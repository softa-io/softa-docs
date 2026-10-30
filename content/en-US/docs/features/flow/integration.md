# Integration

This page is for developers integrating Flow: putting a business model through approval (approving business records), publishing default flows, and what to confirm before enabling `flow-starter` in a host application. For the triggers and messaging automation flows need, see [Automation](./automation#trigger-and-messaging-integration).

## Approving Business Records

A business record — a leave request, an expense claim — is approved by an Approval flow whose trigger is a `SubmitTrigger(modelName, conditionExpression)`. Its model extends `ApprovalModel` (`entity`, in place of `AuditableModel`), its controller extends `ApprovalModelController` (in place of `EntityController`), and the host implements one `ModelApprovalHandler<T>` per model (`runtime/spi`, a Spring bean). `ApprovalModelController` gives every such model the same three endpoints, granted per model like any other: `POST /{Model}/submit?id=`, `POST /{Model}/withdraw?id=` (body `{comment}`, optional) and `POST /{Model}/cancel?id=`, through `FlowClient`. What a submission would do is answered for every model by `GET /flow/instances/preview`.

Every record has a **subject**: the employee it is about, whom the organization-relative approver sources start from (*Approver Resolution*). It is the model's `employeeId` unless the handler's `subject()` names another field (`Transfer::getTransfereeId`); either way a many-to-one onto the employee model (`softa.flow.org.employee-model`), which the boot checks. A record whose subject is empty is not submitted. The submission carries it to the flow as the start variable `_subjectId`.

### Routing variables

An approval starts with every field of the record a route can compare, under the field's name: its own columns of a plain type — text, numbers, booleans, dates and times (as ISO text), options and multi-options (item codes), multi-strings, to-one relations (the id) — less its identity, bookkeeping and approval state (`id`, `tenantId`, `version`, `deleted`, the audit fields, `approvalStatus`, `submitterId`, `submittedTime`) and any field declared sensitive — encrypted, or masked when read — since an instance's variables are not read through the record's field permissions; a field with no value is left out. The handler's `submission` adds what it works out from the record on top — a value read through another model, such as the company's currency — and one of the same name replaces the field's. The designer offers the same fields, so a rule condition on an edge can read every one of them.

The framework keeps the approval state, the same for every model; the handler holds what only the business knows:

| Framework | Handler |
|---|---|
| The approval fields — `approvalStatus` (`ApprovalStatus`), `submitterId`, `submittedTime` — and every write of them | `validate(record)`: the checks a submission must pass — who may submit the record, what it must hold |
| The one state machine below: only a draft is submitted or cancelled; one approval of a record at a time | `validateCancel(record)`: who may cancel the draft beyond seeing it, such as only its claimant |
| Freezing every record that is not a draft (`ApprovalLockValidator`) | `submission(record)`: an `ApprovalSubmission(title, variables, effectiveDate, code)` — the instance title and the routing variables it adds to the record's own fields, worked out from the record alone, and, when the model has them, the date the record takes effect and its own number, which the approval lists show and filter on |
| Writing each result back, once | `afterSubmitted(record)`: what a submission sets off, such as reserving a leave balance |
| What a submission records on the instance: subject, department, effective date, number | `afterOutcome(record, outcome)`: the follow-up actions of a result, such as deducting the balance — or releasing it after a rejection or a cancellation |
| | `effectStatuses(rowIds)`: for a model whose approval takes effect later, where each approved record's change stands (`RecordEffectStatus`: `Scheduled`, `Applied`, `Failed`), read from the records themselves, never guessed from dates. Empty by default, for a model whose approval takes effect at once |

| `FlowClient` | What happens |
|---|---|
| `submitRecord(modelName, rowId)` | The submitter must read the record with their own permissions; only a draft with no approval in progress is submitted. `handler.validate` then checks the whole record as the submitter, and `handler.submission` returns the instance title and the routing variables it adds to the record's fields. The flow is chosen among the tenant's active flows whose submit trigger names the model and whose condition holds for the record — exactly one must match, else the submission is refused naming why. The record becomes `Pending`, with its submitter and the time, `handler.afterSubmitted` runs, and the record's approval starts. All in the caller's transaction. Every submission starts a new approval from the beginning — after a return too, with the flow chosen again for the record as it is now — and marks the record's earlier approvals `superseded` |
| `withdrawRecord(modelName, rowId, comment)` | Withdraws the waiting approval (the engine checks the actor is the initiator and the flow's `withdrawPolicy` permits it); the record is a draft again. When the record's approval **failed**, its submitter takes the record back the same way — the handler is told it was withdrawn; the failed instance stays for flow monitoring. Refused when the record has no approval in progress |
| `cancelRecord(modelName, rowId)` | Cancels a draft for good: the applicant must read the record with their own permissions, it must be a draft, and `handler.validateCancel` must pass. The record becomes `Cancelled` and `handler.afterOutcome` gets a `Cancelled` result with no instance. In the caller's transaction |
| `recordApprovals(modelName, rowId)` | The approval history, as `GET /flow/instances/by-record` |
| `previewRecord(modelName, rowId)` | The approval a submission would start, as `GET /flow/instances/preview` — see below. Call it outside a transaction |

Only the instance a submission starts is the record's **approval** (`FlowExecutionState.recordApproval`): a debug run of the same flow on the same record is not, and is never written back (an API start of an Approval flow is refused — its trigger is `Submit`). A record has at most one approval in progress — `FlowInstance.openRecordId` holds the record's id while its approval is unfinished, under a unique index with the model, so a second submission is refused even when two arrive at once.

A submission also records on its instance, as they stand at submission, what the approval lists show and filter on (see [Instance search](./api#instance-search)): `subjectId` — the employee the record is about — and `departmentId`, that employee's department (`OrganizationService.getDeptIdOfEmployee`, read past the submitter's permissions), the department data scopes narrow by (see [Monitor](./api#monitor)); `effectiveDate` and `recordCode` from the handler's `ApprovalSubmission`. Each submission marks the record's earlier approvals `superseded`, so an approval `Returned` and not superseded is one whose record still waits to be edited and submitted again (`awaitingRevision`).

## Steps

Using a leave request as the example:

1. **The model extends `ApprovalModel`** (instead of `AuditableModel`) and gets `approvalStatus`, `submitterId` and `submittedTime`; the record needs a subject field pointing at the employee model (`employeeId` by default). For record numbers, add an auto-numbered field: a record submitted again after a return keeps its number, and the number is recorded on the approval instance for lists to show and filter.
2. **The controller extends `ApprovalModelController`** (instead of `EntityController`) and gets the `submit`, `withdraw` and `cancel` endpoints, authorised per model.
3. **Implement `ModelApprovalHandler<T>`** as a Spring bean:

```java
@Component
public class LeaveRequestApprovalHandler implements ModelApprovalHandler<LeaveRequest> {
    public Class<LeaveRequest> modelClass() { return LeaveRequest.class; }

    public void validate(LeaveRequest r) { /* enough balance? overlapping dates? */ }

    public ApprovalSubmission submission(LeaveRequest r) {
        return new ApprovalSubmission(
            "Leave · " + r.getEmployeeName(),                           // instance title, shown in lists and notifications
            Map.of(),                                                    // routing variables beyond the record's own fields — none here
            r.getStartDate(),                                            // effective date
            r.getCode());                                                // record number
    }

    public void afterOutcome(LeaveRequest r, ApprovalOutcome outcome) {
        // Approved → deduct the balance; Rejected / Cancelled → release the reservation
    }
}
```

4. **Publish the default flows**: each default flow is one `FlowDesign` row in a tenant seed file (scenario `Approval`, trigger `{"type": "Submit", "modelName": "LeaveRequest"}`, with an optional condition) — see [Default flows as seeds](#default-flows-as-seeds) below. Name built-in roles by role code, and never make a role nobody holds a default approver, or the step resolves no one in every tenant.
5. **Grant access**: authorise the `submit` and `withdraw` endpoints (cancelling a draft comes with `submit`); grant the monitor endpoints and a data scope on `FlowInstance` to administrators' roles.

For the frontend's submit and withdraw buttons, the approval path preview and the approval history panel, see [Form view](../../frontend_dev/views/form).

> [!WARNING]
> `afterOutcome` does only what belongs to the outcome and is written to this database. Anything that leaves it — a payment, an external system — goes after the commit, or a rolled-back approval cannot take it back.

## Default flows as seeds

Default flows reach tenants as tenant seed files: one `FlowDesign` row per file, its trigger naming the model. When seed-starter announces the rows a file created (`SeedFileLoadedEvent`), `SeedFlowPublisher` publishes each new design; a design that does not compile fails the file in that tenant. Tenants then edit their own copy in the designer.

## Host Application Integration Checklist

Before enabling `flow-starter` in a real app, verify:

- add `flow-starter` to the application classpath
- create and expose `FlowDesign` drafts through the generic model APIs
- for approval emails: set `system.site-url` (the link in each email) and give each tenant the `flow.*` mail templates — or turn `emailNotification` off on the flows; provide your own `ApprovalNotificationService` for SMS or IM
- set `flow.notification.failure-role-codes` if failed approvals should reach roles other than `TENANT_ADMIN`
- check the organization follows the default HR conventions, or override `softa.flow.org.*`, or provide your own `OrganizationService`
- for business records: extend `ApprovalModel` (with an `employeeId`, or a `subject()` naming the employee field) and `ApprovalModelController`, implement a `ModelApprovalHandler<T>` per model — with `effectStatuses` when its approval takes effect later — and ship each default flow as a tenant seed file
- grant the monitoring console's endpoints and a data scope on `FlowInstance` to the administrators' roles (a department scope narrows by the subject's department)
- enable Pulsar topics if using triggers or async tasks
- provide timer scheduling/publishing if using `TIMER` nodes
- enable `CALL_SERVICE` explicitly (plus its bean-name allow-list) if flows need to invoke Spring beans; all other task node types ship working executors, conditionally registered on their capability beans

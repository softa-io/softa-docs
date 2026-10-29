# API & Data

The REST APIs of `flow-starter`, the in-process `FlowClient`, the persistence model and the editor contracts, for reference. For how approvals and automation behave, see [Approval Flows](./approval) and [Automation](./automation).

## API Overview

Host applications embedding the engine in-process should integrate through the `FlowClient` facade (`io.softa.starter.flow.api`) rather than looping back over REST — actor / initiator / tenant identity is always resolved server-side from the context, never passed as call parameters. `FlowAutoConfiguration` registers the default `InProcessFlowClient` only when the application defines no `FlowClient` bean of its own. See the in-module integration guide under `starters/flow-starter/docs/integration-guide.md` in the Softa source repository.

### Design APIs (flow editor)

Base path: `/flow/designs` — the dedicated surface for the graphical editor (the full editor API contract lives in the Softa source repository under `starters/flow-starter/docs/frontend-editor-api.md`). The generic model API at `/FlowDesign/**` remains available as the platform data plane and is intentionally not intercepted.

| Method | Path | Description |
|---|---|---|
| `POST` | `/flow/designs` | Create a draft |
| `GET` | `/flow/designs?keyword=&scenario=&pageNumber=&pageSize=` | Paged draft list (canvas excluded) |
| `GET` | `/flow/designs/{id}` | Load one draft (canvas + optimistic-lock version) |
| `POST` | `/flow/designs/{id}/save` | Auto-save the canvas; stale versions are rejected |
| `POST` | `/flow/designs/{id}/delete` | Delete a draft if it has never been published |
| `POST` | `/flow/designs/{id}/duplicate` | Copy a draft under a fresh name (`"<name> (copy)"` when `newFlowName` is omitted) |
| `POST` | `/flow/designs/validate` | Validate the posted document; diagnostics returned as a success payload |
| `POST` | `/flow/designs/{id}/publish` | Publish the saved draft as a new active revision |
| `POST` | `/flow/designs/{id}/restore?bundleId=` | Restore the draft canvas from a historical bundle snapshot |
| `GET` | `/flow/designs/{id}/status` | Publish status: revision badge + dirty flag |
| `GET` | `/flow/designs/{id}/availableVariables?nodeId=` | Variables visible to a node (expression autocomplete) |
| `POST` | `/flow/designs/{id}/debugRun` | Compile and run the current draft as a debug bundle (not a sandbox) |
| `GET` | `/flow/designs/{id}/debugRuns` | Debug-run history, newest first |

### Bundle APIs (published revisions)

Base path: `/flow/bundles`

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/bundles?flowId=` | Revision list of one flow (or, without `flowId`, the active bundle of every flow of the caller's tenant) |
| `GET` | `/flow/bundles/{bundleId}?include=design` | One revision's summary, optionally with the canvas-complete design snapshot |
| `POST` | `/flow/bundles/{bundleId}/activate` | Make this revision the flow's effective one (rollback = roll-forward) |

### Node Descriptor APIs

Base path: `/flow/nodeDescriptors`

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/nodeDescriptors` | List all node descriptors for the editor palette |
| `GET` | `/flow/nodeDescriptors?scenario=Approval` | Filter descriptors by `FlowScenario` |

### Instance APIs

Base path: `/flow/instances` — launch, reads and approval actions on runtime instances.

| Method | Path | Description |
|---|---|---|
| `POST` | `/flow/instances/start` | Start an Automation flow whose trigger is `Api`, by `flowId` or a pinned `bundleId`; any other flow is refused |
| `GET` | `/flow/instances/{instanceId}?includeTrace=` | Get one runtime instance (trace excluded by default) |
| `GET` | `/flow/instances/{instanceId}/overlay` | Per-node run state for canvas painting |
| `GET` | `/flow/instances/{instanceId}/trace?sinceSequence=` | Incremental trace rows for polling |
| `POST` | `/flow/instances/search` | Paged summaries of the caller's own record approvals, newest first — the initiator filter is always the authenticated user, and automation runs their writes triggered are left out. See [Instance search](#instance-search) for the filters and what each row carries |
| `POST` | `/flow/instances/approve` | Approve a pending approval |
| `POST` | `/flow/instances/reject` | Reject a pending approval; the comment saying why is required |
| `POST` | `/flow/instances/batch/approve` | Approve several of the caller's pending tasks (`tasks`: instance + step, at most 100), each in its own transaction. Returns `FlowBatchActionResult` — succeeded / skipped / failed counts and each task's outcome. See [Batch actions and handling steps](./approval#batch-actions-and-handling-steps) |
| `POST` | `/flow/instances/batch/return` | Return several pending tasks to their initiators with one comment (required); a step that allows no return is skipped |
| `POST` | `/flow/instances/batch/reject` | Reject several pending tasks with one comment (required) |
| `POST` | `/flow/instances/transfer` | Transfer a pending approval task |
| `POST` | `/flow/instances/delegate` | Delegate a pending approval task |
| `POST` | `/flow/instances/add-sign-before` | Insert a prerequisite signer |
| `POST` | `/flow/instances/add-sign-after` | Insert a follow-up signer |
| `POST` | `/flow/instances/cc` | Send a CC notification |
| `POST` | `/flow/instances/cc/read` | Mark a CC as read |
| `POST` | `/flow/instances/return` | Return a pending approval to the initiator, ending the instance as `Returned`. Only the step's approver, on a step that allows returns (`returnEnabled`), with a comment saying what to change |
| `POST` | `/flow/instances/withdraw` | Withdraw an Approval instance: its initiator, while it waits on its approvers and the flow's `withdrawPolicy` permits it (`WithdrawPolicyGuard`) |
| `GET` | `/flow/instances/{instanceId}/withdraw` | Whether the caller may withdraw the instance now — `true` exactly when a withdrawal would be accepted, by the same `WithdrawPolicyGuard`. Allowed to whoever may view the instance |
| `POST` | `/flow/instances/urge` | Remind the approvers the approval waits on — its initiator only. Each waiting step is urged at most once per `flow.approval.urge-interval-minutes` (default 240), by the initiator or an administrator alike; each step urged gets its own `URGE` history entry, and when every step is still inside the interval the urge is refused. Returns `FlowUrgeStatus`, not the instance |
| `GET` | `/flow/instances/{instanceId}/urge` | Whether the approval may be urged now, and if not, when (`FlowUrgeStatus`). Allowed to whoever may view the instance |
| `POST` | `/flow/instances/comment` | Add a comment audit entry while the instance runs — its participants only: the initiator and the people it gives or gave a task to. An instance that has ended takes no more comments. Returns `true`, not the instance |
| `GET` | `/flow/instances/{instanceId}/nodes/{nodeId}/formPermissions` | Get field-level form permissions |
| `GET` | `/flow/instances/by-record?modelName=&rowId=` | A business record's approval history: its approval instances newest first, with the steps still waiting, the approvers yet to act and the approval actions, every user named (names are resolved only once the caller is allowed); a failed instance says where and why it stopped (`failure`). Allowed to whoever took part in its approvals or can read the record |
| `GET` | `/flow/instances/preview?modelName=&rowId=` | What submitting the record would do now, without submitting it: the Submit flow it would get and its approval steps, each with the approvers who would be asked or why it passes on its own; a refusal, no applicable flow or several are reported, a route decided only once the approval runs is reported as undecided. For a record in approval, the rest of its path (`InProgress`): the step it waits on now, then those after it. Nothing is started or written. Allowed to whoever can read the record (see [Previewing a record's approval](./approval#previewing-a-records-approval)) |
| `GET` | `/flow/instances/{instanceId}/record` | The business record a record's approval runs on — any other instance is refused, since its record was named freely rather than submitted — for its initiator and the people it gives a task to: read past their own row permissions. Every field, dynamic ones included, but the sensitive ones the caller may see on no row; the field permissions of the waiting steps the caller approves are laid over that — what they list as `Readonly` / `Editable` / `Required` shows, sensitive or not, and what they mark `Hidden` does not. The initiator sees every field but those unseen sensitive ones; anyone else with no waiting step also misses what any approval step hides. Read as the model read API returns a record (relations and options as references, masked fields masked), with each one-to-many's rows in full — an expense claim comes with its lines |

Who may view an instance: its initiator and the people it gives a task to (approvers pending or done, CC recipients, transfer, delegation and add-sign targets) by default; anyone else through the standard role and data-scope configuration — they may read the `FlowInstance` row with their own permissions, or, for a record's approval, read the record itself.

The defaults need no grant on the flow models, which no business role holds. The engine's own bookkeeping — loading and saving instances, the approval ledger, the task and branch projections, delegation and auto-CC rules — runs past the caller's data permissions: who may act is the action handlers' call, who may see the access guard's. The current user's own lists — inbox counts, pending / completed / CC tasks and the inbox (`/flow/approvalTasks`), their approval history and sent CCs (`/flow/approvalRecords`), their delegations, and `POST /flow/instances/search`, with their `FlowClient` counterparts — carry `@SkipPermissionCheck`: pinned to the caller, row scope could only empty them. The per-instance reads (`.../instance/{instanceId}`, the instance detail endpoints) are not waived, because the guard judges everyone but the initiator and the task holders by their own permissions.

### Instance search

`POST /flow/instances/search` (the caller's own approvals) and `POST /flow/monitor/instances/search` (across initiators, see [Monitor](#monitor)) take the same `FlowInstanceSearchRequest` and return the same rows, newest first, paged by `pageNumber` (default 1) and `pageSize` (default 50). Filters combine with AND:

| Filter | Matches |
|---|---|
| `flowId`, `status`, `modelName`, `rowId` | The instance's own columns (`rowId` with `modelName`) |
| `createdFrom` / `createdTo` | When it started — for a record's approval, when the record was submitted |
| `initiatorId` | The monitor search only; the caller's own search always pins it to them |
| `subjectId`, `subjectDeptId` | A record's approval by the employee it is about, or by that employee's department, as at submission |
| `effectiveDateFrom` / `effectiveDateTo` | A record's approval by the date the record takes effect |
| `recordCode` | A record's approval by the record's own number (contains) |
| `awaitingRevision` | Approvals returned to their submitter that no later submission of the record replaced — records still waiting to be edited and submitted again |

A row (`FlowInstanceSummaryView`) leaves out the heavy state columns and the trace — fetch the instance or its overlay for those. It carries the flow, title, initiator, status and the steps the instance waits on now (`currentSteps`, each with the approvers still to act), every user named, and for a record's approval what its submission recorded (*Approving Business Records*): `subject`, `subjectDept`, `effectiveDate`, `recordCode`, and `awaitingRevision`. On the caller's own approvals that wait on their approvers, `withdrawable` and `urge` say whether they may withdraw or urge them now. `recordDeleted` marks an approval whose record is gone — a draft deleted after a return or a withdrawal — and `effectStatus` says where an approved record's change stands, for a model whose approval takes effect later (`ModelApprovalHandler.effectStatuses`).

### Automation APIs

Base path: `/flow/automation` — trigger firing and transient runs; none of these reads or acts on an existing instance.

| Method | Path | Description |
|---|---|---|
| `POST` | `/flow/automation/trigger` | Fire a trigger event and start matching flows. `Submit`, `Cron`, `Api` and `Subflow` events are refused: those flows start by record submission, on their own schedule, by id, or from a parent flow |
| `POST` | `/flow/automation/onchange` | Run `COMPUTE` flows transiently and return variable diffs |
| `POST` | `/flow/automation/validate` | Run `VALIDATION` flows transiently against candidate row data; returns each flow's declared outputs keyed by `flowId` |

Async-task and timer resumes have no REST endpoint: `FlowAsyncTaskConsumer`, `FlowTimerConsumer` and the due-timer sweep of the maintenance cron call `FlowRuntimeEngine` in-process.

`actorId` / `initiatorId` / `tenantId` are **never** sent by clients: every action request stamps them server-side from the login context (`@JsonProperty(READ_ONLY)`), and all query endpoints resolve the current actor from the context. The in-process `FlowClient` resolves the actor the same way and calls the same services as these endpoints.

## Approval Projection APIs

### Approval Tasks

Base path: `/flow/approvalTasks`

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/approvalTasks/counts` | Inbox badge counts for the current actor (`{pendingApprovals, unreadCc}` — same filter definitions as the paged `/pending` and `/cc?read=false` queries) |
| `GET` | `/flow/approvalTasks/pending?flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | Pending tasks for the current actor, newest first (paged: returns `Page`) |
| `GET` | `/flow/approvalTasks/completed?flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | Completed tasks for the current actor (paged) |
| `GET` | `/flow/approvalTasks/cc?read=&flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | CC tasks for the current actor (paged; `read=false` unread, `read=true` acknowledged, omit `read` for both) |
| `GET` | `/flow/approvalTasks/inbox?flowId=&instanceId=&nodeId=&includeCompletedApprovals=&pageNumber=&pageSize=` | Unified inbox view (pending approvals + CC; optional completed approvals) |
| `GET` | `/flow/approvalTasks/instance/{instanceId}` | All tasks for one runtime instance (participants / initiator only) |

Each task (`FlowApprovalTaskView`) comes with its instance's context — `instanceTitle`, `modelName` / `rowId`, `instanceStatus`, the `initiator` and `submittedTime`, and what a record's approval recorded of its record (`subject`, `subjectDept`, `effectiveDate`, `recordCode`), every user, employee and department named — and with what its step's configuration says about acting on it, read from the revision the instance runs on: `handling` (a handling step), `returnAllowed` (the step's `returnEnabled`) and `batchable` (open to its approver now — pending, not blocked by an add-sign, the instance waiting — on a step that is not a handling step and makes no field required). See [Batch actions and handling steps](./approval#batch-actions-and-handling-steps).

### Approval Records

Base path: `/flow/approvalRecords`

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/approvalRecords/instance/{instanceId}` | Approval history by runtime instance |
| `GET` | `/flow/approvalRecords/history` | Actor-scoped approval history |
| `GET` | `/flow/approvalRecords/cc/sent` | Sender-side CC history |

An entry (`FlowApprovalRecord`, `FlowApprovalRecordView`) records its `action` (`ApprovalActionType`: `APPROVE`, `AUTO_APPROVE`, `REJECT`, `TRANSFER`, `DELEGATE`, `ADD_SIGN`, `CC`, `READ`, `RETURN`, `WITHDRAW`, `URGE`, `COMMENT`, `TERMINATE`), its `actorId` and, for an action done on the actor's behalf, `operatorId` — the administrator who reassigned the actor's task (a `TRANSFER` entry from the approver to the new one); empty when the actor acted themselves.

### CC Config

Base path: `/flow/ccConfigs`

| Method | Path | Description |
|---|---|---|
| `POST` | `/flow/ccConfigs` | Create a CC rule |
| `GET` | `/flow/ccConfigs?flowId=` | List CC rules by `flowId` |
| `POST` | `/flow/ccConfigs/{id}/deactivate` | Deactivate a CC rule |

A rule (`FlowCcConfig`) CCs its recipients at its timing:

- `OnSubmit`: when the flow starts.
- `OnApprove` / `OnReject`: after an approver approves or rejects a step.
- `OnComplete`: when the approval completes approved.

A rule without a `nodeId` is flow-level and fires at every such moment. A rule naming a step fires at `OnApprove` / `OnReject` of that step only. `recipientType` `INITIATOR` CCs the initiator; any other type reads `recipientConfig` as comma-separated user ids. An optional `ccCondition` is evaluated over the instance variables.

An automatic CC is recorded like a manual one: one `CC` entry per recipient in the approval history. The entry has no actor, since no person sent it. It sits on the node the rule fired at — the step acted on, or the start node at `OnSubmit` (and at `OnComplete` when every step passed on its own) — in that node's current cycle. So the recipient:

- has a CC task in the inbox, which they mark read;
- is a participant of the instance: they open it and comment on it.

A recipient already CC'd on the same node and cycle, by a rule or by hand, is not CC'd again, so a step that several approvers approve CCs once. `sendNotification` additionally notifies the recipients CC'd that time.

### Delegation

Base path: `/flow/delegations`

| Method | Path | Description |
|---|---|---|
| `POST` | `/flow/delegations` | Create a delegation rule |
| `GET` | `/flow/delegations/my` | Delegations created by the caller (delegator resolved from the login context) |
| `GET` | `/flow/delegations/to-me` | Active delegations assigned to the caller (delegate resolved from the login context) |
| `POST` | `/flow/delegations/{id}/cancel` | Cancel one of the caller's delegation rules; another user's is refused (403) |

### Monitor

Base path: `/flow/monitor` — the administrators' console. No role is built in: each endpoint is granted like any other, and what the console reads or acts on is the caller's own permissions on `FlowInstance` — their roles' grant and data scope; taking part in an instance is not enough. A department scope (`DEPT_SUBTREE`, `MANAGED_DEPARTMENTS`) narrows by `FlowInstance.departmentId`, the subject's department at submission — a plain department-id column the permission-starter scopes filter by the ids of the departments in range — so a role scoped to the departments it manages sees and administers their approvals; an automation run belongs to no department. Opening another user's instance (detail / overlay / trace / approval history) follows the viewing rule under [Instance APIs](#instance-apis), as for any viewer who is not a participant.

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/monitor/health` | Flow runtime health snapshot (per-status instance counts, overdue timers) |
| `POST` | `/flow/monitor/instances/search` | Cross-initiator paged instance summaries, read with the caller's own permissions: the `FlowInstance` rows their data scope reaches. Honors the request's `initiatorId` filter when present; otherwise as [Instance search](#instance-search) |
| `POST` | `/flow/monitor/instances/urge` | Urge an approval as an administrator rather than its initiator: whoever may read the instance's `FlowInstance` row with their own permissions. The initiator's interval applies — a step urged within it, by anyone, is not urged again. Returns `FlowUrgeStatus` |
| `POST` | `/flow/monitor/instances/terminate` | End each instance named (`instanceIds`, at most 100) that is running, waiting or failed, with one `reason` (required): its pending approvals close, it ends `Cancelled` — a record's approval cancels its record — and the history records a `TERMINATE` entry with the reason, which the initiator is sent. Only instances the caller's permissions read; each in its own transaction. Returns `FlowBatchActionResult` |
| `POST` | `/flow/monitor/approvers/reassign/preview` | How many of an approver's pending approval tasks (`fromActorId` → `toActorId`), on the instances the caller's permissions read, a reassignment would move: `FlowReassignPreview` (`tasks`, `instances`) |
| `POST` | `/flow/monitor/approvers/reassign` | Move each of those tasks to the new approver, with a `reason` (required), each in its own transaction: recorded as the approver's `TRANSFER` with the caller as `operatorId`; the new approver is given the task, the initiator is told who now holds it. Only the steps the instances wait on now move — a step not reached yet resolves its approvers when reached; CC tasks stay. Returns `FlowBatchActionResult` |
| `POST` | `/flow/monitor/delegations` | Create a delegation rule on an approver's behalf (the body names the `delegatorId` and the `delegateId`): their tasks arriving from then on go to the delegate, and the approver sees the rule among theirs. It affects all of the approver's tasks whatever the caller's data scope, so it is a permission of its own |
| `GET` | `/flow/monitor/delegations` | Every delegation rule of the tenant, newest first |
| `POST` | `/flow/monitor/delegations/{id}/cancel` | Deactivate any delegation rule of the tenant |

### Event Logs

Base path: `/flow/events`

| Method | Path | Description |
|---|---|---|
| `GET` | `/flow/events?flowId=&sourceModel=&sourceRowId=&instanceId=&success=&eventTimeFrom=&eventTimeTo=&pageNumber=&pageSize=` | Paged event log, newest first (filters combine with AND; list rows exclude the parameters payload) |
| `GET` | `/flow/events/{id}` | Single event including the raw trigger-parameters payload |

## Persistence Model

| Entity | Description |
|---|---|
| `FlowDesign` | Draft working copy |
| `FlowBundle` | Published compiled bundle |
| `FlowInstance` | Persisted runtime instance state (trace and approval history are NOT embedded — see the two dedicated tables), with what a record's approval recorded at submission: `subjectId`, `departmentId`, `effectiveDate`, `recordCode`, `superseded`. Approval instances are kept; finished Automation runs, with their trace, branches and the trigger event log, are purged after `flow.automation.retention-days` (default 30) by the `flow_automation_purge` cron |
| `FlowExecutionTrace` | Append-only execution trace rows (the in-memory state keeps only the current attempt's delta) |
| `FlowApprovalTask` | Pending/completed/CC task projections |
| `FlowApprovalRecord` | Approval action audit ledger — the authoritative approval history, flushed by the instance store in the same transaction as the instance row; `operatorId` names an administrator who acted on the actor's behalf |
| `FlowCcConfig` | Automatic CC rules |
| `FlowDelegation` | Delegation rules |
| `FlowEvent` | Trigger event logs |
| `FlowDebugHistory` | Debug snapshots |
| `FlowParallelBranch` | Parallel branch tracking |

Primary storage adapters in this module:

- `OrmFlowBundleRegistry`
- `OrmFlowInstanceStore`

`OrmFlowBundleRegistry` loads nothing at startup and caches per tenant:

- **Trigger matching** reads an index of the tenant's active bundles, loaded in that tenant's own context on its first event (an empty result is kept too) and merged with the platform-shared bundles (`tenantId = 0`); a context without a tenant matches the shared ones only. Entries live for `flow.trigger-cache-ttl-seconds` (default `60`). Publishing or activating a revision drops the tenant's entry at once on the instance that did it; other instances pick the change up within the TTL. Change logs of models no flow watches are not turned into trigger events.
- **Definitions** are cached by `bundleId` in a bounded LRU (a published revision never changes). A bundle of another tenant reads as not found, whether cached or not; platform-shared bundles are visible to every tenant.
- **The active revision of a flow** is read from the database on every lookup, so starting by `flowId` follows a publish or rollback made on any instance.

## Node Descriptor Contract

The editor palette is built from `FlowNodeDescriptor` records exposed through `/flow/nodeDescriptors`.

- structural descriptors come from `BuiltinNodeDescriptorProvider`
- executor-backed task descriptors come from `TaskExecutorDescriptorProvider`
- descriptors include label, icon, sort order, config schema, default config, and allowed scenarios

`TaskExecutorDescriptorProvider` only exposes task nodes for executors that are actually registered as Spring beans, so conditional executors such as `QUERY_AI` and `ASYNC_TASK` only appear when their dependencies are present.

## Frontend Graph Compatibility

Design graph DTOs remain aligned with xyflow/react style structures:

| xyflow/react | flow-starter |
|---|---|
| `Node.id` | `FlowGraphNode.id` |
| `Node.type` | `FlowGraphNode.type` |
| `Node.position` | `FlowGraphNode.position` |
| `Node.width` / `height` | `FlowGraphNode.width` / `height` |
| `Node.data` | `FlowGraphNode.data` |
| `Edge.id` | `FlowGraphEdge.id` |
| `Edge.source` / `target` | `FlowGraphEdge.source` / `target` |
| `Edge.sourceHandle` / `targetHandle` | `FlowGraphEdge.sourceHandle` / `targetHandle` |
| `Edge.type` | `FlowGraphEdge.type` |
| `Edge.label` | `FlowGraphEdge.label` |
| `Edge.data` | `FlowGraphEdge.data` |
| `Viewport {x, y, zoom}` | `FlowGraphViewport {x, y, zoom}` |

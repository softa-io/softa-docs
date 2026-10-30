# 业务接入

本页写给接入 Flow 的研发：让业务模型走审批（审批业务记录）、发布默认流程，以及在宿主应用里启用 `flow-starter` 前要确认的事项。自动化流程的触发与消息配置见[自动化](./automation#触发与消息集成)。

## 审批业务记录

业务记录——请假申请、报销单——由触发器为 `SubmitTrigger(modelName, conditionExpression)` 的 Approval 流程审批。其模型继承 `ApprovalModel`（`entity` 包，替代 `AuditableModel`），其控制器继承 `ApprovalModelController`（替代 `EntityController`），宿主为每个模型实现一个 `ModelApprovalHandler<T>`（`runtime/spi`，一个 Spring bean）。`ApprovalModelController` 为每个这样的模型提供同样的三个端点，与其他端点一样按模型授权：`POST /{Model}/submit?id=`、`POST /{Model}/withdraw?id=`（请求体 `{comment}`，可选）和 `POST /{Model}/cancel?id=`，均经由 `FlowClient`。提交会产生什么，对所有模型都由 `GET /flow/instances/preview` 回答。

每条记录都有一个**当事人**：记录所涉及的员工，基于组织关系的审批人源从他开始解析（*审批人解析*）。它是模型的 `employeeId`，除非处理器的 `subject()` 指定了另一个字段（`Transfer::getTransfereeId`）；无论哪种，都必须是指向员工模型（`softa.flow.org.employee-model`）的多对一字段，启动时会检查。当事人为空的记录不能提交。提交会把它作为启动变量 `_subjectId` 带给流程。

### 路由变量

审批启动时带上记录上所有可供路由比较的字段，变量名即字段名：记录自身的普通类型列——文本、数字、布尔、日期和时间（转为 ISO 文本）、选项和多选（item code）、多值文本、多对一/一对一关联（id）——但不含标识、簿记和审批状态字段（`id`、`tenantId`、`version`、`deleted`、审计字段、`approvalStatus`、`submitterId`、`submittedTime`），也不含声明为敏感的字段（加密或读取时脱敏），因为实例变量不经过记录的字段权限；没有值的字段不放入。处理器的 `submission` 在此之上补充它根据记录算出的值——例如通过其他模型读到的公司币种——同名变量会覆盖字段值。设计器提供的就是这些字段，因此连线上的规则条件可以读取其中任何一个。

框架维护审批状态，对每个模型都一样；处理器负责只有业务才知道的部分：

| 框架 | 处理器 |
|---|---|
| 审批字段——`approvalStatus`（`ApprovalStatus`）、`submitterId`、`submittedTime`——以及对它们的每一次写入 | `validate(record)`：提交必须通过的检查——谁可以提交该记录、记录必须包含什么 |
| 下文唯一的状态机：只有草稿可以提交或作废；一条记录同一时间只有一个审批 | `validateCancel(record)`：除能看到草稿外，还有谁可以作废它，例如只有报销人本人 |
| 冻结所有非草稿记录（`ApprovalLockValidator`） | `submission(record)`：一个 `ApprovalSubmission(title, variables, effectiveDate, code)`——仅根据记录算出的实例标题和在记录自身字段之外补充的路由变量，以及模型有这些信息时，记录的生效日期和记录自身的编号，供审批列表显示与筛选 |
| 每个结果只回写一次 | `afterSubmitted(record)`：提交所引发的动作，例如预占假期余额 |
| 提交时记在实例上的内容：当事人、部门、生效日期、编号 | `afterOutcome(record, outcome)`：结果的后续动作，例如扣减余额——或在拒绝、作废后释放余额 |
| | `effectStatuses(rowIds)`：对审批后延期生效的模型，每条已批准记录的变更进行到哪一步（`RecordEffectStatus`：`Scheduled`、`Applied`、`Failed`），从记录本身读取，从不根据日期推测。默认为空，适用于审批后立即生效的模型 |

| `FlowClient` | 会发生什么 |
|---|---|
| `submitRecord(modelName, rowId)` | 提交人必须能以自己的权限读取该记录；只有没有进行中审批的草稿才会被提交。随后 `handler.validate` 以提交人身份检查整条记录，`handler.submission` 返回实例标题和它在记录字段之外补充的路由变量。流程从租户的活动流程中选出：其提交触发器指明该模型、且条件对该记录成立——必须恰好匹配一个，否则提交被拒绝并说明原因。记录变为 `Pending`，记下提交人与时间，运行 `handler.afterSubmitted`，然后启动记录的审批。全部在调用方事务中完成。每次提交都从头启动一个新的审批——退回之后也是如此，并按记录当前的样子重新选择流程——同时把该记录之前的审批标记为 `superseded` |
| `withdrawRecord(modelName, rowId, comment)` | 撤回正在等待的审批（引擎检查 actor 是发起人，且流程的 `withdrawPolicy` 允许）；记录重新成为草稿。若记录的审批**失败**，其提交人也以同样方式取回记录——处理器得知它被撤回；失败的实例保留供流程监控。记录没有进行中的审批时拒绝 |
| `cancelRecord(modelName, rowId)` | 永久作废草稿：申请人必须能以自己的权限读取该记录，记录必须是草稿，且 `handler.validateCancel` 必须通过。记录变为 `Cancelled`，`handler.afterOutcome` 收到一个没有实例的 `Cancelled` 结果。在调用方事务中完成 |
| `recordApprovals(modelName, rowId)` | 审批历史，同 `GET /flow/instances/by-record` |
| `previewRecord(modelName, rowId)` | 提交将启动的审批，同 `GET /flow/instances/preview`——见下文。应在事务之外调用 |

只有提交所启动的实例才是记录的**审批**（`FlowExecutionState.recordApproval`）：同一流程在同一记录上的调试运行不是，也从不回写（以 API 启动 Approval 流程会被拒绝——其触发器是 `Submit`）。一条记录最多只有一个进行中的审批——审批未结束期间，`FlowInstance.openRecordId` 保存记录的 id，并与模型组成唯一索引，因此即使两个提交同时到达，第二个也会被拒绝。

提交还会在其实例上记下审批列表显示与筛选所用的内容，以提交时为准（见[实例搜索](./api#实例搜索)）：`subjectId`——记录所涉及的员工——以及 `departmentId`，即该员工的部门（`OrganizationService.getDeptIdOfEmployee`，越过提交人的权限读取），部门数据范围据此收窄（见[监控](./api#监控)）；`effectiveDate` 和 `recordCode` 来自处理器的 `ApprovalSubmission`。每次提交都会把该记录之前的审批标记为 `superseded`，因此一个 `Returned` 且未被取代的审批，就是其记录仍在等待修改并重新提交的审批（`awaitingRevision`）。

## 接入步骤

以「请假单」为例：

1. **模型继承 `ApprovalModel`**（代替 `AuditableModel`），获得 `approvalStatus`、`submitterId`、`submittedTime`；单据要有指向员工模型的当事人字段（默认 `employeeId`）。需要单据编号时加一个自动编号字段：退回后重新提交编号不变，并会记在审批实例上供列表显示与筛选。
2. **控制器继承 `ApprovalModelController`**（代替 `EntityController`），获得 `submit`、`withdraw`、`cancel` 三个端点，按模型授权。
3. **实现 `ModelApprovalHandler<T>`**，注册为 Spring bean：

```java
@Component
public class LeaveRequestApprovalHandler implements ModelApprovalHandler<LeaveRequest> {
    public Class<LeaveRequest> modelClass() { return LeaveRequest.class; }

    public void validate(LeaveRequest r) { /* 余额是否足够、日期是否冲突… */ }

    public ApprovalSubmission submission(LeaveRequest r) {
        return new ApprovalSubmission(
            "Leave · " + r.getEmployeeName(),                           // 实例标题，列表与通知里显示
            Map.of(),                                                    // 记录自身字段之外的路由变量——这里没有
            r.getStartDate(),                                            // 生效日期
            r.getCode());                                                // 单据编号
    }

    public void afterOutcome(LeaveRequest r, ApprovalOutcome outcome) {
        // Approved → 扣减余额；Rejected / Cancelled → 释放预占
    }
}
```

4. **发布默认流程**：每个默认流程作为租户种子文件中的一行 `FlowDesign`（场景 `Approval`，触发器 `{"type": "Submit", "modelName": "LeaveRequest"}`，可加条件），见下文[默认流程种子](#默认流程种子)。内置角色用角色编码指定；不要把没有持有人的角色设为默认审批人，否则该步骤会在所有租户解析不到人。
5. **授权**：为 `submit`、`withdraw` 端点授权（作废草稿随 `submit`）；把监控台端点与 `FlowInstance` 上的数据范围授予管理员角色。

前端的提交、撤回按钮、审批路径预览与审批记录面板见[表单视图](../../frontend_dev/views/form)。

> [!WARNING]
> `afterOutcome` 只做属于这个结果、写在本库里的事。付款、调用外部系统等离开本库的动作放到事务提交之后，否则审批回滚时外部动作收不回来。

## 默认流程种子

默认流程以租户种子文件的形式到达各租户：每个文件一行 `FlowDesign`，其触发器指明模型。当 seed-starter 公布某个文件创建的行时（`SeedFileLoadedEvent`），`SeedFlowPublisher` 发布每个新的设计；无法编译的设计会使该文件在该租户中失败。之后各租户在设计器中编辑自己的副本。

## 宿主应用集成清单

在真实应用中启用 `flow-starter` 之前，请确认：

- 将 `flow-starter` 加入应用 classpath
- 通过通用模型 API 创建并暴露 `FlowDesign` 草稿
- 审批邮件：配置 `system.site-url`（每封邮件中的链接），并为每个租户提供 `flow.*` 邮件模板——或在流程上关闭 `emailNotification`；如需短信或 IM，提供自己的 `ApprovalNotificationService`
- 若失败的审批应通知 `TENANT_ADMIN` 以外的角色，配置 `flow.notification.failure-role-codes`
- 确认组织遵循默认的 HR 约定，或覆盖 `softa.flow.org.*`，或提供自己的 `OrganizationService`
- 对业务记录：继承 `ApprovalModel`（带 `employeeId`，或由 `subject()` 指定员工字段）和 `ApprovalModelController`，为每个模型实现一个 `ModelApprovalHandler<T>`——审批后延期生效的模型还需实现 `effectStatuses`——并把每个默认流程作为租户种子文件发布
- 把监控台的端点以及 `FlowInstance` 上的数据范围授予管理员的角色（部门数据范围按当事人的部门收窄）
- 若使用触发或异步任务，启用 Pulsar topics
- 若使用 `TIMER` 节点，提供定时器调度/发布
- 若流程需要调用 Spring bean，显式启用 `CALL_SERVICE`（及其 bean 名允许列表）；其余任务节点类型均附带可用执行器，并按其能力 bean 条件注册

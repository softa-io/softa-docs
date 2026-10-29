# 接口与数据

`flow-starter` 的 REST 接口、进程内 `FlowClient`、持久化模型与编辑器契约，供查阅。审批与自动化的行为说明见[审批流](./approval)与[自动化](./automation)。

## API 概览

宿主应用若在进程内嵌入引擎，应通过 `FlowClient` 门面（`io.softa.starter.flow.api`）集成，而不是绕回 REST——actor / initiator / tenant 身份始终从服务端上下文解析，绝不作为调用参数传入。只有当应用没有定义自己的 `FlowClient` bean 时，`FlowAutoConfiguration` 才注册默认的 `InProcessFlowClient`。参见 Softa 源仓库中模块内集成指南：`starters/flow-starter/docs/integration-guide.md`。

### 设计 API（flow 编辑器）

基础路径：`/flow/designs` — 图形编辑器的专用表面（完整编辑器 API 契约位于 Softa 源仓库的 `starters/flow-starter/docs/frontend-editor-api.md`）。通用模型 API `/FlowDesign/**` 仍作为平台数据平面可用，且有意不被拦截。

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/designs` | 创建草稿 |
| `GET` | `/flow/designs?keyword=&scenario=&pageNumber=&pageSize=` | 分页草稿列表（不含画布） |
| `GET` | `/flow/designs/{id}` | 加载一个草稿（画布 + 乐观锁 version） |
| `POST` | `/flow/designs/{id}/save` | 自动保存画布；过期 version 会被拒绝 |
| `POST` | `/flow/designs/{id}/delete` | 删除从未发布过的草稿 |
| `POST` | `/flow/designs/{id}/duplicate` | 以新名称复制草稿（省略 `newFlowName` 时为 `"<名称> (copy)"`） |
| `POST` | `/flow/designs/validate` | 校验提交的文档；诊断作为成功 payload 返回 |
| `POST` | `/flow/designs/{id}/publish` | 将已保存草稿发布为新活动修订版 |
| `POST` | `/flow/designs/{id}/restore?bundleId=` | 从历史 bundle 快照恢复草稿画布 |
| `GET` | `/flow/designs/{id}/status` | 发布状态：修订版徽章 + dirty 标志 |
| `GET` | `/flow/designs/{id}/availableVariables?nodeId=` | 节点可见变量（表达式自动完成） |
| `POST` | `/flow/designs/{id}/debugRun` | 将当前草稿编译并作为调试 bundle 运行（非沙箱） |
| `GET` | `/flow/designs/{id}/debugRuns` | 调试运行历史，最新在前 |

### Bundle API（已发布修订版）

基础路径：`/flow/bundles`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/bundles?flowId=` | 一个流程的修订版列表（无 `flowId` 时为调用方租户每个流程的活动 bundle） |
| `GET` | `/flow/bundles/{bundleId}?include=design` | 一个修订版摘要，可选含画布完整设计快照 |
| `POST` | `/flow/bundles/{bundleId}/activate` | 使此修订版成为流程的生效修订版（回滚 = 向前滚动） |

### 节点描述符 API

基础路径：`/flow/nodeDescriptors`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/nodeDescriptors` | 列出编辑器面板的所有节点描述符 |
| `GET` | `/flow/nodeDescriptors?scenario=Approval` | 按 `FlowScenario` 过滤描述符 |

### 实例 API

基础路径：`/flow/instances`——运行时实例的启动、读取与审批操作。

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/instances/start` | 按 `flowId` 或固定的 `bundleId` 启动触发器为 `Api` 的 Automation 流程；其他流程一律拒绝 |
| `GET` | `/flow/instances/{instanceId}?includeTrace=` | 获取一个运行时实例（默认排除 trace） |
| `GET` | `/flow/instances/{instanceId}/overlay` | 画布绘制的每节点运行状态 |
| `GET` | `/flow/instances/{instanceId}/trace?sinceSequence=` | 用于轮询的增量 trace 行 |
| `POST` | `/flow/instances/search` | 调用方自己提交的记录审批的分页摘要，最新在前——发起人过滤始终为已认证用户，其写入触发的自动化运行不在其中。过滤条件与每行内容见[实例搜索](#实例搜索) |
| `POST` | `/flow/instances/approve` | 批准待审批 |
| `POST` | `/flow/instances/reject` | 拒绝待审批；必须填写说明理由的意见 |
| `POST` | `/flow/instances/batch/approve` | 批准调用方的多个待办任务（`tasks`：实例 + 步骤，最多 100 个），每个任务各在自己的事务中执行。返回 `FlowBatchActionResult`——成功 / 跳过 / 失败计数及每个任务的结果。见[批量操作与办理步骤](./approval#批量操作与办理步骤) |
| `POST` | `/flow/instances/batch/return` | 以同一条意见（必填）把多个待办任务退回给各自的发起人；不允许退回的步骤会被跳过 |
| `POST` | `/flow/instances/batch/reject` | 以同一条意见（必填）拒绝多个待办任务 |
| `POST` | `/flow/instances/transfer` | 转交待审批任务 |
| `POST` | `/flow/instances/delegate` | 委托待审批任务 |
| `POST` | `/flow/instances/add-sign-before` | 插入前置签批人 |
| `POST` | `/flow/instances/add-sign-after` | 插入后续签批人 |
| `POST` | `/flow/instances/cc` | 发送抄送通知 |
| `POST` | `/flow/instances/cc/read` | 标记抄送为已读 |
| `POST` | `/flow/instances/return` | 把待审批退回给发起人，实例以 `Returned` 结束。只有该步骤的审批人可以退回，且该步骤须允许退回（`returnEnabled`），并附上说明需修改内容的意见 |
| `POST` | `/flow/instances/withdraw` | 撤回 Approval 实例：由其发起人撤回，且实例正在等待审批人、流程的 `withdrawPolicy` 允许（`WithdrawPolicyGuard`） |
| `GET` | `/flow/instances/{instanceId}/withdraw` | 调用方现在能否撤回该实例——恰在撤回会被接受时为 `true`，判断同样出自 `WithdrawPolicyGuard`。可查看该实例的人均可调用 |
| `POST` | `/flow/instances/urge` | 提醒审批所等待的审批人——仅限发起人。每个等待中的步骤在 `flow.approval.urge-interval-minutes`（默认 240）内最多被催办一次，无论由发起人还是管理员催办；每个被催办的步骤各记一条 `URGE` 历史，若所有步骤都仍在间隔内则拒绝催办。返回 `FlowUrgeStatus`，而非实例 |
| `GET` | `/flow/instances/{instanceId}/urge` | 现在能否催办该审批，若不能则何时可以（`FlowUrgeStatus`）。可查看该实例的人均可调用 |
| `POST` | `/flow/instances/comment` | 在实例运行期间添加评论审计条目——仅限其参与者：发起人以及它给过或正给着任务的人。已结束的实例不再接受评论。返回 `true`，而非实例 |
| `GET` | `/flow/instances/{instanceId}/nodes/{nodeId}/formPermissions` | 获取字段级表单权限 |
| `GET` | `/flow/instances/by-record?modelName=&rowId=` | 业务记录的审批历史：其审批实例按最新在前排列，含仍在等待的步骤、尚未处理的审批人以及审批动作，所有用户都显示姓名（仅在调用方获准后才解析姓名）；失败的实例说明在哪里、因何停止（`failure`）。参与过其审批或能读取该记录的人均可调用 |
| `GET` | `/flow/instances/preview?modelName=&rowId=` | 现在提交该记录会发生什么，而不真正提交：它会匹配到的 Submit 流程及其审批步骤，每个步骤列出将被询问的审批人或它自动通过的原因；拒绝、没有适用流程或有多个适用流程都会报告，只有审批运行时才能决定的路由报告为未决。对审批中的记录，则给出其剩余路径（`InProgress`）：当前等待的步骤，以及之后的步骤。不启动、不写入任何东西。能读取该记录的人均可调用（见[预览记录的审批](./approval#预览记录的审批)） |
| `GET` | `/flow/instances/{instanceId}/record` | 记录审批所针对的业务记录——其他实例一律拒绝，因为它们的记录是随意指定而非提交的——供其发起人以及它给了任务的人读取：越过他们自己的行权限。返回所有字段（包括动态字段），但不含调用方在任何行上都看不到的敏感字段；调用方所审批的等待步骤的字段权限叠加其上——它们列为 `Readonly` / `Editable` / `Required` 的字段会显示，无论是否敏感；标为 `Hidden` 的则不显示。发起人能看到除那些不可见敏感字段外的所有字段；其他没有等待步骤的人还会看不到任一审批步骤隐藏的字段。读取方式与模型读取 API 返回记录相同（关联与选项作为引用，脱敏字段被脱敏），每个一对多关联的行都完整返回——报销单会带上其明细行 |

谁可以查看实例：默认是其发起人以及它给了任务的人（待处理或已处理的审批人、抄送接收人、转交、委托和加签的目标）；其他人则通过标准的角色与数据范围配置——他们能以自己的权限读取 `FlowInstance` 行，或者对于记录的审批，能读取该记录本身。

默认规则不需要对流程模型授权，而任何业务角色都不持有流程模型。引擎自身的簿记——加载与保存实例、审批账本、任务与分支投影、委托与自动抄送规则——越过调用方的数据权限运行：谁可以操作由动作处理器判定，谁可以查看由访问守卫判定。当前用户自己的列表——收件箱计数、待办 / 已办 / 抄送任务与收件箱（`/flow/approvalTasks`）、其审批历史与已发抄送（`/flow/approvalRecords`）、其委托，以及 `POST /flow/instances/search`，连同对应的 `FlowClient` 方法——都带有 `@SkipPermissionCheck`：它们固定于调用方本人，行范围只会把它们清空。按实例的读取（`.../instance/{instanceId}`、实例详情端点）不豁免，因为访问守卫会按每个人自己的权限判断除发起人和任务持有人之外的所有人。

### 实例搜索

`POST /flow/instances/search`（调用方自己的审批）和 `POST /flow/monitor/instances/search`（跨发起人，见[监控](#监控)）接受同一个 `FlowInstanceSearchRequest` 并返回同样的行，最新在前，按 `pageNumber`（默认 1）和 `pageSize`（默认 50）分页。过滤条件以 AND 组合：

| 过滤条件 | 匹配 |
|---|---|
| `flowId`、`status`、`modelName`、`rowId` | 实例自身的列（`rowId` 需配合 `modelName`） |
| `createdFrom` / `createdTo` | 实例启动的时间——对记录的审批，即记录提交的时间 |
| `initiatorId` | 仅监控搜索采纳；调用方自己的搜索总是固定为其本人 |
| `subjectId`、`subjectDeptId` | 按记录所涉及的员工（当事人）或该员工的部门筛选记录的审批，以提交时为准 |
| `effectiveDateFrom` / `effectiveDateTo` | 按记录的生效日期筛选记录的审批 |
| `recordCode` | 按记录自身的编号筛选记录的审批（包含匹配） |
| `awaitingRevision` | 已退回给提交人、且之后没有被该记录的新提交取代的审批——仍在等待修改并重新提交的记录 |

每一行（`FlowInstanceSummaryView`）不含笨重的状态列和 trace——需要时请获取实例或其 overlay。它包含流程、标题、发起人、状态以及实例当前等待的步骤（`currentSteps`，每个步骤附带尚未处理的审批人），所有用户都显示姓名；对记录的审批，还包含其提交时记录下的内容（*审批业务记录*）：`subject`、`subjectDept`、`effectiveDate`、`recordCode` 以及 `awaitingRevision`。对调用方自己那些正在等待审批人的审批，`withdrawable` 和 `urge` 说明现在能否撤回或催办。`recordDeleted` 标记记录已不存在的审批——退回或撤回后被删除的草稿——而 `effectStatus` 说明对审批后延期生效的模型，已批准记录的变更进行到哪一步（`ModelApprovalHandler.effectStatuses`）。

### 自动化 API

基础路径：`/flow/automation`——触发与瞬态运行；这些端点都不读取或操作已有实例。

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/automation/trigger` | 触发事件并启动匹配流程。`Submit`、`Cron`、`Api`、`Subflow` 类型的事件会被拒绝：这些流程分别由提交记录、自己的调度、按 id 启动、父流程调用来启动 |
| `POST` | `/flow/automation/onchange` | 瞬态运行 `COMPUTE` 流程并返回变量 diff |
| `POST` | `/flow/automation/validate` | 针对候选行数据瞬态运行 `VALIDATION` 流程；按 `flowId` 返回各流程声明的输出 |

异步任务与定时器的恢复没有 REST 端点：`FlowAsyncTaskConsumer`、`FlowTimerConsumer` 以及维护 cron 的到期定时器扫描在进程内直接调用 `FlowRuntimeEngine`。

`actorId` / `initiatorId` / `tenantId` **从不**由客户端发送：每个操作请求从登录上下文服务端盖章（`@JsonProperty(READ_ONLY)`），所有查询端点从上下文解析当前 actor。进程内的 `FlowClient` 以同样方式解析 actor，并调用与这些端点相同的服务。

## 审批投影 API

### 审批任务

基础路径：`/flow/approvalTasks`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/approvalTasks/counts` | 当前 actor 的收件箱徽章计数（`{pendingApprovals, unreadCc}`——过滤定义与分页 `/pending` 及 `/cc?read=false` 查询相同） |
| `GET` | `/flow/approvalTasks/pending?flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的待办任务，最新在前（分页：返回 `Page`） |
| `GET` | `/flow/approvalTasks/completed?flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的已完成任务（分页） |
| `GET` | `/flow/approvalTasks/cc?read=&flowId=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的抄送任务（分页；`read=false` 未读，`read=true` 已确认，省略 `read` 则两者都返回） |
| `GET` | `/flow/approvalTasks/inbox?flowId=&instanceId=&nodeId=&includeCompletedApprovals=&pageNumber=&pageSize=` | 统一收件箱视图（待审批 + 抄送；可选已完成审批） |
| `GET` | `/flow/approvalTasks/instance/{instanceId}` | 一个运行时实例的所有任务（仅参与者 / 发起人） |

每个任务（`FlowApprovalTaskView`）都带有其实例的上下文——`instanceTitle`、`modelName` / `rowId`、`instanceStatus`、`initiator` 与 `submittedTime`，以及记录的审批为其记录记下的内容（`subject`、`subjectDept`、`effectiveDate`、`recordCode`），所有用户、员工和部门都显示名称——还带有其步骤配置对处理方式的说明，取自实例所运行的修订版：`handling`（办理步骤）、`returnAllowed`（步骤的 `returnEnabled`）以及 `batchable`（当前对其审批人开放——待处理、未被加签阻塞、实例在等待——且所在步骤不是办理步骤、也没有必填字段）。见[批量操作与办理步骤](./approval#批量操作与办理步骤)。

### 审批记录

基础路径：`/flow/approvalRecords`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/approvalRecords/instance/{instanceId}` | 按运行时实例的审批历史 |
| `GET` | `/flow/approvalRecords/history` | actor 范围的审批历史 |
| `GET` | `/flow/approvalRecords/cc/sent` | 发送方抄送历史 |

每个条目（`FlowApprovalRecord`、`FlowApprovalRecordView`）记录其 `action`（`ApprovalActionType`：`APPROVE`、`AUTO_APPROVE`、`REJECT`、`TRANSFER`、`DELEGATE`、`ADD_SIGN`、`CC`、`READ`、`RETURN`、`WITHDRAW`、`URGE`、`COMMENT`、`TERMINATE`）、其 `actorId`，以及代该 actor 执行的动作的 `operatorId`——转派该 actor 任务的管理员（一条从原审批人到新审批人的 `TRANSFER` 条目）；actor 亲自操作时为空。

### 抄送配置

基础路径：`/flow/ccConfigs`

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/ccConfigs` | 创建抄送规则 |
| `GET` | `/flow/ccConfigs?flowId=` | 按 `flowId` 列出抄送规则 |
| `POST` | `/flow/ccConfigs/{id}/deactivate` | 停用抄送规则 |

一条规则（`FlowCcConfig`）在其时机抄送其接收人：

- `OnSubmit`：流程启动时。
- `OnApprove` / `OnReject`：审批人批准或拒绝某个步骤之后。
- `OnComplete`：审批以批准完成时。

没有 `nodeId` 的规则是流程级的，在每个这样的时刻触发。指明步骤的规则只在该步骤的 `OnApprove` / `OnReject` 触发。`recipientType` 为 `INITIATOR` 时抄送发起人；其他类型把 `recipientConfig` 读作以逗号分隔的用户 id。可选的 `ccCondition` 基于实例变量求值。

自动抄送与手动抄送记录方式相同：审批历史中每个接收人一条 `CC` 条目。该条目没有 actor，因为不是由某个人发送的。它落在规则触发的节点上——被处理的步骤，或者 `OnSubmit` 时的开始节点（以及所有步骤都自动通过时 `OnComplete` 的开始节点）——位于该节点的当前周期。因此接收人：

- 在收件箱中有一条抄送任务，可标记为已读；
- 是实例的参与者：可以打开并评论它。

已在同一节点、同一周期被抄送过的接收人（无论是规则还是手动抄送）不会再次被抄送，因此由多位审批人批准的步骤只抄送一次。`sendNotification` 会额外通知该次被抄送的接收人。

### 委托

基础路径：`/flow/delegations`

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/delegations` | 创建委托规则 |
| `GET` | `/flow/delegations/my` | 调用方创建的委托（委托人从登录上下文解析） |
| `GET` | `/flow/delegations/to-me` | 分配给调用方的活动委托（受托人从登录上下文解析） |
| `POST` | `/flow/delegations/{id}/cancel` | 取消调用方自己的一条委托规则；他人的规则会被拒绝（403） |

### 监控

基础路径：`/flow/monitor`——管理员的监控台。没有内置角色：每个端点都像其他端点一样授权，监控台能读取或操作什么，取决于调用方自己在 `FlowInstance` 上的权限——其角色的授权与数据范围；仅仅参与过某个实例是不够的。部门数据范围（`DEPT_SUBTREE`、`MANAGED_DEPARTMENTS`）按 `FlowInstance.departmentId` 收窄——即提交时当事人所在的部门，这是一个普通的部门 id 列，permission-starter 的范围按落在范围内的部门 id 过滤它——因此被限定在其所管理部门的角色可以查看并管理这些部门的审批；自动化运行不属于任何部门。打开他人的实例（详情 / overlay / trace / 审批历史）遵循[实例 API](#实例-api) 下的查看规则，与任何非参与者的查看者相同。

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/monitor/health` | 流程运行时健康快照（按状态的实例计数、逾期定时器） |
| `POST` | `/flow/monitor/instances/search` | 跨发起人的分页实例摘要，以调用方自己的权限读取：其数据范围所能触及的 `FlowInstance` 行。请求中若有 `initiatorId` 过滤则予以采纳；其余同[实例搜索](#实例搜索) |
| `POST` | `/flow/monitor/instances/urge` | 以管理员而非发起人的身份催办审批：任何能以自己的权限读取该实例 `FlowInstance` 行的人。发起人的间隔同样适用——间隔内被任何人催办过的步骤不会再次被催办。返回 `FlowUrgeStatus` |
| `POST` | `/flow/monitor/instances/terminate` | 以同一条 `reason`（必填）结束所列出的每个运行中、等待中或失败的实例（`instanceIds`，最多 100 个）：其待审批关闭，实例以 `Cancelled` 结束——记录的审批会作废其记录——历史中记下一条附带理由的 `TERMINATE` 条目，并把理由发送给发起人。仅限调用方权限能读取的实例；每个实例各在自己的事务中处理。返回 `FlowBatchActionResult` |
| `POST` | `/flow/monitor/approvers/reassign/preview` | 一次转派（`fromActorId` → `toActorId`）会移动该审批人在调用方权限可读实例上的多少个待审批任务：`FlowReassignPreview`（`tasks`、`instances`） |
| `POST` | `/flow/monitor/approvers/reassign` | 以 `reason`（必填）把这些任务逐个移交给新审批人，每个各在自己的事务中处理：记为原审批人的 `TRANSFER`，调用方为 `operatorId`；新审批人获得该任务，发起人会被告知现在由谁处理。只移动实例当前等待的步骤——尚未到达的步骤在到达时才解析审批人；抄送任务保持不变。返回 `FlowBatchActionResult` |
| `POST` | `/flow/monitor/delegations` | 代某位审批人创建委托规则（请求体指明 `delegatorId` 与 `delegateId`）：此后到达其名下的任务转给受托人，该审批人也能在自己的委托中看到这条规则。它影响该审批人的全部任务，不受调用方数据范围限制，因此是一项单独的权限 |
| `GET` | `/flow/monitor/delegations` | 租户的所有委托规则，最新在前 |
| `POST` | `/flow/monitor/delegations/{id}/cancel` | 停用租户的任意一条委托规则 |

### 事件日志

基础路径：`/flow/events`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/events?flowId=&sourceModel=&sourceRowId=&instanceId=&success=&eventTimeFrom=&eventTimeTo=&pageNumber=&pageSize=` | 分页事件日志，最新在前（filters 以 AND 组合；列表行排除 parameters payload） |
| `GET` | `/flow/events/{id}` | 单条事件，含原始触发参数 payload |

## 持久化模型

| 实体 | 说明 |
|---|---|
| `FlowDesign` | 草稿工作副本 |
| `FlowBundle` | 已发布的编译 bundle |
| `FlowInstance` | 持久化运行时实例状态（trace 与审批历史**不**内嵌——见两张专用表），以及记录的审批在提交时记下的内容：`subjectId`、`departmentId`、`effectiveDate`、`recordCode`、`superseded`。Approval 实例长期保留；已结束的 Automation 运行连同其 trace、并行分支和触发事件日志，在 `flow.automation.retention-days`（默认 30）天后由 `flow_automation_purge` cron 清理 |
| `FlowExecutionTrace` | 仅追加的执行 trace 行（内存状态只保留当前尝试的增量） |
| `FlowApprovalTask` | 待办/已完成/抄送任务投影 |
| `FlowApprovalRecord` | 审批动作审计账本——权威审批历史，由实例存储与实例行在同一事务中刷写；`operatorId` 指明代该 actor 操作的管理员 |
| `FlowCcConfig` | 自动抄送规则 |
| `FlowDelegation` | 委托规则 |
| `FlowEvent` | 触发事件日志 |
| `FlowDebugHistory` | 调试快照 |
| `FlowParallelBranch` | 并行分支跟踪 |

本模块的主要存储适配器：

- `OrmFlowBundleRegistry`
- `OrmFlowInstanceStore`

`OrmFlowBundleRegistry` 启动时不加载任何内容，并按租户缓存：

- **触发匹配**读取租户活动 bundle 的索引，在该租户自己的上下文中于其第一个事件时加载（空结果也会保留），并与平台共享 bundle（`tenantId = 0`）合并；没有租户的上下文只匹配共享 bundle。条目存活 `flow.trigger-cache-ttl-seconds`（默认 `60`）。发布或激活修订版会立即在执行该操作的实例上丢弃该租户的条目；其他实例在 TTL 内获知变更。没有流程关注的模型的变更日志不会被转换为触发事件。
- **定义**按 `bundleId` 缓存在有界 LRU 中（已发布的修订版永不改变）。其他租户的 bundle 无论是否已缓存都读作不存在；平台共享 bundle 对每个租户可见。
- **流程的活动修订版**每次查找都从数据库读取，因此按 `flowId` 启动会跟随在任一实例上进行的发布或回滚。

## 节点描述符契约

编辑器面板由通过 `/flow/nodeDescriptors` 暴露的 `FlowNodeDescriptor` 记录构建。

- 结构描述符来自 `BuiltinNodeDescriptorProvider`
- 由执行器支持的任务描述符来自 `TaskExecutorDescriptorProvider`
- 描述符包含标签、图标、排序、config schema、默认 config 以及允许的场景

`TaskExecutorDescriptorProvider` 仅暴露实际注册为 Spring bean 的执行器对应的任务节点，因此像 `QUERY_AI` 和 `ASYNC_TASK` 这类条件执行器仅在其依赖存在时出现。

## 前端图兼容性

设计图 DTO 仍与 xyflow/react 风格结构对齐：

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

# Flow Starter

## Flow 概念
Flow 是业务流程的更广义概念。

关系：
Flow > BP = Workflow > BPMN

表达式引擎主要用于解决数据计算问题，实现类似 QLExpress 的计算引擎。BPMN 场景更适合工作流或规则引擎（如 Flowable）。例如 Flowable 集成 JUEL 以支持简单表达式解析。DMN 规则引擎更适合真/假决策场景，例如 BP 中的 sequenceFlow 路由条件。Drools 更侧重于规则配置与管理。

示例场景：
- 导入：更适合 BPMN。每个动作是数据更新节点；动作有顺序但可异步处理。
- 审批：BPMN + DMN。BPMN 处理审批流程与路径。DMN 处理复杂审批路由。DQL 解决复杂审批人查询。

`flow-starter` 是 Softa 的元数据驱动流程引擎 starter。涵盖：

- 供可视化编辑器使用的设计时图文档
- 编译时校验并转换为运行时 bundle
- 按 `flowId` 发布的 bundle 修订版
- 审批、自动化、校验和计算流程的运行时执行
- 实例、审批任务、审批记录、委托、抄送规则和触发事件的持久化投影
- 可选的基于 Pulsar 的触发与异步任务集成

本页记录 `flow-starter` 当前实现的后端契约。

## 当前模型

### 设计、发布、运行时

| 层级 | 主要类型 | 说明 |
|---|---|---|
| 设计时 | `DesignFlowDefinition`、`FlowGraphDocument`、`FlowGraphNode`、`FlowGraphEdge` | 面向编辑器的图 DTO |
| 发布时 | `FlowCompiler`、`CompiledFlowDefinition`、`FlowPublishService` | 编译、校验、发布修订版、回滚 |
| 运行时 | `FlowRuntimeEngine`、`FlowExecutionState` | 执行已发布 bundle、挂起/恢复、持久化投影 |

### Flow 身份与修订版

- `FlowDesign` 是草稿工作副本。它的 `id`（分布式字符串 id）就是流程在各处的身份：bundle、实例、待办、审批记录、事件、委托和抄送规则都以 `flowId` 引用它，列表通过这个引用显示流程名称。
- `flowName` 在租户内唯一；没有单独的 flow code。
- `FlowBundle` 是编译后的已发布快照；已发布修订版以 `flowId` 为键。
- `FlowStartRequest` 按以下顺序解析 bundle：
  1. `bundleId` — 固定到确切的已发布修订版
  2. `flowId` — 启动当前活动修订版
- 要启动特定历史修订版，通过修订版列表端点查找其 `bundleId` 并作为 `bundleId` 传入。
- `FlowBundle.designJson` 保留发布时使用的设计快照，以便编辑器恢复历史画布。

### Flow 场景

单一的 `FlowScenario` 枚举声明流程是什么。它在创建流程时选定，此后不可更改（`FlowDesign.scenario` 在更新时只读；设计文档跟随该列）。

| 场景 | 含义 | 可声明的触发器 |
|---|---|---|
| `APPROVAL` | 记录的审批：由提交记录启动，包含审批步骤，结果回写到记录。持久化实例，作为记录的审批历史保留 | `Submit` |
| `AUTOMATION` | 由变更、cron、显式启动或父流程启动；不含审批步骤。持久化运行，保留期过后清理 | `EntityChange`、`Cron`、`Api`、`Subflow` |
| `VALIDATION` | 无状态同步校验流程——瞬态求值：无实例行、无 trace、无事件日志 | `EntityChange`、`Cron` |
| `COMPUTE` | 无状态同步计算/onchange 流程——瞬态求值，同样零足迹规则 | `FieldChange`、`EntityChange`、`Cron` |

场景决定执行策略：`APPROVAL` / `AUTOMATION` 流程经 `FlowRuntimeEngine.start`（持久化、可恢复）；`VALIDATION` / `COMPUTE` 流程经 `evaluate`——相同遍历但零 flow 足迹。任务节点产生的业务写入仍加入调用方事务，因此求值失败会回滚。

每个流程都声明触发器，**触发器就是流程的启动契约**——每种只对应一条启动路径：

| 触发器 | 流程如何启动 |
|---|---|
| `Submit` | 只能由提交记录启动（`FlowClient.submitRecord`）——见[审批业务记录](#审批业务记录) |
| `EntityChange` / `FieldChange` | 只能由各自的事件启动 |
| `Cron` | 只能按自己的调度启动——见[Cron 触发的流程](#cron-触发的流程) |
| `Api` | 只能按 id 显式启动：`POST /flow/instances/start`、`FlowClient.start` / `publishAndStart` |
| `Subflow` | 只能被父流程的 Subflow 节点调用 |

显式启动和 Subflow 调用运行的都是 Automation 流程，因此 `Api` 和 `Subflow` 只属于 Automation。草稿的调试运行忽略触发器。

设置项也各属一个场景：`withdrawPolicy`、`approverDedup`、`selfApproval` 和 `emailNotification` 属于 Approval 流程；`sync` / `rollbackOnFail` 属于 Automation 流程，而 sync 流程在写数据的事务里运行，不能包含 Timer、AsyncTask 或 Approval 节点。违反任一规则的流程会被编译器拒绝。

| 审批设置 | 取值 | 默认值 |
|---|---|---|
| `withdrawPolicy` | 发起人可以撤回到何时：`Never`、`BeforeFirstAction`（直到审批人第一次批准、拒绝、退回、转交、委托或加签——自动通过不算）、`UntilCompleted` | `Never` |
| `approverDedup` | `Global`、`Contiguous`、`None`——见[审批人解析](#审批人解析) | `Global` |
| `selfApproval` | `AutoApprove`、`RequireApproval`——见[审批业务记录](#审批业务记录) | `AutoApprove` |
| `emailNotification` | 是否同时以邮件发送通知；收件箱总会收到——见[通知](#通知) | 开启 |

### 节点类型

当前 `FlowNodeType` 值：

- 控制：`Start`、`End`、`Timer`
- 路由：`InclusiveGateway`、`ParallelFork`、`ParallelJoin`
- 人工：`Approval`、`HumanTask`*
- 任务：`Script`、`CreateRecord`、`GetRecord`、`UpdateRecord`、`DeleteRecord`、`QueryRecords`、`ValidateData`、`Transform`、`CallService`、`CallWebhook`、`SendEmail`、`SendSms`、`SendInboxNotification`、`QueryAI`、`AsyncTask`、`GenerateFile`
- 子流程：`Subflow`
- 数据：`ForEach`*、`ReturnValue`

\* `HumanTask` 和 `ForEach` 已定义但**尚未运行时支持**：它们从节点面板中省略，并在编译时被拒绝（`UNSUPPORTED_NODE_TYPE`），因此包含它们的流程无法发布。

每个 `FlowNodeType` 声明允许使用它的场景（`FlowNodeType.getScenarios()`）；节点面板和编译器（`INVALID_SCENARIO_NODE`）都以此为准：

| 节点类型 | 场景 |
|---|---|
| `Start`、`End`、`Script`、`ReturnValue`、`CreateRecord`、`GetRecord`、`UpdateRecord`、`DeleteRecord`、`QueryRecords`、`CallService`、`CallWebhook` | 四个场景 |
| `Timer`、各网关、`Subflow`、`ValidateData`、`Transform`、`SendEmail`、`SendSms`、`SendInboxNotification`、`QueryAI`、`AsyncTask`、`GenerateFile`、`ForEach` | Approval、Automation |
| `Approval`、`HumanTask` | Approval |

节点行为不变量：

- **`Subflow` 仅支持同步**：若子流程进入等待状态（`TIMER` / `ASYNC`），编排器会使父流程失败；递归子流程调用会被拒绝。子流程必须是带 `Subflow` 触发器的 Automation 流程，否则父流程失败。人工步骤应建模在 Approval 流程中，而非子流程。
- **`ParallelFork` 分支串行执行**（确定性顺序），而非墙钟并行——该网关建模路由拓扑，而非并发。

### 运行时状态

已定义的 `FlowExecutionStatus` 值：

- `Pending`
- `Running`
- `Waiting` — 停在一个或多个等待上（待审批和/或定时器 / 异步回调）。具体原因位于实例的待审批列表和等待令牌列表中，因此单一状态可同时覆盖因不同原因挂起的并行分支。
- `Rejected`
- `Returned` — 退回给发起人；像拒绝一样结束实例，但其记录重新成为草稿。发起人修改后再次提交，从头启动一个新实例
- `Withdrawn` — 由发起人撤回；结束实例，其记录重新成为草稿
- `Cancelled` — 由管理员结束（*终止*，见[监控](#监控)）；记录的审批会连同其记录一起作废
- `Completed`
- `Failed` — 某个步骤无法运行。除非管理员将其终止（→ `Cancelled`），否则保持失败；记录审批的提交人也可以改为把记录取回（见[审批业务记录](#审批业务记录)）

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
| `POST` | `/flow/instances/batch/approve` | 批准调用方的多个待办任务（`tasks`：实例 + 步骤，最多 100 个），每个任务各在自己的事务中执行。返回 `FlowBatchActionResult`——成功 / 跳过 / 失败计数及每个任务的结果。见[批量操作与办理步骤](#批量操作与办理步骤) |
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
| `GET` | `/flow/instances/preview?modelName=&rowId=` | 现在提交该记录会发生什么，而不真正提交：它会匹配到的 Submit 流程及其审批步骤，每个步骤列出将被询问的审批人或它自动通过的原因；拒绝、没有适用流程或有多个适用流程都会报告，只有审批运行时才能决定的路由报告为未决。对审批中的记录，则给出其剩余路径（`InProgress`）：当前等待的步骤，以及之后的步骤。不启动、不写入任何东西。能读取该记录的人均可调用（见[预览记录的审批](#预览记录的审批)） |
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

每个任务（`FlowApprovalTaskView`）都带有其实例的上下文——`instanceTitle`、`modelName` / `rowId`、`instanceStatus`、`initiator` 与 `submittedTime`，以及记录的审批为其记录记下的内容（`subject`、`subjectDept`、`effectiveDate`、`recordCode`），所有用户、员工和部门都显示名称——还带有其步骤配置对处理方式的说明，取自实例所运行的修订版：`handling`（办理步骤）、`returnAllowed`（步骤的 `returnEnabled`）以及 `batchable`（当前对其审批人开放——待处理、未被加签阻塞、实例在等待——且所在步骤不是办理步骤、也没有必填字段）。见[批量操作与办理步骤](#批量操作与办理步骤)。

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

## 审批模型

### 审批与拒绝阈值

- 审批模式：`ANY_ONE`、`UNANIMOUS`、`MIN_COUNT`、`PERCENTAGE`
- 拒绝模式：`ANY_ONE`、`UNANIMOUS`、`MIN_COUNT`、`PERCENTAGE`
- 同一 actor 在每个周期只能投一次有效票。
- 编译时校验器会拒绝不可能的阈值组合。

### 审批人解析

审批节点支持：

- 通过 `config.approvers` 配置静态审批人
- 通过 `config.approverSource` 配置动态审批人
- 通过 `config.emptyApproverStrategy` 配置空审批人策略

支持的动态源类型：

- 来自启动变量：`VariableList`、`Expression`、`InitiatorManager`（`initiatorManagerId`）、`Role`（`roleApprovers`）
- 来自组织：`Supervisor`（第 N 级上级）、`DeptLeader` 和 `DeptHrbp`（某个部门的）、`RoleQuery`（由 `roleIds`、`roleCodes` 或两者共同指定的角色的持有人——可选地收窄到某个部门）、`Position`、`Department`（其成员）

组织关系相对于记录的**当事人**——记录所涉及的员工（*审批业务记录*）——读取，因此代他人提交的申请会交给当事人的审批人，而不是提交人的。`Supervisor` 接受 `relativeTo`：`SUBJECT`（默认）或 `INITIATOR`。基于部门的源接受一个 `deptScope`：

| `deptScope` | 部门 | 默认用于 |
|---|---|---|
| `SUBJECT_DEPT` | 当事人的部门 | `DeptLeader`、`DeptHrbp` |
| `INITIATOR_DEPT` | 提交人的部门 | |
| `SPECIFIC_DEPT` | `deptId` 指定的部门（`Department` 用 `deptIds`） | `Department` |
| `VARIABLE_DEPT` | `deptVariable` 所指变量中的部门 id——例如调动的调入部门 | |
| `ALL` | 不限部门：所有持有人（仅 `RoleQuery`） | `RoleQuery` |

无法确定的部门——没有当事人部门、变量为空——解析为无人，而不会变成所有持有人；该步骤随后按其空审批人策略处理。没有记录的实例（调试运行）没有当事人，从其发起人开始解析。编译器会拒绝某个源不接受的范围，以及缺少必需信息的范围（`INVALID_DEPT_SCOPE`、`MISSING_DEPT_IDS`、`MISSING_DEPT_VARIABLE`、`INVALID_RELATIVE_TO`）。

审批人是**登录账号 id**。组织通过 `OrganizationService` SPI 读取，其默认实现 `FlowOrgService` 遵循 permission-starter 已在使用的 HR 约定，因此基于这些模型的应用无需任何配置：

| 用途 | Model.field |
|---|---|
| 账号 → 员工（发起人的） | `Employee.userId` |
| 姓名、部门、岗位 | `Employee.fullName`、`departmentId`、`jobPositionId` |
| 上级（员工 id） | `Employee.piEmployeeId` |
| 部门负责人、HRBP（员工 id）、上级部门、名称 | `Department.picEmpId`、`hrbpEmpId`、`parentId`、`name` |
| 角色持有人、角色编码 | `UserRoleRel.userId` / `roleId`、`Role.code` |

没有账号的员工视为无人，因此只解析到这类员工的步骤为空，按其空审批人策略处理；角色持有人本身就是账号，即使没有员工档案也能审批。没有负责人（或 HRBP）的部门沿用其上级部门的。查询跳过行范围——由谁审批不能取决于发起人能看到什么。所有模型名和字段名都可以在 `softa.flow.org.*`（`OrganizationServiceProperties`）下覆盖；使用其他组织体系的应用提供自己的 `OrganizationService` bean。

与角色 id 不同，角色编码在每个租户中都相同，因此下发到多个租户的流程用编码（`roleCodes`）指定内置角色；设计器同时提供两种列表，因为管理员自建的角色没有编码，需要按 id 选择。

审批人去重（`approverDedup`）：默认策略为 **`Global`**——已在先前节点审批过的用户在后续节点自动通过（记为 `AUTO_APPROVE`）。残余风险：流程中途的表单编辑仍会被该先前审批自动背书；在需要重新审阅的流程上，将策略设为 `Contiguous` 或 `None`。

### 审批人的写入

一旦 actor 被确认为该节点的审批人，审批的表单编辑以及它所恢复执行的每个节点都会搁置该 actor 自己的行范围来运行。审批本身就是授权：审批人很少对其所审批的记录持有更新权限，而在按动作授予行范围的情况下（permission-starter），这会连审批本身都被拒绝。在引擎之外执行审批的宿主端点也同样处理，并先做一次入口检查，确认审批人能看到该申请（`@RequirePermission`）。因此，记录的写入规则（`ModelWriteValidator`）会把这些写入视为系统写入：在记录处于审批中时冻结记录的审批锁（`ApprovalLockValidator`，见*审批业务记录*）仍会放行节点标为可编辑的字段。

搁置指的是**所有**权限检查，而不仅是行范围——包括敏感字段的写入检查。节点的表单配置（其字段权限 `formPermissions`）是审批人所编辑字段的唯一授权。只有标为 `EDITABLE` 或 `REQUIRED` 的字段会被回写；批准请求 `formData` 中的其他键——`HIDDEN` 或 `READONLY` 字段，或节点未列出的字段——都会被丢弃，没有 `formPermissions` 的节点什么也不写。`REQUIRED` 字段在编辑落地后必须有值——要么是提交的值，要么是记录已存的值——因此当记录缺少该值时，什么都不提交的批准仍会被拒绝。写入之后，记录的审批会根据编辑后的记录重新计算其处理器的 `submission`，其变量替换流程启动时的变量：后续路由能看到审批人所做的修改。因此，即使审批人的角色没有覆盖某个字段的敏感字段集，只要节点表单把它设为可编辑，审批人仍能写入它。流程设计者不得在审批表单上把敏感字段（薪资、银行信息、证件号码……）设为可编辑，除非该节点可能解析到的每位审批人都应当能编辑它；应设为只读，或不放在表单上。

### 额外审批动作

- transfer
- delegate
- add-sign-before
- add-sign-after
- cc
- read-cc
- return（退回给发起人；结束实例）
- withdraw
- urge
- comment
- 批量 approve / return / reject（审批人一次处理自己的多个任务）
- terminate 与 reassign（管理员在[监控](#监控)中操作）

### 批量操作与办理步骤

审批步骤要么是被评判的——批准、拒绝、退回——要么是被**办理**的：`config.handling = true` 声明一个办理步骤，其审批人填写该步骤要求的内容（其 `EDITABLE` / `REQUIRED` 字段）后提交，使流程继续。它仍然是一次审批——账本记为 `APPROVE`——但客户端把这个动作称为“提交”。`handling` 需要显式声明，从不根据 `formPermissions` 推断。`config.returnEnabled` 决定该步骤是否允许退回给发起人。

`POST /flow/instances/batch/{approve,return,reject}`（`BatchApprovalExecutor`）以同一条意见对调用方最多 100 个待办任务执行同一种审批人动作——退回或拒绝时意见必填。每个任务都是一次独立的引擎调用，因此各在自己的事务中：一个被拒绝的任务不影响其他任务，且每条引擎规则都与单个操作时一样生效。批量操作不填写任何内容，因此在调用引擎之前会跳过所在步骤是办理步骤或有 `REQUIRED` 字段的任务，退回时还会跳过没有 `returnEnabled` 的步骤——与设置任务 `batchable` 标志的规则相同。结果（`FlowBatchActionResult`）给出成功 / 跳过 / 失败计数，以及按请求顺序排列的每个任务的结果与原因。

### 超时处理

审批超时策略：

- `REMIND`
- `AUTO_APPROVE`
- `AUTO_REJECT`
- `ESCALATE`

`ApprovalTimeoutScheduler` 针对已持久化的待审批处理提醒、自动动作与升级。

它由一条 cron 行驱动。starter 的维护 cron（审批超时提醒与处理、委托到期、定时器扫描、卡住实例扫描、调试 bundle 清理、自动化运行清理）以关闭状态随 `data-system/SysCron.FlowMaintenance.json` 发布。应用需要在其 `seed-manifest.yml` 的 `platform` 下列出该文件，否则这些行根本不存在；然后开启所需的那些。

## 任务执行模型

由执行器支持的任务节点使用 `TaskNodeConfig`。节点的 **`FlowNodeType`** 选择执行器——config 中没有单独的 `executor` 字段。

```json
{
  "input": {
    "to": ["{{ applicantEmail }}"],
    "subject": "Order {{ orderId }} confirmed",
    "htmlBody": "<h1>Thank you for your order!</h1>"
  },
  "outputVariable": "taskResult"
}
```

- `input` 支持 `{{ expr }}` 插值；解析由执行器负责（数据执行器按类型感知，自由形态 payload 递归插值）
- `options` 为执行器特定配置
- `outputVariable` 若存在，将原始执行器结果存入该变量名

每种任务节点类型在 `TaskConfigTypes` 中注册有**类型化 input config DTO**：编译器在发布时将 `config.input` 解析为该 DTO，并拒绝缺失的必填键（`MISSING_REQUIRED_INPUT`），因此配置错误的节点在发布时失败，而非执行中途。`DefaultTaskExecutorRegistry` 在启动时断言每个已注册执行器的节点类型都有对应条目。

### 内置任务执行器

| 节点类型 | 执行器 bean | 说明 |
|---|---|---|
| `CREATE_RECORD` | `CreateDataTaskExecutor` | 内置 |
| `GET_RECORD` | `GetDataTaskExecutor` | 内置 |
| `UPDATE_RECORD` | `UpdateDataTaskExecutor` | 内置 |
| `DELETE_RECORD` | `DeleteDataTaskExecutor` | 内置 |
| `QUERY_RECORDS` | `QueryRecordsTaskExecutor` | 内置；可通过 `flow.task.builtin.query-records.enabled=false` 退出以注册自定义执行器 |
| `VALIDATE_DATA` | `ValidateDataTaskExecutor` | 内置 |
| `TRANSFORM` | `ExtractTransformTaskExecutor` | 内置 |
| `CALL_WEBHOOK` | `WebHookTaskExecutor` | 内置 |
| `CALL_SERVICE` | `CallServiceTaskExecutor` | **默认禁用**。通过 `flow.task.builtin.call-service.enabled=true` 启用；随后必须提供非空的 `flow.task.call-service.allow-list`（允许的 bean 名前缀） |
| `SEND_EMAIL` | `SendEmailTaskExecutor` | 仅在 `MessageService` 可用时注册 |
| `SEND_SMS` | `SendSmsTaskExecutor` | 仅在 `MessageService` 可用时注册 |
| `SEND_INBOX_NOTIFICATION` | `SendInboxNotificationTaskExecutor` | 仅在 `MessageService` 可用时注册 |
| `QUERY_AI` | `QueryAiTaskExecutor` | 仅在 `AiRobotService` 可用时注册 |
| `ASYNC_TASK` | `AsyncTaskExecutor` | 仅在 `FlowAsyncTaskProducer` 可用时注册 |
| `GENERATE_FILE` | `GenerateFileTaskExecutor` | 仅在 `DocumentTemplateService`（file-starter）可用时注册 |

当前模块说明：

- `CALL_SERVICE` 附带内置执行器但**默认禁用**：它按名称调用任意 Spring bean 方法，因此必须显式启用并给出非空的 bean 名允许列表。

## 审批业务记录

业务记录——请假申请、报销单——由触发器为 `SubmitTrigger(modelName, conditionExpression)` 的 Approval 流程审批。其模型继承 `ApprovalModel`（`entity` 包，替代 `AuditableModel`），其控制器继承 `ApprovalModelController`（替代 `EntityController`），宿主为每个模型实现一个 `ModelApprovalHandler<T>`（`runtime/spi`，一个 Spring bean）。`ApprovalModelController` 为每个这样的模型提供同样的三个端点，与其他端点一样按模型授权：`POST /{Model}/submit?id=`、`POST /{Model}/withdraw?id=`（请求体 `{comment}`，可选）和 `POST /{Model}/cancel?id=`，均经由 `FlowClient`。提交会产生什么，对所有模型都由 `GET /flow/instances/preview` 回答。

每条记录都有一个**当事人**：记录所涉及的员工，基于组织关系的审批人源从他开始解析（*审批人解析*）。它是模型的 `employeeId`，除非处理器的 `subject()` 指定了另一个字段（`Transfer::getTransfereeId`）；无论哪种，都必须是指向员工模型（`softa.flow.org.employee-model`）的多对一字段，启动时会检查。当事人为空的记录不能提交。提交会把它作为启动变量 `_subjectId` 带给流程。

框架维护审批状态，对每个模型都一样；处理器负责只有业务才知道的部分：

| 框架 | 处理器 |
|---|---|
| 审批字段——`approvalStatus`（`ApprovalStatus`）、`submitterId`、`submittedTime`——以及对它们的每一次写入 | `validate(record)`：提交必须通过的检查——谁可以提交该记录、记录必须包含什么 |
| 下文唯一的状态机：只有草稿可以提交或作废；一条记录同一时间只有一个审批 | `validateCancel(record)`：除能看到草稿外，还有谁可以作废它，例如只有报销人本人 |
| 冻结所有非草稿记录（`ApprovalLockValidator`） | `submission(record)`：一个 `ApprovalSubmission(title, variables, effectiveDate, code)`——仅根据记录算出的实例标题和路由变量，以及模型有这些信息时，记录的生效日期和记录自身的编号，供审批列表显示与筛选 |
| 每个结果只回写一次 | `afterSubmitted(record)`：提交所引发的动作，例如预占假期余额 |
| 提交时记在实例上的内容：当事人、部门、生效日期、编号 | `afterOutcome(record, outcome)`：结果的后续动作，例如扣减余额——或在拒绝、作废后释放余额 |
| | `effectStatuses(rowIds)`：对审批后延期生效的模型，每条已批准记录的变更进行到哪一步（`RecordEffectStatus`：`Scheduled`、`Applied`、`Failed`），从记录本身读取，从不根据日期推测。默认为空，适用于审批后立即生效的模型 |

每个审批模型都遵循同一个状态机：

| `approvalStatus` | 可以发生什么 | 去向 |
|---|---|---|
| `Draft` | 编辑；提交；由申请人作废 | 提交 → `Pending`；作废 → `Cancelled` |
| `Pending` | 冻结。审批人批准、拒绝或退回；其提交人在流程的 `withdrawPolicy` 范围内撤回；管理员终止 | 批准 → 下一步骤或 `Approved`；拒绝 → `Rejected`；退回或撤回 → 重新成为 **`Draft`**；终止 → `Cancelled` |
| `Approved`、`Rejected`、`Cancelled` | 最终且冻结：不再编辑、提交或作废 | — |

退回或撤回不是记录会停留的状态：记录重新成为草稿，修改后作为新的审批提交，其审批历史保留发生过的一切。管理员终止其审批（`POST /flow/monitor/instances/terminate`）会使记录变为 `Cancelled`。记录审批之后的情况——已付款、已生效、已作废——不是审批状态，应放在模型自己的状态字段中；对延期生效的变更，处理器的 `effectStatuses` 告诉监控台其进展。若处理器的模型在元数据中缺少这三个字段，启动会失败。

流程的 `withdrawPolicy` 决定提交人可以撤回到何时：`Never`（默认）、`BeforeFirstAction`——直到审批人在任一步骤第一次批准、拒绝、退回、转交、委托或加签；自动通过不算——或 `UntilCompleted`。无论哪种策略，只有发起人可以撤回，且只能在审批等待审批人期间撤回。`WithdrawPolicyGuard` 是唯一的规则：撤回动作据此执行，预览、`GET /flow/instances/{instanceId}/withdraw` 和实例搜索的 `withdrawable` 据此报告，因此“撤回”按钮恰好在撤回会被接受时出现。

| `FlowClient` | 会发生什么 |
|---|---|
| `submitRecord(modelName, rowId)` | 提交人必须能以自己的权限读取该记录；只有没有进行中审批的草稿才会被提交。随后 `handler.validate` 以提交人身份检查整条记录，`handler.submission` 返回实例标题和路由变量。流程从租户的活动流程中选出：其提交触发器指明该模型、且条件对该记录成立——必须恰好匹配一个，否则提交被拒绝并说明原因。记录变为 `Pending`，记下提交人与时间，运行 `handler.afterSubmitted`，然后启动记录的审批。全部在调用方事务中完成。每次提交都从头启动一个新的审批——退回之后也是如此，并按记录当前的样子重新选择流程——同时把该记录之前的审批标记为 `superseded` |
| `withdrawRecord(modelName, rowId, comment)` | 撤回正在等待的审批（引擎检查 actor 是发起人，且流程的 `withdrawPolicy` 允许）；记录重新成为草稿。若记录的审批**失败**，其提交人也以同样方式取回记录——处理器得知它被撤回；失败的实例保留供流程监控。记录没有进行中的审批时拒绝 |
| `cancelRecord(modelName, rowId)` | 永久作废草稿：申请人必须能以自己的权限读取该记录，记录必须是草稿，且 `handler.validateCancel` 必须通过。记录变为 `Cancelled`，`handler.afterOutcome` 收到一个没有实例的 `Cancelled` 结果。在调用方事务中完成 |
| `recordApprovals(modelName, rowId)` | 审批历史，同 `GET /flow/instances/by-record` |
| `previewRecord(modelName, rowId)` | 提交将启动的审批，同 `GET /flow/instances/preview`——见下文。应在事务之外调用 |

只有提交所启动的实例才是记录的**审批**（`FlowExecutionState.recordApproval`）：同一流程在同一记录上的调试运行不是，也从不回写（以 API 启动 Approval 流程会被拒绝——其触发器是 `Submit`）。一条记录最多只有一个进行中的审批——审批未结束期间，`FlowInstance.openRecordId` 保存记录的 id，并与模型组成唯一索引，因此即使两个提交同时到达，第二个也会被拒绝。

提交还会在其实例上记下审批列表显示与筛选所用的内容，以提交时为准（见[实例搜索](#实例搜索)）：`subjectId`——记录所涉及的员工——以及 `departmentId`，即该员工的部门（`OrganizationService.getDeptIdOfEmployee`，越过提交人的权限读取），部门数据范围据此收窄（见[监控](#监控)）；`effectiveDate` 和 `recordCode` 来自处理器的 `ApprovalSubmission`。每次提交都会把该记录之前的审批标记为 `superseded`，因此一个 `Returned` 且未被取代的审批，就是其记录仍在等待修改并重新提交的审批（`awaitingRevision`）。

结果通过一个监听器 `ApprovalOutcomeListener` 和一个写入器 `ApprovalStatusWriter` 到达记录：当记录的审批完成、被拒绝、退回、撤回或作废（由管理员终止）时，写入器把 `approvalStatus` 设为结果——退回或撤回后为 `Draft`——并调用 `handler.afterOutcome(record, outcome)`，传入类型、做出决定的用户及其意见（自动通过时没有；终止时为管理员及其理由）——在该动作的事务中、跳过权限检查执行，因此抛出异常的处理器会否决该动作。结果只会落到仍为 `Pending` 的记录上：已结束的实例再次保存（因评论或抄送已读）不会改变任何东西，`afterOutcome` 对每个结果只运行一次。只在其中做属于该结果、写入本数据库的操作；任何离开本数据库的事——付款、外部系统——放到提交之后。失败的实例不写入任何东西，其记录保持 `Pending`，有两种出路：其提交人通过撤回取回记录（重新成为草稿），或由管理员终止该审批（记录变为 `Cancelled`）。记录在实例启动之前就变为 `Pending`，因为没有审批步骤的流程会在启动时就完成。审批人解析为无人的步骤会在运行时按其空审批人策略失败（默认 `Error`）；记录的审批预览会在任何人提交之前指出失败位置。

在提交流程上，记录本人默认代为通过：当某个步骤的审批人中包含提交人，或记录所涉员工对应的用户时，他们被视为已批准——在审批历史中记为 `AUTO_APPROVE`（"Auto-approved (submitter)" / "Auto-approved (subject)"）——其余由该步骤的审批模式决定：任一人通过的步骤直接通过，需全员通过的步骤仍等待其他人。由流程设置 `selfApproval` 决定：`AutoApprove`（默认）或 `RequireApproval`，后者像对待其他审批人一样询问他们。策略为 `AutoApprove` 的空步骤也以同样方式记录，但没有 actor（"Auto-approved (no approver)"）。

### 审批锁

`ApprovalLockValidator`（一个 `ModelWriteValidator`，order 10）作用于写入根，所有写入通道都在此汇合——记录的表单、通用端点、导入、流程的写入节点：

- 非草稿记录——`Pending`、`Approved`、`Rejected`、`Cancelled`——既不能修改也不能删除，它所拥有的东西也不能：即那些通过直接指向它、且级联删除（`onDelete = CASCADE`）的多对一字段归属于它的模型记录，例如报销单的明细行——也不能在它下面新增此类记录；
- 审批字段属于框架：新记录是没有提交人的 `Draft`，任何写入都不能改变它们。回传已存储的值不算修改。

关闭权限检查的写入不受限制：写入器自己的写入、审批步骤允许其审批人编辑的字段（*审批人的写入*）、处理器的后续动作。审批锁只规定何时任何人都不能修改记录；在其他状态下谁可以修改它——其所有者、在哪些状态下——仍由模型自己的校验器决定。审批字段在元数据中不是 `readonly`，否则框架自己的写入也会被丢弃；表单把它们显示为只读。

### 预览记录的审批

`GET /flow/instances/preview?modelName=&rowId=`（`FlowClient.previewRecord`）回答现在提交该记录会发生什么，而不真正提交——供记录页面在任何人按下“提交”之前展示审批路径。它执行提交本身的检查与流程选择：记录的审批状态及其审批、以请求者自己的权限执行 `handler.validate` 和 `handler.submission`、提交触发器。拒绝、没有适用流程或有多个适用流程都在 `status`（`Refused`、`NoFlow`、`SeveralFlows`，适用的流程列在 `candidates` 中）和 `message`——提交会被拒绝时的那条消息——中报告，而不是抛出。`afterSubmitted` 从不被调用。

对审批正在进行中的记录，预览是该审批的剩余部分（`InProgress`）：当前等待的步骤及其现状（`current`，附带仍被询问的审批人），然后是之后的步骤，按下文方式基于实例自身的变量和审批、在实例的副本上推演——从不触碰实例本身。`withdrawable` 说明请求者现在能否撤回该记录：其提交人，在审批等待审批人且流程的 `withdrawPolicy` 允许时（`WithdrawPolicyGuard`），或在其审批失败之后——因此“撤回”按钮不需要自己的规则。

当恰有一个流程适用时（`Ready`），`ApprovalPathPreviewer` 按引擎的运行方式从开始节点推演，假定每个审批步骤都被批准：路由由 `FlowGatewayRouter` 基于提交将带入的变量决定，审批人由 `PendingApprovalFactory`（含自动委托）决定，自动通过由 `ApproverDedupService` 决定，所用状态从不保存。`steps` 按审批到达的顺序列出审批步骤，每个步骤带有一个 `outcome`：

| Outcome | 该步骤 |
|---|---|
| `Waiting` | 等待 `approvers`，其中需要 `requiredApprovals` 人批准 |
| `AutoApproved` | 自动通过：`autoApprovals` 把提交人（`Submitter`）、记录所涉员工（`Subject`）——依流程的 `selfApproval`——或在先前步骤批准过的人——依流程的审批人去重（`EarlierApproval`）——视为已批准 |
| `NoApproverApproved`、`NoApproverSkipped` | 解析为无人；其空审批人策略将其记为通过或跳过 |
| `NoApproverFails` | 在 `Error` 策略下解析为无人：审批会停在这里，如 `failure` 所述 |
| `Undetermined` | 由谁审批，或是否自动通过，取决于只有审批运行时才知道的数据 |

不做任何猜测。预览不运行任何节点：推演一旦经过脚本、任务或子流程，该节点写入的变量就是未知的——对没有输出变量的任务和异步任务而言是其写入的全部变量——而实例 id 从一开始就是未知的。条件读取了未知变量的路由列在 `undecided` 中，且不被沿用；在这种节点之后到达、审批人来自动态源的步骤为 `Undetermined`；开启审批人去重时，其审批人可能批准过、也可能没批准过先前步骤（多个可能通过它的人之一）的步骤同样如此。引擎会因之失败的错误——路由不匹配任何边或匹配多条边、条件无法求值——会以 `failure` 结束推演。

不写入任何东西：没有实例、任务、账本行或通知，也不计入任何委托的使用。能以自己的权限读取该记录的人才可以预览（`FlowInstanceAccessGuard.requireRecordReader`），且从不豁免行范围；参与过该记录先前的审批是不够的。用户的显示方式与审批历史相同。它不在自己的事务中运行，`FlowClient.previewRecord` 应在事务之外调用：通过事务方法抛出的拒绝会把它所加入的事务标记为只能回滚。

默认流程以租户种子文件的形式到达各租户：每个文件一行 `FlowDesign`，其触发器指明模型。当 seed-starter 公布某个文件创建的行时（`SeedFileLoadedEvent`），`SeedFlowPublisher` 发布每个新的设计；无法编译的设计会使该文件在该租户中失败。之后各租户在设计器中编辑自己的副本。

## 通知

默认的 `ApprovalNotificationService` 是 `CompositeApprovalNotificationService`，它分别通知两个通道——一个通道失败既不会让另一个沉默，也不会影响动作本身：

- **收件箱**（`InboxApprovalNotificationService`），始终发送：经由 message-starter 发送 Workflow 类型的站内消息，指向流程实例（`sourceModel` = `FlowInstance`，`sourceId` = 其实例 id；客户端打开实例并从那里继续）。超过收件箱 200 字符上限的标题会被截断；文本翻译为租户的默认语言。
- **邮件**（`MailApprovalNotificationService`），在 `emailNotification` 未关闭的流程上发送：经由 message-starter 发往每个接收人的账号邮箱（`UserAccount.email`；没有邮箱的接收人跳过），措辞来自租户中该通知代码对应的邮件模板（见[邮件](./message/email)）。模板变量为 `subject`（实例标题，否则为流程名）、`content`（意见或理由，如有）、`flowName`、`recordCode` 和 `link`——审批页面，即 `system.site-url` + `/approvals/{instanceId}`，未配置站点 URL 时为空。flow-starter 不附带任何邮件模板：没有该代码模板的租户收不到邮件，失败会记入日志。

由一个映射（`ApprovalNotices`）决定在两个通道上通知谁、通知什么：

| 事件 | 通知对象 | 邮件模板 |
|---|---|---|
| 步骤中尚未处理的审批人被指派；任务被转交、委托或转派给某人 | 尚未处理的审批人；新的任务持有人 | `flow.task-assigned` |
| 催办 | 被催办的审批人 | `flow.urged` |
| 步骤即将超时 | 其尚未处理的审批人 | —（仅收件箱） |
| 抄送 | 其接收人 | —（仅收件箱） |
| 已批准；被拒绝或退回（附意见） | 发起人 | `flow.approved`、`flow.rejected`、`flow.returned` |
| 被管理员终止，或某个步骤被管理员转派（附理由） | 发起人 | `flow.terminated`、`flow.reassigned` |
| 记录的审批失败（附错误） | 发起人，以及 `flow.notification.failure-role-codes`（默认 `TENANT_ADMIN`）中角色的持有人 | `flow.failed` |

只有 Approval 流程会通知其完成：自动化运行不是写入触发它的用户要求得知的事，而失败的自动化运行由运维人员关注。消息在动作提交之后、在其自己的事务中写入：回滚的动作不发送任何东西，无法写入的消息会记入日志而不使动作失败。失败会立即通知，因为失败那次尝试自身的事务会回滚。

`InboxReadMarker` 让收件箱保持最新：一旦审批人对某个审批采取行动——批准、拒绝、退回、转交、委托、加签或阅读抄送——其关于该实例的未读站内消息会在动作提交后被标记为已读，因此铃铛只统计仍在等待他们的事项（催办、评论或发出抄送不算采取行动）。“我的待办”仍是工作清单。

应用提供的 `ApprovalNotificationService` bean 会替换默认实现，连同两个通道一起；若要增加通道——短信、IM——请声明自己的 `CompositeApprovalNotificationService`，把收件箱和邮件通道与你的通道一并列入。

## 触发与消息集成

支持的触发源（`TriggerSource` sealed 子类型），每种都是声明它的流程的启动契约（各场景可用哪些，见 [Flow 场景](#flow-场景)）：

- `EntityChange` —— 模型的一条变更日志。每条变更日志对每个流程最多启动一次运行：它的 `uuid` 作为事件 id 写入 `FlowInstance.triggerEventId`（与流程组合唯一），因此重投的变更日志会返回它已启动的那次运行，而同一行的不同变更各自启动自己的运行
- `Cron` —— 流程自己的 Quartz 调度；只能由它启动（见[Cron 触发的流程](#cron-触发的流程)）：其他 cron 任务的触发不会启动它，`POST /flow/automation/trigger` 也拒绝该类型
- `FieldChange`（仅 COMPUTE 场景）
- `Api`（仅 AUTOMATION 场景）—— 只能按 id 显式启动；不匹配任何事件，`POST /flow/automation/trigger` 拒绝该类型
- `Subflow`（仅 AUTOMATION 场景）—— 只能由父流程的 Subflow 节点运行；同样不能作为事件触发
- `Submit`（仅 APPROVAL 场景）—— 指明流程审批哪个模型的记录，可选地附带对记录的条件。只能由提交记录启动（见审批业务记录）；变更日志永远不会产生它，`POST /flow/automation/trigger` 也拒绝它

`EntityChange` 由变更日志触发，因此声明为 `@Model(enableAuditLog = false)` 的模型永远不会触发它，同步、异步都不会——见[审计日志开关](../backend_dev/model_dev/annotation#审计日志开关enableauditlog)。

Pulsar 相关组件按条件注册：

| 属性 | 组件 | 用途 |
|---|---|---|
| `mq.topics.flow-event.topic` | `FlowEventProducer`、`FlowEventConsumer` | 异步触发投递与消费 |
| `mq.topics.flow-async-task.topic` | `FlowAsyncTaskProducer`、`FlowAsyncTaskConsumer` | 异步任务分发与回调恢复 |
| `mq.topics.change-log.topic` | `ChangeLogFlowConsumer` | 实体变更驱动的流程触发 |
| `mq.topics.cron-task.topic` | `CronFlowJobProvider`、`CronTaskFlowConsumer` | 按 cron 调度 Cron 触发的流程，并启动它们 |
| `mq.topics.flow-timer.topic` | `FlowTimerConsumer` | 定时器唤醒的消费侧 |

重要定时器说明：

- 模块包含定时器恢复消费者。
- 发布 `FlowTimerMessage` 的调度器或生产者仍需由宿主应用或其他集成模块提供。

### Cron 触发的流程

Cron 触发的流程拥有自己的调度：触发器的 `cronExpression`，采用 cron-starter 运行的 Quartz 格式（`second minute hour day-of-month month day-of-week [year]`，例如 `0 0 9 ? * MON-FRI` 表示工作日 09:00，按调度器所在时区）。发布时按调度器的方式解析它：表达式为空时以 `CRON_MISSING_EXPRESSION` 失败，调度器无法运行的表达式以 `CRON_INVALID_EXPRESSION` 失败。Automation、Validation 和 Compute 流程可以按调度运行，Approval 流程不可以（见 [Flow 场景](#flow-场景)）；按调度运行的 Validation 或 Compute 流程与它们的其他运行一样瞬态求值。

- **调度。** `CronFlowJobProvider` 是 cron-starter 的 `CronJobProvider`：调度 leader 在开始调度时以及之后每 30 秒读取每个租户活动的 Cron 触发修订版（`FlowBundle.cronExpression`，发布时从触发器复制），并为每个修订版运行一个名为 `flow:<bundleId>` 的任务。因此发布、激活另一个修订版（回滚或向前滚动）以及切换到其他触发器，都会在 30 秒内移动或移除调度，无论是哪个实例执行的——其间到期的执行会被跳过，绝不会运行两次；不会写入任何 `SysCron` 行。未配置 `mq.topics.cron-task.topic` 时不进行任何调度。
- **租户。** 租户的流程在该租户的上下文中运行，且仅在租户处于活动状态时运行；平台共享流程（`tenantId = 0`）在每个活动租户中各运行一次，每次运行都在该租户的上下文中。未启用多租户时（`system.enable-multi-tenancy=false`），每个流程运行一次，没有租户。
- **启动。** `CronTaskFlowConsumer` 启动 `flow:<bundleId>` 消息所指的修订版（`FlowAutomationService.fireCron`），且仅当它仍是其流程的活动修订版时：被替换的修订版在 leader 下次读取之前触发的任务不会启动任何东西。其他所有 cron 消息——维护 cron、其他模块的任务、任何名称的 `SysCron` 行——都被忽略，也没有触发事件会匹配 Cron 流程。流程启动时没有发起人，调度触发的时间作为变量 `triggerTime`，Automation 流程的这次触发与其他触发一样记录在 `FlowEvent` 中。
- **每次执行都启动自己的运行**，即使上一次仍在运行或等待。执行不携带事件 id，因此与变更日志不同，重投的 cron 消息不会被识别为已运行过。

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

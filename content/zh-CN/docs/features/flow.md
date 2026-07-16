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
- 按 `designId` 发布的 bundle 修订版
- 流程、校验和计算流程的运行时执行
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

- `FlowDesign` 是草稿工作副本。
- `FlowBundle` 是编译后的已发布快照。
- 已发布修订版以 `designId` 为键，而非 `flowCode`。
- `FlowStartRequest` 按以下顺序解析 bundle：
  1. `bundleId` — 固定到确切的已发布修订版
  2. `designId` — 启动当前活动修订版
- 要启动特定历史修订版，通过修订版列表端点查找其 `bundleId` 并作为 `bundleId` 传入。
- `FlowBundle.designJson` 保留发布时使用的设计快照，以便编辑器恢复历史画布。

### Flow 场景

模块现使用单一的 `FlowScenario` 枚举，取代旧的 `FlowKind + FlowPurpose` 拆分。

| 场景 | 含义 |
|---|---|
| `PROCESS` | 有状态运行时流程，持久化实例；涵盖审批式与自动化式流程 |
| `VALIDATION` | 无状态同步校验流程——瞬态求值：无实例行、无 trace、无事件日志 |
| `COMPUTE` | 无状态同步计算/onchange 流程——瞬态求值，同样零足迹规则 |

场景决定执行策略：`PROCESS` 流程经 `FlowRuntimeEngine.start`（持久化、可恢复）；`VALIDATION` / `COMPUTE` 流程经 `evaluate`——相同遍历但零 flow 足迹。任务节点产生的业务写入仍加入调用方事务，因此求值失败会回滚。

### 节点类型

当前 `FlowNodeType` 值：

- 控制：`Start`、`End`、`Timer`
- 路由：`InclusiveGateway`、`ParallelFork`、`ParallelJoin`
- 人工：`Approval`、`HumanTask`*
- 任务：`Script`、`CreateRecord`、`GetRecord`、`UpdateRecord`、`DeleteRecord`、`QueryRecords`、`ValidateData`、`Transform`、`CallService`、`CallWebhook`、`SendEmail`、`SendSms`、`SendInboxNotification`、`QueryAI`、`AsyncTask`、`GenerateFile`
- 子流程：`Subflow`
- 数据：`ForEach`*、`ReturnValue`

\* `HumanTask` 和 `ForEach` 已定义但**尚未运行时支持**：它们从节点面板中省略，并在编译时被拒绝（`UNSUPPORTED_NODE_TYPE`），因此包含它们的流程无法发布。

节点行为不变量：

- **`Subflow` 仅支持同步**：若子流程进入等待状态（`WAITING_APPROVAL` / `TIMER` / `ASYNC`），编排器会使父流程失败；递归子流程调用会被拒绝。人工步骤应建模在父流程中，而非子流程。
- **`ParallelFork` 分支串行执行**（确定性顺序），而非墙钟并行——该网关建模路由拓扑，而非并发。

### 运行时状态

已定义的 `FlowExecutionStatus` 值：

- `Pending`
- `Running`
- `Waiting` — 停在一个或多个等待上（待审批和/或定时器 / 异步回调）。具体原因位于实例的待审批列表和等待令牌列表中，因此单一状态可同时覆盖因不同原因挂起的并行分支。
- `Rejected`
- `Returned`
- `Withdrawn`
- `Cancelled`
- `Completed`
- `Failed`

## API 概览

宿主应用若在进程内嵌入引擎，应通过 `FlowClient` 门面（`io.softa.starter.flow.api`）集成，而不是绕回 REST——actor / initiator / tenant 身份始终从服务端上下文解析，绝不作为调用参数传入。参见 Softa 源仓库中模块内集成指南：`starters/flow-starter/docs/integration-guide.md`。

### 设计 API（flow 编辑器）

基础路径：`/flow/designs` — 图形编辑器的专用表面（完整编辑器 API 契约位于 Softa 源仓库的 `starters/flow-starter/docs/frontend-editor-api.md`）。通用模型 API `/FlowDesign/**` 仍作为平台数据平面可用，且有意不被拦截。

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/designs` | 创建草稿 |
| `GET` | `/flow/designs?keyword=&scenario=&pageNumber=&pageSize=` | 分页草稿列表（不含画布） |
| `GET` | `/flow/designs/{id}` | 加载一个草稿（画布 + 乐观锁 version） |
| `POST` | `/flow/designs/{id}/save` | 自动保存画布；过期 version 会被拒绝 |
| `POST` | `/flow/designs/{id}/delete` | 删除从未发布过的草稿 |
| `POST` | `/flow/designs/{id}/duplicate` | 在新 flow code 下复制草稿 |
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
| `GET` | `/flow/bundles?designId=` | 一个设计的修订版列表（无 `designId` 时为每个设计的活动 bundle） |
| `GET` | `/flow/bundles/{bundleId}?include=design` | 一个修订版摘要，可选含画布完整设计快照 |
| `POST` | `/flow/bundles/{bundleId}/activate` | 使此修订版成为设计的生效修订版（回滚 = 向前滚动） |

### 节点描述符 API

基础路径：`/flow/nodeDescriptors`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/nodeDescriptors` | 列出编辑器面板的所有节点描述符 |
| `GET` | `/flow/nodeDescriptors?scenario=PROCESS` | 按 `FlowScenario` 过滤描述符 |

### 运行时 API

基础路径：`/flow/runtime`

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/runtime/instances/start` | 启动流程实例 |
| `GET` | `/flow/runtime/instances/{instanceId}?includeTrace=` | 获取一个运行时实例（默认排除 trace） |
| `GET` | `/flow/runtime/instances/{instanceId}/overlay` | 画布绘制的每节点运行状态 |
| `GET` | `/flow/runtime/instances/{instanceId}/trace?sinceSequence=` | 用于轮询的增量 trace 行 |
| `POST` | `/flow/runtime/instances/search` | 调用方自身实例的分页摘要——发起人过滤始终为已认证用户（filters：flowCode/designId/status/model/row/createdFrom/createdTo） |
| `POST` | `/flow/runtime/instances/approve` | 批准待审批 |
| `POST` | `/flow/runtime/instances/reject` | 拒绝待审批 |
| `POST` | `/flow/runtime/instances/transfer` | 转交待审批任务 |
| `POST` | `/flow/runtime/instances/delegate` | 委托待审批任务 |
| `POST` | `/flow/runtime/instances/add-sign-before` | 插入前置签批人 |
| `POST` | `/flow/runtime/instances/add-sign-after` | 插入后续签批人 |
| `POST` | `/flow/runtime/instances/cc` | 发送抄送通知 |
| `POST` | `/flow/runtime/instances/cc/read` | 标记抄送为已读 |
| `POST` | `/flow/runtime/instances/return` | 退回待审批 |
| `POST` | `/flow/runtime/instances/resubmit` | 重新提交已退回实例 |
| `POST` | `/flow/runtime/instances/withdraw` | 撤回流程实例 |
| `POST` | `/flow/runtime/instances/urge` | 催办待审批人 |
| `POST` | `/flow/runtime/instances/comment` | 添加评论审计条目 |
| `GET` | `/flow/runtime/instances/{instanceId}/nodes/{nodeId}/formPermissions` | 获取字段级表单权限 |
| `POST` | `/flow/runtime/trigger` | 触发事件并启动匹配流程 |
| `POST` | `/flow/runtime/onchange` | 瞬态运行 `COMPUTE` 流程并返回变量 diff |
| `POST` | `/flow/runtime/validate` | 针对候选行数据瞬态运行 `VALIDATION` 流程；按 flow code 返回各流程声明的输出 |

引擎内部恢复回调位于 `/internal/flow/runtime/instances/{resumeAsync|resumeTimer}`（INTERNAL 身份范围）——不属于面向用户的表面。

`actorId` / `initiatorId` / `tenantId` **从不**由客户端发送：每个操作请求从登录上下文服务端盖章（`@JsonProperty(READ_ONLY)`），所有查询端点从上下文解析当前 actor。

## 审批投影 API

### 审批任务

基础路径：`/flow/approvalTasks`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/approvalTasks/counts` | 当前 actor 的收件箱徽章计数（`{pendingApprovals, unreadCc}`——过滤定义与分页 `/pending` 及 `/cc?read=false` 查询相同） |
| `GET` | `/flow/approvalTasks/pending?flowCode=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的待办任务（分页：返回 `Page`） |
| `GET` | `/flow/approvalTasks/completed?flowCode=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的已完成任务（分页） |
| `GET` | `/flow/approvalTasks/cc?read=&flowCode=&instanceId=&nodeId=&pageNumber=&pageSize=` | 当前 actor 的抄送任务（分页；`read=false` 未读，`read=true` 已确认，省略 `read` 则两者都返回） |
| `GET` | `/flow/approvalTasks/inbox?flowCode=&instanceId=&nodeId=&includeCompletedApprovals=&pageNumber=&pageSize=` | 统一收件箱视图（待审批 + 抄送；可选已完成审批） |
| `GET` | `/flow/approvalTasks/instance/{instanceId}` | 一个运行时实例的所有任务（仅参与者 / 发起人） |

### 审批记录

基础路径：`/flow/approvalRecords`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/approvalRecords/instance/{instanceId}` | 按运行时实例的审批历史 |
| `GET` | `/flow/approvalRecords/history` | actor 范围的审批历史 |
| `GET` | `/flow/approvalRecords/cc/sent` | 发送方抄送历史 |

### 抄送配置

基础路径：`/flow/ccConfigs`

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/ccConfigs` | 创建抄送规则 |
| `GET` | `/flow/ccConfigs?flowCode=` | 按 `flowCode` 列出抄送规则 |
| `POST` | `/flow/ccConfigs/{id}/deactivate` | 停用抄送规则 |

### 委托

基础路径：`/flow/delegations`

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/flow/delegations` | 创建委托规则 |
| `GET` | `/flow/delegations/my` | 调用方创建的委托（委托人从登录上下文解析） |
| `GET` | `/flow/delegations/to-me` | 分配给调用方的活动委托（受托人从登录上下文解析） |
| `POST` | `/flow/delegations/{id}/cancel` | 取消委托规则 |

### 监控

基础路径：`/flow/monitor` — 面向运维；搜索端点需要系统管理员角色（`@RequireRole(SystemRoleAdmin)`，宿主应用未接入角色提供者时失败关闭）。持有该角色的调用者还会绕过实例详情 / overlay / trace / 审批历史读取上的参与者范围限制。

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/monitor/health` | 流程运行时健康快照（按状态的实例计数、逾期定时器） |
| `POST` | `/flow/monitor/instances/search` | 跨发起人的分页实例摘要；请求中若有 `initiatorId` 过滤则予以采纳 |

### 事件日志

基础路径：`/flow/events`

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/flow/events?flowCode=&sourceModel=&sourceRowId=&instanceId=&success=&eventTimeFrom=&eventTimeTo=&pageNumber=&pageSize=` | 分页事件日志，最新在前（filters 以 AND 组合；列表行排除 parameters payload） |
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

当前默认解析路径支持的动态源类型：

- `VariableList`
- `Expression`
- `InitiatorManager`
- `Role`

重要集成说明：

- `OrganizationService` 定义为 SPI（接入时默认使用 `MetadataOrganizationService`）。默认解析路径还通过 `ApproverResolutionService` 支持基于变量的源。
- 若需要真实组织树查询，请提供自定义 `OrganizationService` bean，或在流程到达审批节点前填充如 `initiatorManagerId`、`roleApprovers` 等解析变量。

审批人去重：默认策略为 **`GLOBAL`**——已在先前节点审批过的用户在后续节点自动通过（记为 `AUTO_APPROVE`）。残余风险：流程中途的表单编辑仍会被该先前审批自动背书；在需要重新审阅的流程上，将策略设为 `CONTIGUOUS` 或 `NONE`。

### 额外审批动作

- transfer
- delegate
- add-sign-before
- add-sign-after
- cc
- read-cc
- return
- resubmit
- withdraw
- urge
- comment

### 超时处理

审批超时策略：

- `REMIND`
- `AUTO_APPROVE`
- `AUTO_REJECT`
- `ESCALATE`

`ApprovalTimeoutScheduler` 针对已持久化的待审批处理提醒、自动动作与升级。

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

## 触发与消息集成

支持的触发源（`TriggerSource` sealed 子类型）：

- `EntityChange`
- `Api`
- `Cron`
- `Subflow`
- `FieldChange`（仅 COMPUTE 场景）

Pulsar 相关组件按条件注册：

| 属性 | 组件 | 用途 |
|---|---|---|
| `mq.topics.flow-event.topic` | `FlowEventProducer`、`FlowEventConsumer` | 异步触发投递与消费 |
| `mq.topics.flow-async-task.topic` | `FlowAsyncTaskProducer`、`FlowAsyncTaskConsumer` | 异步任务分发与回调恢复 |
| `mq.topics.change-log.topic` | `ChangeLogFlowConsumer` | 实体变更驱动的流程触发 |
| `mq.topics.cron-task.topic` | `CronTaskFlowConsumer` | Cron 驱动的流程触发 |
| `mq.topics.flow-timer.topic` | `FlowTimerConsumer` | 定时器唤醒的消费侧 |

重要定时器说明：

- 模块包含定时器恢复消费者。
- 发布 `FlowTimerMessage` 的调度器或生产者仍需由宿主应用或其他集成模块提供。

## 持久化模型

| 实体 | 说明 |
|---|---|
| `FlowDesign` | 草稿工作副本 |
| `FlowBundle` | 已发布的编译 bundle |
| `FlowInstance` | 持久化运行时实例状态（trace 与审批历史**不**内嵌——见两张专用表） |
| `FlowExecutionTrace` | 仅追加的执行 trace 行（内存状态只保留当前尝试的增量） |
| `FlowApprovalTask` | 待办/已完成/抄送任务投影 |
| `FlowApprovalRecord` | 审批动作审计账本——权威审批历史，由实例存储与实例行在同一事务中刷写 |
| `FlowCcConfig` | 自动抄送规则 |
| `FlowDelegation` | 委托规则 |
| `FlowEvent` | 触发事件日志 |
| `FlowDebugHistory` | 调试快照 |
| `FlowParallelBranch` | 并行分支跟踪 |

本模块的主要存储适配器：

- `OrmFlowBundleRegistry`
- `OrmFlowInstanceStore`

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
- 若需要邮件、短信、IM 或站内通知，提供真实的 `ApprovalNotificationService`
- 若需要基于经理/角色/部门的审批人，提供自定义 `OrganizationService` 或填充审批人解析变量
- 若使用触发或异步任务，启用 Pulsar topics
- 若使用 `TIMER` 节点，提供定时器调度/发布
- 若流程需要调用 Spring bean，显式启用 `CALL_SERVICE`（及其 bean 名允许列表）；其余任务节点类型均附带可用执行器，并按其能力 bean 条件注册

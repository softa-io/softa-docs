# Flow Starter

## 1. Flow 概念

Flow 是对业务流程的一种更通用抽象。

关系大致可以理解为：

> Flow > 业务流程（BP） ≈ Workflow > BPMN

表达式引擎主要用于解决数据计算问题，可以实现类似 QLExpress 的计算引擎。带有流程编排的场景更适合使用工作流或规则引擎，如 Flowable；Flowable 集成了 JUEL 用于简单表达式解析。DMN 规则引擎更适合布尔决策场景，例如 BP 中 `sequenceFlow` 的路由条件；Drools 更偏向规则配置与管理。

典型场景示例：

- 导入：更适合用 BPMN 表达，每个动作是一次数据更新节点，节点之间有执行顺序，但可以异步处理。
- 审批：结合 BPMN + DMN 使用。BPMN 负责审批流程与路径，DMN 负责复杂的审批路由，复杂人员查询可交给 DQL。

## 2. Flow 设计

Flow Starter 提供事件驱动的流程定义与执行能力。

### 支持的流程类型

- 自动化流程（automated flow）
- Cron 流程（cron flow）
- 表单流程（form flow）
- 校验流程（validation flow）
- onchange 事件流程（onchange event flow）
- AI Agent 流程（AI Agent flow）

### 支持的节点类型

- 创建数据、更新数据、删除数据、查询数据、计算数据
- 决策网关、生成报表、调用 AI、发送消息
- 校验数据、WebHook、异步任务、子流程（subflow）

### 支持的事件类型

- create、update、delete、changed（create/update/delete）、onchange、API、cron、subflow、message
- 按钮事件可以通过 API 事件来实现

Flow 同时支持**同步/异步**执行，以及**流程版本管理**。

## 3. 适用场景

1. 批量导入场景下的校验流程，以及导入完成后的业务处理流程
2. 数据校验同步执行，其它业务处理异步执行
3. 消息与邮件由流程中的消息节点生产（例如入职欢迎邮件）
4. 各类业务流程配置与定时任务（基于 Cron）的组合

## 4. 总体概览

Flow Starter 为 Softa 提供可配置的流程引擎。流程由 `FlowConfig`、`FlowTrigger`、`FlowNode`、`FlowEdge` 等元数据定义。

一个流程可以通过以下来源触发：

- ChangeLog 事件（数据的 create/update/delete）
- API 事件
- Cron 事件
- 子流程调用（subflow）

执行模型支持：

- 事务提交前的同步校验（validation）
- 通过 MQ 的异步处理

## 5. 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>flow-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 6. 前置条件

- 数据库中需要存在流程相关的元数据表：
  - `FlowConfig`、`FlowTrigger`、`FlowNode`、`FlowEdge`
  - `FlowStage`、`FlowEvent`、`FlowInstance`、`FlowDebugHistory`
- 需要 Pulsar 用于异步流程事件与异步任务执行。
- ChangeLog 与 Cron 集成非必需，如需从这些来源触发流程则需开启对应集成。

## 7. 配置

### 开启 Flow

```yml
enable:
  flow: true
```

### MQ 主题

```yml
mq:
  topics:
    change-log:
      topic: dev_demo_change_log
      flow-sub: dev_demo_change_log_flow_sub
    cron-task:
      topic: dev_demo_cron_task
      flow-sub: dev_demo_cron_task_flow_sub
    flow-async-task:
      topic: dev_demo_flow_async_task
      sub: dev_demo_flow_async_task_sub
    flow-event:
      topic: dev_demo_flow_event
      sub: dev_demo_flow_event_sub
```

## 8. 核心概念

- **FlowConfig**：流程定义。关键字段包括 `name`、`flowType`、`sync`、`rollbackOnFail`、`debugMode`、`active` 等。
- **FlowTrigger**：触发定义，包括 `eventType`、`sourceModel`、`sourceFields`、`triggerCondition`、`cronId` 等。
- **FlowNode**：执行单元，包含 `nodeType`、`nodeParams`、`nodeCondition` 以及可选的 `exceptionPolicy`。
- **FlowEdge**：节点之间的连线，主要用于可视化布局。
- **FlowStage**：可选的阶段分组。

## 9. 执行模型

### 触发来源

- **ChangeLog 事件**：由 ORM 的变更日志产生。
  - 同步流程在事务提交前（BEFORE_COMMIT）执行，用于校验。
  - 异步流程通过 MQ 消费执行。
- **API 事件**：通过 `POST /automation/apiEvent`，传入 `TriggerEventDTO` 触发。
- **Cron 事件**：从 cron-task 主题消费消息，根据 `cronId` 路由到对应流程。
- **子流程事件**：`TriggerSubflow` 节点通过 `triggerId` 触发子流程。

### 触发条件

- `FlowTrigger.triggerCondition` 在 `triggerParams` 上进行求值：
  - ChangeLog 事件：`CREATE/UPDATE` 使用变更后的数据，`DELETE` 使用变更前的数据。
  - API 事件：`TriggerEventDTO.eventParams`。
- `UPDATE` 事件中，`sourceFields` 用于限制“哪些字段变化时触发”；若为空则任意字段更新都会触发。

### 同步 vs 异步

- `FlowConfig.sync = true`：在当前进程内执行；当 `rollbackOnFail = true` 时会包裹在事务中。
- `FlowConfig.sync = false`：会发送 `FlowEventMessage` 到 MQ，由 `FlowEventConsumer` 异步执行。

### 重要行为说明

- FlowManager 在启动时一次性加载所有 `FlowTrigger` 与 `FlowConfig` 到内存；更新元数据后需要重启或提供手动刷新机制。
- 校验类流程在 BEFORE_COMMIT 阶段执行，不建议在其中修改数据。
- `FlowConstant.EXCLUDE_TRIGGER_MODELS` 会排除 `FlowInstance`、`FlowEvent` 等模型，避免流程互相触发造成循环。

## 10. 上下文与表达式

Flow 引擎在节点之间传递一个 `NodeContext`，其中包括：

- FlowEnv 变量：`NOW`、`TODAY`、`YESTERDAY` 等
- `TriggerParams`：触发该流程的记录数据
- `SourceRowId`：触发记录的主键 ID

变量与表达式语法：

- 变量：`#{var}`，支持 Map 取值：`#{TriggerParams.status}`
- 表达式：`${...}`，用于模板中的计算
- 在 Filters 中还支持保留字段引用：`@{fieldName}`

节点结果：

- 多数节点会将输出结果放入 `NodeContext`，键为节点 ID。
- 可通过 `#{<nodeId>}` 或 `#{<nodeId>.field}` 在后续节点或模板中引用。

节点异常策略：

- `FlowNode.exceptionPolicy` 支持 `NodeExceptionPolicy`，可以检测结果为空/为 false 等情况，并发出 `EndFlow` 或 `ThrowException` 等信号。

## 11. 已实现的节点类型

- **ValidateData**：表达式校验，失败时抛出 `BusinessException`。
- **GetData**：查询数据，支持返回单行/多行/字段值/是否存在/计数等。
- **ComputeData**：计算表达式结果。
- **CreateData / UpdateData / DeleteData**：基于模板与 Filters 的 CRUD。
- **ExtractTransform**：从集合中抽取指定字段并组成 Set。
- **Condition**：判断条件并发出异常信号。
- **TriggerSubflow**：通过 triggerId 触发子流程。
- **AsyncTask**：向 MQ 发送异步任务消息。
- **QueryAi**：调用 AI，并将回复写入上下文。
- **ReturnData**：设置流程返回结果。

## 12. 预留/待实现的节点类型

这些节点当前为占位实现，需要自定义 Processor 才能生效：

- BranchGateway
- LoopByDataset
- LoopByPage
- TransferStage
- GenerateReport
- SendMessage
- WebHook
- ApprovalNode

其中，`FlowNodeService` 已经包含了 LoopByDataset 与 LoopByPage 的循环控制逻辑，但 Starter 未提供对应的 `NodeProcessor` 实现，需要由业务自定义。

## 13. 关键参数与枚举

以下参数与当前代码保持一致，字段值支持：

- 常量
- 变量 `#{var}`，包括 `#{TriggerParams.status}` 这类 Map 访问
- 表达式 `${...}`
- Filters 中的保留字段 `@{fieldName}`

常用枚举：

- **NodeGetDataType**：MultiRows、SingleRow、OneFieldValue、OneFieldValues、Exist、Count
- **ValueType**：String、Integer、Long、Double、BigDecimal、Boolean、Date、DateTime、Time

同时，文档还列出了各节点类型的参数对象与字段（可参考英文版表格或 `examples/node-params.json` 示例）。

## 14. REST API

- `POST /automation/apiEvent`
- `POST /automation/onchange`（当前返回空 Map）
- `POST /automation/simulateEvent`（仅在非生产环境可用）
- `GET /FlowConfig/getByModel`
- `GET /FlowConfig/getFlowById`

此外，`EntityController` 也提供 `FlowConfig`、`FlowTrigger`、`FlowNode`、`FlowEdge`、`FlowStage`、`FlowInstance`、`FlowEvent`、`FlowDebugHistory` 等实体的 CRUD 接口。

## 15. 示例

API event request body:
```json
{
  "sourceModel": "Order",
  "sourceRowId": 1001,
  "triggerId": 2001,
  "eventParams": {
    "id": 1001,
    "status": "PAID",
    "totalAmount": 199.99,
    "updatedBy": "system"
  }
}
```

API event:
```bash
curl -X POST http://localhost:8080/automation/apiEvent \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "sourceModel": "Order",
  "sourceRowId": 1001,
  "triggerId": 2001,
  "eventParams": {
    "id": 1001,
    "status": "PAID",
    "totalAmount": 199.99,
    "updatedBy": "system"
  }
}
JSON
```

Simulate flow event request body (non-prod only):
```json
{
  "flowId": 3001,
  "flowNodeId": null,
  "rollbackOnFail": true,
  "triggerId": 2001,
  "sourceModel": "Order",
  "sourceRowId": 1001,
  "triggerParams": {
    "id": 1001,
    "status": "PAID",
    "totalAmount": 199.99
  }
}
```

Simulate flow event (non-prod only):
```bash
curl -X POST http://localhost:8080/automation/simulateEvent \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "flowId": 3001,
  "flowNodeId": null,
  "rollbackOnFail": true,
  "triggerId": 2001,
  "sourceModel": "Order",
  "sourceRowId": 1001,
  "triggerParams": {
    "id": 1001,
    "status": "PAID",
    "totalAmount": 199.99
  }
}
JSON
```

Node parameters reference (common `nodeParams` templates):
```json
{
  "validateData": {
    "expression": "TriggerParams.totalAmount > 0",
    "exceptionMsg": "totalAmount must be greater than 0 for order #{TriggerParams.id}"
  },
  "getData": {
    "modelName": "Order",
    "getDataType": "MultiRows",
    "fields": ["id", "status", "totalAmount"],
    "filters": ["status", "=", "PENDING"],
    "orders": ["createdTime", "DESC"],
    "limitSize": 100
  },
  "extractTransform": {
    "collectionVariable": "#{101}",
    "itemKey": "id"
  },
  "computeData": {
    "expression": "1 + 2",
    "valueType": "Integer"
  },
  "updateData": {
    "modelName": "Order",
    "pkVariable": "#{102}",
    "rowTemplate": {
      "status": "PROCESSING",
      "updatedAt": "${NOW}"
    }
  },
  "deleteData": {
    "modelName": "Order",
    "filters": ["status", "=", "CANCELLED"]
  },
  "condition": {
    "passCondition": "TriggerParams.status == 'PAID'",
    "exceptionSignal": "EndFlow",
    "exceptionMessage": "status is not PAID, flow ended"
  },
  "returnData": {
    "dataTemplate": {
      "orderId": "#{TriggerParams.id}",
      "status": "#{TriggerParams.status}"
    }
  },
  "asyncTask": {
    "asyncTaskHandlerCode": "OrderNotify",
    "dataTemplate": {
      "orderId": "#{TriggerParams.id}",
      "status": "#{TriggerParams.status}"
    }
  },
  "triggerSubflow": {
    "subflowTriggerId": 4001,
    "dataTemplate": {
      "orderId": "#{TriggerParams.id}",
      "totalAmount": "#{TriggerParams.totalAmount}"
    }
  },
  "loopByDataset": {
    "dataSetParam": "#{101}",
    "loopItemNaming": "orderItem"
  },
  "loopByPage": {
    "model": "Order",
    "fields": ["id", "status"],
    "filters": ["status", "=", "PENDING"],
    "pageSize": 50,
    "pageParamNaming": "pageRows"
  },
  "queryAi": {
    "robotId": 1,
    "conversationId": 1,
    "queryContent": "Summarize order #{TriggerParams.id}"
  }
}
```

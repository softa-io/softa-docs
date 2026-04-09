# Cron Starter

## 概览

本 Starter 提供分布式 Cron 调度：从数据库加载 `SysCron` 记录，通过 Redis 选举唯一 Leader，并将触发事件以 `CronTaskMessage` 形式发布到 MQ（Pulsar）。应用消费这些消息后执行实际业务逻辑。

调度端与执行端刻意解耦：

- `cron-starter` 决定何时触发以及下发何种上下文。
- 你的 MQ 消费者在收到触发后决定执行哪段业务代码。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>cron-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 前置条件

- 需要 Redis 做主节点选举（`StringRedisTemplate`）。
- 需要 Pulsar 做任务投递（`PulsarTemplate`）。
- 数据库中存在 `SysCron`、`SysCronLog` 等元数据表。
- 若在共享库多租户模式下运行，运行时还需提供 `TenantInfoService`（通常配合 `system.enable-multi-tenancy=true` 以及可用的 `tenant_info` 模型/表）。

## 配置

### MQ 主题

```yml
mq:
  topics:
    cron-task:
      topic: dev_demo_cron_task
      flow-sub: dev_demo_cron_task_flow_sub
```

### 调度线程池大小

```yml
cron:
  threads:
    number: 1
```

### 多租户开关

`cron-starter` 自身不增加单独的「仅 Cron 用」租户开关，而是跟随 ORM/运行时的租户模式：

```yml
system:
  enable-multi-tenancy: true
```

未启用多租户时，不应对 `TenantInfoService` 有要求，也不具备按租户扇出的能力。

## 数据模型

### SysCron

关键字段：

- `name`：任务名称。
- `cronExpression`：Quartz Cron 表达式。
- `cronSemantic`：人类可读描述（参见 `CronUtils.cronSemantic`）。
- `limitExecution`：为 `true` 时启用有限次数执行。
- `remainingCount`：当 `limitExecution=true` 时的剩余次数。
- `nextExecTime`、`lastExecTime`：时间戳，便于展示或排查。
- `redoMisfire`、`priority`：预留给调度器后续使用。
- `description`：自由文本说明。
- `tenantJobMode`：可选的租户分发模式，取值为 `PerTenant` 与 `CrossTenant`。
- `active`：是否激活。

### SysCronLog

任务执行日志。Flow Starter 在消费 Cron 任务时会写入。

### CronTaskMessage

发布到 MQ 的字段：

- `cronId`、`cronName`
- `triggerTime`、`lastExecTime`
- `context`：供消费者使用的请求上下文快照

## 调度流程

1. 某个节点通过持有 Redis 键 `cron:scheduler:leader` 成为 Leader。
2. Leader 从元数据存储加载全部 `SysCron`。
3. 每个任务转换为 Quartz 调度并注册到本地调度池。
4. 触发时，调度器发布一条或多条 `CronTaskMessage`。
5. 消费者恢复 `message.context` 并执行实际业务逻辑。

实现说明：

- 全集群同一时刻只有一个调度器实例在跑。
- 租约时长 60 秒，续约间隔 30 秒。
- 调度器使用 `ZoneId.systemDefault()`。
- `limitExecution=false` 时任务按表达式重复调度。
- `limitExecution=true` 时仅依赖内存计数；调度器不会持久化回写 `remainingCount`。
- 当前实现启动时注册的条件是 `active` **不为** `true`（`null` / `false`）。若你的语义是「`active` 表示启用」，请在数据上对齐或调整代码条件。

## 租户模式

### 非多租户模式

适用于 `system.enable-multi-tenancy=false`，或应用未提供 `TenantInfoService` 时。

推荐的 `SysCron` 配置：

- `tenantJobMode` 留空 / 为 null

执行行为：

- 每次触发发布一条 MQ 消息
- 不会对 `message.context.tenantId` 做扇出
- `message.context.crossTenant=false`

说明：

- 此模式下不支持 `tenantJobMode=PerTenant`。调度器会记录错误并跳过派发，因为无法列出活跃租户。
- `tenantJobMode=CrossTenant` 技术上无妨，但在非多租户运行时没有实际意义。

### 共享库多租户模式

适用于 `system.enable-multi-tenancy=true` 且 `TenantInfoService` 可用。

#### 模式 1：默认单次派发

推荐的 `SysCron` 配置：

- `tenantJobMode` 留空 / 为 null

执行行为：

- 发布一条 MQ 消息
- 当前调度器上下文原样复制进消息

仅在明确需要「单次派发并继承当前上下文」时使用。若要做租户维度的批量任务，请显式使用 `PerTenant` 或 `CrossTenant`。

#### 模式 2：按租户派发

推荐的 `SysCron` 配置：

- `tenantJobMode=PerTenant`

执行行为：

- 调度器从 `TenantInfoService` 加载全部活跃租户 ID
- 每个活跃租户发布一条 MQ 消息
- 每条消息设置各自的 `context.tenantId`
- 每条消息保持 `context.crossTenant=false`

典型场景：

- 按月给各租户发报表
- 租户维度的清理任务
- 同步租户隔离的业务数据

#### 模式 3：跨租户派发

推荐的 `SysCron` 配置：

- `tenantJobMode=CrossTenant`

执行行为：

- 发布一条 MQ 消息
- `context.tenantId` 留空
- `context.crossTenant=true`

典型场景：

- 全局对账
- 全系统统计
- 必须扫描所有租户的管理类维护任务

## 消费者侧执行逻辑

调度器已决定租户上下文并写入 `CronTaskMessage.context`。消费者在调用基于 ORM 的服务前应先恢复该上下文。

示例：

```java
@Component
@ConditionalOnProperty(name = "mq.topics.cron-task.topic")
public class CustomCronConsumer {

    @PulsarListener(
        topics = "${mq.topics.cron-task.topic}",
        subscriptionName = "${mq.topics.cron-task.flow-sub}"
    )
    public void onMessage(CronTaskMessage message) {
        Runnable task = () -> {
            // TODO: 在此执行业务逻辑
            // message.getCronName(), message.getTriggerTime(), message.getLastExecTime()
        };

        if (message.getContext() != null) {
            ContextHolder.runWith(message.getContext(), task);
        } else {
            task.run();
        }
    }
}
```

重要约定：

- 若 `SysCron.tenantJobMode=PerTenant`，不要在下游业务入口方法上再标注 `@PerTenant`，否则任务会被展开两次。

## 使用方式

### 1. 创建定时任务

可选用以下方式创建 Cron 任务；首选通过 UI 创建。

1. UI（推荐）  
   通过管理后台或元数据控制台创建 `SysCron`。仅在需要多租户扇出或跨租户执行时设置 `tenantJobMode`。

2. 预置数据  
   在系统初始化或迁移脚本中预置 `SysCron`，服务启动后再激活。

3. SQL 插入  
   直接向 `SysCron` 表插入（字段以实际库表为准）。

```sql
INSERT INTO sys_cron
  (name, cron_expression, cron_semantic, tenant_job_mode, limit_execution, remaining_count, active)
VALUES
  ('DailyReport', '0 0 2 ? * *', 'At 02:00 AM', 'PerTenant', false, 0, true);
```

### 2. 立即执行一次

控制器提供立即执行接口：

- `POST /SysCron/executeNow?id=123`
- `POST /SysCron/executeMultipleNow?ids=1&ids=2`

## Quartz Cron 表达式

格式：

```
* * * ? * * [*]
- - - - - -  -
| | | | | |  |
| | | | | |  +- 年（可选）
| | | | | +---- 星期（范围：1-7 或 SUN-SAT，1 表示周一）
| | | | +------ 月（范围：1-12 或 JAN-DEC）
| | | +-------- 日（范围：1-31）
| | +---------- 时（范围：0-23）
| +------------ 分（范围：0-59）
+-------------- 秒（范围：0-59）
```

特殊字符：

- `*`：任意
- `?`：不指定具体值
- `,`：列举
- `-`：范围
- `/`：步长

示例：

- `0 0 2 ? * *`：每天 02:00 执行
- `0 */5 * ? * *`：每 5 分钟执行
- `0 30 9 ? * MON-FRI`：工作日 09:30 执行

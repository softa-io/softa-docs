# Cron Starter

## 概览

Cron Starter 提供一个分布式的定时任务调度器。它从数据库中加载 `SysCron` 记录，通过 Redis 选举集群中的单个调度节点，然后将触发结果以 `CronTaskMessage` 的形式发布到 MQ（Pulsar）。你的业务应用只需要消费这些消息并执行实际的业务逻辑。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>cron-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 前置条件

- 需要 Redis 用于主节点选举（`StringRedisTemplate`）。
- 需要 Pulsar 用于任务消息投递（`PulsarTemplate`）。
- 数据库中需要存在定时任务相关的元数据表：`SysCron`、`SysCronLog`。

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

## 数据模型

### SysCron

关键字段：

- `name`：Cron 任务名称。
- `cronExpression`：Quartz Cron 表达式。
- `cronSemantic`：用户可读的语义描述（参考 `CronUtils.cronSemantic`）。
- `limitExecution`：是否限制执行次数。
- `remainingCount`：当 `limitExecution=true` 时的剩余执行次数。
- `nextExecTime`、`lastExecTime`：下一次/上一次执行时间，便于展示或排查。
- `redoMisfire`、`priority`：预留给调度器后续扩展使用。
- `description`：任务说明。
- `active`：是否激活。

### SysCronLog

定时任务的执行日志。Flow Starter 在消费 Cron 任务时会写入日志。

### CronTaskMessage

发布到 MQ 的消息字段：

- `cronId`、`cronName`
- `triggerTime`、`lastExecTime`
- `context`：请求上下文快照

## 调度行为

- 整个集群中只有一个调度器实例在运行，通过 Redis 键 `cron:scheduler:leader` 进行主节点选举。
- 租约时长为 60 秒，续约间隔为 30 秒。
- 调度器使用 `ZoneId.systemDefault()` 所在的时区。
- 当 `limitExecution=false` 时，任务会一直按照 Cron 表达式周期执行。
- 当 `limitExecution=true` 时，调度器在内存中维护剩余次数计数，不会回写 `remainingCount`。

重要行为说明：

- 当前实现中，调度器在启动时会注册 `active` 不为 `true`（为 null 或 false）的任务。如果你期望 “active 表示启用”，需要在数据上对齐约束，或者在代码中调整条件。

## 使用方式

### 1. 创建定时任务

你可以通过以下方式创建 `SysCron` 任务记录，推荐使用管理界面：

1. 管理 UI（推荐）

   通过管理后台或元数据控制台创建 `SysCron` 记录，保存后根据需要激活任务。

2. 预置数据

   在系统初始化或迁移脚本中预置 `SysCron` 数据，在服务启动时统一激活。

3. 直接插入 SQL

   直接向 `SysCron` 表插入记录（字段根据实际表结构为准）：

   ```sql
   INSERT INTO sys_cron
     (name, cron_expression, cron_semantic, limit_execution, remaining_count, active)
   VALUES
     ('DailyReport', '0 0 2 ? * *', 'At 02:00 AM', false, 0, true);
   ```

### 2. 立即执行一次

控制器提供了立即执行的接口：

- `POST /SysCron/executeNow?id=123`
- `POST /SysCron/executeMultipleNow?ids=1&ids=2`

### 3. 消费 Cron 任务

实现一个 Pulsar Consumer，在 Cron 触发时执行具体业务逻辑：

```java
@Component
@ConditionalOnProperty(name = "mq.topics.cron-task.topic")
public class CustomCronConsumer {

    @PulsarListener(
        topics = "${mq.topics.cron-task.topic}",
        subscriptionName = "${mq.topics.cron-task.flow-sub}"
    )
    public void onMessage(CronTaskMessage message) {
        // TODO: 执行业务任务
        // message.getCronName(), message.getTriggerTime(), message.getContext()
    }
}
```

## Quartz Cron 表达式

格式：

```
* * * ? * * [*]
- - - - - -  -
| | | | | |  |
| | | | | |  +- 年（可选）
| | | | | +---- 星期几（范围：1-7 或 SUN-SAT，1 表示周一）
| | | | +------ 月份（范围：1-12 或 JAN-DEC）
| | | +-------- 日（范围：1-31）
| | +---------- 小时（范围：0-23）
| +------------ 分钟（范围：0-59）
+-------------- 秒（范围：0-59）
```

特殊字符：

- `*`：匹配任意值
- `?`：不指定值
- `,`：列举多个值
- `-`：范围
- `/`：步长

示例：

- `0 0 2 ? * *`：每天 02:00 执行
- `0 */5 * ? * *`：每 5 分钟执行一次
- `0 30 9 ? * MON-FRI`：工作日 09:30 执行

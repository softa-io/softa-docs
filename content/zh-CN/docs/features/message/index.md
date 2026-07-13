# Message Starter

为 Softa 应用提供统一消息能力：

- **邮件**：发送邮件、接收邮件、渲染邮件模板
- **短信**：发送短信、批量发送、模板渲染、失败重试
- **收件箱**：向用户推送应用内通知

投递可靠性基于**事务性 outbox** + **乐观锁 CAS** 状态机，因此 broker 故障、重复投递和进行中崩溃可在不丢消息、不重复发送的情况下处理。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>message-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 应用 API

`MessageService` 是暴露给业务模块的唯一消息提交服务：

| 渠道 | 单条 | 批量 |
|---|---|---|
| Mail | `sendMail(SendMailDTO)` | `sendMailBatch(List<SendMailDTO>)` |
| SMS | `sendSms(SendSmsDTO)` | `sendSmsBatch(List<SendSmsDTO>)` |
| Inbox | `sendInbox(SendInboxDTO)` | `sendInboxBatch(List<SendInboxDTO>)` |

一个 DTO 始终代表一条独立消息。批量方法接受 1..500 项，加入调用方事务，并按输入顺序返回记录 ID。一个邮件 DTO 可在一个 MIME 消息中寻址多个 `to` 收件人；一个 SMS DTO 始终只含一个电话号码。

## 要求与配置

在 `src/main/resources/sql/` 下应用以下 DDL：

- `message-starter.sql` — 邮件 + 收件箱表
- `message-starter-sms.sql` — SMS 表
- `message-starter-outbox.sql` — 事务性 outbox（邮件 + SMS 共享）
- `message-starter-dlq.sql` — 统一死信存储（`dead_letter_message`）

使用框架 ORM/versionLock 路径进行运行时写入，因此 outbox 发布不依赖数据库特定的行锁 SQL。

### 硬依赖

`message-starter` 刻意将 Redis 和关系数据库视为**硬依赖**。对它们没有 fail-open / 本地回退路径——若任一不可用，依赖它的操作会向调用方抛出异常。这使运行时保持简单，并与 Softa 栈其余部分（缓存、分布式锁、会话等）的行为一致。权衡与运维期望：

| 依赖 | 使用者 | 失败行为 | 运维期望 |
|---|---|---|---|
| Database | 所有路径（记录、outbox、框架 versionLock） | 操作抛出；调用方看到 5xx | HA 数据库（复制 MySQL / 托管 PG）；已应用迁移。 |
| Redis | `RateLimiter`（每租户 + 每配置配额）、`MailConfigCache`、发送配额计数器 | 操作抛出；调用方看到 5xx | Sentinel 或 Cluster 部署。K8s `readinessProbe` 应包含 `/actuator/health/redis`，以便 Redis 不可达时负载均衡器分流。 |
| Pulsar broker | `OutboxPublisher`（发布）、消费者（订阅） | Outbox 行保持 `NEW`；发布者指数退避重试；最终在 `MAX_PUBLISH_ATTEMPTS=10` 后标记 `DEAD`。 | HA 集群。失败不阻塞业务写入——outbox 吸收间隙。 |
| SMTP / SMS provider | 外发发送 | 每条记录失败；由 `ErrorClassifier` 分类；指数退避重试（`ExponentialBackoffPolicy`）。 | 将提供商侧速率限制配置在提供商配额以下。 |

**为何 Redis 无进程内回退？** 本地 Guava 限流器会在 Redis 故障期间静默让单节点突破跨节点配额，足够长的故障可能击穿提供商日配额并产生真实成本（Twilio / 阿里云 / SES）。通过 readiness 探针在负载均衡器层面 fail closed，比部分故障下静默扇出更安全。

### 多租户

所有消息业务表（`mail_*`、`sms_*`、`inbox_notification`）为 `multiTenant` 模型：当平台 `system.enable-multi-tenancy` 开启时，读取隔离于调用方租户，写入由 ORM 自动盖章。`tenant_id = 0` 行构成**平台层**，由所有租户共享：

- 配置/模板/路由解析为**叠加式**：调用方自身行 + 平台层（租户默认 → 平台默认；租户模板 → 平台模板；路由 = 两者并集，按 priority）。
- 后台任务为跨租户扫描，在每条记录所属租户上下文中执行：定时邮件拉取在每个接收配置的租户内运行，僵尸清扫器在每个卡住记录的租户内恢复。
- 事务性 outbox 和死信存储为共享基础设施表；租户身份在消息 payload（`recordId / tenantId / traceId`）中传递，由消费者恢复。

多租户禁用时，无过滤或盖章，一切表现为单租户。

### 异步投递（唯一投递模型）

无论 broker 配置如何，每次 `MessageService.sendMail(...)` / `sendSms(...)` 调用遵循相同路径：

1. `MailSendRecord` / `SmsSendRecord` 和 `OutboxEntry` 在**一个 DB 事务**中写入（`status = PENDING`，`version = 0`）。方法立即返回记录 id——调用方不阻塞于 SMTP/SMS 往返。
2. 定时 `OutboxPublisher`（500 ms 轮询）通过框架 `versionLock` 将 `NEW` 行认领为 `PUBLISHING`，发布到对应 topic，并将 outbox 行翻转为 `PUBLISHED`。
3. `@PulsarListener` 消费者读取消息（仅携带 `recordId` / `tenantId` / `traceId`），然后驱动渠道的 `DeliveryProcessor`，在调用提供商前 CAS 转换 `PENDING|RETRY → SENDING`。

若未配置 broker topic，outbox 行保持 `NEW` 状态，发布者每次轮询重试——无丢失；发送仅排队直到运维提供 topic。**不**使用 Spring `@Async`。

### Broker topics

仅需声明实际使用的渠道 topic。初始投递与延迟重试共享同一 topic；重试时机由事务性 outbox 的 `next_attempt_at` 携带，而非编码为独立 broker 路由。发送死信为终态记录状态（`DEAD_LETTER`）加上归档到统一 `dead_letter_message` 存储的行（见下文*死信存储*），而非独立队列。

```yml
mq:
  topics:
    mail-send:
      topic: dev_demo_mail_send
      sub: dev_demo_mail_send_sub
    sms-send:
      topic: dev_demo_sms_send
      sub: dev_demo_sms_send_sub
    cron-task:
      topic: dev_demo_cron_task
      mail-fetch-sub: dev_demo_cron_task_mail_fetch_sub
```

### Message-starter 属性

绑定前缀 `softa.message`，来源为 `MessageProperties`、`RetryProperties` 与 DLQ 的 `@Value` 键：

```yml
softa:
  message:
    outbox:
      enabled: true           # default true; disable on read-only replicas
      poll-interval-ms: 500
    zombie:
      enabled: true           # default true
      stale-seconds: 300      # stale SENDING/PUBLISHING claims are revived
      cron: "0 * * * * *"     # every minute
    retry:
      default-max-attempts: 5
      exponential:
        base-seconds: 30
        max-seconds: 3600
        multiplier: 2.0
        jitter: 0.5                 # ±50% randomisation
        quota-floor-seconds: 300    # QUOTA errors wait at least 5 min
    dlq:
      topic: dev_demo_message_dlq   # unset = broker-poison archiving disabled
      max-redeliver: 5              # broker nacks before dead-lettering
      alert:
        recipients: ops@example.com # comma-separated; empty = no alert mail
    mail:
      debug: false                  # Jakarta Mail protocol debug — never enable in prod (leaks AUTH)
      fetch:
        batch-limit: 100            # max messages per cron tick per (config, folder)
        lease-timeout: 1h           # abandoned IMAP watermark lease takeover
        max-message-size: 100MB     # RFC822 size cap; oversize → envelope-only + BodyTooLarge
        max-attachment-size: 20MB   # per-part cap; oversize parts skipped
        archive-eml: false          # opt-in raw EML archive via FileService
        max-mime-depth: 10          # MIME zip-bomb guard
        max-mime-parts: 100         # attachment-storm guard
      transport:
        connection-timeout: 5s      # SMTP/IMAP/POP3 connect timeout
        read-timeout: 30s           # SMTP/IMAP/POP3 read timeout
    sms:
      transport:
        connection-timeout: 5s      # HTTPS RestClient connect timeout
        read-timeout: 30s           # HTTPS RestClient read timeout
```

### 邮件认证

邮件服务器使用**用户名 + 密码**认证。提供商将 API key 作为 SMTP/IMAP 凭证时，将该 key 作为 `password` 提供。常见设置：

- **ESP / SMTP 中继**，API key 凭证（SendGrid、Amazon SES、Postmark、Mailgun）：在 `mail_send_server_config` 上将 key 设为 `password`；
- **提供商应用密码**，账户签发时；
- **自托管 MTA**（如 Stalwart、Postfix）。


## 运维

### 指标

当 classpath 上有 Micrometer 时，`MessageMetrics` 发出四类计数器：

| 名称 | 标签 | 递增时机 |
|---|---|---|
| `softa.message.sent` | `channel`（mail/sms）、`provider` | 提供商调用成功 |
| `softa.message.failed` | `channel`、`provider`、`outcome`（retry/failed/dead_letter） | 提供商调用失败 |
| `softa.message.outbox.published` | `route` | Outbox 条目成功发布到 broker |
| `softa.message.outbox.dead` | `route` | Outbox 条目超过发布尝试 → DEAD |

`softa.message.failed{outcome=dead_letter}` 在发送记录转换为 DEAD_LETTER 时由 `SendFailureHandler` 发出。

### 入站投递状态

邮件退信和已读回执状态来自 IMAP 接收路径上的**入站邮件**——DSN 报告邮件（`DsnRule` / `MailerDaemonRule` → `BounceReceiptLinker` → `markBounced`）和 MDN 邮件（`ReadReceiptRule`）。不提供入站 HTTP 回调；对于提供商推送的投递事件（SMS DLR、ESP 邮件事件），在应用中增加控制器调用记录服务的 CAS 转换。

### 速率限制

`MailSendServerConfig` 和 `SmsProviderConfig` 携带两个配额列：

- `daily_send_limit` — 每日累计发送
- `rate_limit_per_minute` — 每分钟发送（平滑突发）

任一可为 null/zero 以禁用该窗口。计数器位于 Redis（`rl:{channel}:{daily|min}:{tenantId}:{configId}:{window}`），因此多实例部署共享一个预算。配额突破表现为提供商侧 `QUOTA_EXCEEDED` 错误，分类为 `ErrorCategory.QUOTA`——重试策略应用配置的 `quotaFloorSeconds`（默认 5 分钟），避免猛击提供商。

### 僵尸记录清扫器

`ZombieRecordSweeper` 每分钟运行。`updated_time` 早于 `softa.message.zombie.stale-seconds`（默认 300）且卡在 `SENDING` 的记录，经 versionLock 转换回 `RETRY`，`next_retry_at = now`，并在同一事务中写入重试 outbox 行。过期的 outbox `PUBLISHING` 认领重新打开为 `NEW`。覆盖 JVM 在认领记录与完成提供商/broker 调用之间崩溃的情况。

在只读副本上通过 `softa.message.zombie.enabled=false` 禁用。

### 敏感字段加密

配置表上的凭证列（`mail_*_server_config.password`、`sms_provider_config.api_secret`）定义得足够宽以容纳密文。框架透明加密（`MetaField.isEncrypted()`）处理读写侧——但部署时仍须在 `SysField` 元数据表中将**这些字段标记为 encrypted**。见 [字段元数据 `encrypted` 属性](../metadata/field)；开箱即列存储明文。

## 扩展点

### 邮件传输

邮件发送仅 SMTP。`MailSendServerConfig` 是完整外发服务器配置；`SmtpMailTransport` 无状态，每次发送构建新的 Jakarta Mail sender，因此配置变更仅需驱逐 Redis 配置缓存（update/delete 时自动）。

### 邮件分类规则

`MailClassifier` 是对 `MailClassificationRule` bean 的责任链。四个内置规则（已读回执 → DSN → mailer-daemon → 关键词）按 `@Order` 顺序运行；第一个返回分类的规则获胜。添加提供商特定检测——如旧版 Exchange NDR、中国 ISP 退信形态——使用新规则：

```java
@Component
@Order(25)  // between DsnRule (20) and MailerDaemonRule (30)
public class ExchangeNdrRule implements MailClassificationRule {
    @Override
    public Optional<MailClassification> match(MimeMessage message) throws Exception {
        // ... return MailClassification.bounce(info) if it matches
        return Optional.empty();
    }
}
```

### 死信存储

两层的死信汇聚到单一 `dead_letter_message` 表以便分拣，由 `source` 列区分：

- `SendExhausted` — 邮件 / SMS 发送记录耗尽提供商重试预算；由 `SendFailureHandler` 归档（记录 id 在 `event_id`，失败详情在 JSON `payload`）。
- `BrokerPoison` — Pulsar 消费者在 broker 最大 redelivery 后仍无法处理消息；原始信封路由到 DLQ topic 并由 `DeadLetterConsumer` 归档。用 `@PulsarListener(deadLetterPolicy = "commonDlqPolicy")` 选择监听器并设置 `softa.message.dlq.topic`。

通过 `DeadLetterMessageController` 分拣行（状态 `Pending` → `Resolved` / `Discarded`）。自定义告警（Slack、PagerDuty）可消费 DLQ topic 或监视表——无进程内监听器 SPI。

### 重试策略

失败发送由 `ExponentialBackoffPolicy` 重试——可配置基数、乘数、上限和 ±jitter，通过 `softa.message.retry.exponential.*` 调优。`ErrorClassifier` 的错误类别决定处置：TRANSIENT / QUOTA / UNKNOWN 重试（QUOTA 钳制到 `quota-floor-seconds`）直至达到 `default-max-attempts` 并死信；PERMANENT / INVALID_INPUT / AUTH 立即失败不重试。`RetryDecision` 为密封类型（`Retry` / `Fail` / `DeadLetter`），使失败处理器的 `switch` 保持穷尽。

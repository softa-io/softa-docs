# Message Starter

为 Softa 应用提供统一消息能力：

- **邮件**：发送邮件、接收邮件、渲染邮件模板
- **短信**：发送短信、批量发送、模板渲染、失败重试
- **收件箱**：向用户推送应用内通知

每封邮件、每条短信都是一条**发送记录**，发送记录本身就是投递队列：投递循环通过**乐观锁 CAS** 状态机认领到期记录，因此并发实例不会重复发送同一条记录，进行中崩溃也不会丢消息（至少一次：提供商已接收、记录还没标记为已发送时崩溃，会再发一次）。投递路径上没有 broker。

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

表由 starter 的 `@Model` 类声明：`system.metadata.scanner-scope` 覆盖 `io\.softa\.starter\.message.*` 的应用在启动时自动建表并保持最新。运行时写入走框架 ORM/versionLock 路径，因此认领记录不依赖数据库特定的行锁 SQL。从经由 outbox 投递的旧版本升级：见下文*从 outbox 管道升级*。

### 硬依赖

`message-starter` 刻意将 Redis 和关系数据库视为**硬依赖**。对它们没有 fail-open / 本地回退路径——若任一不可用，依赖它的操作会向调用方抛出异常。这使运行时保持简单，并与 Softa 栈其余部分（缓存、分布式锁、会话等）的行为一致。权衡与运维期望：

| 依赖 | 使用者 | 失败行为 | 运维期望 |
|---|---|---|---|
| Database | 所有路径（发送记录、框架 versionLock） | 操作抛出；调用方看到 5xx | HA 数据库（复制 MySQL / 托管 PG）；已应用迁移。 |
| Redis | `RateLimiter`（每配置的投递速率窗口）、`MailConfigCache` | 操作抛出；调用方看到 5xx | Sentinel 或 Cluster 部署。K8s `readinessProbe` 应包含 `/actuator/health/redis`，以便 Redis 不可达时负载均衡器分流。 |
| Pulsar broker | `CronTaskMailFetchConsumer`（定时拉取邮件）、`DeadLetterConsumer`（归档其他消费者的毒消息） | 拉取邮件和毒消息归档暂停，直到 broker 恢复。发送不受影响：投递直接读发送记录。 | 发送不依赖它。 |
| SMTP / SMS provider | 外发发送 | 每条记录失败；由 `ErrorClassifier` 分类；指数退避重试（`ExponentialBackoffPolicy`）。 | 将提供商侧速率限制配置在提供商配额以下。 |

**为何 Redis 无进程内回退？** 本地 Guava 限流器会在 Redis 故障期间静默让单节点突破跨节点配额，足够长的故障可能击穿提供商日配额并产生真实成本（Twilio / 阿里云 / SES）。通过 readiness 探针在负载均衡器层面 fail closed，比部分故障下静默扇出更安全。

### 多租户

所有消息业务表（`mail_*`、`sms_*`、`inbox_notification`）为 `multiTenant` 模型：当平台 `system.enable-multi-tenancy` 开启时，读取隔离于调用方租户，写入由 ORM 自动盖章。`tenant_id = -1` 行（`BaseConstant.PLATFORM_TENANT_ID`）构成**平台层**——归平台运营方所有，对租户不可见。两个层级是完全分离的命名空间，不存在叠加：

- **模板按租户种入，不共享。** 每个租户在开通时由**应用**的租户种子文件获得自己的模板行（应用 `seed-manifest.yml` 里的租户文件，由 seed-starter 在租户开通时运行）。此后租户自由拥有并编辑自己的行。每个租户只跑一次同一个种子文件，所以新模板以新的租户文件的形式，由平台管理员运行后到达存量租户；应用若在清单里给模板文件标 `mode: append`，新模板直接加进该文件即可，平台管理员下次运行时只在缺这条模板的租户里创建；租户已有同 code 的模板、只是没有种子绑定（脚本插入或手工新建）时，按 code 补上绑定、原样保留，不再建第二条。不论哪种，修改存量租户已有的模板都走数据迁移（种子文件也同步修改，供之后开通的租户使用）。平台层只保存 PLATFORM 作用域发送要渲染的模板（账单、安全）；两层都需要的 code（如公开密码重置兜底）在两份种子里各出现一次。发送时的解析层级纯净：`scope = TENANT` 只读当前作用域自己的行，`scope = PLATFORM` 只读平台层。
- **服务器/提供商配置对租户不可见。** 租户只能看到并 pin 自己的配置；平台层只通过调度器的静默兜底（`@CrossTenant`）在租户没有配置时被触达——邮件收发兜底到平台默认，短信路由**按国家**兜底（同一国家内两层永不交错）。
- 后台任务为跨租户扫描，在每条记录所属租户上下文中执行：投递循环在每条到期记录的租户内（并沿用提交它的请求的 trace id）认领并发送，定时邮件拉取在每个接收配置的租户内运行，僵尸清扫器在每个卡住记录的租户内恢复。
- 死信存储为共享基础设施表。

模型还有两个配套件：

- 每次发送的层级策略：`SendMailDTO.scope` / `SendSmsDTO.scope`（默认 `MessageScope.TENANT`；`PLATFORM` = 模板、服务器或提供商与配额桶全部走平台层——用于账单/安全/合规消息）。scope 存在发送记录上（`platform_scope`），首次投递按调用方选的层级渲染和路由。发送记录属于发起调用时所在的租户（见*调用 MessageService*），所以 TENANT 作用域的渲染命中该租户自己的模板。
- 平台行在租户作用域内结构性不可写（payload 校验、插入盖章、更新/删除的租户过滤预读）；邮件写端点还会把这种静默 no-op 转为带解释的 `BusinessException`。

多租户禁用时，无过滤或盖章，一切表现为单租户。

### 启用 / 禁用（框架 active 控制）

七个配置/模板模型（`MailTemplate`、`MailSendServerConfig`、`MailReceiveServerConfig`、`SmsTemplate`、`SmsProviderConfig`、`SmsProviderRegion`、`SmsTemplateProviderBinding`）声明 `@Model(activeControl = true)`，使用框架的 `active` 字段——不再有手写的 `isEnabled` 开关，服务层也不再手写 `active = true` 条件：`WhereBuilder` 会把它追加到每一次 FlexQuery 读取上，因此解析、调度与列表界面的过滤保持一致，新写的查询也不可能漏掉它。禁用会让该行从所有读取中退场但**不删除**——这正是被发送记录引用的行所需要的。因此禁用行会离开默认列表视图——七个管理页面都做成了两个页签的 MultiView：**Active**（框架默认）与 **All**（`active IN (true, false)`，因为点名了该字段从而抑制自动追加）；没有第二个页签，禁用一行会让它从自己的管理页面消失。列头对 `active` 的筛选同理，可用于临时查询。必须触达禁用行的读取使用 `FilterControl.bypassActiveControl()`：按 id 的重放（`findVisibleById`，因此禁用配置绝不会把在途重试变成 `CONFIG_NOT_RESOLVABLE`）、编辑器工具（`resolveAny`——模板启用前即可预览与提取变量）、平台行写入探针，以及默认项降级。普通 `getById` 无需绕过：按 id 查找从不携带该过滤。

### 月度发送配额

`TenantMessageQuota`（刻意**非** `multiTenant`——平台拥有的、关于租户的登记表，只能从平台作用域写入）为每个租户设置月度邮件/短信发送上限。`MonthlyQuotaGuard` 在发送记录**准备**时扣额度——即首次投递、模板渲染完且服务器或提供商解析出来之后，发不出去的消息不占额度。超额的记录变为 `FAILED`，错误码 `MONTHLY_QUOTA_EXCEEDED`（并打 ERROR 日志）——这是商业上限而非速率控制——已准备记录的重试不再触碰计数。调整额度后在记录上点 Retry 即可重发。计数桶跟随发送的 scope：`PLATFORM` 发送消耗平台自己的 `tenantId = -1` 行（设一个非常大的值即可，它的存在是为了兜住失控或恶意的批量发送）；缺行时回退到 `softa.message.quota.mail-monthly-default` / `sms-monthly-default`（null = 不限——账本仍会累加以便报表）。计数落在**数据库**：每桶每日历月一行 `TenantMessageUsage`，通过 ORM 乐观锁 CAS（`versionLock`，每次尝试独立 `REQUIRES_NEW` 事务）做检查并自增。没有重置任务——新月份自然开新行——行也永不过期，因此每租户的历史消耗就是一次普通模型查询，且每行快照了当时生效的上限。`GET /TenantMessageQuota/usage?tenantId=` 返回某个桶的用量与当前解析上限（租户会话只能查自己的桶）。每配置的 `dailySendLimit` / `rateLimitPerMinute` 属于另一条轴（投递时的基础设施保护），保持不变。

### 异步投递（唯一投递模型）

每次 `MessageService.sendMail(...)` / `sendSms(...)` 调用遵循相同路径：

1. **受理**——在调用方的线程和事务里——只检查调用方的错误：有收件人、地址或 E.164 号码格式正确、有内容或可用于渲染的模板。每条消息写一条 `MailSendRecord` / `SmsSendRecord`，`status = PENDING`，原样保存请求：显式内容、模板及其变量、scope、调用方的 trace id。方法立即返回记录 id；记录随调用方事务一起提交或回滚。被拒绝时在写入任何数据之前抛出，且不会把调用方事务标记为只回滚。
2. **投递循环**（`DeliveryPoller`）每个渠道一个工作线程池（`softa.message.{mail,sms}.send-concurrency`，每实例默认邮件 4 个、短信 10 个）。工作线程跨租户认领一条到期记录——`PENDING`，或 `next_retry_at` 已到的 `RETRY`——通过框架 `versionLock` 做 CAS `PENDING|RETRY → SENDING`，以记录的租户和 trace 发送，发完立即认领下一条；只有没有到期记录时才空闲，由每 500 ms 一次的轮询把新到期的记录交给空闲线程。因此积压在每个实例上按"并发数 ÷ 单条耗时"的速度消化；要更快就调大 `send-concurrency`，但不要超过邮件服务器对单个账号的并发连接数（每个邮件线程占一个连接）。每次扫描为每个线程多读几条到期记录、按随机顺序尝试认领，认领输给别的线程或实例时就换下一条。
3. 渠道的 `DeliveryProcessor` 在首次投递时**准备**记录：渲染模板并应用其默认值，选择服务器（邮件）或按号码路由到提供商（短信），最后扣月度额度；结果写回记录，重试原样重放。然后限流、发送，成功标记 `SENT`，失败交给 `SendFailureHandler`：带退避 `next_retry_at` 的 `RETRY`、`FAILED` 或 `DEAD_LETTER`。

**配置不全的发送也有记录。** 没有服务器或提供商、模板缺失或渲染出错、月度额度用完、模板渲染出空内容：记录变为 `FAILED`，带标记码（`CONFIG_NOT_RESOLVABLE`、`TEMPLATE_NOT_RESOLVABLE`、`MONTHLY_QUOTA_EXCEEDED`、`CONTENT_INVALID`）和原因；每次终态失败都打 ERROR 日志（含记录 id 和租户），日志告警可以通知到开发人员。配置好后在记录上点 Retry：准备前就失败的记录会重新准备。调用方看不到这些错误——受理时 `sendMail` 已返回记录 id。

在同一张表上轮询的多个实例不会重复发送同一条记录：持有相同版本的两次认领只有一次成功。投递路径上没有 outbox 表，也没有 broker；**不**使用 Spring `@Async`。

**调用 MessageService。** 所有发邮件、短信的模块——包括 user-starter 的登录验证码、邀请、账号变更提醒和订阅到期提醒——都依赖 message-starter，直接调用 `MessageService`，中间没有请求事件。发送记录属于发起调用时所在的租户。要替另一个租户发——定时任务，或带着租户信息的匿名链接——在 `ContextUtils.inTenantContext(tenantId, …)` 里调用。在没有租户的上下文里发 `PLATFORM` 作用域的消息（比如登录验证码，此时还没有会话），记录记在平台层；写记录时从不跨租户，所以跨租户的调用方写下的记录也有租户（`TenantScopes.inRecordOwnerContext`）。受理拒绝（`BusinessException`）不会让调用方事务失效；不能因为一条提醒而让自身改动失败的调用方，捕获它并打 ERROR 日志，user-starter 的各类提醒就是这样做的。

### 手动重试

自动恢复覆盖投递失败（`SendFailureHandler`：指数退避，然后 `FAILED` / `DEAD_LETTER`；认证错误、配置或模板缺失、额度用完等不可重试失败跳过退避，首败即 `FAILED`）与在途卡死（`ZombieRecordSweeper`：陈旧 `SENDING` → `RETRY`）。修好原因之后用运维端点重发：

- `POST /MailSendRecord/retry?id=` / `POST /SmsSendRecord/retry?id=`——把一条记录改回 `RETRY` 并立即到期：`PENDING / RETRY / FAILED / DEAD_LETTER` → `RETRY`，投递循环下一次轮询就会认领。准备前就失败的记录会重新准备，因此补好配置后重试即可。`SENT` 与在途 `SENDING` 被拒绝。可安全重复调用——投递认领是 CAS 门控的，不可能重复发信。`retryCount` 持续累计：手动重试给予一次新尝试；再次失败回到 `FAILED` / `DEAD_LETTER`，而非重新武装整个自动重试预算。
- `POST /MailSendRecord/retryByIds` / `POST /SmsSendRecord/retryByIds`（请求体 `{"ids": [...]}`）——对选中的多条做同样的事：能重试的重新排队，`SENT`、在途 `SENDING`、期间被投递线程认领的记录跳过而不报错，返回实际重新排队的条数。邮件服务器恢复后、或补好缺失的服务器配置后，用它一次重发一批。

HCM 管理界面在 Mail Send Record / SMS Send Record 详情页以按状态显隐的工具栏动作暴露单条重试，在对应列表页提供行级动作，列表页还能勾选多条一起 Retry（确认框写明几条会被跳过）。这些动作都需要该页面的 Retry 权限。

### Broker topics

投递不使用 topic。message-starter 只消费两个可选 topic：`cron-task` 驱动定时邮件拉取，`softa.message.dlq.topic` 把其他消费者的毒消息收进死信存储。发送死信为终态记录状态（`DEAD_LETTER`）加上归档到统一 `dead_letter_message` 存储的行（见下文*死信存储*），而非独立队列。

```yml
mq:
  topics:
    cron-task:
      topic: dev_demo_cron_task
      mail-fetch-sub: dev_demo_cron_task_mail_fetch_sub
```

### 从 outbox 管道升级

早期版本经 `message_outbox` 表和 `mail-send` / `sms-send`（以及 `mail-request` / `sms-request`）Pulsar topic 投递。升级时：

- 从应用配置里删掉这四个 topic；不再有代码读它们。
- 下列配置项已删除，取值改成代码常量，或者对应的行为总是开着：`softa.message.delivery.*`（装了 message-starter 的实例都跑投递循环和卡住发送的清理）、`softa.message.zombie.*`、`softa.message.retry.*`、`softa.message.mail.max-body-chars`、`softa.message.mail.smtp-pool.*`（连接复用改成每台发件服务器配置上的开关，见下），以及 `softa.message.mail.fetch.*`。从应用配置里删掉；设了也会被忽略。
- 三个默认值变了：`softa.message.mail.send-concurrency` 1 → 4、`softa.message.sms.send-concurrency` 1 → 10、`softa.message.dlq.max-redeliver` 5 → 2。邮件服务器对单个账号允许的并发连接数少于 4 的部署，把 `mail.send-concurrency` 调低。
- 新增 `MailSendServerConfig.connectionReuseEnabled`（默认 true）：某台发件服务器不接受同一个连接上的第二封信时，关掉它的连接复用。`scanner-scope` 覆盖 message-starter 的环境，扫描器会加上 `mail_send_server_config.connection_reuse_enabled` 列，已有的行取默认值；其他环境按该部署加目录列的方式加上这一列和它的目录行，加上之前所有服务器照旧复用连接。
- 收信不再归档原始 EML，`MailReceiveRecord.emlFileId` 随之删除；解析出的正文和附件照旧保存。`scanner-scope` 覆盖 message-starter 的环境，扫描器会删掉 `mail_receive_record.eml_file_id` 列；其他环境这一列已不再使用，可以手工删掉。
- 框架事件 `MailRequestMessage` / `SmsRequestMessage`（softa-base）已删除。原来发布它们的代码改为调用 `MessageService`——`SendMailDTO.ofTemplate` / `SendSmsDTO.ofTemplate` 构造同样的模板发送；事件里指定了租户的，在 `ContextUtils.inTenantContext(tenantId, …)` 里调用。
- 旧管道留下的 `PENDING` / `RETRY` 记录无需迁移：投递循环按记录自己的 `status` 和 `next_retry_at` 认领。旧管道在受理时就准备了记录，所以大多数已是准备好的；服务器配置没有发件地址的邮件记录当时存的是空 `from_address`，在这里首次投递时会重新准备，月度额度会再扣一次。
- 扫描器会加上新的记录列（`platform_scope`、`template_id`、`template_code`、`template_variables`、`trace_id`），并把 `mail_send_record.body_mode` 改为可空。被删模型的表扫描器从不删除，所以 `message_outbox` 和 `OutboxEntry` / `OutboxStatus` / `TopicRoute` 的目录行要由部署应用在新 jar 起来之后用发版脚本删掉；那时 `message_outbox` 里还是 `NEW` 的行无害，对应记录会从记录表直接投递。
- 删掉基于 `OutboxEntry` 的页面（outbox 列表及其 Requeue 动作）；发送记录的 Retry 涵盖了 Requeue 的用途。

### Message-starter 属性

绑定前缀 `softa.message`，来源为 `MessageProperties` 与 DLQ 的 `@Value` 键。只有各部署之间确实不同的才做成配置。装了 message-starter 的实例都会发信——投递循环和卡住发送的清理总是运行。SMTP 连接复用是每台发件服务器配置上的开关（`connectionReuseEnabled`，默认开），不是配置项。重试退避、卡住发送的判定时间、轮询间隔、邮件正文上限、SMTP 连接池的空闲时间和单连接封数、收信的批量 / 租约 / 大小上限，都是代码里的常量。

```yml
softa:
  message:
    quota:
      mail-monthly-default: 10000   # monthly ceiling for buckets with no TenantMessageQuota row; unset = unlimited
      sms-monthly-default: 10000
    dlq:
      topic: dev_demo_message_dlq   # unset = broker-poison archiving disabled
      max-redeliver: 2              # broker nacks before dead-lettering
      alert:
        recipients: ops@example.com # comma-separated; empty = no alert mail
    mail:
      debug: false                  # Jakarta Mail protocol debug — never enable in prod (leaks AUTH)
      send-concurrency: 4           # mails one instance sends in parallel (each worker holds an SMTP connection)
      transport:
        connection-timeout: 5s      # SMTP/IMAP/POP3 connect timeout
        read-timeout: 30s           # SMTP/IMAP/POP3 read timeout
    sms:
      send-concurrency: 10          # SMS one instance sends in parallel
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

当 classpath 上有 Micrometer 时，`MessageMetrics` 发出两类计数器：

| 名称 | 标签 | 递增时机 |
|---|---|---|
| `softa.message.sent` | `channel`（mail/sms）、`provider` | 提供商调用成功 |
| `softa.message.failed` | `channel`、`provider`、`outcome`（retry/failed/dead_letter） | 一次发送尝试失败（含准备阶段） |

`softa.message.failed{outcome=dead_letter}` 在发送记录转换为 DEAD_LETTER 时由 `SendFailureHandler` 发出。

### 入站投递状态

邮件退信和已读回执状态来自 IMAP 接收路径上的**入站邮件**——DSN 报告邮件（`DsnRule` / `MailerDaemonRule` → `BounceReceiptLinker` → `markBounced`）和 MDN 邮件（`ReadReceiptRule`）。不提供入站 HTTP 回调；对于提供商推送的投递事件（SMS DLR、ESP 邮件事件），在应用中增加控制器调用记录服务的 CAS 转换。

### 速率限制

`MailSendServerConfig` 和 `SmsProviderConfig` 携带两个配额列：

- `daily_send_limit` — 每日累计发送
- `rate_limit_per_minute` — 每分钟发送（平滑突发）

任一可为 null/zero 以禁用该窗口。计数器位于 Redis（`rl:{channel}:{daily|min}:{tenantId}:{configId}:{window}`），因此多实例部署共享一个预算。配额突破表现为提供商侧 `QUOTA_EXCEEDED` 错误，分类为 `ErrorCategory.QUOTA`——重试策略至少等 5 分钟再试，避免猛击提供商。

### 僵尸记录清扫器

`ZombieRecordSweeper` 每分钟运行。`updated_time` 早于 5 分钟前（远长于任何一次发送：连接和读超时都只有几秒）且卡在 `SENDING` 的记录，经 versionLock 转换回 `RETRY`，`next_retry_at = now`，使其重新被投递循环认领。覆盖 JVM 在认领记录与完成提供商调用之间崩溃的情况。

它和投递循环一起，在装了 message-starter 的实例上总是运行。

### 敏感字段加密

配置表上的凭证列（`mail_*_server_config.password`、`sms_provider_config.api_secret`）定义得足够宽以容纳密文。框架透明加密（`MetaField.isEncrypted()`）处理读写侧——但部署时仍须在 `SysField` 元数据表中将**这些字段标记为 encrypted**。见 [字段元数据 `encrypted` 属性](../metadata/field)；开箱即列存储明文。

## 扩展点

### 邮件传输

邮件发送仅 SMTP。`MailSendServerConfig` 是完整外发服务器配置。`SmtpMailTransport` 在两次发送之间保持已登录的连接，每个服务器配置一个小连接池，所以经同一台服务器连续发信时，TCP 连接、TLS 握手和 AUTH 只做一次，而不是每封一次。空闲连接复用前先用 `NOOP` 探测；出过错、发满 100 封或空闲超过 30 秒的连接直接关闭。这个空闲上限低于 SMTP 服务器前面任何 NAT 或负载均衡的空闲上限：被悄悄断开的连接只会让探测读超时。

每个连接池以建立连接时用的设置为键，所以改过的配置（换了主机、轮换了密码）下次发送就开新连接，配置变更仍然只需驱逐 Redis 配置缓存（update/delete 时自动）。连通性测试总是开新连接。

不接受同一个连接上第二封信的服务器，在它的配置上关掉 `connectionReuseEnabled`（默认开）：经它的每次发送各自开、关连接，它原有的连接池在下次发送时关闭。

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

失败发送由 `ExponentialBackoffPolicy` 重试——依次等 30 秒、60 秒、120 秒、240 秒、480 秒，每次 ±50% 随机抖动。`ErrorClassifier` 的错误类别决定处置：TRANSIENT / QUOTA / UNKNOWN 重试（QUOTA 至少等 5 分钟），5 次重试用完即死信，约在首次失败后一刻钟；PERMANENT / INVALID_INPUT / AUTH / CONFIG 立即失败不重试。`RetryDecision` 为密封类型（`Retry` / `Fail` / `DeadLetter`），使失败处理器的 `switch` 保持穷尽。

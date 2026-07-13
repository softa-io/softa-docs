## 邮件

### 核心逻辑

#### 配置解析

邮件发送使用以下默认查找顺序：

```text
1. 当前租户默认邮件服务器
2. 平台默认邮件服务器（`tenant_id = 0`）
3. 若均不可用则 BusinessException
```

若多条记录标记为默认，使用 `sequence` 最小的一条。配置对象在 Redis 中缓存 5 分钟；通过 `MailSendServerConfigService.updateOne` / `deleteById` 更新配置时会自动驱逐。

#### 模板解析

邮件模板按 `code` 解析，带平台回退：

```text
租户模板（code + enabled）
  -> 平台模板（tenant_id = 0）
  -> BusinessException
```

模板占位符使用统一的 Softa 语法：`{{ variable }}`。

#### 投递管道

每次接受的发送恰好产生一条 `MailSendRecord`。状态转换通过 CAS 辅助，因此 broker 重复投递会自我拒绝，无需去重表：

```text
PENDING → SENDING → SENT
               ↓
               RETRY → SENDING → SENT
                   ↓
                   DEAD_LETTER（重试耗尽）
               FAILED（永久错误：错误收件人、认证、畸形输入）
```

失败时，`ErrorClassifier` 将提供商错误映射为 `ErrorCategory`（TRANSIENT / PERMANENT / INVALID_INPUT / AUTH / QUOTA / UNKNOWN），重试策略（`ExponentialBackoffPolicy`）决定：

- **Retry** → `markRetry(nextRetryAt = now + backoff)` + 在 `mail-send` 上入队延迟 outbox 行，使同一投递消费者重新驱动
- **Fail** → `markFailed`（终态；不重试；提供商永久拒绝）
- **DeadLetter** → `markDeadLetter` + 归档 `dead_letter_message` 行（`source = SendExhausted`）

业务代码通常无需显式选择邮件服务器。默认应由平台或租户管理员准备。

### 邮件服务器选择

与 SMS 类似，**邮件服务器选择为单选，发送失败后不切换提供商**。发送时的选择链：

```text
SendMailDTO.serverConfigId          (1) 调用点显式覆盖
  ↓ null
MailTemplate.preferredServerConfigId (2) 模板级软偏好
  ↓ null
MailServerDispatcher.resolveSend()   (3) 租户默认 → 平台默认
  ↓ 未找到
BusinessException
```

一旦选定配置，即固定——没有「主服务器失败，尝试备用」行为。SMTP 失败走正常重试策略（对同一服务器退避重试），而非切换服务器。

#### 字段含义

| 字段 | 用于 | 不用于 |
|---|---|---|
| `MailSendServerConfig.isDefault` | 标记租户/平台默认候选 | 故障转移（仅会选取第一个默认） |
| `MailSendServerConfig.sequence` | 多条 `isDefault=true` 时的决胜 + UI 列表顺序 | 故障转移优先级 |
| `MailReceiveServerConfig.sequence` | Cron 轮询顺序（每个 tick 轮询所有启用配置）+ UI 列表顺序 | 故障转移优先级 |
| `MailTemplate.preferredServerConfigId` | 每模板首选 SMTP（如营销→SendGrid，事务→Postmark） | 硬绑定——DTO 仍可覆盖 |

> 命名说明：字段名为 `sequence`（非 `priority`），因为邮件侧将该值用于 UI / 默认排序，而非重试链。SMS 侧保留 `priority`，因为国家路由和模板绑定都将其用作显式提供商选择顺序。

#### `preferredServerConfigId` 用例

- **营销 vs 事务拆分**：营销模板 → 跟踪像素 SMTP（SendGrid），事务 → 高送达率 SMTP（Postmark）
- **发件域名对齐**：HR 模板经 `hr@company.com` 走企业 Exchange，品牌模板经 `noreply@brand.com` 走 SendGrid
- **合规**：法律披露模板锁定内部 SMTP
- **多租户白标**：每个租户的欢迎模板指向其自身配置的 SMTP

软偏好（非硬绑定），因为调用方偶尔需要覆盖路径——例如运维在提供商故障期间通过在调用点设置 `SendMailDTO.serverConfigId` 切断所有外发至备用 SMTP，而无需修改每条模板行。

### 发送邮件

注入面向应用的单一 `MessageService`：

```java
@Autowired
private MessageService messageService;

// Plain text
SendMailDTO plain = new SendMailDTO();
plain.setTo(List.of("alice@example.com"));
plain.setSubject("Hello");
plain.setTextBody("Welcome to Softa.");
Long recordId = messageService.sendMail(plain);

// Full control. Multiple `to` recipients share one MIME message and one record.
SendMailDTO dto = new SendMailDTO();
dto.setTo(List.of("a@x.com", "b@x.com"));
dto.setCc(List.of("manager@example.com"));
dto.setSubject("Offer Letter");
dto.setHtmlBody("<p>Dear Alice...</p>");
dto.setAttachments(List.of(attachment));
Long fullRecordId = messageService.sendMail(dto);
// IDs point at PENDING records; the consumer flips them to SENT/FAILED.
// To check terminal status, query MailSendRecordService.getById(recordId).
```

> **所有邮件发送均为异步。** `sendMail / sendMailBatch` 在一个 DB 事务中持久化 `MailSendRecord (PENDING)` + outbox 行并立即返回；SMTP 投递在 broker 驱动的消费者中发生。刻意无同步变体：SMTP `250 OK` **不等于**「用户已收到邮件」——用户仍须等待数秒到数分钟由提供商投递，因此约 500 ms 的 broker 延迟不可见，而单一异步路径避免阻塞 HTTP 线程及 stranded-`RETRY` 边界情况。

### 独立批量

```java
SendMailDTO alice = new SendMailDTO();
alice.setTo(List.of("alice@example.com"));
alice.setTemplateCode("ORDER_CONFIRMATION");
alice.setTemplateVariables(Map.of("orderNo", "SO-1001", "name", "Alice"));

SendMailDTO bob = new SendMailDTO();
bob.setTo(List.of("bob@example.com"));
bob.setTemplateCode("ORDER_CONFIRMATION");
bob.setTemplateVariables(Map.of("orderNo", "SO-1002", "name", "Bob"));

List<Long> ids = messageService.sendMailBatch(List.of(alice, bob));
```

### 附件

```java
FileInfo attachment = fileService.uploadFromStream(uploadRequest);
SendMailDTO mail = new SendMailDTO();
mail.setAttachments(List.of(attachment));
```

先通过 `file-starter` 上传字节，再传入得到的 `FileInfo`。

### 邮件模板

当业务内容应可复用时使用模板：

```java
@Autowired
private MessageService messageService;

Map<String, Object> vars = Map.of(
    "name", "Alice",
    "activationUrl", "https://app.example.com/activate/abc123"
);

SendMailDTO mail = new SendMailDTO();
mail.setTo(List.of("alice@example.com"));
mail.setTemplateCode("USER_WELCOME");
mail.setTemplateVariables(vars);
messageService.sendMail(mail);
```

#### 模板示例

```bash
POST /MailTemplate/createOne
{
  "code": "USER_WELCOME",
  "name": "User Welcome Email",
  "subject": "Welcome, {{ name }}!",
  "bodyHtml": "<h1>Welcome, {{ name }}</h1><p><a href='{{ activationUrl }}'>Activate</a></p>",
  "bodyMode": "HTML",
  "isEnabled": true
}
```

### 接收邮件

若业务需要入站邮件处理，注入 `MailReceiveService`：

```java
@Autowired
private MailReceiveService mailReceiveService;

// Fetch from auto-resolved server
int fetched = mailReceiveService.fetchNewMails();

// Fetch from a specific server config
int fetchedByServer = mailReceiveService.fetchNewMails(serverConfigId);

// Mark as read
mailReceiveService.markAsRead(recordId);
mailReceiveService.markAsRead(List.of(id1, id2, id3));
```

消息按 `(server_config_id, message_id)` 去重，因此重复轮询安全。退信和已读回执分类在单次批量 `IN()` 查询中将入站邮件与发送日志匹配；匹配的 `MailSendRecord` 通过 CAS 更新（见 `markBounced` / `markReadReceiptReceived`）。

### 定时拉取

- 定时拉取为可选，需要 `cron-starter`
- 当前消费者监听 `mq.topics.cron-task.topic`
- 收到名称以 `mail-fetch` 开头的 cron 时，轮询每个 `isEnabled = true` 的接收配置——跨所有租户；每个配置的拉取在该配置的租户上下文中运行
- 节奏由 `cron-starter` 中注册的单一全局 `mail-fetch` cron 控制；本模块不支持每收件箱独立节奏

### 邮件状态参考

#### MailSendRecord

```text
Pending -> Sending -> Sent
                  -> Retry -> Sending -> Sent
                          -> DeadLetter
                  -> Failed
```

- `Pending` — 记录已创建，等待消费者或 outbox 发布者
- `Sending` — 通过 CAS 被消费者认领；SMTP 发送进行中
- `Sent` — SMTP 服务器已接受消息
- `Retry` — 瞬态失败；`next_retry_at` 到期后重新驱动
- `Failed` — 永久 SMTP 拒绝或校验失败（错误收件人、认证、畸形输入）
- `DeadLetter` — 重试预算耗尽；需运维介入

关联入站退信时，记录可从 `Sent → Failed` 转换。

#### MailReceiveRecord

```text
Unread -> Read -> Archived
               -> Deleted
```

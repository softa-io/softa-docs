## 邮件

### 核心逻辑

#### 配置解析

邮件发送使用以下默认查找顺序：

```text
1. 当前租户默认邮件服务器
2. 平台默认邮件服务器（`tenant_id = -1`）——静默兜底；平台配置在租户管理面不可见
3. 若均不可用则 BusinessException
```

若多条记录标记为默认，使用 `sequence` 最小的一条。配置对象在 Redis 中缓存 5 分钟；通过 `MailSendServerConfigService.updateOne` / `deleteById` 更新配置时会自动驱逐。

声明 `scope = PLATFORM` 的发送会跳过第 1 步，仅解析平台默认（缓存在平台键下，既不读也不污染租户自己的默认缓存条目）——平台邮件不得经由租户控制的 SMTP 发出。

#### 模板解析

邮件模板按 `code` 在发送 scope 指定的层级内解析——两个层级是分离的命名空间，无任何回退（租户在开通时经应用的逐租户种子文件获得自己的模板行）：

```text
scope = TENANT（默认） -> 当前作用域自己的模板（code + enabled）
scope = PLATFORM      -> 平台层模板（tenant_id = -1）
所在层级缺失           -> BusinessException（响亮报错——不跨层解救）
```

模板占位符使用统一的 Softa 语法：`{{ variable }}`。

#### 正文模式

`bodyMode` 声明模板（及由它发出的每条记录）产出的 MIME 形态——UI 据此选择编辑器，发送路径据此挑选 MIME part，同一套 `BodyMode` 词汇表：

| bodyMode | 发送形态 | bodyHtml | bodyText |
| --- | --- | --- | --- |
| `HTML` | 单一 `text/html` | 作者撰写 | — |
| `PLAIN` | 单一 `text/plain` | — | 作者撰写 |
| `HTML_WITH_DERIVED_PLAIN` | `multipart/alternative` | 作者撰写 | 受理时从 HTML 派生（`HtmlUtils.toText`） |
| `HTML_WITH_AUTHORED_PLAIN` | `multipart/alternative` | 作者撰写 | 作者撰写（为空时退回派生，记录如实改标 `DERIVED`） |

在模板编辑器中切换 `bodyMode` 时，已有正文会迁移到新模式实际发送的编辑器（HTML → 文本走 `HtmlUtils.toText`，文本 → 转义后的 HTML 段落；非空目标绝不覆盖），新模式不使用的列会被清空。仅表单状态——保存前不落库，Cancel 恢复原记录。

#### 模板工具（编辑器端点）

Preview & Send Test 弹窗背后是三个可按 id 寻址的操作。`id` 指向**正在编辑的那一行**——无解析语义、无 `isEnabled` 过滤，禁用模板在启用之前即可完整检视与试发；`code` 在调用方自身层级内解析，供程序化调用方使用：

- `GET /api/mail/templates/variables?id=|code=`——模板的去重输入 token，按首次出现排序并为输入 UI 分类：`VARIABLE`（简单名，含 unicode 与点号路径 → 一行文本输入）、`COLLECTION`（Pebble `{% for %}` 的迭代集合 → JSON 值输入）、`EXPRESSION`（操作数以原始 JSON 提供）、`RESERVED_FIELD`（服务端解析）。模板局部名——循环变量、Pebble 内建 `loop`、`{% set %}` 目标——一律剔除。
- `POST /api/mail/templates/preview`——按给定变量渲染 subject / bodyHtml / bodyText，不发送。
- `SendMailDTO.templateId`——试发精确寻址该行并走完整生产管线：预览什么，发出什么。

#### 投递管道

每次接受的发送恰好产生一条 `MailSendRecord`。状态转换通过 CAS 辅助，因此 broker 重复投递会自我拒绝，无需去重表：

```text
PENDING → SENDING → SENT
               ↓
               RETRY → SENDING → SENT
                   ↓
                   DEAD_LETTER（重试耗尽）
               FAILED（提供商永久拒绝：错误收件人、畸形输入）
               DEAD_LETTER（不可重试且非永久：认证失败或配置无法解析——
                            首败即入，不烧重试预算）
```

失败时，`ErrorClassifier` 将提供商错误映射为 `ErrorCategory`（TRANSIENT / PERMANENT / INVALID_INPUT / AUTH / QUOTA / UNKNOWN），重试策略（`ExponentialBackoffPolicy`）决定：

- **Retry** → `markRetry(nextRetryAt = now + backoff)` + 在 `mail-send` 上入队延迟 outbox 行，使同一投递消费者重新驱动
- **Fail** → `markFailed`（终态；不重试；提供商永久拒绝）
- **DeadLetter** → `markDeadLetter` + 归档 `dead_letter_message` 行（`source = SendExhausted`）——重试预算耗尽到达，或不可重试且非永久的失败（AUTH 类）**首败直达**。配置解析失败以标记码 `CONFIG_NOT_RESOLVABLE` 走首败直达路线：配坏的 config 重试永远不会好——修复配置后用手动 Retry 重新入队。

业务代码通常无需显式选择邮件服务器。默认应由平台或租户管理员准备。

### 邮件服务器选择

与 SMS 类似，**邮件服务器选择为单选，发送失败后不切换提供商**。发送时的选择链：

```text
SendMailDTO.serverConfigId          (1) 调用点显式覆盖
  ↓ null
MailTemplate.preferredServerConfigId (2) 模板级软偏好
  ↓ null
MailServerDispatcher.resolveSend()   (3) 租户默认 → 平台默认
  ↓ 未找到                               （PLATFORM scope：仅平台默认）
BusinessException
```

一旦选定配置，即固定——没有「主服务器失败，尝试备用」行为。SMTP 失败走正常重试策略（对同一服务器退避重试），而非切换服务器。

#### 字段含义

| 字段 | 用于 | 不用于 |
|---|---|---|
| `MailSendServerConfig.isDefault` | 标记租户/平台默认候选 | 故障转移（仅会选取第一个默认） |
| `MailSendServerConfig.sequence` | 多条 `isDefault=true` 时的决胜 + UI 列表顺序 | 故障转移优先级 |
| `MailReceiveServerConfig.sequence` | Cron 轮询顺序（每个 tick 轮询所有启用配置）+ UI 列表顺序 | 故障转移优先级 |
| `MailTemplate.preferredServerConfigId` | 每模板首选 SMTP（如营销→SendGrid，事务→Postmark）。写入时做作用域校验：只能 pin 模板自身租户作用域拥有的配置（平台配置对租户不可见） | 硬绑定——DTO 仍可覆盖 |

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

#### 地址规则

地址在**受理时**校验——写错的地址是同步 4xx、点名字段和具体条目，而不是留给异步管线、事后在发送记录上才发现的 SMTP 失败：

- `to` / `cc` / `bcc`：每个列表元素必须是**恰好一个**严格 RFC822 mailbox。display-name 形式（`Alice <alice@x.com>`）合法；单个元素里夹带列表会被拒绝——一元素一地址。
- `replyTo`：单个字符串承载 RFC822 **地址列表**——一个或多个 mailbox。逗号 / 分号 / 换行分隔均可，受理时归一化为逗号列表；记录存储归一化后的形式。纯逗号输入绝不改写——带引号内嵌逗号的 display-name（`"Smith, John" <j@x.com>`）得以保留。

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


## 邮件

### 核心逻辑

#### 配置解析

邮件发送按以下默认顺序查找：

```text
1. 当前租户默认邮件服务器
2. 平台默认邮件服务器（`tenant_id = 0`）
3. 若均不可用则抛出 BusinessException
```

若有多条记录标记为默认，则取 `sortOrder` 最小的一条。

#### 模板解析

邮件模板按以下回退逻辑选择：

```text
租户 + 当前语言
  -> 租户 + 默认语言
  -> 平台 + 当前语言
  -> 平台 + 默认语言
  -> BusinessException
```

模板占位符统一使用 Softa 语法：`{{ variable }}`。

#### 异步投递

- `sendAsync(...)` 立即返回，在后台完成投递
- 每次发送都会自动创建一条 `MailSendRecord`

业务代码通常无需显式选择邮件服务器，默认应由平台或租户管理员预先配置。

### 发送邮件

在需要投递邮件处注入 `MailSendService`：

```java
@Autowired
private MailSendService mailSendService;

// 纯文本
mailSendService.sendText("alice@example.com", "Hello", "Welcome to Softa.");

// HTML
mailSendService.sendHtml("alice@example.com", "Welcome", "<h1>Hello Alice</h1>");

// 多收件人
mailSendService.sendHtml(List.of("a@x.com", "b@x.com"), "Notice", "<p>...</p>");

// 完全控制
SendMailDTO dto = new SendMailDTO();
dto.setTo(List.of("alice@example.com"));
dto.setCc(List.of("manager@example.com"));
dto.setSubject("Offer Letter");
dto.setHtmlBody("<p>Dear Alice...</p>");
dto.setAttachments(List.of(attachment));
mailSendService.send(dto);

// 异步
mailSendService.sendAsync(dto);
```

### 附件

```java
MailAttachmentDTO attachment = new MailAttachmentDTO();
attachment.setFileName("report.pdf");
attachment.setContentType("application/pdf");
attachment.setData(pdfBytes);
// 或
attachment.setFileId(fileId);
```

### 邮件模板

当业务内容需要复用或多语言时，使用模板：

```java
@Autowired
private MailSendService mailSendService;

Map<String, Object> vars = Map.of(
    "name", "Alice",
    "activationUrl", "https://app.example.com/activate/abc123"
);

mailSendService.sendByTemplate("USER_WELCOME", "alice@example.com", vars);
mailSendService.sendByTemplate("ORDER_CONFIRMATION", List.of("a@x.com", "b@x.com"), vars);
```

当前请求语言取自 `ContextHolder`。

#### 模板示例

```bash
POST /MailTemplate/createOne
{
  "code": "USER_WELCOME",
  "name": "User Welcome Email",
  "language": "en-US",
  "subject": "Welcome, {{ name }}!",
  "body": "<h1>Welcome, {{ name }}</h1><p><a href='{{ activationUrl }}'>Activate</a></p>",
  "includePlainText": true,
  "isEnabled": true
}
```

使用 `language: "default"` 可定义回退模板。

### 接收邮件

若业务需要处理入站邮件，注入 `MailReceiveService`：

```java
@Autowired
private MailReceiveService mailReceiveService;

// 从自动解析的服务器拉取
int fetched = mailReceiveService.fetchNewMails();

// 从指定服务器配置拉取
int fetchedByServer = mailReceiveService.fetchNewMails(serverConfigId);

// 标记已读
mailReceiveService.markAsRead(recordId);
mailReceiveService.markAsRead(List.of(id1, id2, id3));
```

消息按 `(server_config_id, message_id)` 去重，因此重复轮询是安全的。

### 邮件状态参考

#### MailSendRecord

```text
PENDING -> SENT
PENDING -> FAILED
PENDING -> RETRY
```

#### MailReceiveRecord

```text
UNREAD -> READ -> ARCHIVED
              -> DELETED
```

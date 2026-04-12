
## Email

### Core Logic

#### Config resolution

Email sending uses the following default lookup order:

```text
1. Current tenant default mail server
2. Platform default mail server (`tenant_id = 0`)
3. BusinessException if nothing is available
```

If multiple records are marked as default, the one with the smallest `sortOrder` is used.

#### Template resolution

Email templates use the following fallback logic:

```text
tenant + current language
  -> tenant + default language
  -> platform + current language
  -> platform + default language
  -> BusinessException
```

Template placeholders use the unified Softa syntax: `{{ variable }}`.

#### Async delivery

- `sendAsync(...)` returns immediately and performs delivery in the background
- Every send automatically creates a `MailSendRecord`

Business code usually does not need to choose a mail server explicitly. Defaults should be prepared
by the platform or tenant admin.

### Sending Email

Inject `MailSendService` where email delivery is needed:

```java
@Autowired
private MailSendService mailSendService;

// Plain text
mailSendService.sendText("alice@example.com", "Hello", "Welcome to Softa.");

// HTML
mailSendService.sendHtml("alice@example.com", "Welcome", "<h1>Hello Alice</h1>");

// Multiple recipients
mailSendService.sendHtml(List.of("a@x.com", "b@x.com"), "Notice", "<p>...</p>");

// Full control
SendMailDTO dto = new SendMailDTO();
dto.setTo(List.of("alice@example.com"));
dto.setCc(List.of("manager@example.com"));
dto.setSubject("Offer Letter");
dto.setHtmlBody("<p>Dear Alice...</p>");
dto.setAttachments(List.of(attachment));
mailSendService.send(dto);

// Async
mailSendService.sendAsync(dto);
```

### Attachments

```java
MailAttachmentDTO attachment = new MailAttachmentDTO();
attachment.setFileName("report.pdf");
attachment.setContentType("application/pdf");
attachment.setData(pdfBytes);
// or
attachment.setFileId(fileId);
```

### Email Templates

Use templates when business content should be reusable or multilingual:

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

The current request language is taken from `ContextHolder`.

#### Template example

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

Use `language: "default"` to define a fallback template.

### Receiving Email

If the business needs inbound mail processing, inject `MailReceiveService`:

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

Messages are deduplicated by `(server_config_id, message_id)`, so repeated polling is safe.

### Email Status Reference

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
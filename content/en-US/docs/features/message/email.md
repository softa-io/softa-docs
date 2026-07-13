## Email

### Core Logic

#### Config resolution

Email sending uses the following default lookup order:

```text
1. Current tenant default mail server
2. Platform default mail server (`tenant_id = 0`)
3. BusinessException if nothing is available
```

If multiple records are marked as default, the one with the smallest `sequence`
is used. Config objects are cached in Redis for 5 minutes; updating a config
via `MailSendServerConfigService.updateOne` / `deleteById` evicts automatically.

#### Template resolution

Email templates are resolved by `code` with a platform fallback:

```text
tenant template (code + enabled)
  -> platform template (tenant_id = 0)
  -> BusinessException
```

Template placeholders use the unified Softa syntax: `{{ variable }}`.

#### Delivery pipeline

Every accepted send produces exactly one
`MailSendRecord`. State transitions go through CAS helpers so duplicate broker
deliveries self-reject without a dedupe table:

```text
PENDING → SENDING → SENT
               ↓
               RETRY → SENDING → SENT
                   ↓
                   DEAD_LETTER (retries exhausted)
               FAILED (permanent error: bad recipient, auth, malformed input)
```

On failure, `ErrorClassifier` maps the provider error to an `ErrorCategory`
(TRANSIENT / PERMANENT / INVALID_INPUT / AUTH / QUOTA / UNKNOWN), and the
retry policy (`ExponentialBackoffPolicy`) decides:

- **Retry** → `markRetry(nextRetryAt = now + backoff)` + enqueue a delayed
  outbox row on `mail-send` so the same delivery consumer re-drives it
- **Fail** → `markFailed` (terminal; no retry; permanent provider reject)
- **DeadLetter** → `markDeadLetter` + archive a `dead_letter_message` row (`source = SendExhausted`)

Business code usually does not need to choose a mail server explicitly. Defaults
should be prepared by the platform or tenant admin.

### Mail Server Selection

Like SMS, **mail server selection is single-pick with no provider switching
after a send failure**. The selection chain at send time:

```text
SendMailDTO.serverConfigId          (1) explicit call-site override
  ↓ null
MailTemplate.preferredServerConfigId (2) template-level soft preference
  ↓ null
MailServerDispatcher.resolveSend()   (3) tenant default → platform default
  ↓ none found
BusinessException
```

Once a config is chosen, that's it — there is no "primary failed, try
secondary" behaviour. SMTP failure goes through the normal retry policy
(retry against the same server with backoff), not server-switching.

#### What the fields mean

| Field | Used for | NOT used for |
|---|---|---|
| `MailSendServerConfig.isDefault` | Marks tenant/platform default candidate | Failover (only the first default is ever picked) |
| `MailSendServerConfig.sequence` | Tie-break among multiple `isDefault=true` rows + UI list order | Failover priority |
| `MailReceiveServerConfig.sequence` | Cron polling order (all enabled configs polled each tick) + UI list order | Failover priority |
| `MailTemplate.preferredServerConfigId` | Per-template preferred SMTP (e.g. marketing→SendGrid, transactional→Postmark) | Hard binding — DTO can still override |

> Naming note: the field is called `sequence` (not `priority`) because the
> mail side uses the value for UI / default ordering, not a retry chain. The SMS
> side keeps `priority` because country routing and template bindings both use
> it as explicit provider-selection order.

#### Use cases for `preferredServerConfigId`

- **Marketing vs transactional split**: marketing templates → tracking-pixel
  SMTP (SendGrid), transactional → high-deliverability SMTP (Postmark)
- **From-domain alignment**: HR templates from `hr@company.com` via corporate
  Exchange, brand templates from `noreply@brand.com` via SendGrid
- **Compliance**: legal disclosure templates locked to internal SMTP
- **Multi-tenant white-label**: each tenant's welcome template points at their
  own configured SMTP

Soft preference (not hard binding) because callers occasionally need an
override path — e.g. ops cuts all outbound to the backup SMTP during a
provider outage by setting `SendMailDTO.serverConfigId` at the call site
without touching every template row.

### Sending Email

Inject the single application-facing `MessageService`:

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

> **All mail sends are asynchronous.** `sendMail / sendMailBatch` persist a
> `MailSendRecord (PENDING)` + outbox row in one DB transaction
> and return immediately; SMTP delivery happens in the broker-driven consumer.
> There is deliberately no synchronous variant: an SMTP `250 OK` is **not** the
> same as "user has the email" — the user still waits seconds-to-minutes for the
> provider to deliver, so the ~500ms of broker latency is invisible, while a
> single async path avoids blocking HTTP threads and the stranded-`RETRY` edge case.

### Independent Batch

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

### Attachments

```java
FileInfo attachment = fileService.uploadFromStream(uploadRequest);
SendMailDTO mail = new SendMailDTO();
mail.setAttachments(List.of(attachment));
```

Upload bytes through `file-starter` first, then pass the resulting `FileInfo`.

### Email Templates

Use templates when business content should be reusable:

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

#### Template example

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

Messages are deduplicated by `(server_config_id, message_id)`, so repeated
polling is safe. Bounce and read-receipt classification matches inbound mails
against the send log in a single batched `IN()` query; the matched
`MailSendRecord` is updated via CAS (see `markBounced` / `markReadReceiptReceived`).

### Scheduled Fetch

- Scheduled fetch is optional and requires `cron-starter`
- The current consumer listens to `mq.topics.cron-task.topic`
- When it receives a cron whose name starts with `mail-fetch`, it polls every
  receive config with `isEnabled = true` — across all tenants; each config's
  fetch runs inside that config's tenant context
- Cadence is governed by a single global `mail-fetch` cron registered in
  `cron-starter`; per-inbox cadence is not supported in this module

### Email Status Reference

#### MailSendRecord

```text
Pending -> Sending -> Sent
                  -> Retry -> Sending -> Sent
                          -> DeadLetter
                  -> Failed
```

- `Pending` — record created, waiting for the consumer or outbox publisher
- `Sending` — claimed by a consumer via CAS; SMTP send in flight
- `Sent` — SMTP server accepted the message
- `Retry` — transient failure; re-driven after `next_retry_at` elapses
- `Failed` — permanent SMTP reject or validation failure (bad recipient, auth, malformed input)
- `DeadLetter` — retry budget exhausted; ops intervention required

A record can transition `Sent → Failed` when an inbound bounce is correlated.

#### MailReceiveRecord

```text
Unread -> Read -> Archived
               -> Deleted
```


# Message Starter

Provides unified messaging capabilities for Softa applications:

- **Email**: send emails, receive emails, and render email templates
- **SMS**: send SMS messages, batch send, render templates, and retry on failure
- **Inbox**: push in-app notifications to users

Every mail and SMS is a **send record**, and the record is the delivery queue: a
delivery loop claims due records through an **optimistic-lock CAS** state machine,
so concurrent instances never send a record twice and an in-flight crash loses
nothing (at-least-once: a crash between the provider accepting a message and the
record being marked sent re-sends it once). No broker sits in the delivery path.

## Dependency

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>message-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## Application API

`MessageService` is the only message-submission service exposed to business
modules:

| Channel | Single | Batch |
|---|---|---|
| Mail | `sendMail(SendMailDTO)` | `sendMailBatch(List<SendMailDTO>)` |
| SMS | `sendSms(SendSmsDTO)` | `sendSmsBatch(List<SendSmsDTO>)` |
| Inbox | `sendInbox(SendInboxDTO)` | `sendInboxBatch(List<SendInboxDTO>)` |

One DTO always represents one independent message. Batch methods accept 1..500
items, join the caller's transaction, and return record IDs in input order. A
mail DTO may address multiple `to` recipients in one MIME message; an SMS DTO
always contains exactly one phone number.

## Requirements and Configuration

The tables are declared by the starter's `@Model` classes: an application whose
`system.metadata.scanner-scope` covers `io\.softa\.starter\.message.*` gets them
created and kept current at boot. Runtime writes use the framework
ORM/versionLock path, so claiming a record does not depend on database-specific
row-lock SQL. Upgrading from a release that delivered through an outbox: see
*Upgrading from the outbox pipeline* below.

### Hard dependencies

`message-starter` deliberately treats Redis and the relational database as
**hard dependencies**. There is no fail-open / local-fallback path for them —
if either is unavailable the operation that depends on it surfaces an
exception to the caller. This keeps the runtime simple and matches how the
rest of the Softa stack already behaves (cache, distributed lock, session,
etc.). The trade-off and the operational expectations:

| Dependency | Used by | Failure behaviour | Operational expectation |
|---|---|---|---|
| Database | All paths (send records, framework versionLock) | Operation throws; caller sees 5xx | HA-Database (replicated MySQL / managed PG); migrations applied. |
| Redis | `RateLimiter` (per-config delivery rate windows), `MailConfigCache` | Operation throws; caller sees 5xx | Sentinel or Cluster setup. K8s `readinessProbe` should include `/actuator/health/redis` so the load balancer routes traffic away while Redis is unreachable. |
| Pulsar broker | `CronTaskMailFetchConsumer` (scheduled mail fetch), `DeadLetterConsumer` (archiving other consumers' poison messages) | Fetching and poison archiving pause until the broker is back. Sending is unaffected: delivery reads the send records directly. | Optional for sending. |
| SMTP / SMS provider | Outbound send | Per-record fails; classified by `ErrorClassifier`; retried with exponential back-off (`ExponentialBackoffPolicy`). | Configure provider-side rate limits below provider's quota. |

**Why no in-process fallback for Redis?** A local Guava limiter would silently
let one node burst past the cross-node quota during Redis outages, which on a
long enough outage can blow through provider day-quotas and cost real money
(Twilio / Aliyun / SES). It's safer to fail closed at the load-balancer level
via the readiness probe than to silently fan out under partial failure.

### Multi-tenancy

All messaging business tables (`mail_*`, `sms_*`, `inbox_notification`) are
`multiTenant` models: when the platform's `system.enable-multi-tenancy` is on,
reads are isolated to the caller's tenant and writes are auto-stamped by the
ORM. `tenant_id = -1` rows (`BaseConstant.PLATFORM_TENANT_ID`) form the **platform tier** — owned by the platform operator and invisible to tenants. The two tiers are fully separate namespaces; there is no overlay:

- **Templates are seeded per tenant, not shared.** Each tenant receives its template rows at provisioning from the APPLICATION's tenant seed files (the tenant files of its `seed-manifest.yml`, run by seed-starter when the tenant is set up). From then on the tenant owns and edits its rows freely. A tenant runs a seed file once, so a new template reaches existing tenants as a new tenant file the platform admin runs — or, when the application gives its template file `mode: append` in the manifest, straight from that file on the admin's next run, created only where a tenant lacks it; a template the tenant already has under that code without a seed binding (inserted by a script or added by hand) is bound by its code and left as it is, never created a second time. Either way, a change to a template they already have goes out as a data migration (the seed file is edited too, for tenants created after). The platform tier holds only the templates PLATFORM-scoped sends render (billing, security); a code needed on both tiers (e.g. a public password-reset fallback) appears in both seed sets. Send-time resolution is tier-pure: `scope = TENANT` reads the current scope's own rows only, `scope = PLATFORM` reads the platform tier only.
- **Server/provider configs are invisible to tenants.** Tenants see and pin only their own configs; the platform tier is reached solely by the dispatchers' silent fallback (`@CrossTenant`) when a tenant has none — mail send/receive fall back to the platform default, and SMS routing falls back **per country** (tiers never interleave within one country).
- Background jobs are cross-tenant scans that execute per-record in the owning
  tenant's context: the delivery loop claims and sends each due record inside
  its record's tenant (and under the trace id of the request that submitted it),
  the scheduled mail fetch runs each receive config inside its config's tenant,
  and the zombie sweeper revives each stuck record inside its record's tenant.
- The dead-letter store is a shared infrastructure table.

Two more moving parts round the model out:

- Per-send tier policy: `SendMailDTO.scope` / `SendSmsDTO.scope` (`MessageScope.TENANT` default, `PLATFORM` = the platform tier for template, server or provider AND quota bucket — for billing/security/compliance messages). The scope is stored on the send record (`platform_scope`), so the first delivery attempt renders and routes in the tier the caller chose. The record belongs to the tenant the call is made in (see *Calling MessageService*), so a TENANT-scoped render reaches that tenant's own template.
- Platform rows are structurally un-writable from a tenant scope (payload guard, insert stamping, and the tenant-filtered pre-read on update/delete); the mail write endpoints additionally turn that silent no-op into an explanatory `BusinessException`.

With multi-tenancy disabled, no filtering or stamping occurs and everything
behaves single-tenant.

### Enable / disable (framework active control)

The seven config/template models (`MailTemplate`, `MailSendServerConfig`, `MailReceiveServerConfig`, `SmsTemplate`, `SmsProviderConfig`, `SmsProviderRegion`, `SmsTemplateProviderBinding`) declare `@Model(activeControl = true)` with the framework's `active` field — no hand-rolled `isEnabled` switch, and no service hand-writes an `active = true` condition: `WhereBuilder` appends it to every FlexQuery read, so resolution, dispatch and list surfaces filter consistently and a new query cannot forget it. Disabling retires a row from every read WITHOUT deleting it, which is what rows referenced by send records need. A disabled row therefore leaves the default list view, so each of the seven admin pages is a two-tab MultiView — **Active** (framework default) and **All** (`active IN (true, false)`, which names the field and therefore suppresses the automatic condition); without that second tab, disabling a row would make it vanish from its own admin page. The column-header filter on `active` works the same way for ad-hoc queries. Reads that must reach disabled rows use `FilterControl.bypassActiveControl()`: id-addressed replay (`findVisibleById`, so disabling a config never turns in-flight retries into `CONFIG_NOT_RESOLVABLE`), authoring tooling (`resolveAny` — preview and variable extraction work before a template is activated), the platform-row write probe, and default demotion. Plain `getById` needs no bypass: id lookups never carry the filter.

### Monthly send quotas

`TenantMessageQuota` (deliberately NOT `multiTenant` — a platform-owned registry ABOUT tenants, writable only from the platform scope) sets per-tenant monthly ceilings for mail/SMS sends. `MonthlyQuotaGuard` charges a send when it is **prepared** — its first delivery attempt, after its template rendered and its server or provider resolved, so a send that cannot go out costs nothing. An over-quota send fails its record with `MONTHLY_QUOTA_EXCEEDED` (logged at ERROR) — a commercial ceiling, not rate limiting — and retries of a prepared record never touch the count. Fix the quota and Retry the record to send it. The bucket follows the send's scope: `PLATFORM` sends draw on the platform's own `tenantId = -1` row (set it very large; it exists to cap runaway or malicious mass sending); missing rows fall back to `softa.message.quota.mail-monthly-default` / `sms-monthly-default` (null = unlimited — the ledger still advances for reporting). The counters live in the **database**: one `TenantMessageUsage` row per bucket per calendar month, check-and-incremented via the ORM's optimistic-lock CAS (`versionLock`, one `REQUIRES_NEW` transaction per attempt). There is no reset job — a new month starts a new row — and rows are never expired, so per-tenant consumption history is a plain model query with the ceiling in force snapshotted onto each row. `GET /TenantMessageQuota/usage?tenantId=` serves one bucket's usage vs currently-resolved limits (a tenant session may read only its own bucket). The per-config `dailySendLimit` / `rateLimitPerMinute` windows are a different axis (delivery-time infrastructure protection) and stay unchanged.

### Async delivery (the only delivery model)

Every `MessageService.sendMail(...)` / `sendSms(...)` call follows the same path:

1. **Acceptance** — in the caller's thread and transaction — checks only what
   the caller got wrong: a recipient, well-formed addresses or an E.164 number,
   content or a template to render it from. It writes one `MailSendRecord` /
   `SmsSendRecord` per message, `status = PENDING`, holding the request as it was
   made: any explicit content, the template and its variables, the scope, the
   caller's trace id. The method returns the record id(s) at once; the records
   commit or roll back with the caller's transaction. A rejection throws before
   anything is written and does not mark the caller's transaction rollback-only.
2. The **delivery loop** (`DeliveryPoller`) runs each channel on a worker pool
   (`softa.message.{mail,sms}.send-concurrency`, default 1 per instance). A worker
   claims a due record — `PENDING`, or `RETRY` whose `next_retry_at` has passed —
   across tenants with a CAS `PENDING|RETRY → SENDING` through framework
   `versionLock`, sends it in the record's tenant and trace, and goes straight on
   to the next due record. It idles only when nothing is due; every
   `softa.message.delivery.poll-interval-ms` (default 500) the poll hands newly
   due records to idle workers. A backlog therefore drains at concurrency ÷ time
   per send on each instance; raise `send-concurrency` for more, within the mail
   server's limit on concurrent connections per account (each mail worker holds
   one). Each scan reads a few due records per worker and tries them in random
   order, so a claim lost to another worker or instance moves on to the next
   record.
3. The channel's `DeliveryProcessor` **prepares** a record on its first attempt:
   it renders the template and applies its defaults, chooses the server (mail)
   or routes the number to a provider (SMS), and charges the monthly quota, last.
   It writes the result back, so retries replay it verbatim. Then it rate-limits,
   sends, and marks the record `SENT` — or hands the failure to
   `SendFailureHandler`: `RETRY` with a back-off `next_retry_at`, `FAILED`, or
   `DEAD_LETTER`.

**A send that cannot go out as configured still has its record.** No server or
provider, a missing or broken template, the monthly quota used up, a template
that renders nothing: the record fails `FAILED` with a marker code
(`CONFIG_NOT_RESOLVABLE`, `TEMPLATE_NOT_RESOLVABLE`, `MONTHLY_QUOTA_EXCEEDED`,
`CONTENT_INVALID`) and the reason, and every terminal failure is logged at ERROR
with the record id and tenant, so log-based alerting reaches a developer. Fix the
configuration, then use the record's Retry action: a record that failed before it
was prepared is prepared afresh. The caller never sees these errors —
`sendMail` returned the record id when the request was accepted.

Instances polling the same tables never send a record twice: of two claims
holding the same version only one wins. There is no outbox table and no broker in
the delivery path; Spring `@Async` is **not** used.

**Calling MessageService.** Every module that sends mail or SMS — user-starter's
login codes, invitations, account notices and subscription reminders included —
depends on message-starter and calls `MessageService` directly; there is no
request event in between. The send record belongs to the tenant the call is made
in. To send for another tenant — a scheduled job, or an anonymous link that names
its tenant — make the call inside `ContextUtils.inTenantContext(tenantId, …)`. A
`PLATFORM`-scoped send from a context with no tenant (a login code, asked for
before any session exists) is filed under the platform tier, and the insert never
runs cross-tenant, so a cross-tenant caller's record still gets its tenant
(`TenantScopes.inRecordOwnerContext`). A rejection (`BusinessException`) leaves
the caller's transaction usable; a caller whose own change must not fail because
of a notice catches it and logs it at ERROR, as user-starter's notices do.

### Manual retry

Automatic recovery covers delivery failures (`SendFailureHandler`: exponential
back-off, then `FAILED` / `DEAD_LETTER`; non-retryable failures — an auth error,
a missing server or template, a used-up quota — skip the back-off and fail on
the first attempt) and stuck in-flight states (`ZombieRecordSweeper`: stale
`SENDING` → `RETRY`). Once the cause is fixed, an operator endpoint sends again:

- `POST /MailSendRecord/retry?id=` / `POST /SmsSendRecord/retry?id=` — requeue one record:
  `PENDING / RETRY / FAILED / DEAD_LETTER` → `RETRY`, due now, so the delivery loop takes it
  on its next poll. A record that failed before it was prepared is prepared afresh, so
  fixing the configuration and retrying is enough. `SENT` and in-flight `SENDING` are
  rejected. Safe to call repeatedly — the delivery claim is CAS-guarded, so no double
  email/SMS is possible. `retryCount` keeps counting: a manual retry grants one new attempt;
  another failure returns the record to `FAILED` / `DEAD_LETTER` instead of re-arming the
  whole automatic budget.

The HCM admin UI surfaces it as a status-gated toolbar action on the
Mail Send Record / SMS Send Record detail pages, and as a row-level action on
the corresponding list pages.

### Broker topics

Delivery uses no topic. message-starter consumes two, both optional: `cron-task`
drives the scheduled mail fetch, and `softa.message.dlq.topic` collects other
consumers' poison messages into the dead-letter store. Send dead-lettering is a
terminal record state (`DEAD_LETTER`) plus a row archived into the unified
`dead_letter_message` store (see *Dead letter store* below), not a separate queue.

```yml
mq:
  topics:
    cron-task:
      topic: dev_demo_cron_task
      mail-fetch-sub: dev_demo_cron_task_mail_fetch_sub
```

### Upgrading from the outbox pipeline

Earlier releases delivered through a `message_outbox` table and the `mail-send` /
`sms-send` (plus `mail-request` / `sms-request`) Pulsar topics. On upgrade:

- Remove those four topic entries from the application config; nothing reads
  them any more.
- The framework events `MailRequestMessage` / `SmsRequestMessage` (softa-base)
  are gone. Code that published one calls `MessageService` instead —
  `SendMailDTO.ofTemplate` / `SendSmsDTO.ofTemplate` build the same templated
  send — inside `ContextUtils.inTenantContext(tenantId, …)` where the event named
  a tenant.
- Records the old pipeline left `PENDING` or `RETRY` need no migration: the
  delivery loop claims them by their own `status` and `next_retry_at`. The old
  pipeline prepared records at acceptance, so most are already prepared. A mail
  record whose server config had no from address was stored with an empty
  `from_address` and is prepared again on its first attempt here, which charges
  the monthly quota a second time.
- The scanner adds the new record columns (`platform_scope`, `template_id`,
  `template_code`, `template_variables`, `trace_id`) and makes
  `mail_send_record.body_mode` nullable. It never drops a removed model's table,
  so `message_outbox` and the `OutboxEntry` / `OutboxStatus` / `TopicRoute`
  catalog rows stay until the deploying application removes them with a release
  script, after the new jar is up. Rows still `NEW` in `message_outbox` at that
  point are harmless: their records are delivered from the record tables.
- Remove pages built on `OutboxEntry` (an outbox list, its Requeue action); the
  send record's Retry action covers what Requeue did.

### Message-starter properties

Bound under `softa.message` from `MessageProperties`, `RetryProperties`, and DLQ `@Value` keys:

```yml
softa:
  message:
    delivery:
      enabled: true           # default true; false = this instance sends nothing
      poll-interval-ms: 500   # how often idle workers look for newly due records
    zombie:
      enabled: true           # default true
      stale-seconds: 300      # SENDING records older than this are revived
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
      max-body-chars: 1048576       # acceptance-time cap per outbound body field (characters); the columns themselves are unbounded TEXT
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

### Mail authentication

Mail servers authenticate with **username + password**. Where a provider issues
an API key as its SMTP/IMAP credential, supply that key as the `password`.
Common setups:

- an **ESP / SMTP relay** with an API-key credential (SendGrid, Amazon SES,
  Postmark, Mailgun): set the key as the `password` on `mail_send_server_config`;
- a **provider app password**, where the account issues one;
- a **self-hosted MTA** (e.g. Stalwart, Postfix).


## Operations

### Metrics

When Micrometer is on the classpath, `MessageMetrics` emits two counter
families:

| Name | Tags | When incremented |
|---|---|---|
| `softa.message.sent` | `channel` (mail/sms), `provider` | Provider call succeeded |
| `softa.message.failed` | `channel`, `provider`, `outcome` (retry/failed/dead_letter) | A send attempt failed, preparation included |

`softa.message.failed{outcome=dead_letter}` is emitted by `SendFailureHandler`
when a send record transitions to DEAD_LETTER.

### Inbound delivery status

Mail bounce and read-receipt status is derived from **inbound mail** on the
IMAP receive path — DSN report emails (`DsnRule` / `MailerDaemonRule` →
`BounceReceiptLinker` → `markBounced`) and MDN emails (`ReadReceiptRule`). No
inbound HTTP callback is provided; for provider-pushed delivery events (SMS
DLR, ESP mail events) add a controller in your application that calls the
record services' CAS transitions.

### Rate limits

`MailSendServerConfig` and `SmsProviderConfig` carry two quota columns:

- `daily_send_limit` — cumulative sends per day
- `rate_limit_per_minute` — sends per minute (smooths bursts)

Either can be left null/zero to disable that window. Counters live in Redis
(`rl:{channel}:{daily|min}:{tenantId}:{configId}:{window}`), so multi-instance
deployments share one budget. A quota breach surfaces as a provider-side
`QUOTA_EXCEEDED` error, classified as `ErrorCategory.QUOTA` — the retry policy
applies the configured `quotaFloorSeconds` (default 5 min) so we don't hammer
the provider.

### Zombie record sweeper

`ZombieRecordSweeper` runs every minute. Records stuck in `SENDING` whose
`updated_time` is older than `softa.message.zombie.stale-seconds` (default
300) are versionLock-transitioned back to `RETRY` with `next_retry_at = now`,
which makes them due for the delivery loop again. This covers JVM crashes
between claiming a record and finishing the provider call.

Disable via `softa.message.zombie.enabled=false` on read-only replicas.

### Sensitive field encryption

Credential columns on the config tables (`mail_*_server_config.password`,
`sms_provider_config.api_secret`) are defined wide enough to hold ciphertext.
The framework's transparent encryption (`MetaField.isEncrypted()`)
handles the read/write side — but you must still **mark these fields as
encrypted in the `SysField` metadata table** during deployment. See the [field metadata `encrypted` attribute](../metadata/field) for the full procedure; out of the box the columns
store plaintext.

## Extension Points

### Mail transport

Mail sending is SMTP-only. `MailSendServerConfig` is the complete outgoing
server configuration; `SmtpMailTransport` is stateless and builds a fresh
Jakarta Mail sender per send, so config changes only need the Redis config
cache evicted (automatic on update/delete).

### Mail classification rules

`MailClassifier` is a chain-of-responsibility over `MailClassificationRule`
beans. The four stock rules (read-receipt → DSN → mailer-daemon → keyword) run
in `@Order` sequence; the first rule that returns a classification wins. Add
provider-specific detection — e.g. legacy Exchange NDRs, Chinese ISP bounce
shapes — with a new rule:

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

### Dead letter store

Dead letters from both layers converge into a single `dead_letter_message`
table for triage, discriminated by a `source` column:

- `SendExhausted` — a mail / SMS send record exhausted its provider retry
  budget; archived by `SendFailureHandler` (record id in `event_id`, failure
  detail in the JSON `payload`).
- `BrokerPoison` — a Pulsar consumer could not process a message after the
  broker's max redeliveries; the raw envelope is routed to the DLQ topic and
  archived by `DeadLetterConsumer`. Opt a listener in with
  `@PulsarListener(deadLetterPolicy = "commonDlqPolicy")` and set
  `softa.message.dlq.topic`.

Triage the rows via `DeadLetterMessageController` (status `Pending` →
`Resolved` / `Discarded`). For custom alerting (Slack, PagerDuty), consume the
DLQ topic or watch the table — there is no in-process listener SPI.

### Retry policy

Failed sends are retried by `ExponentialBackoffPolicy` — exponential back-off
with a configurable base, multiplier, cap, and ±jitter, tuned via
`softa.message.retry.exponential.*`. The error category from `ErrorClassifier`
decides the disposition: TRANSIENT / QUOTA / UNKNOWN retry (QUOTA clamped to
`quota-floor-seconds`) until `default-max-attempts` is reached and the record
is dead-lettered; PERMANENT / INVALID_INPUT / AUTH / CONFIG fail immediately without
retry. `RetryDecision` is a sealed type (`Retry` / `Fail` / `DeadLetter`) so the
failure handler's `switch` stays exhaustive.

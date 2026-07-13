# Message Starter

Provides unified messaging capabilities for Softa applications:

- **Email**: send emails, receive emails, and render email templates
- **SMS**: send SMS messages, batch send, render templates, and retry on failure
- **Inbox**: push in-app notifications to users

Delivery reliability is built on a **transactional outbox** + **optimistic-lock CAS**
state machine, so broker failures, duplicate deliveries, and in-flight crashes are
handled without message loss or double-sends.

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

Apply the following DDL under `src/main/resources/sql/`:

- `message-starter.sql` — email + inbox tables
- `message-starter-sms.sql` — SMS tables
- `message-starter-outbox.sql` — transactional outbox (shared by mail + SMS)
- `message-starter-dlq.sql` — unified dead-letter store (`dead_letter_message`)

Uses the framework ORM/versionLock path for runtime writes, so outbox publishing
does not depend on database-specific row-lock SQL.

### Hard dependencies

`message-starter` deliberately treats Redis and the relational database as
**hard dependencies**. There is no fail-open / local-fallback path for them —
if either is unavailable the operation that depends on it surfaces an
exception to the caller. This keeps the runtime simple and matches how the
rest of the Softa stack already behaves (cache, distributed lock, session,
etc.). The trade-off and the operational expectations:

| Dependency | Used by | Failure behaviour | Operational expectation |
|---|---|---|---|
| Database | All paths (records, outbox, framework versionLock) | Operation throws; caller sees 5xx | HA-Database (replicated MySQL / managed PG); migrations applied. |
| Redis | `RateLimiter` (per-tenant + per-config quotas), `MailConfigCache`, send-quota counters | Operation throws; caller sees 5xx | Sentinel or Cluster setup. K8s `readinessProbe` should include `/actuator/health/redis` so the load balancer routes traffic away while Redis is unreachable. |
| Pulsar broker | `OutboxPublisher` (publish), consumers (subscribe) | Outbox row stays `NEW`; publisher retries with exponential back-off; eventually marks `DEAD` after `MAX_PUBLISH_ATTEMPTS=10`. | HA cluster. Failure does not block business writes — outbox absorbs the gap. |
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
ORM. `tenant_id = 0` rows form the **platform tier**, shared by every tenant:

- Config/template/routing resolution is **overlay-style**: the caller's own
  rows plus the platform tier (tenant default → platform default; tenant
  template → platform template; routing = union of both, by priority).
- Background jobs are cross-tenant scans that execute per-record in the owning
  tenant's context: the scheduled mail fetch runs each receive config inside
  its config's tenant, and the zombie sweeper revives each stuck record inside
  its record's tenant.
- The transactional outbox and the dead-letter store are shared infrastructure
  tables; tenant identity travels inside the message payload
  (`recordId / tenantId / traceId`) and is restored by the consumer.

With multi-tenancy disabled, no filtering or stamping occurs and everything
behaves single-tenant.

### Async delivery (the only delivery model)

Every `MessageService.sendMail(...)` / `sendSms(...)` call follows the same
path regardless of broker configuration:

1. A `MailSendRecord` / `SmsSendRecord` and an `OutboxEntry` are written **in one
   DB transaction** (`status = PENDING`, `version = 0`). The method returns the
   record id(s) immediately — callers do not block on the SMTP/SMS round-trip.
2. The scheduled `OutboxPublisher` (500 ms poll) claims `NEW` rows as
   `PUBLISHING` through framework `versionLock`, publishes them to the
   corresponding topic, and flips the outbox row to `PUBLISHED`.
3. A `@PulsarListener` consumer reads the message (carrying only `recordId` /
   `tenantId` / `traceId`), then drives the channel's `DeliveryProcessor`, which CAS-transitions
   `PENDING|RETRY → SENDING` before invoking the provider.

If no broker topic is configured, outbox rows stay in `NEW` state and are retried
by the publisher on every poll — nothing is lost; sends just queue up until an
operator supplies a topic. Spring `@Async` is **not** used.

### Broker topics

Only the channel topics you actually use need to be declared. Initial delivery
and delayed retries share the same topic; retry timing is carried by the
transactional outbox's `next_attempt_at` rather than encoded as a separate
broker route. Send dead-lettering is a terminal record state (`DEAD_LETTER`)
plus a row archived into the unified `dead_letter_message` store (see *Dead
letter store* below), not a separate queue.

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

### Message-starter properties

Bound under `softa.message` from `MessageProperties`, `RetryProperties`, and DLQ `@Value` keys:

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

When Micrometer is on the classpath, `MessageMetrics` emits four counter
families:

| Name | Tags | When incremented |
|---|---|---|
| `softa.message.sent` | `channel` (mail/sms), `provider` | Provider call succeeded |
| `softa.message.failed` | `channel`, `provider`, `outcome` (retry/failed/dead_letter) | Provider call failed |
| `softa.message.outbox.published` | `route` | Outbox entry successfully published to broker |
| `softa.message.outbox.dead` | `route` | Outbox entry exceeded publish attempts → DEAD |

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
300) are versionLock-transitioned back to `RETRY` with `next_retry_at = now`
and a retry outbox row is written in the same transaction. Stale outbox
`PUBLISHING` claims are reopened to `NEW`. This covers JVM crashes between
claiming a record and finishing the provider/broker call.

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
is dead-lettered; PERMANENT / INVALID_INPUT / AUTH fail immediately without
retry. `RetryDecision` is a sealed type (`Retry` / `Fail` / `DeadLetter`) so the
failure handler's `switch` stays exhaustive.

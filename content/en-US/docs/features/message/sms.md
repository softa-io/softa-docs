## SMS

### Core Logic

#### Config resolution

SMS sending uses the following default lookup order:

```text
1. Current tenant default SMS provider
2. Platform default SMS provider (`tenant_id = 0`)
3. BusinessException if nothing is available
```

If multiple records are marked as default, the one with the smallest `priority`
is used. Provider configs are cached in Redis (5 min TTL) and evicted on update
/ delete automatically.

#### Template resolution

SMS templates are resolved by `code` with a platform fallback:

```text
tenant template (code + enabled)
  -> platform template (tenant_id = 0)
  -> BusinessException
```

Template placeholders use the unified Softa syntax: `{{ variable }}`.

#### Delivery pipeline

Identical to mail. Each recipient becomes one `SmsSendRecord`; the state machine
is the same six-state CAS flow (`PENDING → SENDING → SENT / FAILED / RETRY /
DEAD_LETTER`). Provider routing is resolved before persistence, and retry
replays the same provider/template parameters stored on the record.

### Sending SMS

Use the same `MessageService` for SMS:

```java
@Autowired
private MessageService messageService;

// Plain text to a single recipient
SendSmsDTO dto = new SendSmsDTO();
dto.setPhoneNumber("+1234567890");
dto.setContent("Order #1234 has been shipped.");
Long id = messageService.sendSms(dto);

// Independent batch: one DTO and one send record per phone number.
SendSmsDTO first = new SendSmsDTO();
first.setPhoneNumber("+1111111111");
first.setContent("System maintenance tonight at 10pm.");
SendSmsDTO second = new SendSmsDTO();
second.setPhoneNumber("+2222222222");
second.setContent("System maintenance tonight at 10pm.");
List<Long> ids = messageService.sendSmsBatch(List.of(first, second));
// ids point at PENDING records; the consumer flips them to SENT/FAILED.
```

> **All SMS sends are asynchronous** — same contract as Mail. `sendSms /
> sendSmsBatch` enqueue an `SmsSendRecord (PENDING)` + outbox row and
> return immediately; the broker-driven consumer performs the provider
> call.

### Send Modes

| Mode | Main fields | Description |
|---|---|---|
| Single | `sendSms(SendSmsDTO)` | One recipient and one record |
| Batch | `sendSmsBatch(List<SendSmsDTO>)` | 1..500 independent messages, atomic and ordered |
| Template | `templateCode` + `templateVariables` on each DTO | Render then send |

### Per-recipient template variables

```java
SendSmsDTO first = new SendSmsDTO();
first.setPhoneNumber("+111");
first.setTemplateCode("ORDER_STATUS");
first.setTemplateVariables(Map.of("orderId", "A001", "status", "Shipped"));

SendSmsDTO second = new SendSmsDTO();
second.setPhoneNumber("+222");
second.setTemplateCode("ORDER_STATUS");
second.setTemplateVariables(Map.of("orderId", "B002", "status", "Delivered"));

messageService.sendSmsBatch(List.of(first, second));
```

### SMS Templates

```java
Map<String, Object> vars = Map.of("code", "123456", "minutes", 5);

SendSmsDTO sms = new SendSmsDTO();
sms.setPhoneNumber("+1234567890");
sms.setTemplateCode("VERIFY_CODE");
sms.setTemplateVariables(vars);
messageService.sendSms(sms);
```

#### Template example

```bash
POST /SmsTemplate/createOne
{
  "code": "VERIFY_CODE",
  "name": "Verification Code",
  "content": "Your verification code is {{ code }}. Valid for {{ minutes }} minutes.",
  "isEnabled": true
}
```

### SMS Provider Routing (by country)

`SmsProviderDispatcher` picks the provider(s) for an outbound SMS based on
the recipient's country, parsed from the E.164 phone number via
[libphonenumber](https://github.com/google/libphonenumber). Resolution is
**two-tier, strict, no implicit cross-tier fallback**:

```text
parseRegion(+8613800138000) -> "CN"

  Tier 1: PRECISE      Tier 2: CATCHALL              FAIL
  ┌──────────────┐     ┌──────────────────────┐     ┌────────────────────┐
  │ Enabled rows │     │ SmsProviderConfig    │     │ BusinessException  │
  │ in           │ ──▶ │ where isDefault=true │ ──▶ │ "No provider for X"│
  │ sms_provider │     │ (ordered by priority)│     │                    │
  │ _region      │     │                      │     │                    │
  │ matching CN  │     │                      │     │                    │
  └──────────────┘     └──────────────────────┘     └────────────────────┘
        │                       │                            │
        ▼                       ▼                            ▼
  Use this ordered       Use this ordered               Send fails;
  candidate list         candidate list                 fix config to recover
```

#### Configuration model

| Table | Purpose | Per-row data |
|---|---|---|
| `sms_provider_config` | Provider accounts and credentials | API key, sender number, `isDefault`, `priority` |
| `sms_provider_region` | Per-country routing rules | `region_code` (ISO 3166-1 alpha-2 string), `dial_code` (denormalized), `priority` |

Two tables intentionally — one provider account commonly serves N countries
(Twilio US/CA/MX/UK/AU/…). 1-to-N relationship is normalised into a routing
table; per-region priority is a column on the routing row, not on the config.

`region_code` is the ISO 3166-1 alpha-2 country code (`CN`, `TW`, `US`, …),
validated at write time against `country_region.code` in
`reference-data-starter`. The reference table holds all 249 ISO 3166-1
territories with English name, alpha-3 code, E.164 dial code, default
currency, continent, EEA flag, and subdivisions flag. **`reference-data-starter`
must be on the classpath** for SMS provider routing to function — `message-starter`
depends on it as a hard dependency.

`dial_code` is a framework-maintained **stored cascade** of
`regionCode.dialCode` (`CountryRegion` is code-as-id, so the region FK stores
the alpha-2 code itself). It lets admin list views render "CN (+86) → Aliyun"
without joining `country_region`. Operators must not edit `dial_code`
directly — the framework derives it from `region_code`.

#### Catchall semantics

There is **no magic** `region_code='*'` row. Catchall is expressed by
`SmsProviderConfig.isDefault=true` — keeps `region_code` strictly an ISO
3166 alpha-2 value with no special carve-outs in the schema.

#### Resolution rules

1. **Precise match wins fully** — if any `sms_provider_region` row matches
   the recipient's country, only that tier's providers are used. The
   dispatcher does **NOT** merge in the catchall tier.
2. **Catchall** is consulted only when **no precise row** matches, never as
   an in-line fallback for a partial precise match.
3. **Explicit over implicit** — to make a catchall provider eligible for a
   configured country too, add it explicitly as another
   `sms_provider_region` row for that country.

This rule keeps misrouting deterministic: a country you've explicitly
configured cannot accidentally fall through to a wrong provider (e.g. TW
traffic should never route through a mainland-CN-only line).

#### Failure mode

If neither precise nor catchall yields a provider, the dispatcher throws
`BusinessException` with the unresolved region in the message. The send
**fails fast** — there is no "any-enabled-provider" implicit fallback.
Operators recover by either adding the missing `sms_provider_region` row or
marking at least one provider `isDefault=true`.

#### Example configuration

| `sms_provider_config` | id | name | provider_type | is_default | priority |
|---|---|---|---|---|---|
|  | 1 | Aliyun-China  | ALIYUN  | false | 10 |
|  | 2 | Tencent-China | TENCENT | false | 20 |
|  | 3 | Twilio-Global | TWILIO  | true  | 1  |
|  | 4 | Vonage-Backup | VONAGE  | true  | 2  |

| `sms_provider_region` | provider_config_id | region_code | priority |
|---|---|---|---|
|  | 1 | CN | 10 |
|  | 2 | CN | 20 |
|  | 3 | TW | 10 |

Dispatch behaviour:

| Recipient | Resolved provider list | Notes |
|---|---|---|
| `+8613800138000` (CN) | `[Aliyun, Tencent]` | Precise match; selection uses ordered CN candidates |
| `+886912345678` (TW)  | `[Twilio]`           | Precise match; **Vonage is NOT added** as fallback |
| `+33123456789` (FR)   | `[Twilio, Vonage]`   | No precise FR; falls to isDefault catchall |
| `+44...` if no GB row and no defaults | throws `BusinessException` | Operator must configure |

#### Tenant scoping

`sms_provider_region.tenant_id` follows the same rule as other tenant tables:
`0` for platform-level routing (shared by all tenants); `>0` for per-tenant
overrides. Routing reads are platform-overlay: the dispatcher sees the union
of platform rows and the caller's own tenant rows, interleaved by priority.

#### Template-level provider bindings

`sms_provider_region` (above) decides **which provider accounts are eligible
to send to a country**. `SmsTemplateProviderBinding` (separate table) layers
on top of that to express **per-(template, provider) details**: provider-side
external template ID, signName, optional `region_code`, and binding-level
priority. The dispatcher runs first to filter eligible providers by country;
`SmsRoutingPlanner` then intersects those providers with template bindings and
persists one selected provider plus the external IDs/signNames. The two concerns are
deliberately split — country eligibility on the provider, template-specific
overrides on the binding.

### SMS Provider Selection and Retry

When a template is bound to multiple eligible SMS providers, enqueue-time
planning selects one provider in `priority` order (lower = preferred):

```text
country route candidates ∩ template bindings -> selected provider
```

- `SmsSendRecord` stores the selected provider's `provider_config_id`,
  `provider_type`, `external_template_id`, and `sign_name`.
- If the provider call fails, `ExponentialBackoffPolicy.decide(...)` determines
  the next step (RETRY / FAILED / DEAD_LETTER) — same contract as mail.
- During retry, the record replays the same provider and template parameters.

### SMS Status Reference

#### SmsSendRecord

```text
Pending -> Sending -> Sent
                  -> Retry -> Sending -> Sent
                          -> DeadLetter
                  -> Failed
```

Semantics match `MailSendRecord`. The `deliveryStatus` /
`deliveryStatusUpdatedAt` columns hold the provider-reported delivery outcome;
they stay `UNKNOWN` unless your application feeds provider delivery receipts
(DLR) back into the record.


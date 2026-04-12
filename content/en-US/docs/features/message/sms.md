
## SMS

### Core Logic

#### Config resolution

SMS sending uses the following default lookup order:

```text
1. Current tenant default SMS provider
2. Platform default SMS provider (`tenant_id = 0`)
3. BusinessException if nothing is available
```

If multiple records are marked as default, the one with the smallest `sortOrder` is used.

#### Template resolution

SMS templates use the following fallback logic:

```text
tenant + current language
  -> tenant + default language
  -> platform + current language
  -> platform + default language
  -> BusinessException
```

Template placeholders use the unified Softa syntax: `{{ variable }}`.

#### Async, failover, and retry

- `sendAsync(...)` returns immediately and performs delivery in the background
- Each recipient automatically creates one `SmsSendRecord`
- If a template is bound to multiple providers, delivery tries them in `sortOrder`
- If retry is enabled, failed sends can enter `Retry` and be attempted again later

Business code usually does not need to choose a provider explicitly. Defaults and bindings should be
prepared by the platform or tenant admin.

### Sending SMS

Inject `SmsSendService` where SMS delivery is needed:

```java
@Autowired
private SmsSendService smsSendService;

// Plain text to a single recipient
smsSendService.send("+1234567890", "Your verification code is 123456");

// Full control via DTO
SendSmsDTO dto = new SendSmsDTO();
dto.setPhoneNumber("+1234567890");
dto.setContent("Order #1234 has been shipped.");
smsSendService.send(dto);

// Uniform batch
SendSmsDTO batchDto = new SendSmsDTO();
batchDto.setPhoneNumbers(List.of("+1111111111", "+2222222222"));
batchDto.setContent("System maintenance tonight at 10pm.");
smsSendService.send(batchDto);

// Async
smsSendService.sendAsync(dto);
```

### Send Modes

| Mode | Main fields | Description |
|---|---|---|
| Single | `phoneNumber` + `content` | Send to one recipient |
| Uniform batch | `phoneNumbers` + `content` | Same content to all recipients |
| Differentiated batch | `items` | Per-recipient variables or content |
| Template | `templateCode` + `phoneNumber(s)` + `templateVariables` | Render then send |

### Differentiated Batch Example

```java
SendSmsDTO dto = new SendSmsDTO();
dto.setTemplateCode("ORDER_STATUS");

List<BatchSmsItemDTO> items = List.of(
    new BatchSmsItemDTO("+111", null, Map.of("orderId", "A001", "status", "Shipped")),
    new BatchSmsItemDTO("+222", null, Map.of("orderId", "B002", "status", "Delivered"))
);

dto.setItems(items);
smsSendService.send(dto);
```

### SMS Templates

```java
Map<String, Object> vars = Map.of("code", "123456", "minutes", 5);

smsSendService.sendByTemplate("VERIFY_CODE", "+1234567890", vars);
smsSendService.sendByTemplate("VERIFY_CODE", List.of("+111", "+222"), vars);
```

#### Template example

```bash
POST /SmsTemplate/createOne
{
  "code": "VERIFY_CODE",
  "name": "Verification Code",
  "language": "en-US",
  "content": "Your verification code is {{ code }}. Valid for {{ minutes }} minutes.",
  "isEnabled": true
}
```

### SMS Failover and Retry

When a template is bound to multiple SMS providers, delivery tries them in `sortOrder`:

```text
Provider 1 -> Provider 2 -> Provider 3
```

- Stop on the first successful provider
- If all providers fail, the record becomes `Failed`
- If retry is enabled, the record can enter `Retry` and be attempted again later
- During retry, the full failover chain starts from the beginning

This logic matters for business developers mainly when they need to understand why a send eventually
succeeded or why the final record became `Failed` or `Retry`.

### SMS Status Reference

#### SmsSendRecord

```text
PENDING -> SENT
PENDING -> FAILED
PENDING -> RETRY
```
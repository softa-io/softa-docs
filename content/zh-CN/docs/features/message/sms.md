
## 短信

### 核心逻辑

#### 配置解析

短信发送按以下默认顺序查找：

```text
1. 当前租户默认短信服务商
2. 平台默认短信服务商（`tenant_id = 0`）
3. 若均不可用则抛出 BusinessException
```

若有多条记录标记为默认，则取 `sortOrder` 最小的一条。

#### 模板解析

短信模板按以下回退逻辑选择：

```text
租户 + 当前语言
  -> 租户 + 默认语言
  -> 平台 + 当前语言
  -> 平台 + 默认语言
  -> BusinessException
```

模板占位符统一使用 Softa 语法：`{{ variable }}`。

#### 异步、故障转移与重试

- `sendAsync(...)` 立即返回，在后台完成投递
- 每个收件人会自动创建一条 `SmsSendRecord`
- 若模板绑定多个服务商，按 `sortOrder` 依次尝试
- 若启用重试，失败发送可进入 `Retry` 状态并在稍后再次尝试

业务代码通常无需显式选择服务商，默认与绑定关系应由平台或租户管理员预先配置。

### 发送短信

在需要发送短信处注入 `SmsSendService`：

```java
@Autowired
private SmsSendService smsSendService;

// 纯文本，单收件人
smsSendService.send("+1234567890", "Your verification code is 123456");

// 通过 DTO 完全控制
SendSmsDTO dto = new SendSmsDTO();
dto.setPhoneNumber("+1234567890");
dto.setContent("Order #1234 has been shipped.");
smsSendService.send(dto);

// 统一批量（相同内容）
SendSmsDTO batchDto = new SendSmsDTO();
batchDto.setPhoneNumbers(List.of("+1111111111", "+2222222222"));
batchDto.setContent("System maintenance tonight at 10pm.");
smsSendService.send(batchDto);

// 异步
smsSendService.sendAsync(dto);
```

### 发送模式

| 模式 | 主要字段 | 说明 |
|---|---|---|
| 单发 | `phoneNumber` + `content` | 发给一个号码 |
| 统一批量 | `phoneNumbers` + `content` | 相同内容发给多个号码 |
| 差异化批量 | `items` | 按收件人区分变量或内容 |
| 模板 | `templateCode` + `phoneNumber(s)` + `templateVariables` | 渲染模板后发送 |

### 差异化批量示例

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

### 短信模板

```java
Map<String, Object> vars = Map.of("code", "123456", "minutes", 5);

smsSendService.sendByTemplate("VERIFY_CODE", "+1234567890", vars);
smsSendService.sendByTemplate("VERIFY_CODE", List.of("+111", "+222"), vars);
```

#### 模板示例

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

### 短信故障转移与重试

当模板绑定多个短信服务商时，按 `sortOrder` 依次尝试：

```text
Provider 1 -> Provider 2 -> Provider 3
```

- 任一服务商成功即停止
- 若全部失败，记录变为 `Failed`
- 若启用重试，记录可进入 `Retry` 并在稍后再次尝试
- 重试时会从头完整再走一遍故障转移链

业务开发主要在需要理解「为何最终成功」或「为何最终为 `Failed` / `Retry`」时关注上述逻辑。

### 短信状态参考

#### SmsSendRecord

```text
PENDING -> SENT
PENDING -> FAILED
PENDING -> RETRY
```

## 短信

### 核心逻辑

#### 配置解析

短信发送使用以下默认查找顺序：

```text
1. 当前租户默认 SMS 提供商
2. 平台默认 SMS 提供商（`tenant_id = 0`）
3. 若均不可用则 BusinessException
```

若多条记录标记为默认，使用 `priority` 最小的一条。提供商配置在 Redis 中缓存（5 分钟 TTL），update/delete 时自动驱逐。

#### 模板解析

短信模板按 `code` 解析，带平台回退：

```text
租户模板（code + enabled）
  -> 平台模板（tenant_id = 0）
  -> BusinessException
```

模板占位符使用统一的 Softa 语法：`{{ variable }}`。

#### 投递管道

与邮件相同。每个收件人产生一条 `SmsSendRecord`；状态机为相同的六态 CAS 流程（`PENDING → SENDING → SENT / FAILED / RETRY / DEAD_LETTER`）。提供商路由在持久化前解析，重试重放记录在记录上存储的相同提供商/模板参数。

### 发送短信

对 SMS 使用同一 `MessageService`：

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

> **所有短信发送均为异步**——与 Mail 相同契约。`sendSms / sendSmsBatch` 入队 `SmsSendRecord (PENDING)` + outbox 行并立即返回；broker 驱动的消费者执行提供商调用。

### 发送模式

| 模式 | 主要字段 | 说明 |
|---|---|---|
| Single | `sendSms(SendSmsDTO)` | 一个收件人、一条记录 |
| Batch | `sendSmsBatch(List<SendSmsDTO>)` | 1..500 条独立消息，原子且有序 |
| Template | 每个 DTO 上的 `templateCode` + `templateVariables` | 渲染后发送 |

### 每收件人模板变量

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

### 短信模板

```java
Map<String, Object> vars = Map.of("code", "123456", "minutes", 5);

SendSmsDTO sms = new SendSmsDTO();
sms.setPhoneNumber("+1234567890");
sms.setTemplateCode("VERIFY_CODE");
sms.setTemplateVariables(vars);
messageService.sendSms(sms);
```

#### 模板示例

```bash
POST /SmsTemplate/createOne
{
  "code": "VERIFY_CODE",
  "name": "Verification Code",
  "content": "Your verification code is {{ code }}. Valid for {{ minutes }} minutes.",
  "isEnabled": true
}
```

### SMS 提供商路由（按国家）

`SmsProviderDispatcher` 根据收件人国家选择外发 SMS 的提供商，通过 [libphonenumber](https://github.com/google/libphonenumber) 从 E.164 电话号码解析。解析为**两层、严格、无隐式跨层回退**：

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

#### 配置模型

| 表 | 用途 | 每行数据 |
|---|---|---|
| `sms_provider_config` | 提供商账户与凭证 | API key、发信号码、`isDefault`、`priority` |
| `sms_provider_region` | 按国家路由规则 | `region_code`（ISO 3166-1 alpha-2 字符串）、`dial_code`（反规范化）、`priority` |

有意分为两表——一个提供商账户通常服务 N 个国家（Twilio US/CA/MX/UK/AU/…）。1 对 N 关系规范化为路由表；每区域 priority 为路由行上的列，而非配置上的列。

`region_code` 为 ISO 3166-1 alpha-2 国家代码（`CN`、`TW`、`US`、…），写入时针对 `reference-data-starter` 中的 `country_region.code` 校验。参考表持有全部 249 个 ISO 3166-1 地区，含英文名、alpha-3 代码、E.164 区号、默认货币、大洲、EEA 标志和行政区划标志。**`reference-data-starter` 必须在 classpath 上**，SMS 提供商路由才能工作——`message-starter` 将其作为硬依赖。

`dial_code` 为框架维护的 `regionCode.dialCode` **存储级联**（`CountryRegion` 为 code-as-id，因此区域 FK 存储 alpha-2 代码本身）。使管理列表视图可渲染「CN (+86) → Aliyun」而无需 join `country_region`。运维不得直接编辑 `dial_code`——框架从 `region_code` 派生。

#### Catchall 语义

**没有**魔法 `region_code='*'` 行。Catchall 由 `SmsProviderConfig.isDefault=true` 表达——保持 `region_code` 严格为 ISO 3166 alpha-2 值，schema 中无特殊例外。

#### 解析规则

1. **精确匹配完全获胜**——若任何 `sms_provider_region` 行匹配收件人国家，仅使用该层的提供商。调度器**不会**合并 catchall 层。
2. **Catchall** 仅在**无精确行**匹配时查阅，从不作为部分精确匹配的内联回退。
3. **显式优于隐式**——要使 catchall 提供商也对已配置国家可用，须显式为该国家添加另一条 `sms_provider_region` 行。

此规则使误路由可确定：已显式配置的国家不会意外落入错误提供商（如 TW 流量绝不应经大陆专线路由）。

#### 失败模式

若精确与 catchall 均未产生提供商，调度器抛出带未解析区域的 `BusinessException`。发送**快速失败**——无「任意启用提供商」隐式回退。运维通过添加缺失的 `sms_provider_region` 行或至少标记一个提供商 `isDefault=true` 恢复。

#### 配置示例

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

分派行为：

| 收件人 | 解析的提供商列表 | 说明 |
|---|---|---|
| `+8613800138000` (CN) | `[Aliyun, Tencent]` | 精确匹配；选择使用有序 CN 候选 |
| `+886912345678` (TW)  | `[Twilio]`           | 精确匹配；**Vonage 不会**作为回退添加 |
| `+33123456789` (FR)   | `[Twilio, Vonage]`   | 无精确 FR；落入 isDefault catchall |
| `+44...` 若无 GB 行且无默认 | 抛出 `BusinessException` | 运维须配置 |

#### 租户范围

`sms_provider_region.tenant_id` 与其他租户表相同规则：`0` 为平台级路由（所有租户共享）；`>0` 为每租户覆盖。路由读取为平台叠加：调度器看到平台行与调用方租户行的并集，按 priority 交错。

#### 模板级提供商绑定

`sms_provider_region`（上文）决定**哪些提供商账户有资格向某国家发送**。`SmsTemplateProviderBinding`（独立表）在其上叠加**每（模板、提供商）详情**：提供商侧外部模板 ID、signName、可选 `region_code` 和绑定级 priority。调度器先按国家过滤合格提供商；`SmsRoutingPlanner` 再将这些提供商与模板绑定求交，并持久化一个选定提供商及外部 ID/signName。两关注点刻意拆分——国家资格在提供商，模板特定覆盖在绑定。

### SMS 提供商选择与重试

当模板绑定多个合格 SMS 提供商时，入队时规划按 `priority` 顺序（越小越优先）选择一个提供商：

```text
country route candidates ∩ template bindings -> selected provider
```

- `SmsSendRecord` 存储选定提供商的 `provider_config_id`、`provider_type`、`external_template_id` 和 `sign_name`。
- 若提供商调用失败，`ExponentialBackoffPolicy.decide(...)` 决定下一步（RETRY / FAILED / DEAD_LETTER）——与邮件相同契约。
- 重试期间，记录重放相同的提供商和模板参数。

### SMS 状态参考

#### SmsSendRecord

```text
Pending -> Sending -> Sent
                  -> Retry -> Sending -> Sent
                          -> DeadLetter
                  -> Failed
```

语义与 `MailSendRecord` 匹配。`deliveryStatus` / `deliveryStatusUpdatedAt` 列持有提供商报告的投递结果；除非应用将提供商投递回执（DLR）反馈到记录，否则保持 `UNKNOWN`。

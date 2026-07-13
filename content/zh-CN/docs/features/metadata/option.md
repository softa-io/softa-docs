## 选项集

> **另见**：若要通过 Java 枚举注解声明选项集和条目，请参阅 [`@OptionSet` / `@OptionItem`](../../backend_dev/model_dev/annotation#optionset--sysoptionset)。

选项集提供共享、有序的可选值列表。Web 模块暴露读取选项条目的 API，ORM 层缓存它们以快速查找。

### 数据来源
选项条目存储在元数据表 `SysOptionItem` 中。每个条目属于一个 `optionSetCode`，具有 `itemCode`、`label` 和用于排序的 `sequence`。

### 缓存行为
应用启动时，`OptionManager.init()` 加载所有 `SysOptionItem` 行，按 `sequence` 排序，并以 `optionSetCode` 为键存入内存缓存。检索时保持原始顺序。

### API 用法
按选项集编码读取选项条目：

```
GET /SysOptionSet/getOptionItems/{optionSetCode}
```

示例：
```
GET /SysOptionSet/getOptionItems/OrderStatus
```

响应为 `OptionReference` 对象列表。
```json
{
    "data": [
        {
            "itemCode": "Male",
            "label": "Male",
            "itemTone": "",
            "itemIcon": ""
        },
        ...
    ]
}
```

### 编程用法
在服务代码中使用 `OptionManager`：

```java
List<MetaOptionItem> items = OptionManager.getMetaOptionItems("OrderStatus");
MetaOptionItem pending = OptionManager.getMetaOptionItem("OrderStatus", "PENDING");
String pendingLabel = OptionManager.getLabelByCode("OrderStatus", "PENDING");
String pendingCode = OptionManager.getItemCodeByLabel("OrderStatus", "Pending");
boolean exists = OptionManager.existsItemCode("OrderStatus", "PENDING");
```

### 本地化
`MetaOptionItem.getLabel()` 若当前上下文中语言存在翻译则返回翻译后的 label。若无翻译，返回原始 `label`。

### OptionReference 结构
选项值展开或作为引用返回时使用 `OptionReference`。

字段：
- `itemCode`：选项条目编码。
- `label`：选项条目显示标签。
- `itemTone`：可选语义色调（`Success` / `Warning` / `Error` / `Info` / `Neutral`）。
- `itemIcon`：可选图标编码（如 `check`、`x`、`ban`、`alert`、`pause`、`info`、`eye`、`loader`、`clock`、`pending`、`undo`、`lock`）。

### Option / MultiOption 字段的 API 返回
默认 API 返回（`REFERENCE`）：
1. `Option` -> `OptionReference` 对象：
```json
{ "itemCode": "Active", "label": "Active", "itemTone": "Success", "itemIcon": "check" }
```
2. `MultiOption` -> `List<OptionReference>`：
```json
[
  { "itemCode": "A", "label": "Tag A", "itemTone": "", "itemIcon": "" },
  { "itemCode": "B", "label": "Tag B", "itemTone": "", "itemIcon": "" }
]
```

### 说明
- 若 `optionSetCode` 在缓存中不存在，`OptionManager` 会抛出异常。需要时用 `OptionManager.existsOptionSetCode` 校验。
- 启动前选项集数据必须存在于数据库中，否则缓存为空。

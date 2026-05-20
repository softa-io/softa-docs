## 选项集

> **参见**：在 Java 枚举上通过注解声明选项集与选项项，见 [`@OptionSet` / `@OptionItem`](../../backend_dev/model_dev/annotation#optionset--sysoptionset)。

选项集提供一组共享且有序的可选值。Web 模块暴露用于读取选项项的 API，ORM 层将其缓存以便快速查找。

### 数据来源

选项项存储在元数据表 `SysOptionItem` 中。每条记录属于一个 `optionSetCode`，并包含 `itemCode`、`itemName`，以及用于排序的 `sequence`。

### 缓存行为

应用启动时，`OptionManager.init()` 会按 `sequence` 顺序加载所有 `SysOptionItem` 行，并将其以 `optionSetCode` 为键存入内存缓存。读取时保持原有顺序。

### API 使用

按选项集编码读取选项项：

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
            "itemName": "Male",
            "itemTone": "",
            "itemIcon": ""
        },
        ...
    ]
}
```

### 程序内使用

在服务端代码中通过 `OptionManager` 使用：

```java
List<MetaOptionItem> items = OptionManager.getMetaOptionItems("OrderStatus");
MetaOptionItem pending = OptionManager.getMetaOptionItem("OrderStatus", "PENDING");
String pendingName = OptionManager.getItemNameByCode("OrderStatus", "PENDING");
boolean exists = OptionManager.existsItemCode("OrderStatus", "PENDING");
```

### 本地化

当上下文中存在当前语言的翻译时，`MetaOptionItem.getItemName()` 返回翻译后的名称；若无翻译，则返回原始 `itemName`。

### OptionReference 结构

选项值被展开或作为引用返回时，使用 `OptionReference`。

字段：

- `itemCode`：选项条目编码。
- `itemName`：选项显示名称。
- `itemTone`：可选的语义色调（例如 `success`、`warning`、`error`、`info`、`neutral`）。
- `itemIcon`：可选的图标编码（例如 `check`、`x`、`ban`、`alert`、`pause`、`info`、`eye`、`loader`、`clock`、`pending`、`undo`、`lock`）。

### Option / MultiOption 字段的 API 默认返回

默认 API 返回类型（`REFERENCE`）：

1. `Option` → `OptionReference` 对象：

```json
{ "itemCode": "Active", "itemName": "Active", "itemTone": "success", "itemIcon": "check" }
```

2. `MultiOption` → `List<OptionReference>`：

```json
[
  { "itemCode": "A", "itemName": "Tag A", "itemTone": "", "itemIcon": "" },
  { "itemCode": "B", "itemName": "Tag B", "itemTone": "", "itemIcon": "" }
]
```

### 注意事项

- 当 `optionSetCode` 在缓存中不存在时，`OptionManager` 会抛出异常。需要时可先用 `OptionManager.existsOptionSetCode` 校验。
- 选项集数据须在启动前存在于数据库中，否则缓存为空。

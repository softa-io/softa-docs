# 选项集

选项集用于维护一组**共享且有顺序的可选值**。Web 模块通过 API 提供选项项的读取能力，ORM 层会将其缓存到内存中以便快速查找。

## 数据来源

选项项存储在元数据表 `SysOptionItem` 中。每条记录属于一个 `optionSetCode`，并包含：

- `itemCode`：选项条目编码
- `itemName`：选项显示名称
- `sequence`：用于排序的序号

## 缓存行为

应用启动时，`OptionManager.init()` 会按 `sequence` 顺序加载所有 `SysOptionItem` 记录，并将其按 `optionSetCode` 分组缓存到内存中。后续读取选项集时，会保持原有顺序返回。

## API 使用

根据选项集编码读取选项项：

```http
GET /SysOptionSet/getOptionItems/{optionSetCode}
```

示例：

```http
GET /SysOptionSet/getOptionItems/OrderStatus
```

返回值为 `MetaOptionItem` 对象列表。

## 代码中使用

在服务端代码中通过 `OptionManager` 使用选项集：

```java
List<MetaOptionItem> items = OptionManager.getMetaOptionItems("OrderStatus");
MetaOptionItem pending = OptionManager.getMetaOptionItem("OrderStatus", "PENDING");
String pendingName = OptionManager.getItemNameByCode("OrderStatus", "PENDING");
boolean exists = OptionManager.existsItemCode("OrderStatus", "PENDING");
```

## 多语言

当存在当前语言环境下的翻译时，`MetaOptionItem.getItemName()` 会返回**翻译后的名称**；如果找不到翻译，则返回原始的 `itemName`。

## OptionReference 结构

当选项值被展开或作为引用返回时，会使用 `OptionReference` 结构，字段包括：

- `itemCode`：选项条目编码
- `itemName`：选项显示名称
- `itemColor`：可选的颜色字符串

## 注意事项

- 当传入不存在的 `optionSetCode` 时，`OptionManager` 会抛出异常。需要时可通过 `OptionManager.existsOptionSetCode` 进行校验。
- 选项集数据必须在应用启动前写入数据库，否则缓存会为空。


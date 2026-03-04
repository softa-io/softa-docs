# API 响应说明

## 按字段类型的 API 返回值

本节按字段类型说明模型 API（`/getById`、`/getByIds`、`/searchList`、`/searchPage`）的返回值。默认情况下，ModelController 使用 `ConvertType.REFERENCE`。

### Option / MultiOption

默认 API 返回（`OptionReference`）：

1. `Option` → `OptionReference` 对象：

```json
{ "itemCode": "ACTIVE", "itemName": "Active", "itemColor": "green" }
```

2. `MultiOption` → `List<OptionReference>`：

```json
[
  { "itemCode": "A", "itemName": "Tag A", "itemColor": "" },
  { "itemCode": "B", "itemName": "Tag B", "itemColor": "" }
]
```

3. `OptionReference` 字段：
- `itemCode`：选项条目编码。
- `itemName`：选项显示名称。
- `itemColor`：可选的颜色字符串。

### File / MultiFile

默认 API 返回（`FileInfo`）：

1. `File` → `FileInfo` 对象。
2. `MultiFile` → `List<FileInfo>`。

`FileInfo` 常见字段包括：
1. `fileId`
2. `fileName`
3. `size`
4. `url`

示例：

```json
{
  "avatar": { "fileId": 1001, "fileName": "a.png", "url": "..." },
  "attachments": [
    { "fileId": 2001, "fileName": "doc.pdf", "url": "..." },
    { "fileId": 2002, "fileName": "spec.docx", "url": "..." }
  ]
}
```

### ManyToOne / OneToOne

默认 API 返回（`ModelReference`，无 SubQuery）：

1. `ManyToOne` / `OneToOne` → `ModelReference` 对象：
```json
{ "id": 3001, "displayName": "Engineering" }
```

配置 SubQuery 时：
1. 返回值为关联模型的**行 Map**，而不再是 `ModelReference`。
2. 返回的 Map 包含关联模型的 `id`、显示名称字段以及 `SubQuery.fields` 中的字段。

`ModelReference` 字段：
- `id`：关联行 ID。
- `displayName`：关联行显示名称。

### ManyToMany / OneToMany

默认 API 返回（`ModelReference`，无 SubQuery）：
1. `OneToMany` / `ManyToMany` → `List<ModelReference>`, 前端 `searchPage` 接口的默认行为，可以在数据列表中展示 ManyToMany / OneToMany 字段的摘要数据。
示例：
```json
{
  "projects": [
    { "id": 5001, "displayName": "Project Alpha" },
    { "id": 5002, "displayName": "Project Beta" }
  ],
  "orderLines": [
    { "id": 7001, "displayName": "Line A" },
    { "id": 7002, "displayName": "Line B" }
  ]
}
```

配置 SubQuery 时：
1. `ManyToMany` / `OneToMany` 均返回关联行的 `List<Map>`。
2. 若 `count=true`，则返回整数数量而非行数据。

---

## ConvertType 参考

`ConvertType` 用于控制在**读取**数据时（search / get / copy / fetch 等接口）字段值的格式化方式，影响布尔/选项字段与关联字段，以及关联是展开为明细还是以引用形式返回。

说明：
1. `QueryParams` 不暴露 `convertType`。Web 层默认使用 `ConvertType.REFERENCE`。若需使用其它 `ConvertType`，请在服务层通过 `FlexQuery` 直接设置。
2. Filters 与 orders 的格式与顶层 `filters`、`orders` 一致（Filters 列表格式，Orders 列表或字符串格式）。

### ConvertType 取值

1. `ORIGINAL`：返回原始数据库值，不做格式化。典型场景：诊断、调试或解密前获取原始密文。
2. `TYPE_CAST`（`FlexQuery` 默认）：按字段类型做标准转换（如数值/字符串/布尔/JSON 等）。计算字段与动态级联字段会被求值。关联字段默认不展开为显示值。
3. `DISPLAY`：将 Boolean / Option / MultiOption 及 ManyToOne / OneToOne 转为显示值（人类可读字符串）。OneToMany / ManyToMany 在无 SubQuery 时默认返回显示值。
4. `REFERENCE`：将 Option / MultiOption 及 ManyToOne / OneToOne 转为引用对象（选项为 `OptionReference`，关联为 `ModelReference`）。OneToMany / ManyToMany 在无 SubQuery 时默认返回 `ModelReference` 列表。

### 后端与 API 默认行为

1. `FlexQuery` 未显式设置时默认为 `TYPE_CAST`。
2. Web API（`/searchList`、`/searchPage`、`/getById`、`/getByIds` 等）通常使用 `ConvertType.REFERENCE`，以便关联字段返回引用结构。
3. 对于 OneToMany / ManyToMany：
   - 若提供了 SubQuery，按 SubQuery 的 fields/filters 展开关联行。
   - 若未提供 SubQuery 且 `convertType` 为 `DISPLAY`，则返回显示字符串列表。
   - 若未提供 SubQuery 且 `convertType` 为 `REFERENCE`，则返回 `ModelReference` 列表。

### Boolean

| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始存储值（无格式化）。 |
| `TYPE_CAST` | 布尔 `true/false`。 |
| `DISPLAY` | 布尔选项集的显示名称（若已配置）；否则同 `TYPE_CAST`。 |
| `REFERENCE` | 布尔 `true/false`（布尔无引用对象）。 |

### Option / MultiOption

| ConvertType | Option（单选） | MultiOption |
| --- | --- | --- |
| `ORIGINAL` | 原始存储的条目编码。 | 原始存储字符串（逗号分隔）。 |
| `TYPE_CAST` | 条目编码字符串。 | 条目编码的 `List<String>`。 |
| `DISPLAY` | 条目显示名称。 | 逗号拼接的显示名称字符串。 |
| `REFERENCE` | `OptionReference`（`itemCode`、`itemName`、`itemColor`）。 | `List<OptionReference>`。 |

### ManyToOne / OneToOne

1. 无 SubQuery：

| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始关联 ID（不展开）。 |
| `TYPE_CAST` | 按类型格式化后的关联 ID。 |
| `DISPLAY` | 关联显示名称（字符串）。 |
| `REFERENCE` | `ModelReference`（`id`、`displayName`）。 |

2. 有 SubQuery：

返回值为关联**行 Map**，而非显示名称或 `ModelReference`。Map 按同一 `convertType` 构建（嵌套的选项/关联字段沿用该 `convertType`）。返回字段包括关联模型 `id`、所有显示名称字段以及 `SubQuery.fields` 中指定的字段。

### OneToMany / ManyToMany

1. 不在 `QueryParams.fields` 且无 SubQuery：
   OneToMany / ManyToMany 字段若既未出现在 `QueryParams.fields` 也未在 `subQueries` 中，则不会出现在响应中。

2. 在 `QueryParams.fields` 中，无 SubQuery：

| ConvertType | OneToMany | ManyToMany |
| --- | --- | --- |
| `TYPE_CAST` | 关联模型行的 `List<Map>`（全部存储字段）。 | 关联模型行的 `List<Map>`（全部存储字段）。 |
| `DISPLAY` | 含 `displayName`、显示字段、id 及分组用关联字段的 `List<Map>`。 | 显示名称的 `List<String>`。 |
| `REFERENCE` | 含 `displayName`、显示字段、id 及分组用关联字段的 `List<Map>`。 | `List<ModelReference>`。 |

3. 有 SubQuery：

1. 若 `count = true`，按父行返回整数数量；SubQuery 的 `filters` 会应用于计数。
2. 否则返回关联行的 `List<Map>`。
3. 若 `SubQuery.fields` 为空，默认返回关联模型的全部存储字段。
4. 若指定了 `SubQuery.fields`，则返回这些字段，且自动包含 `id`；OneToMany 还会包含分组用关联字段。
5. 嵌套 `subQueries` 会递归应用到关联模型。

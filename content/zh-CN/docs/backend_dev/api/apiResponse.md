# API 响应说明

## 按字段类型的 API 返回值
本节按字段类型说明模型 API（`/getById`、`/getByIds`、`/searchList`、`/searchPage`）的返回值。
默认情况下，ModelController 使用 `ConvertType.REFERENCE`。

### Option / MultiOption
默认 API 返回（`OptionReference`）：
1. `Option` -> `OptionReference` 对象：
```json
{ "itemCode": "ACTIVE", "label": "Active", "itemTone": "Success", "itemIcon": "" }
```

2. `MultiOption` -> `List<OptionReference>`：
```json
[
  { "itemCode": "A", "label": "Tag A", "itemTone": "", "itemIcon": "" },
  { "itemCode": "B", "label": "Tag B", "itemTone": "", "itemIcon": "" }
]
```

3. `OptionReference` 字段：
- `itemCode`：选项条目编码。
- `label`：选项条目显示标签（已本地化）。
- `itemTone`：可选语义色调（`Success` / `Warning` / `Error` / `Info` / `Neutral`）。
- `itemIcon`：可选图标名称。

### File / MultiFile
默认 API 返回（`FileInfo`）：
1. `File` -> `FileInfo` 对象。
2. `MultiFile` -> `List<FileInfo>`。

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
1. `ManyToOne` / `OneToOne` -> `ModelReference` 对象：
```json
{ "id": 3001, "displayName": "Engineering" }
```

使用 `SubQuery` 时：
1. 返回值变为关联模型的行映射（而非 `ModelReference`）。
2. 返回的映射包含关联模型的 `id`、displayName 字段以及 `SubQuery.fields` 中的字段。

`ModelReference` 字段：
- `id`：关联行 id。
- `displayName`：关联行显示名称。

### ManyToMany / OneToMany
默认 API 返回（`ModelReference`，无 SubQuery）：
1. `OneToMany` / `ManyToMany` -> `List<ModelReference>`，在 `searchPage` API 中为默认行为。ManyToMany/OneToMany 字段的摘要数据可在数据列表中展示。

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

使用 `SubQuery` 时：
1. `ManyToMany` / `OneToMany` 均返回关联行的 `List<Map>`。
2. 若 `count=true`，则返回整数计数而非行数据。

---

## ConvertType 参考
`ConvertType` 控制**读取**数据时（search/get/copy 及 fetch API）字段值的格式化方式。它影响布尔/选项字段和关联字段，并控制关联是展开还是表示为引用。

说明：
1. `QueryParams` 不暴露 `convertType`。Web 层默认设置 `ConvertType.REFERENCE`。要使用其他 `ConvertType` 值，需通过 `FlexQuery` 直接调用服务层。
2. Filters 和 orders 遵循与顶层 `filters`、`orders` 相同的格式（`Filters` 列表格式及 `Orders` 列表或字符串格式）。

### ConvertType 取值
1. `ORIGINAL` — 返回原始数据库值，不做格式化。典型用途：诊断或在解密前获取原始密文。
2. `TYPE_CAST`（`FlexQuery` 中的默认值）— 基于 fieldType 的标准转换（例如数值/字符串/布尔/json 类型转换）。计算字段和动态级联字段会被求值。关联字段默认不展开为显示值。
3. `DISPLAY` — 将 Boolean/Option/MultiOption 以及 ManyToOne/OneToOne 字段转换为显示值（人类可读字符串）。OneToMany/ManyToMany 的默认展开（未提供 SubQuery 时）返回显示值。
4. `REFERENCE` — 将 Option/MultiOption 以及 ManyToOne/OneToOne 字段转换为引用对象（选项字段为 `OptionReference`，关联字段为 `ModelReference`）。OneToMany/ManyToMany 的默认展开（未提供 SubQuery 时）返回 `ModelReference` 对象列表。

### 后端与 API 默认行为
1. 若未显式设置，`FlexQuery` 默认为 `TYPE_CAST`。
2. Web API（`/searchList`、`/searchPage`、`/getById`、`/getByIds` 等）通常设置 `ConvertType.REFERENCE`，以便关联字段返回引用。
3. 对于 OneToMany/ManyToMany 字段：
   - 若提供 SubQuery，则按 SubQuery 的 fields/filters 展开关联行。
   - 若未提供 SubQuery 且 `convertType` 为 `DISPLAY`，OneToMany/ManyToMany 返回显示字符串列表。
   - 若未提供 SubQuery 且 `convertType` 为 `REFERENCE`，OneToMany/ManyToMany 返回 `ModelReference` 对象列表。

### Boolean
| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始存储值（无格式化）。 |
| `TYPE_CAST` | 布尔值 `true/false`。 |
| `DISPLAY` | 布尔选项集的布尔显示名称（若已配置）；否则与 `TYPE_CAST` 相同。 |
| `REFERENCE` | 布尔值 `true/false`（布尔字段无引用对象）。 |

### Option / MultiOption
| ConvertType | Option（单选） | MultiOption |
| --- | --- | --- |
| `ORIGINAL` | 原始存储的条目编码。 | 原始存储字符串（逗号分隔）。 |
| `TYPE_CAST` | 条目编码字符串。 | 条目编码的 `List<String>`。 |
| `DISPLAY` | 条目显示名称。 | 逗号连接的显示名称（字符串）。 |
| `REFERENCE` | `OptionReference`（`itemCode`、`label`、`itemTone`、`itemIcon`）。 | `List<OptionReference>`。 |

### ManyToOne / OneToOne
1. 无 SubQuery：
| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始关联 id（不展开）。 |
| `TYPE_CAST` | 关联 id（按类型格式化）。 |
| `DISPLAY` | 关联显示名称（字符串）。 |
| `REFERENCE` | `ModelReference`（`id`、`displayName`）。 |

2. 有 SubQuery：
返回值始终为关联**行映射**，而非显示名称或 `ModelReference`。映射使用相同的 `convertType` 构建（因此嵌套的选项/关联字段遵循该 `convertType`）。返回字段包括关联模型的 `id`、所有 display-name 字段以及 `SubQuery.fields` 中指定的字段。

### OneToMany / ManyToMany
1. 不在 `QueryParams.fields` 中且无 SubQuery
对于 OneToMany/ManyToMany 字段，若未在 `QueryParams.fields` 或 `subQueries` 中指定，则不会出现在响应中。

2. 在 `QueryParams.fields` 中，无 SubQuery：
| ConvertType | OneToMany | ManyToMany |
| --- | --- | --- |
| `TYPE_CAST` | 关联模型行的 `List<Map>`（所有存储字段）。 | 关联模型行的 `List<Map>`（所有存储字段）。 |
| `DISPLAY` | 包含 `displayName` 以及显示字段和 id（及用于分组的关联字段）的 `List<Map>`。 | 显示名称的 `List<String>`。 |
| `REFERENCE` | 包含 `displayName` 以及显示字段和 id（及用于分组的关联字段）的 `List<Map>`。 | `List<ModelReference>`。 |

3. 有 SubQuery：
1. 若 `count = true`，每个父行返回整数计数。SubQuery 的 `filters` 会应用于计数。
2. 否则将关联行作为 `List<Map>` 返回。
3. 若 `SubQuery.fields` 为空，默认返回关联模型的所有存储字段。
4. 若指定了 `SubQuery.fields`，则返回这些字段，并自动包含 `id`。对于 OneToMany，用于分组的关联字段也会存在。
5. 嵌套的 `subQueries` 会递归应用于关联模型。

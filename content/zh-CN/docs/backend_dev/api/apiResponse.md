# API 响应结构与 ConvertType

## ConvertType

`ConvertType` 用于控制在**读取数据**时（search / get / copy / fetch 等接口），字段值的格式化方式。它会影响：

- 布尔字段、选项字段（Option / MultiOption）的显示形式；
- 关联字段（ManyToOne / OneToOne / OneToMany / ManyToMany）的展开方式；
- 以及关联对象是直接展开为明细，还是仅以“引用对象”的形式返回。

说明：

1. `QueryParams` 本身不暴露 `convertType` 配置；Web 层默认使用 `ConvertType.REFERENCE`。如需使用其它 `ConvertType`，可以在服务层直接使用 `FlexQuery` 设置。
2. Filters 和 Orders 的格式与顶层 `filters`、`orders` 一致：Filter 使用 `Filters` 的列表格式（中缀数组），Orders 使用列表或字符串格式。

## OptionReference

当选项值被展开或以“引用”的方式返回时，会使用 `OptionReference` 结构。

字段：

- `itemCode`：选项条目编码。
- `itemName`：选项名称。
- `itemColor`：可选的颜色字符串。

## ModelReference

当关联字段的值被展开或以“引用”的方式返回时，会使用 `ModelReference` 结构。

字段：

- `id`：关联记录的 ID。
- `displayName`：关联记录的显示名称。

## ConvertType 取值

1. `ORIGINAL`
   返回数据库中存储的**原始值**，不做格式化。典型场景：诊断、调试，或在解密前拿到原始密文。

2. `TYPE_CAST`（`FlexQuery` 的默认值）
   按字段类型（数值 / 字符串 / 布尔 / JSON 等）做常规类型转换。
   - 计算字段与动态级联字段会被求值。
   - 关联字段默认不会展开为显示值或引用对象。

3. `DISPLAY`
   将 Boolean / Option / MultiOption 以及 ManyToOne / OneToOne 字段转换为**显示值**（人类可读字符串）。
   - 对于 OneToMany / ManyToMany，在没有配置 SubQuery 时，默认返回显示值形式。

4. `REFERENCE`
   将 Option / MultiOption 以及 ManyToOne / OneToOne 字段转换为**引用对象**：
   - 选项字段：返回 `OptionReference`。
   - 关联字段：返回 `ModelReference`。
   对于 OneToMany / ManyToMany，在没有配置 SubQuery 时，默认返回 `ModelReference` 列表。

## 默认行为与 API 整体约定

1. `FlexQuery`：如果未显式设置，默认 `ConvertType.TYPE_CAST`。
2. Web API（如 `/searchList`、`/searchPage`、`/getById`、`/getByIds` 等）通常会设置为 `ConvertType.REFERENCE`，以便关联字段统一返回引用结构。
3. 对于 OneToMany / ManyToMany：
   - 如果配置了 SubQuery，则按 SubQuery 的字段/过滤条件展开明细。
   - 如果没有 SubQuery 且 `convertType` 为 `DISPLAY` 或 `REFERENCE`，则 OneToMany / ManyToMany 默认返回显示值列表。
   - 如果没有 SubQuery 且 `convertType` 为 `REFERENCE`，ManyToMany 会返回 `ModelReference` 列表。

## 不同 ConvertType 下的返回值对比

除非特别说明，本节描述的是服务层 `FlexQuery` 的行为。
Web API 使用 `QueryParams` 时默认 `ConvertType.REFERENCE`，在未提供 SubQuery 的情况下，可以参照 `REFERENCE` 列中的行为。

### 1. Boolean

| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始存储值（不做任何格式化）。 |
| `TYPE_CAST` | 布尔值 `true/false`。 |
| `DISPLAY` | 来自布尔选项集的显示名称（如果已配置）；否则与 `TYPE_CAST` 一致。 |
| `REFERENCE` | 仍然是布尔 `true/false`（布尔类型不会包装成引用对象）。 |

### 2. Option / MultiOption

| ConvertType | Option（单选） | MultiOption（多选） |
| --- | --- | --- |
| `ORIGINAL` | 原始存储的条目编码。 | 原始存储的字符串（逗号分隔）。 |
| `TYPE_CAST` | 条目编码字符串。 | `List<String>` 编码列表。 |
| `DISPLAY` | 条目显示名称。 | 以逗号拼接的显示名称字符串。 |
| `REFERENCE` | `OptionReference`（含 `itemCode`、`itemName`、`itemColor`）。 | `List<OptionReference>`。 |

### 3. ManyToOne / OneToOne

1. **未配置 SubQuery 时：**

| ConvertType | 返回值 |
| --- | --- |
| `ORIGINAL` | 原始关联 ID（不展开）。 |
| `TYPE_CAST` | 类型转换后的关联 ID。 |
| `DISPLAY` | 关联记录的显示名称（字符串）。 |
| `REFERENCE` | `ModelReference`（包含 `id`、`displayName`）。 |

2. **配置 SubQuery 时：**

- 返回值始终为一条**关联行 Map**，而不再是纯字符串或 `ModelReference`。
- Map 中的字段会按当前 `convertType` 做相同的类型转换（嵌套的选项/关联字段遵循同一 `convertType`）。
- 默认会包含：关联模型的 `id`、所有显示名称字段，以及 `SubQuery.fields` 中显式指定的字段。

### 4. OneToMany / ManyToMany

1. **既不在 `QueryParams.fields` 中，也没有 SubQuery：**

- OneToMany / ManyToMany 字段在响应中不会出现。

2. **出现在 `QueryParams.fields` 中，但没有 SubQuery：**

| ConvertType | OneToMany | ManyToMany |
| --- | --- | --- |
| `TYPE_CAST` | 返回 `List<Map>`，每个 Map 为关联模型的一行（包含所有存储字段）。 | 返回 `List<Map>`，每个 Map 为关联模型的一行（包含所有存储字段）。 |
| `DISPLAY` | 返回 `List<Map>`，包含 `displayName`、显示字段、id 以及用于分组的关联字段。 | 返回 `List<String>`，为显示名称列表。 |
| `REFERENCE` | 返回 `List<Map>`，包含 `displayName`、显示字段、id 以及用于分组的关联字段。 | 返回 `List<ModelReference>`。 |

3. **配置了 SubQuery：**

1. 当 `count = true` 时：返回按父记录分组的关联行数量（整数）；SubQuery 的 `filters` 会应用在计数查询上。
2. 否则：返回 `List<Map>` 形式的关联明细行。
3. 如果 `SubQuery.fields` 为空：默认返回关联模型的所有存储字段。
4. 如果指定了 `SubQuery.fields`：仅返回这些字段，同时总是包含 `id`；对于 OneToMany，还会包含用于分组的关联字段。
5. 若配置了嵌套 `subQueries`，会对关联模型递归应用相同的展开逻辑。

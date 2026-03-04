# 字段提交说明（Option / File / XToOne）

以下格式适用于创建/更新类接口（`createOne`、`createList`、`updateOne`、`updateList` 及其变体）。

## Option / MultiOption

提交格式：

1. **Option（单选）**：选项条目编码字符串。
2. **MultiOption（多选）**：选项条目编码列表（推荐），或逗号分隔的字符串。

示例：

```json
{
  "status": "Active",
  "tags": ["A", "B", "C"]
}
```

清空语义：

1. **Option**：将字段设为 `null`（若字段非必填）。
2. **MultiOption**：设为 `[]`，或 `null`（若字段非必填）。

## File / MultiFile

提交格式：

1. **File（单文件）**：上传后的 `fileId`。
2. **MultiFile（多文件）**：`fileId` 列表。

示例：

```json
{
  "avatar": "1001",
  "attachments": ["2001", "2002", "2003"]
}
```

清空语义：

1. **File**：将字段设为 `null`（若字段非必填）。
2. **MultiFile**：设为 `[]`，或 `null`（若字段非必填）。

## ManyToOne / OneToOne

提交格式：

1. 直接提交关联行 ID。
2. 不要以嵌套对象（如 `{id, displayName}`）作为提交值。

示例：

```json
{
  "deptId": "3001",
  "ownerId": "4001"
}
```

清空语义：

1. 将字段设为 `null`（若字段非必填）可解除关联。

校验说明：

1. 关联 ID 会按关联模型的主键类型格式化后再持久化。
2. 若字段为必填，传 `null` 会被拒绝。

## XToMany API 数据提交

在创建/更新类接口（`createOne`、`createList`、`updateOne`、`updateList` 及其 `*AndFetch` 变体）中，`OneToMany` 与 `ManyToMany` 字段均支持**全量提交**和**增量提交**两种方式。

后端通过字段值的类型区分模式：

1. **`List`** → 全量提交模式，后端通过差集推断增/改/删；
2. **`Object(Map)`** → 增量提交模式，按 `PatchType` 属性值直接执行对应操作；

在前端 `ModelForm` 组件中，支持 XToMany 数据分页，因此默认采用增量提交方式，在提交的数据中，通过 `PatchType` 区分数据操作类型。

`PatchType` 可选项：
- OneToMany 场景: `Create`、 `Update`、`Delete`；
- ManyToMany 场景：`Add`、`Remove`；

### OneToMany 提交

字段值支持：

1. **全量提交**：`[{row1}, {row2}]`，当字段值为 `[]` 时，清空历史记录。
2. **增量提交**，以 `PatchType` 为 Key：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": 101, "name": "changed" }],
  "Delete": [102, 103]
}
```

`PatchType` 规则：

1. `Create` / `Update` 的值为行列表（`List<Map>` 或可转为 Map 的对象列表）。
2. `Delete` 的值为 ID 列表。
3. 在**创建主模型数据**场景下，仅允许 `Create`；`Update` 和 `Delete` 会被拒绝。
4. 在**更新主模型数据**场景下，`Update` / `Delete` 中的 ID 必须属于当前父记录。

### ManyToMany 提交

字段值支持：

1. **全量提交**：`[id1, id2, id3]`，当字段值为 `[]` 时，清空历史记录。
2. **增量提交**，以 `PatchType` 为 Key：

```json
{
  "Add": [1, 2, 3],
  "Remove": [4, 5]
}
```

`PatchType` 规则：

1. `PatchType`： `Add` 与 `Remove`, 值为 ID 列表。
2. 在**创建主模型数据**场景下，仅允许 `Add`；`Remove` 会被拒绝。
3. 在**更新主模型数据**场景下：
   - `Add` 仅添加当前不存在的关联。
   - `Remove` 仅删除当前已存在的关联。

### 兼容性与校验

1. 全量提交模式与现有推断逻辑保持兼容。
2. PatchType 大小写不敏感，支持枚举风格与显示风格命名：
   - OneToMany：`CREATE/UPDATE/DELETE` 或 `Create/Update/Delete`
   - ManyToMany：`ADD/REMOVE` 或 `Add/Remove`
3. 未知的 PatchType 或非列表类型的 Patch Value 会在参数校验阶段快速失败并返回错误。

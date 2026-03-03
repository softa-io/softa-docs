# API 中的通用查询条件

## 1. QueryParams 介绍

`QueryParams` 是 `/searchPage` 等查询接口的请求体模型，用于以结构化的方式描述字段、筛选条件、排序、分组、聚合以及关联展开方式，从而实现灵活、精确的数据查询。

### 1.1 QueryParams

`QueryParams` 的属性说明：

- `fields`：要返回的模型字段列表。对于关联字段：
  - 控制当关联字段被展开（通过 `ConvertType` 或 SubQuery）时，返回哪些字段。
  - 对于 ManyToOne / OneToOne，除了 `fields` 中指定的字段外，显示名称字段总是会被额外返回。
  - 对于 OneToMany / ManyToMany，如果既没有出现在 `fields` 中，也没有在 `subQueries` 中配置，则不会出现在响应中。
- `filters`：筛选条件列表。每个条件使用数组形式表示 `[field, operator, value]`，例如：`["status", "=", "ACTIVE"]`。
- `orders`：排序规则列表。每条规则为 `[field, direction]` 形式，例如：`["createdTime", "DESC"]`。也可以使用字符串形式，如 `"createdTime DESC, name ASC"`。
- `aggFunctions`：需要执行的聚合函数列表，例如：`["SUM(amount)", "COUNT(id)"]`。
- `pageNumber`：分页页码，从 1 开始。
- `pageSize`：每页返回的记录数。
- `groupBy`：用于分组的字段列表。
- `splitBy`：用于拆分查询结果的字段（Split Query 场景）。
- `summary`：是否返回汇总数据（例如合计行）。
- `effectiveDate`：用于评估“按生效日期”数据的日期（时间轴模型）。
- `subQueries`：一个 Map，key 为关联字段名，value 为对应的 `SubQuery` 配置，用于定义关联字段如何展开。

示例请求（基础分页 + subQueries）：

```json
{
  "fields": ["id", "name", "deptId", "projects"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": [["createdTime", "DESC"]],
  "pageNumber": 1,
  "pageSize": 20,
  "subQueries": {
    "deptId": { "fields": ["id", "name"] },
    "projects": { "fields": ["id", "name"], "orders": [["createTime", "DESC"]], "topN": 3 }
  }
}
```

### 1.2 SubQuery

`SubQuery` 用于 `subQueries` 中，定义某个关联字段的展开方式。

SubQuery 属性：

1. `fields`：要返回的关联模型字段列表。对于 ManyToOne / OneToOne，除了这些字段外，显示名称字段也会被自动包含。
2. `filters`：应用在关联模型上的筛选条件。
3. `orders`：关联模型的排序规则。
4. `count`：当为 `true` 时，对于 OneToMany / ManyToMany，不再返回明细行，而是返回关联行数量。
5. `topN`：仅适用于 OneToMany，且需要配置 `orders`；表示对每个主记录只返回前 N 条关联记录。
6. `subQueries`：对关联模型再做嵌套展开。

## 2. Filters 中缀表达式

Filters 使用**中缀表达式**来定义查询条件，可以支持对象形式、字符串形式、语义化表达，甚至接入 AI 的智能查询能力。

### 2.1 对象查询（数组形式）

对象查询使用数组/嵌套数组表达条件：

- 空查询：

  `[]`

- 单条件：

  `["name", "=", "IT"]`

- 多条件（隐式 AND）：

  `[["name", "=", "IT"], ["level", "=", 6]]`

- 带逻辑运算符的组合条件：

  - 使用 `OR`：

    `[["name", "=", "IT"], "OR", ["code", "=", "A010"], "OR", ["level", "=", 2]]`

  - 混合 `OR` 和 `AND`：

    `[[ "name", "=", "IT"], "OR", ["code", "=", "A010"]], "AND", ["level", "=", 2]`

### 2.2 字符串查询

字符串形式的查询允许将条件写成简洁的字符串表达式，常用于场景简单、强调可读性时。底层会解析成等价的对象形式条件。

### 2.3 语义化查询

语义化查询使用更接近自然语言的语法来表达条件，提升可读性与业务人员的易用性，例如支持“部门为研发且级别 ≥ 6”这一类更贴近业务口语的描述。

### 2.4 查询扩展：AI 查询

在接入 AI 能力后，可以通过自然语言描述查询意图，由 AI 生成对应的 Filters 表达式，实现更加智能、上下文感知的查询体验。

## 3. Orders 排序条件

`orders` 用于定义查询结果的排序规则，例如：

- 升序：

  `["name", "ASC"]`

- 降序：

  `["date", "DESC"]`

也可以使用字符串形式：

```text
"createdTime DESC, name ASC"
```

## 4. groupBy 分组条件

`groupBy` 指定按哪些字段进行分组聚合，例如：

- 按单个字段分组：

  `["department"]`

- 按多个字段分组：

  `["department", "role"]`

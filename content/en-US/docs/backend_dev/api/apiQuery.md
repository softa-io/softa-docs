# General Query in API

## 1. Introduction to QueryParams

`QueryParams` provides a flexible and structured way to define query conditions for API endpoints, enabling precise data retrieval based on filters, sorting, grouping, and extensions.

### 1.1 QueryParams

`QueryParams` is the request body for `/searchPage`. It describes fields, filters, sorting, aggregation, paging, and relational expansions.

`QueryParams` attributes:
- `fields`: list of model fields to return. For relational fields, this controls which related fields are included when the relation is expanded (either by `ConvertType` or SubQuery). For ManyToOne/OneToOne, display name fields are always included in addition to `fields`. For OneToMany/ManyToMany fields, they would not be appear in the response if not specified in `fields` nor in `subQueries`.
- `filters`: list of filter conditions. Each condition is a list in the format `[field, operator, value]` (e.g., `["status", "=", "ACTIVE"]`).
- `orders`: list of sorting rules. Each rule is a list in the format `[field, direction]` (e.g., `["createdTime", "DESC"]`). Alternatively, `orders` can be a string like `"createdTime DESC, name ASC"`.
- `aggFunctions`: list of aggregation functions to apply (e.g., `["SUM(amount)", "COUNT(id)"]`).
- `pageNumber`: page number for pagination (starting from 1).
- `pageSize`: number of records per page.
- `groupBy`: list of fields to group by.
- `splitBy`: field to split results by (for split queries).
- `summary`: boolean flag to indicate whether to return summary data (e.g., totals) for the query.
- `effectiveDate`: date for evaluating effective-dated data.
- `subQueries`: map of relational field names to `SubQuery` objects, defining how to expand those relations.

Example request (basic paging + subQueries):
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

`SubQuery` is used inside `subQueries` to define how a relational field is expanded.

SubQuery attributes:
1. `fields` - related model fields to return. For ManyToOne/OneToOne, display name fields are always included in addition to `fields`.
2. `filters` - filter conditions applied to the related model.
3. `orders` - sort rules for the related model.
4. `count` - when `true`, returns the count of related rows for OneToMany/ManyToMany instead of rows.
5. `topN` - OneToMany only; requires `orders`, returns top N related rows per parent.
6. `subQueries` - nested expansions for the related model.


## 2. Filters with Infix Expressions

Filters use infix expressions to define conditions for querying data. These expressions can target objects, strings, semantics, or even AI-assisted queries.

### 2.1 Object Queries

Object queries are defined using arrays to represent conditions. Examples:

- **Empty Query**:
  []

- **Single Condition**:
  ["name", "=", "IT"]

- **Multiple Conditions**:
  [["name", "=", "IT"], ["level", "=", 6]]

- **Compound Conditions with Logical Operators**:
  - Using `OR`:
    [["name", "=", "IT"], "OR", ["code", "=", "A010"], "OR", ["level", "=", 2]]

  - Combining `OR` and `AND`:
    [["name", "=", "IT"], "OR", ["code", "=", "A010"]], "AND", ["level", "=", 2]

### 2.2 String Queries

String-based queries allow conditions to be expressed as simple strings. They are often used for easier readability or when conditions are straightforward.

### 2.3 Semantic Queries

Semantic queries utilize human-friendly syntax to express conditions, enabling more intuitive and readable query definitions.

### 2.4 Query Extensions: AI Queries

AI-assisted queries allow leveraging machine learning or natural language processing to define dynamic and context-aware conditions.

## 3. Orders: Sorting Conditions

Define sorting criteria to order the results of a query. For example:

- Ascending order:
  ["name", "ASC"]

- Descending order:
  ["date", "DESC"]

## 4. groupBy: Grouping Conditions

Grouping conditions specify how data should be aggregated based on specific fields. For instance:

- Group by a single field:
  ["department"]

- Group by multiple fields:
  ["department", "role"]
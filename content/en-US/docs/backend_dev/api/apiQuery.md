# General Query in API

## 1. Introduction to QueryParams

`QueryParams` provides a flexible and structured way to define query conditions for API endpoints, enabling precise data retrieval based on filters, sorting, grouping, and extensions.

### 1.1 QueryParams

`QueryParams` is the request body for `/searchPage`. It describes fields, filters, sorting, aggregation, paging, and relational expansions.

`QueryParams` attributes:
- `fields`: list of model fields to return. For relational fields, this controls which related fields are included when the relation is expanded (either by `ConvertType` or SubQuery). For ManyToOne/OneToOne, display name fields are always included in addition to `fields`. For OneToMany/ManyToMany fields, they would not be appear in the response if not specified in `fields` nor in `subQueries`. For timeline models, `sliceId` is always included even under a narrow `fields` selection (like `version` under optimistic locking), so returned version rows stay actionable via `update` / `deleteBySliceId`.
- `filters`: list of filter conditions. Each condition is a list in the format `[field, operator, value]` (e.g., `["status", "=", "ACTIVE"]`).
- `orders`: list of sorting rules. Each rule is a list in the format `[field, direction]` (e.g., `["createdTime", "DESC"]`). Alternatively, `orders` can be a string like `"createdTime DESC, name ASC"`. A paged query appends the primary key last (in the direction of the first sort), so pages neither repeat nor skip a row where the sort fields tie.
- `aggFunctions`: list of aggregation functions to apply (e.g., `["SUM(amount)", "COUNT(id)"]`).
- `pageNumber`: page number for pagination (starting from 1).
- `pageSize`: number of records per page.
- `groupBy`: list of fields to group by.
- `splitBy`: field to split results by (for split queries).
- `summary`: boolean flag to indicate whether to return summary data (e.g., totals) for the query.
- `effectiveDate`: date for evaluating effective-dated (timeline) data; default is today. Ignored when `acrossTimeline` is true.
- `acrossTimeline`: timeline models only. When `true`, return **all** version slices (skip the effective-date clamp) — for example a record's full version list. Default `false` returns the single slice effective on `effectiveDate`. Maps to `FlexQuery.acrossTimelineData()`; no-op for non-timeline models. Also available on `SearchListParams` for `/searchList`. Not present on `SearchNameParams`.
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
3. `orders` - sort rules for the related model; without them the related model's `defaultOrder`, and entry order (`id` ascending) when it has none.
4. `count` - when `true`, returns the count of related rows for OneToMany/ManyToMany instead of rows.
5. `topN` - OneToMany only; requires `orders`, returns top N related rows per parent.
6. `subQueries` - nested expansions for the related model.

### 1.3 SearchNameParams

`SearchNameParams` is the request body of `/searchName`: a name search for candidates (dropdowns and pickers), one page at a time, each row carrying `displayName`.

- `value` - the text to match, by default with `CONTAINS` on the model's `searchName` fields.
- `matchField` / `operator` - match on another field or with another operator, such as `"code"` with `"START WITH"`.
- `filters` - extra conditions, such as the relational field's own filters or conditions from the form context.
- `orders` - sort rules; the model's `defaultOrder` when omitted, newest first (`id DESC`) when the model has none. Either way the model's physical primary key (`sliceId` on a timeline model) ends the order, so pages neither repeat nor skip a candidate.
- `additionalFields` - fields to return besides the display name.
- `pageNumber` - page number, from 1; default 1.
- `pageSize` - rows per page, default 10, within 1 to 10000; a value outside that range is rejected.
- `effectiveDate` - the effective date for timeline models; default today.
- `sourceRecord` - a snapshot of the record the caller is on, so the backend can narrow the candidates by business rules.

The response is the page's rows (a list), with no total and no count query. Fewer rows than `pageSize` means this is the last page; exactly `pageSize` means the next page may be requested (when the last page happens to be full, the next one comes back empty).

```json
{
  "value": "Li",
  "filters": ["active", "=", true],
  "pageNumber": 2,
  "pageSize": 20
}
```

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
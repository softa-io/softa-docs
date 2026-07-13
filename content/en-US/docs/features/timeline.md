# Timeline Model
A timeline model records historical slices of data over time. It is useful for business data that depends on an effective date (for example, department structures or reports that change before/after a specific date). A business record `id` can have multiple slices; each slice is identified by `sliceId`, and `effectiveStartDate`/`effectiveEndDate` define the effective range.

## 1. Timeline Model Metadata

### 1.1 Timeline Attribute at Model Level
- `timeline = true` indicates this is a timeline model. It must contain the reserved fields `effectiveStartDate` and `effectiveEndDate`. The system validates these fields on startup and throws an exception if missing.
- `timeline = false` indicates a non-timeline model. Non-timeline models must not define the reserved fields `effectiveStartDate` and `effectiveEndDate`.
- A timeline model **requires an app-generated logical id** — `idStrategy = DISTRIBUTED_LONG` (or `DISTRIBUTED_STRING` / `EXTERNAL_ID`). `DB_AUTO_ID` is rejected at boot: the auto-increment lands on the physical `sliceId`, so nothing would fill the shared logical `id` column of a first slice (split/correct rows arrive carrying the entity's existing id and keep it).

### 1.2 Primary Keys and Fields
- `sliceId`: physical primary key of a timeline model, used to update a slice.
- `effectiveStartDate`: effective start date of the timeline data.
- `effectiveEndDate`: effective end date of the timeline data.
- `id`: logical (business) primary key, compatible with non-timeline models. All business foreign keys referencing a timeline model use this field.
- If your database needs an auto-increment record number (such as `record_id`) for change logs, you can add it yourself. It is not a framework-reserved field.
- Recommended unique constraint: `(id, effectiveStartDate, effectiveEndDate)` — one index doubles as the as-of read cover (the end date is checked in-index) and as an integrity backstop: interval maintenance is a check-then-act sequence, so a true concurrent write race on one entity surfaces as a unique violation instead of silent same-start slices. Declare it with an **explicit `indexName`** (the default concatenated name exceeds the 60-char global limit for longer table names):

  ```java
  @Index(indexName = "uk_<table>_timeline",
         fields = {"id", "effectiveStartDate", "effectiveEndDate"}, unique = true)
  ```

### 1.3 Metadata Relationships
- Timeline models can relate to themselves via One2One, Many2One, One2Many, Many2Many. Storage and references use the logical primary key `id`.
- When a timeline model relates to a non-timeline model, relation tables store the timeline model logical key `id`.
- When a non-timeline model relates to a timeline model, Many2One/One2One fields and Many2Many join tables store the timeline model logical key `id`.
- Association reads use `effectiveDate` by default (current date if not specified), so there may be no effective slice for the current date.
- In cascade query chains (for example, timeline -> non-timeline -> timeline), `effectiveDate` should be propagated to the last model to keep consistency.

### 1.4 Cascaded Fields
- Cascaded fields are based on Many2One/One2One associations. When the related model is a timeline model, `Context.effectiveDate` is used to query the related data.

### 1.5 Timeline Data Concepts
- Every slice must have `effectiveStartDate` and `effectiveEndDate`, and slices for the same `id` are expected to be continuous and non-overlapping.
- To simplify queries, the last slice typically uses `effectiveEndDate = 9999-12-31`.
- In most cases, you only need to set `effectiveStartDate`; the system computes and fills `effectiveEndDate` based on adjacent slices.
- Physical record: each slice is a physical record (identified by `sliceId`). Any change in effective dates creates or updates physical slices. Change logs are bound to physical records.
- Logical record: a group of physical slices that share the same logical `id`. Business foreign keys reference the logical `id`, and association reads return the slice effective on the requested date.

Example timeline slices (same logical department `id`):

| sliceId (physical) | id (logical) | Department Code | Department Name | effectiveStartDate | effectiveEndDate | Manager |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 6 | D001 | Product R&D Dept | 2022-09-01 | 9999-12-31 | Joan |
| 2 | 6 | D001 | R&D Dept | 2020-05-11 | 2022-08-31 | Tom |
| 1 | 6 | D001 | R&D Dept | 2019-08-01 | 2020-05-10 | Mars |

## 2. Common Scenarios

### 2.1 Effective Date Propagation
- `effectiveDate` is a `LocalDate` stored in `Context`, defaulting to the current date.
- Query data effective on a specific date:
  `effectiveStartDate <= effectiveDate && effectiveEndDate >= effectiveDate`
- Query data effective within a period (startDateValue, endDateValue must be non-null):
  `effectiveStartDate <= endDateValue && effectiveEndDate >= startDateValue`
- To query all slices for a business record, use `acrossTimelineData()` with `id` filters (or include `effectiveStartDate/effectiveEndDate` in filters).
- Typical adjacent slice lookups:
  `previous: id = {id} AND effective_end_date = {effectiveStartDate - 1}`
  `next: id = {id} AND effective_start_date = {effectiveEndDate + 1}`

### 2.2 read/search APIs
- Queries like `getById/getByIds/searchList/searchPage` return only slices effective on `effectiveDate` by default.
- To query history across time, use `FlexQuery#acrossTimelineData()` or include `effectiveStartDate`/`effectiveEndDate` in filters.
- Cascaded reads propagate `effectiveDate`.

### 2.3 create APIs
- For `createOne/createList`, if `effectiveStartDate` is empty, it uses the current `effectiveDate`; if `effectiveEndDate` is empty, it is set to `9999-12-31`.
- If an existing `id` is provided, the system automatically splits or adjusts adjacent slices based on the new `effectiveStartDate`.

### 2.4 update APIs
- The current implementation uses `sliceId` as the update primary key. Updating `effectiveStartDate` automatically corrects adjacent slices' `effectiveEndDate`.
- Manual updates to `effectiveEndDate` are not recommended. To create a new slice, use `create` with an existing `id` and a new `effectiveStartDate`.
- If an upper layer provides a "correct"-style API (update data without creating a new slice), it should locate by `sliceId` (the ORM currently does not provide a dedicated correct API).

### 2.5 delete APIs
- `deleteById/deleteByIds`: deletes all slices for a business `id` — this is **entity deletion**, and it is the point where the inbound-FK delete strategy (`onDelete` RESTRICT / CASCADE / SET_NULL, keyed by the logical `id`) fires against referencing models.
- `deleteBySliceId`: deletes a single slice and automatically corrects adjacent slice ranges. The entity survives, so `onDelete` deliberately does **not** fire.

### 2.6 Versioning seam (engine internals)
- All timeline handling in `ModelServiceImpl` routes through one `VersioningStrategy` seam (`service/versioning/`): `IdentityStrategy` is a no-op for regular models, `TimelineStrategy` adapts the interval-maintenance algorithm in `TimelineService`. New read paths must route Filters/FlexQuery through the `scopedRead` exits — there is no per-call-site `if (isTimelineModel)` to forget.
- The across-timeline opt-out is a **dual trigger by contract**: the explicit `FlexQuery.acrossTimelineData()` flag, **or** caller-supplied `effectiveStartDate`/`effectiveEndDate` conditions (which declare "I am doing my own temporal filtering"). Either suppresses the default effective-date clamp; both are intended, stable behavior.
- **Accepted limitations** (a master-detail table split was evaluated and rejected — its headline benefit, a real DB FK target, is moot because referential integrity is enforced app-level and no physical FKs are emitted): version-invariant fields (e.g. `code`) repeat on every slice, and a **declarative reference-by-code relation to a timeline model is not supported** (`code` is not physically unique across slices). Reference timeline entities by logical `id` (as-of) or pin one slice via `sliceId`; a **runtime** "`code` + effective date" as-of query is fully supported (non-overlapping intervals make it unique).
- `Context.effectiveDate` is ambient state (defaults to today). Batch engines that fan work out across threads must propagate the context (ScopedValue) to workers — e.g. a payroll run pricing by `payDate` — or that branch silently prices "as of today".

### 2.7 search Join Rules for Timeline Associations
- When the related object is a timeline model, Many2One/One2One queries automatically append to the `LEFT JOIN ON` clause:
  `effectiveStartDate <= effectiveDate AND effectiveEndDate >= effectiveDate`.
- One2Many/Many2Many cascades also filter slices based on `effectiveDate`.

## Examples

### 1) Model Definition
```java
@Data
@EqualsAndHashCode(callSuper = true)
@Model(label = "Product Price", timeline = true, idStrategy = IdStrategy.DISTRIBUTED_LONG)
@Index(indexName = "uk_product_price_timeline",
       fields = {"id", "effectiveStartDate", "effectiveEndDate"}, unique = true)
public class ProductPrice extends TimelineModel {
    @Serial
    private static final long serialVersionUID = 1L;

    @Field(label = "ID")
    private Long id;

    @Field(label = "Product ID")
    private Long productId;

    @Field(label = "Price")               // BigDecimal → DECIMAL(32,8) by default (money)
    private BigDecimal price;
}
```

### 2) Query Current and Historical Slices
```java
ContextHolder.getContext().setEffectiveDate(LocalDate.of(2025, 1, 1));

Filters filters = new Filters().eq("productId", 1001L);
List<Map<String, Object>> current = modelService.searchList("ProductPrice", new FlexQuery(filters));

FlexQuery historyQuery = new FlexQuery(new Filters().eq("id", 1L))
        .acrossTimelineData()
        .orderBy(Orders.ofAsc("effectiveStartDate"));
List<Map<String, Object>> history = modelService.searchList("ProductPrice", historyQuery);
```

## 3. Performance
- By default, queries do not scan across time (no `effectiveStartDate/effectiveEndDate` filters and no `acrossTimelineData()`), which reduces scanning.
- Add indexes for `effectiveStartDate` and `effectiveEndDate`.

## 4. Time-Effective (Non-Timeline) Data
Some models need history records with effective dates but are not timeline models (for example, HR changes, work history, education history). These cases may allow multiple records on the same day and do not require continuous slices.

In Softa, timeline fields are reserved. If you need history-only behavior, use a separate history model or different field names, and keep `timeline = false` to avoid timeline slice semantics.

# Relation Fields

Use this document for relation-oriented field APIs:

- `RelationTable`
- `SelectTree`
- `ManyToOne` / `OneToOne`
- `OneToMany`
- `ManyToMany`
- relation query / pagination / patch behavior

Related docs:

- [Fields](./fields): core `Field` props, conditions, `filters`, `Field.onChange`, value contracts
- [Widget matrix](./widgets): widget compatibility and widget-specific examples
- [ModelForm](../views/form): page shell and relation-form examples
- [ModelTable](../views/table): read cells and inline edit behavior

## Import

```tsx
import { Field, RelationTable } from "@/components/fields";
```

`RelationTable` is used only inside relation field declarations such as `Field.tableView`.

## `RelationTable`

`RelationTable` is the relation-table view definition for `OneToMany` and `ManyToMany`.
Declare a zero-prop `tableView` component and return `<RelationTable />` from it.

Example:

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTable>
  );
}
```

### Props

| Prop       | Type             | Required | Notes                                                                                                     |
| ---------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`      | Yes      | Ordered `<Field />` column declarations, plus optional `<Action />` row actions (see [Row Actions](#row-actions)). |
| `orders`   | `OrderCondition` | No       | Default relation-table sorting. Supports a single tuple or multiple tuples.                               |
| `pageSize` | `number`         | No       | Relation-table page size. Only affects paged relation tables (`isPaged={true}`).                          |

Sorting examples:

```tsx
<RelationTable orders={["sequence", "ASC"]}>
  <Field fieldName="sequence" />
  <Field fieldName="itemCode" />
</RelationTable>
```

```tsx
<RelationTable
  orders={[
    ["sequence", "ASC"],
    ["itemCode", "DESC"],
  ]}
>
  <Field fieldName="sequence" />
  <Field fieldName="itemCode" />
</RelationTable>
```

Behavior notes:

- `RelationTable.pageSize` only affects paged relation tables (`isPaged`)
- `RelationTable.orders` supports both a single tuple and multiple tuples
- column declaration still comes from child `<Field />` order

### Row Actions

`RelationTable` accepts `<Action />` children alongside `<Field />` declarations. They render as per-row actions in a trailing `Actions` column and dispatch against the **related model** — the action's `operation` / `href` / `onClick` receives the row's `id` as the record id.

```tsx
import { Action } from "@/components/actions/Action";

function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]}>
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Action
        type="link"
        labelName="Open"
        placement="inline"
        href="/config/option-item/{id}"
      />
      <Action
        labelName="Archive"
        operation="archive"
        placement="more"
      />
    </RelationTable>
  );
}
```

Placement rules match `ModelTable` row actions:

- `placement="inline"` (default for rows) → icon/button in the Actions column
- `placement="more"` → overflow dropdown in the Actions column
- `placement="toolbar"` / `"header"` are ignored (relation tables have no toolbar)

Behavior notes:

- actions only render on rows that have an `id`; draft/unsaved rows show an empty cell
- action dispatch uses the **related** model name (not the parent form's model), so `operation` invokes against the related entity and query invalidation refreshes that model
- `disabled` / `hidden` conditions evaluate against the saved row data — they do not track unsaved inline-edit values (unlike `ModelTable`)
- `ActionExecutionContext.scope` is reported as `"model-table"` in this context (relation rows reuse the same dispatcher)

## `ManyToOne` / `OneToOne`

Default behavior is searchable reference selection:

```tsx
<Field fieldName="departmentId" />
```

Dependent relation filter example:

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

Notes:

- `filters` is applied to the default searchable reference query
- when a dependent `{{ fieldName }}` has no current value, the selector stays query-disabled instead of loading all options

#### `filterBySource` — backend-driven contextual filtering

For business rules that cannot be expressed declaratively via `filters` / `{{ fieldName }}` (e.g. "male employees can't select maternity leave", "remaining annual leave must be > 0"), use `filterBySource` to let the backend apply its own filtering based on the calling record's context:

```tsx
<Field fieldName="leaveTypeId" filterBySource />
```

When `filterBySource` is true, the `searchName` request carries a `SourceRecord`:

```ts
interface SourceRecord {
  model: string;                     // metaField.modelName — the model that owns this field
  recordId?: string | null;          // resolved recordId; null in create mode
  values?: Record<string, unknown>;  // current in-memory form values of that record
}
```

Semantics:

- `model` and `recordId` describe the record that directly owns the field — for a root form Field this is the root record, for a Field inside a OneToMany / ManyToMany row it is that row's record (with the row's own model, not the parent's)
- `values` is the form snapshot at query time; changes to any form value trigger a fresh query so the dropdown re-filters reactively
- default is `false`; enable per field, because "should this lookup honor the host form" is a call-site decision, not a target-model decision
- can be combined with declarative `filters`; both are sent and the backend applies them together

Choosing between `filters` and `filterBySource`:

- **`filters` with `{{ fieldName }}`** — simple cross-field references resolved on the frontend (`gender`, `status`, `departmentId` etc.). Declarative, discoverable in code, no backend changes needed.
- **`filterBySource`** — rules that require computation, policy lookups, or cross-model joins on the backend. Opaque to the frontend but keeps business rules co-located with the backend service that enforces them on `save`.

Example — a leave-type dropdown filtered by employee gender through a server-side rule:

```tsx
<Field fieldName="employeeId" />
<Field fieldName="leaveTypeId" filterBySource />
```

Security note: `filterBySource` sends the entire current form values map. Don't enable it on forms carrying fields the target backend shouldn't see.

### `SelectTree`

Use `SelectTree` when the related model is hierarchical:

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

Common pattern with dependent filtering:

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  widgetType="SelectTree"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

Behavior:

- `SelectTree` is the recommended developer-facing tree entry for forms and inline editors
- it is still declared through `Field`, not by rendering `SelectTreePanel` directly
- it uses the same `Field.filters` rules as searchable reference fields
- when a dependent `{{ fieldName }}` value is missing, the tree selector stays query-disabled instead of loading an unfiltered tree
- low-level `Tree` / `SelectTreePanel` are internal infrastructure

## `OneToMany`

Rendered as relation table with inline or dialog editing. Public usage stays on `Field`.

Example:

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTable>
  );
}

<Field fieldName="optionItems" tableView={OptionItemsTableView} />;
```

Common props:

- `tableView`: relation-table view component that renders `<RelationTable><Field /></RelationTable>`
- `formView`: dialog form for row create/edit
- `isPaged`: enable pagination / remote relation mode

Default submit behavior is incremental patch map:

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

Behavior:

- `false` (default): include relation `subQuery` in `getById`; relation table does not paginate in UI and renders local rows
- `true`: relation table enables pagination UI; when `recordId + relatedModel + scoped relation filter` are ready, data is loaded by `relatedModel.searchPage` (remote mode), otherwise paginated locally
- static `Field.filters` (no `{{ fieldName }}` references) are included in the `getById` subQuery so the initial load already applies the filter; dynamic filters with `{{ fieldName }}` references are applied only at remote-mode query time once the referenced values are available
- editable cells are limited to declared `RelationTable` columns intersected with editable related-model fields
- unresolved `{{ expr }}` dependencies pause remote relation queries until the dependent parent form value exists

## `ManyToMany`

Rendered as relation table plus picker dialog by default.

Example:

```tsx
function UserTableView() {
  return (
    <RelationTable orders={["username", "ASC"]} pageSize={10}>
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="status" />
    </RelationTable>
  );
}

<Field fieldName="userIds" tableView={UserTableView} />;
```

Default submit behavior is incremental patch map:

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

### `TagList`

`widgetType="TagList"` switches `ManyToMany` to a searchable multi-select dropdown with tags rendered below the trigger.

```tsx
<Field fieldName="userIds" widgetType="TagList" tableView={UserTableView} />
```

Behavior:

- searchable dropdown with multi-select interactions
- selected values are rendered as tags below the trigger
- trigger text stays compact and only shows selection count
- field layout follows surrounding `FormSection` columns by default; pass `fullWidth` explicitly when you want it to span the whole row
- top-level `ModelForm` `getById` only adds the field name to `fields`; it does not add a relation `subQuery`
- field UI value is `ModelReference[]`, while top-level submit still uses the normal incremental patch map

### Query Notes

- `ManyToMany` picker dialog merges the effective field filter, internal relation-scoped filters, search filter, and column filters using `AND`
- unresolved `{{ expr }}` dependencies pause remote picker and relation-table queries until the source value exists
- `formView` is optional; in `ManyToMany`, row-click opens `ModelDialog` in read mode while add/remove still uses picker behavior

## Shared Read / Inline Behavior

Shared behavior across relation fields:

- `ModelTable` / `RelationTable` read-mode cells render both `OneToMany` and `ManyToMany` as compact tag lists using `displayName -> id` fallback instead of JSON strings
- `widgetProps` is not propagated into `RelationTable` read-mode cell renderers
- relation tables reuse the same compact file/image read renderers as `ModelTable`
- `RelationTable.pageSize` only affects paged relation tables (`isPaged=true`)
- remote relation table and picker queries use the effective field filter (`Field.filters ?? metaField.filters`), relation-scoped filters, and runtime search / column filters

## Form View Example

`formView` is typically paired with `ModelDialog`:

```tsx
function UserRoleUserIdsFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection labelName="General" hideHeader>
        <Field fieldName="username" />
        <Field fieldName="nickname" />
        <Field fieldName="email" />
        <Field fieldName="mobile" />
        <Field fieldName="status" />
      </FormSection>
    </ModelDialog>
  );
}
```

# Relation Fields

Use this document for relation-oriented field APIs:

- `RelationTable`
- `SelectTree`
- `ManyToOne` / `OneToOne`
- `OneToMany`
- `ManyToMany`
- relation query / pagination / patch behavior

Related docs:

- [Fields](./index): core `Field` props, conditions, `filters`, `Field.onChange`, value contracts
- [Widget matrix](./widgets): widget compatibility and widget-specific examples
- [ModelForm](../form): page shell and relation-form examples
- [ModelTable](../table): read cells and inline edit behavior

## Import

```tsx
import { Field, RelationTable } from "@/components/fields";
```

`RelationTable` is used only inside relation field declarations such as `Field.tableView`.

## `RelationTable`

`RelationTable` is the relation-table view definition for `OneToMany` and `ManyToMany`.

Example:

```tsx
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);
```

### Props

| Prop       | Type             | Required | Notes                                                                                      |
| ---------- | ---------------- | -------- | ------------------------------------------------------------------------------------------ |
| `children` | `ReactNode`      | Yes      | Ordered `<Field />` column declarations for the relation table.                            |
| `orders`   | `OrderCondition` | No       | Default relation-table sorting. Supports a single tuple or multiple tuples.                |
| `pageSize` | `number`         | No       | Relation-table page size. Only affects paged relation tables (`isPaged={true}`).           |

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
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

Notes:

- `filters` is applied to the default searchable reference query
- when a dependent `#{fieldName}` has no current value, the selector stays query-disabled instead of loading all options

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
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

Behavior:

- `SelectTree` is the recommended developer-facing tree entry for forms and inline editors
- it is still declared through `Field`, not by rendering `SelectTreePanel` directly
- it uses the same `Field.filters` rules as searchable reference fields
- when a dependent `#{fieldName}` value is missing, the tree selector stays query-disabled instead of loading an unfiltered tree
- low-level `Tree` / `SelectTreePanel` are internal infrastructure

## `OneToMany`

Rendered as relation table with inline or dialog editing. Public usage stays on `Field`.

Example:

```tsx
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);

<Field fieldName="optionItems" tableView={optionItemsTableView} />;
```

Common props:

- `tableView`: relation-table columns via `<RelationTable><Field /></RelationTable>`
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
- editable cells are limited to declared `RelationTable` columns intersected with editable related-model fields
- unresolved `#{fieldName}` dependencies pause remote relation queries until the dependent parent form value exists

## `ManyToMany`

Rendered as relation table plus picker dialog by default.

Example:

```tsx
const userTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="status" />
  </RelationTable>
);

<Field fieldName="userIds" tableView={userTableView} />;
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
<Field fieldName="userIds" widgetType="TagList" tableView={userTableView} />
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
- unresolved `#{fieldName}` dependencies pause remote picker and relation-table queries until the source value exists
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

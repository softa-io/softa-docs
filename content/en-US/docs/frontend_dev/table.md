# ModelTable

Composable data table view with:

- metadata-driven columns
- server-side query integration
- toolbar filter/sort/group controls
- optional side tree filter panel

## Related Docs

- [Dialog](./dialog)
- [ModelForm](./form)
- [Action](./action)

## Quick Start

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/actions/Action";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export default function UserAccountPage() {
  return (
    <ModelTable
      modelName="UserAccount"
      orders={["createdTime", "DESC"]}
    >
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
      <Field fieldName="createdTime" />
      <Action
        labelName="Lock Account"
        operation="lockAccount"
        placement="more"
        confirmMessage="Lock this user account?"
        successMessage="User account locked."
        errorMessage="Failed to lock user account."
      />
      <Action
        type="dialog"
        labelName="Unlock Account"
        operation="unlockAccount"
        placement="more"
        successMessage="User account unlocked."
        errorMessage="Failed to unlock user account."
        component={UserAccountUnlockActionDialog}
      />
    </ModelTable>
  );
}
```

Most pages do not need explicit generic parameters. `ModelTable` defaults row type to:

```ts
type ModelTableRowData = { id: string };
```

## Column Declaration

`ModelTable` is JSX-first:

- columns come from ordered `<Field />` children
- top-level query `fields` are generated automatically from those declarations
- top-level `orders` is the recommended way to declare default sorting
- `initialParams` is the advanced query escape hatch for non-column query params such as `filters`, `pageSize`, `groupBy`, `effectiveDate`
- `children` can mix `<Field />`, `<Action />`, and `<BulkAction />`
- at least one visible `<Field />` declaration is required

Example:

```tsx
<ModelTable
  modelName="SysOptionSet"
  orders={["optionSetCode", "ASC"]}
>
  <Field fieldName="optionSetCode" readonly />
  <Field fieldName="name" />
  <Field fieldName="description" />
  <Field fieldName="active" widgetType="CheckBox" />
</ModelTable>
```

Preferred sorting syntax:

```tsx
<ModelTable modelName="UserAccount" orders={["createdTime", "DESC"]}>
  <Field fieldName="username" />
  <Field fieldName="email" />
</ModelTable>
```

Multi-sort syntax:

```tsx
<ModelTable
  modelName="SysField"
  orders={[
    ["modelName", "ASC"],
    ["fieldName", "ASC"],
  ]}
>
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
</ModelTable>
```

Table declaration notes:

- `Field` order is the rendered column order
- `widgetType`, `labelName`, `filters`, `onChange`, and static `required` / `readonly` overrides are reused by both read cells and inline editors
- `defaultValue` is create-only; in table flows it is used for relation row creation and inline editors, not for read-mode cells
- inline-edit field values use the same UI value contracts as forms; for example `File -> FileInfo | null`, `MultiFile -> FileInfo[]`, and `JSON` / `DTO` / `Filters` / `Orders` stay structured
- table read cells intentionally do not consume `widgetProps`; v1 uses a unified compact table renderer instead of form-style widget variants
- for relation columns (`ManyToOne` / `OneToOne`) in inline edit, `filters` may use `#{fieldName}` and resolves against the current editing row before the relation query is sent
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged; use `@{literal}` when backend should treat a token-like string as a literal
- `hidden` only supports `boolean` in table declarations; `hidden={true}` removes the whole column
- conditional `required` / `readonly` are supported in inline edit, but conditional `hidden` is not

Detailed field value contracts are documented in [Field & Widget](./fields/index).

## File And Image Columns

Table-side file rendering is driven by API values, not by form widget state:

- `File` expects `FileInfo`
- `MultiFile` expects `FileInfo[]`
- image preview uses `FileInfo.url`
- file link label falls back as `fileName -> fileId -> "-"`

Read-mode behavior:

- `File` + `widgetType="Image"` renders a compact thumbnail only; clicking it opens an image preview dialog
- `MultiFile` + `widgetType="MultiImage"` renders a compact thumbnail summary with `+N`; clicking it opens a gallery-style preview dialog
- plain `File` renders a downloadable filename link to `FileInfo.url`
- plain `MultiFile` renders the first filename link plus `+N`
- if an image item has no `url`, the cell renders a compact placeholder box instead of a broken image
- read-mode cells remain single-line / no-wrap; table rows are not globally expanded for multi-file content

These same compact read renderers are also used by relation tables (`RelationTable`) in read mode.

## XToMany Read Cells

`OneToMany` and `ManyToMany` table cells use a compact tag-list renderer in read mode.

Read-mode behavior:

- values are treated as relation-like arrays, typically `ModelReference[]`
- each item renders as a compact tag using `displayName`, then `id` as fallback
- if no item can produce a label, the cell falls back to a count summary such as `3 items`
- this applies to both `ModelTable` and `RelationTable` read cells
- `widgetType="TagList"` does not change the read cell renderer; it only enables the searchable multi-select editor for `ManyToMany` in forms and inline edit

Example:

```tsx
<ModelTable modelName="UserRole">
  <Field fieldName="name" />
  <Field fieldName="userIds" widgetType="TagList" />
</ModelTable>
```

## Inline Edit

`ModelTable` supports optional row-level inline editing.

```tsx
<ModelTable
  modelName="TenantOptionItem"
  inlineEdit
  orders={["sequence", "ASC"]}
>
  <Field fieldName="sequence" readonly />
  <Field fieldName="companyId" />
  <Field
    fieldName="departmentId"
    filters={[["companyId", "=", "#{companyId}"]]}
  />
  <Field fieldName="itemName" readonly={[["active", "=", false]]} />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` example:

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(
    ["active"],
    ({ values, scope, rowId }) =>
      scope === "model-table" && Boolean(rowId) && values.active === true,
  )}
/>;
```

Behavior:

- default is `inlineEdit={false}`
- `false`: row click navigates to detail page in read mode
- `true`: row click activates inline edit for that row
- editable cells render `Field` directly inside the table cell
- active row shows row-level `Save` / `Cancel`
- `Save` stays disabled until the active row has actual changes
- `Save` submits only changed editable fields for that row via update API
- `Cancel` restores the row from the latest loaded server snapshot
- switching to another row while current row is dirty asks for discard confirmation
- `required` / `readonly` support `boolean`, `FilterCondition`, and `dependsOn([...], evaluator)`
- inline-edit conditions are evaluated against the current row object with `scope="model-table"`, plus `rowIndex` and `rowId`
- relation-field filters using `#{fieldName}` are also evaluated against the current row object
- if a relation-field filter dependency is missing, that row's relation query stays disabled instead of loading unfiltered options
- only metadata-editable and not effectively readonly columns become inline editors; unsupported columns stay read-only
- `File`, `MultiFile`, `Image`, and `MultiImage` participate in inline edit and reuse the normal `Field` upload widgets inside the active row
- `OneToMany` stays read-only in table inline edit
- `ManyToMany` participates in table inline edit only when `widgetType="TagList"`; otherwise it stays read-only
- active edit rows may grow vertically for file/image widgets; non-active rows remain fixed-height

### Remote `Field.onChange`

Inline edit also supports remote field linkage on declared columns:

```tsx
<ModelTable modelName="SysOptionSet" inlineEdit>
  <Field fieldName="optionSetCode" onChange={["name", "description"]} />
  <Field fieldName="name" />
  <Field fieldName="description" />
</ModelTable>
```

Behavior in `ModelTable` inline edit:

- scope is the current editing row only
- request path is `POST /<modelName>/onChange/<fieldName>`
- `with: "all"` serializes the current row, not the whole table
- response `values` patch only the current row
- response `readonly` / `required` apply only to the current row and override local effective state
- remote rule state is cleared when the row is saved, cancelled, reloaded, or when editing switches to another row

## Developer Types

`ModelTableTab` is a **type**, not a component.

```ts
interface ModelTableTab {
  id: string;
  label: string;
  icon?: ReactNode;
  filter?: FilterCondition;
}
```

| Prop     | Type              | Required | Default | Notes                                               |
| -------- | ----------------- | -------- | ------- | --------------------------------------------------- |
| `id`     | `string`          | Yes      | -       | Stable tab key used by `activeTabId`.               |
| `label`  | `string`          | Yes      | -       | UI label displayed in table header tabs.            |
| `icon`   | `ReactNode`       | No       | -       | Optional tab icon shown before tab label in header. |
| `filter` | `FilterCondition` | No       | -       | Extra base filter applied when this tab is active.  |

`tabs` usage example:

```tsx
import type { ModelTableTab } from "@/components/views/table/types/types";
import { Lock, ShieldCheck } from "lucide-react";

const tabs: ModelTableTab[] = [
  { id: "all", label: "All" },
  {
    id: "active",
    label: "Active",
    icon: <ShieldCheck className="ui-icon-sm" />,
    filter: ["status", "=", "active"],
  },
  {
    id: "locked",
    label: "Locked",
    icon: <Lock className="ui-icon-sm" />,
    filter: ["locked", "=", true],
  },
];

<ModelTable modelName="UserAccount" tabs={tabs} />;
```

`ModelTableRowWith<TExtra>` is useful when you want strong row typing:

```ts
type UserAccountRow = ModelTableRowWith<{
  username: string;
  status: string;
  locked: boolean;
}>;
```

## Side Tree (Optional)

`ModelTable` can render a left side tree panel via `sideTree`.

This is the recommended developer-facing tree entry for list pages. The low-level tree primitives are internal; see [Tree](./tree).

```tsx
const sideTree: SideTree = {
  title: "System Model",
  modelName: "SysModel",
  filterField: "modelId",
  idKey: "id",
  labelKey: "labelName",
  parentKey: "parentId",
  selectionMode: "single",
  defaultExpandedLevel: 2,
};

<ModelTable
  modelName="SysField"
  orders={["modelName", "ASC"]}
  sideTree={sideTree}
>
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="labelName" />
  <Field fieldName="fieldType" />
</ModelTable>;
```

`sideTree` only changes filter behavior and layout. Column declaration still comes from `<Field />` children.

`SideTree` type:

| Prop                   | Type                     | Required | Default      | Notes                                                                 |
| ---------------------- | ------------------------ | -------- | ------------ | --------------------------------------------------------------------- |
| `filterField`          | `string`                 | Yes      | -            | Target field used to build table filters from selected tree node ids. |
| `title`                | `string`                 | No       | -            | Side panel title.                                                     |
| `modelName`            | `string`                 | No       | -            | Tree model source (query mode).                                       |
| `mockData`             | `FlatNode[]`             | No       | -            | Tree local data source.                                               |
| `treeFilters`          | `FilterCondition`        | No       | -            | Extra filters for tree query mode.                                    |
| `treeLimit`            | `number`                 | No       | -            | Query limit for tree query mode.                                      |
| `idKey`                | `string`                 | No       | `"id"`       | Tree node id key.                                                     |
| `labelKey`             | `string`                 | No       | `"name"`     | Tree node label key.                                                  |
| `parentKey`            | `string`                 | No       | `"parentId"` | Tree parent id key.                                                   |
| `disabledKey`          | `string`                 | No       | -            | Tree disabled-state field key.                                        |
| `sortKey`              | `string`                 | No       | -            | Tree sort key.                                                        |
| `selectionMode`        | `"single" \| "multiple"` | No       | `"single"`   | Side tree selection mode used by table filter integration.            |
| `defaultExpandedLevel` | `number`                 | No       | `3`          | Initial tree open-state depth.                                        |
| `height`               | `number`                 | No       | -            | Tree viewport height.                                                 |
| `className`            | `string`                 | No       | -            | Side panel className.                                                 |

## Side Tree Standardization in `ModelTable`

When `sideTree` is enabled, `ModelTable` enforces these `Tree` defaults internally:

- `searchMode = "local"`
- `selectionMode` is normalized to `"single"` or `"multiple"` only

This keeps behavior consistent across pages and prevents per-page drift.

## Unified Active Toolbar State

Toolbar active state area can show and clear:

- Tree filter tag
- Column filter tags
- Condition filter preview
- Sort summary
- Group summary

`Clear all` clears all active toolbar states together.

## Core Props

| Prop               | Type                       | Required | Default | Notes                                                                                                                                      |
| ------------------ | -------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `modelName`        | `string`                   | Yes      | -       | Used to fetch metadata API.                                                                                                                |
| `inlineEdit`       | `boolean`                  | No       | `false` | Enable row-click inline edit mode. When enabled, active-row editable cells render `Field` components instead of navigating to detail.      |
| `orders`           | `OrderCondition`           | No       | -       | Recommended default sort entry. Supports a single tuple (`["createdTime", "DESC"]`) or multiple tuples.                                  |
| `initialParams`    | `QueryParamsWithoutFields` | No       | -       | Advanced initial query settings such as `filters`, `pageSize`, `groupBy`, `effectiveDate`. Top-level `orders` takes precedence.          |
| `children`         | `ReactNode`                | No       | -       | Ordered `<Field />` declarations plus optional `<Action />` and `<BulkAction />`. At least one visible `<Field />` is required at runtime. |
| `enableBulkDelete` | `boolean`                  | No       | `true`  | Enable built-in bulk delete entry.                                                                                                         |
| `enableCreate`     | `boolean`                  | No       | `true`  | Enable built-in create button.                                                                                                             |
| `enableImport`     | `boolean`                  | No       | `true`  | Enable built-in import dialog entry in More menu.                                                                                          |
| `enableExport`     | `boolean`                  | No       | `true`  | Enable built-in export dialog entry in More menu.                                                                                          |
| `bulkEditFields`   | `string[]`                 | No       | -       | Optional bulk-edit allowlist. If omitted, built-in Bulk Edit uses all metadata fields.                                                     |
| `excludeFields`    | `string[]`                 | No       | -       | Optional bulk-edit denylist. Always excluded from built-in Bulk Edit (in addition to reserved fields).                                     |
| `tabs`             | `ModelTableTab[]`          | No       | -       | Optional tab filters at header level.                                                                                                      |
| `freezeColumnIndex`| `number`                   | No       | `1`     | Initial count of left-side data columns kept frozen. The select column remains pinned ahead of the frozen range when enabled.             |
| `sideTree`         | `SideTree`                 | No       | -       | Left tree filter panel config.                                                                                                             |

## Built-in Import / Export

`ModelTable` ships with built-in import and export dialogs under the toolbar `More` menu.

Detailed behavior is covered in [ModelTable](./table), including:

- import/export tabs and flows
- export scope rules
- history-tab renderer reuse

Toolbar-level custom actions are still declared with `<Action placement="toolbar" />` inside `children`.

## `initialParams` Guide

`initialParams` is the initial server query state for `ModelTable` and follows:

```ts
type initialParams = QueryParamsWithoutFields;
```

`ModelTable` does not accept top-level `initialParams.fields`.
The table query field list always comes from visible `<Field />` children in declaration order.

Recommended split:

- use top-level `orders` for normal default sorting
- use `initialParams` for advanced query concerns such as `filters`, `pageSize`, `groupBy`, `effectiveDate`, or `subQueries`
- if both `orders` and `initialParams.orders` are provided, top-level `orders` wins

`initialParams.filters` remains a normal server-side base filter for the table query itself. It does not resolve `#{fieldName}` references; that declarative syntax is only supported on relation-field `filters`.

Query bootstrap defaults:

- `pageNumber = 1`
- `pageSize = 20`
- others are `undefined`

### `initialParams` Fields

| Key             | Type                        | Default     | Notes                                                                                      |
| --------------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `filters`       | `FilterCondition`           | `undefined` | Base filter condition. This is treated as the base and merged with UI filters using `AND`. |
| `orders`        | `OrderCondition`            | `undefined` | Initial sort order.                                                                        |
| `pageNumber`    | `number`                    | `1`         | Initial page number.                                                                       |
| `pageSize`      | `number`                    | `20`        | Initial page size.                                                                         |
| `aggFunctions`  | `Array<string \| string[]>` | `undefined` | Advanced aggregation functions (when backend supports them).                               |
| `groupBy`       | `string[]`                  | `undefined` | Initial group-by fields.                                                                   |
| `splitBy`       | `string[]`                  | `undefined` | Advanced split/group dimension fields.                                                     |
| `summary`       | `boolean`                   | `undefined` | Whether summary mode is enabled for the query.                                             |
| `effectiveDate` | `string`                    | `undefined` | Effective date snapshot (time-travel style query).                                         |
| `subQueries`    | `Record<string, SubQuery>`  | `undefined` | Related/sub-query payloads.                                                                |

### Minimal Example

```tsx
<ModelTable
  modelName="UserAccount"
  orders={["updatedTime", "DESC"]}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### Advanced Example

```tsx
<ModelTable
  modelName="UserAccount"
  orders={["updatedTime", "DESC"]}
  initialParams={{
    filters: [["status", "!=", "Deleted"], "AND", ["locked", "=", false]],
    pageNumber: 1,
    pageSize: 50,
    effectiveDate: "2026-03-01",
  }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### Advanced Example (`groupBy` / `aggFunctions` / `subQueries`)

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    filters: ["status", "=", "Active"],
    groupBy: ["departmentId"],
    aggFunctions: [["COUNT", "*", "count"]],
    subQueries: {
      roles: {
        fields: ["id", "name"],
        orders: [["name", "ASC"]],
        topN: 5,
      },
    },
  }}
>
  <Field fieldName="departmentId" />
  <Field fieldName="status" />
</ModelTable>
```

### Filter Merge Behavior (Important)

`initialParams.filters` is only the base filter. Runtime filters are merged with `AND`:

- base filter (`initialParams.filters`)
- active tab filter
- side tree filter
- search filter (`["searchName", "CONTAINS", keyword]`)
- column filters
- toolbar condition filter

Example merged condition:

```ts
[
  ["status", "=", "Active"],
  "AND",
  ["locked", "=", true],
  "AND",
  ["searchName", "CONTAINS", "alice"],
];
```

## Actions

Common `Action` / `BulkAction` API now lives in [Action](./action).
This section keeps only the `ModelTable` container rules and a complete table-level example.

Rules:

- `<Action placement="toolbar" />` renders in the table toolbar custom action area
- `<Action placement="inline" />` renders in the last-column inline action area
- `<Action placement="more" />` renders in the last-column More Actions dropdown
- active inline-edit rows resolve action context from the current draft row values
- clicking a row action while the active row is dirty asks whether to discard the draft before continuing
- `BulkAction` is selection-scoped and only shown when rows are selected
- `BulkAction placement="toolbar"` appears between `Columns` and `More`
- `BulkAction placement="more"` appears in the toolbar More dropdown bulk section
- built-in `Delete selected` shares that bulk section

Action callbacks in table receive row execution context:

```ts
onClick: ({ id, modelName, scope, mode, isDirty, values, row }) => void
```

Complete example:

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { ModelTable } from "@/components/views/table/ModelTable";
import { ExternalLink, Lock, Pencil, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" labelName="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />

  <Action
    type="custom"
    labelName="Refresh"
    placement="toolbar"
    onClick={() => console.log("refresh")}
  />

  <Action
    type="custom"
    labelName="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  <Action
    type="default"
    labelName="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
    successMessage="Account locked."
    errorMessage="Failed to lock account."
  />

  <Action
    type="dialog"
    labelName="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
    successMessage="Account unlocked."
    errorMessage="Failed to unlock account."
  />

  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
  />

  <BulkAction
    labelName="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
    confirmMessage={({ ids }) => `Lock ${ids.length} selected accounts?`}
  />

  <BulkAction
    type="dialog"
    labelName="Unlock Selected"
    operation="unlockByIds"
    placement="more"
    component={UnlockDialog}
  />
</ModelTable>;
```

Built-in Bulk Edit action:

- location: `More` dropdown bulk section in toolbar
- behavior: supports adding multiple field edits in one submit
- value editor: rendered by field type (`Boolean`, numeric, date/time, text/json, option, etc.)
- submit API: `updateByFilter` with `filters = ["id","IN", selectedIds]`, `values = { ...editedFields }`

```tsx
<ModelTable
  modelName="UserAccount"
  bulkEditFields={["status", "email", "phoneNumber", "locked"]} // optional
  excludeFields={["email"]} // optional
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
</ModelTable>
```

If `bulkEditFields` is not provided, Bulk Edit uses all available metadata fields.
Even when `bulkEditFields` is provided, excluded fields are still removed.
Built-in reserved fields are always excluded:
`id`, `createdTime`, `createdId`, `createdBy`, `updatedTime`, `updatedId`, `updatedBy`, `tenantId`.

## SideTree Notes

- `filterField` is required and mapped to table query filters.
- If multiple tree nodes are selected, table filter becomes `OR` over selected IDs.
- Keep `idKey` values unique and stable.
- `disabledKey` is optional (no implicit default field).
- Side tree width is fixed by the shared table layout; there is no public width/min/max API.

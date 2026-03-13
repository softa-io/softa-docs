# ModelTable

Composable data table view with:

- metadata-driven columns
- server-side query integration
- toolbar filter/sort/group controls
- optional side tree filter panel

## Related Docs

- [Dialog components](./dialog)
- [Form components](./form)
- [Fields and widgets](./field)

## Quick Start

```tsx
import {
  UserAccountUnlockActionDialog,
} from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export default function UserAccountPage() {
  return (
    <ModelTable
      modelName="UserAccount"
      initialParams={{ orders: [["createdTime", "DESC"]] }}
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
- `initialParams` only carries non-column query params such as `filters`, `orders`, `pageSize`, `groupBy`
- `children` can mix `<Field />`, `<Action />`, and `<BulkAction />`
- at least one visible `<Field />` declaration is required

Example:

```tsx
<ModelTable
  modelName="SysOptionSet"
  initialParams={{ orders: [["optionSetCode", "ASC"]], pageSize: 50 }}
>
  <Field fieldName="optionSetCode" readonly />
  <Field fieldName="name" />
  <Field fieldName="description" />
  <Field fieldName="active" widgetType="CheckBox" />
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

Detailed field value contracts are documented in `src/components/fields/README.md`.

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

These same compact read renderers are also used by relation tables (`RelationTableView`) in read mode.

## XToMany Read Cells

`OneToMany` and `ManyToMany` table cells use a compact tag-list renderer in read mode.

Read-mode behavior:

- values are treated as relation-like arrays, typically `ModelReference[]`
- each item renders as a compact tag using `displayName`, then `id` as fallback
- if no item can produce a label, the cell falls back to a count summary such as `3 items`
- this applies to both `ModelTable` and `RelationTableView` read cells
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
  initialParams={{
    orders: [["sequence", "ASC"]],
  }}
>
  <Field fieldName="sequence" readonly />
  <Field fieldName="companyId" />
  <Field
    fieldName="departmentId"
    filters={[["companyId", "=", "#{companyId}"]]}
  />
  <Field
    fieldName="itemName"
    readonly={[["active", "=", false]]}
  />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` example:

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(["active"], ({ values, scope, rowId }) =>
    scope === "model-table" && Boolean(rowId) && values.active === true
  )}
/>
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

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes | - | Stable tab key used by `activeTabId/defaultTabId`. |
| `label` | `string` | Yes | - | UI label displayed in table header tabs. |
| `icon` | `ReactNode` | No | - | Optional tab icon shown before tab label in header. |
| `filter` | `FilterCondition` | No | - | Extra base filter applied when this tab is active. |

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

<ModelTable
  modelName="UserAccount"
  tabs={tabs}
  defaultTabId="active"
/>
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

```tsx
const sideTree: SideTreeConfig = {
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
  initialParams={{
    orders: [["modelName", "ASC"]],
  }}
  sideTree={sideTree}
>
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="labelName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

`sideTree` only changes filter behavior and layout. Column declaration still comes from `<Field />` children.

`SideTreeConfig` type:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `filterField` | `string` | Yes | - | Target field used to build table filters from selected tree node ids. |
| `title` | `string` | No | - | Side panel title. |
| `modelName` | `string` | No | - | Tree model source (query mode). |
| `mockData` | `FlatNode[]` | No | - | Tree local data source. |
| `treeFilters` | `FilterCondition` | No | - | Extra filters for tree query mode. |
| `treeLimit` | `number` | No | - | Query limit for tree query mode. |
| `idKey` | `string` | No | `"id"` | Tree node id key. |
| `labelKey` | `string` | No | `"name"` | Tree node label key. |
| `parentKey` | `string` | No | `"parentId"` | Tree parent id key. |
| `disabledKey` | `string` | No | - | Tree disabled-state field key. |
| `sortKey` | `string` | No | - | Tree sort key. |
| `selectionMode` | `"single" \| "multiple"` | No | `"single"` | Side tree selection mode used by table filter integration. |
| `defaultExpandedLevel` | `number` | No | `3` | Initial tree open-state depth. |
| `height` | `number` | No | - | Tree viewport height. |
| `className` | `string` | No | - | Side panel className. |
| `getSelectionLabel` | `(selectedIds, selectedNodes) => string \| undefined` | No | - | Custom label for active tree filter tag in toolbar state area. |

## Side Tree Standardization in `ModelTable`

When `sideTree` is enabled, `ModelTable` enforces these `Tree` defaults internally:

- `searchMode = "local"`
- `dragEnabled = false`
- `selectionMode` is normalized to `"single"` or `"multiple"` only

This keeps behavior consistent across pages and prevents per-page drift.

## Side Tree Layout Controls

`ModelTableProps` supports:

- `sideTreeWidth` (default `280`)
- `sideTreeMinWidth` (default `220`)
- `sideTreeMaxWidth` (default `560`)

The panel provides:

- draggable vertical separator (layout width only)
- collapse/expand
- collapsed narrow strip (`44px`) with expand button
- table area automatically taking remaining width

## Side Tree Actions

Top area:

- Locate icon (shown when there is selected node)
- Clear icon (shown when there is selected node)
- Collapse icon

Bottom area:

- `Reset` (restore default expanded state)
- `Collapse all`

Selected tree rows can show a hover clear action (`x`) to remove only that row from selection.

## Unified Active Toolbar State

Toolbar active state area can show and clear:

- Tree filter tag
- Column filter tags
- Condition filter preview
- Sort summary
- Group summary

`Clear all` clears all active toolbar states together.

## Core Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `modelName` | `string` | Yes | - | Used to fetch metadata API. |
| `inlineEdit` | `boolean` | No | `false` | Enable row-click inline edit mode. When enabled, active-row editable cells render `Field` components instead of navigating to detail. |
| `initialParams` | `QueryParamsWithoutFields` | No | - | Initial non-column query settings such as `filters`, `orders`, `pageSize`, `groupBy`. |
| `queryOptions` | `UseQueryOptions` (partial) | No | - | Optional React Query options for table page query. |
| `children` | `ReactNode` | No | - | Ordered `<Field />` declarations plus optional `<Action />` and `<BulkAction />`. At least one visible `<Field />` is required at runtime. |
| `toolbarActionsComponent` | `ReactNode \| ComponentType<{ table }>` | No | - | Custom toolbar actions. |
| `tableProps` | `Omit<TableProps, "children">` | No | - | Props forwarded to underlying table component. |
| `className` | `string` | No | - | Outer container className. |
| `enableBulkDelete` | `boolean` | No | `true` | Enable built-in bulk delete entry. |
| `enableCreate` | `boolean` | No | `true` | Enable built-in create button. |
| `enableImport` | `boolean` | No | `true` | Enable built-in import dialog entry in More menu. |
| `enableExport` | `boolean` | No | `true` | Enable built-in export dialog entry in More menu. |
| `bulkEditFields` | `string[]` | No | - | Optional bulk-edit allowlist. If omitted, built-in Bulk Edit uses all metadata fields. |
| `excludeFields` | `string[]` | No | - | Optional bulk-edit denylist. Always excluded from built-in Bulk Edit (in addition to reserved fields). |
| `tabs` | `ModelTableTab[]` | No | - | Optional tab filters at header level. |
| `defaultTabId` | `string` | No | First tab id, otherwise `"all"` | Initial active tab id. |
| `freezeColumnIndex` | `number` | No | `1` | Initial frozen columns count from the left. |
| `sideTree` | `SideTreeConfig` | No | - | Left tree filter panel config. |
| `sideTreeWidth` | `number` | No | `280` | Initial side tree width. |
| `sideTreeMinWidth` | `number` | No | `220` | Side tree min width. |
| `sideTreeMaxWidth` | `number` | No | `560` | Side tree max width. |

## Built-in Import / Export

`ModelTable` ships with built-in import and export dialogs under the toolbar `More` menu.
There is no separate page-level config object today; the dialogs derive behavior from the current `modelName`, table query state, selected rows, current page rows, and metadata.

### Import

- gated by `enableImport`
- dialog tabs:
  - `By Template`
  - `Dynamic Import`
  - `My Import History`
- template import:
  - loads templates by `modelName`
  - supports template download
  - submits uploaded files through the configured template
- dynamic import:
  - parses the uploaded `.xlsx` workbook in the browser
  - auto-maps workbook headers to model fields using metadata
  - lets the user adjust mappings before submit
- history tab:
  - loads `ImportHistory` for the current model
  - renders rows through the shared relation-table field renderer
  - file columns such as original/failed files rely on `FileInfo.url` for download links

### Export

- gated by `enableExport`
- dialog tabs:
  - `By Template`
  - `Dynamic Export`
  - `My Export History`
- template export:
  - loads export templates by `modelName`
  - submits the current export scope as `ExportParams`
- dynamic export:
  - builds candidate fields from current model metadata
  - defaults selected fields to the currently visible table columns
  - lets the user change fields, file name, and sheet name
  - generates `.xlsx` workbooks for front-end initiated exports
- history tab:
  - loads `ExportHistory` for the current model
  - renders exported file links using the same `FileInfo.url` read behavior as normal table file cells

### Export Scope Rules

Built-in export supports three scopes:

- `Selected Rows`
- `Current Page`
- `All Filtered Data`

Behavior notes:

- `Selected Rows` uses the current toolbar bulk selection ids
- `Current Page` uses the current page id snapshot, not `pageNumber/pageSize` replay
- `All Filtered Data` reuses current `filters/orders/groupBy/aggFunctions/effectiveDate`
- front-end export is limited to `100000` records for a single request; over-limit scopes are disabled instead of truncated

### Read Renderer Reuse

History tabs intentionally reuse the existing table/relation-table field renderers.
This means file/history rows follow the same runtime contract as normal table read cells:

- `File` expects `FileInfo`
- `MultiFile` expects `FileInfo[]`
- download/preview links come directly from `FileInfo.url`

## `initialParams` Guide

`initialParams` is the initial server query state for `ModelTable` and follows:

```ts
type initialParams = QueryParamsWithoutFields;
```

`ModelTable` does not accept top-level `initialParams.fields`.
The table query field list always comes from visible `<Field />` children in declaration order.

`initialParams.filters` remains a normal server-side base filter for the table query itself. It does not resolve `#{fieldName}` references; that declarative syntax is only supported on relation-field `filters` and relation `tableView.initialParams.filters`.

Query bootstrap defaults:

- `pageNumber = 1`
- `pageSize = 20`
- others are `undefined`

### `initialParams` Fields

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `filters` | `FilterCondition` | `undefined` | Base filter condition. This is treated as the base and merged with UI filters using `AND`. |
| `orders` | `OrderCondition` | `undefined` | Initial sort order. |
| `pageNumber` | `number` | `1` | Initial page number. |
| `pageSize` | `number` | `20` | Initial page size. |
| `aggFunctions` | `Array<string \| string[]>` | `undefined` | Advanced aggregation functions (when backend supports them). |
| `groupBy` | `string[]` | `undefined` | Initial group-by fields. |
| `splitBy` | `string[]` | `undefined` | Advanced split/group dimension fields. |
| `summary` | `boolean` | `undefined` | Whether summary mode is enabled for the query. |
| `effectiveDate` | `string` | `undefined` | Effective date snapshot (time-travel style query). |
| `subQueries` | `Record<string, SubQuery>` | `undefined` | Related/sub-query payloads. |

### Minimal Example

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    orders: [["updatedTime", "DESC"]],
  }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### Common Example

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    filters: [["status", "!=", "Deleted"], "AND", ["locked", "=", false]],
    orders: [["updatedTime", "DESC"]],
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
]
```

Row actions support the same `Action` capabilities as form toolbar:

- `type="default" | "dialog" | "link" | "custom"`
- `placement="inline" | "more"`
- dynamic props via `ActionValue<T>` (`T` or `(context) => T`) for `confirmMessage`, `successMessage`, `errorMessage`, `payload`
- `disabled` and `visible` support `boolean`, `FilterCondition`, and `dependsOn([...], evaluator)`
- In table context:
  - `inline`: shown directly in the last column
  - `more`: shown in last-column More Actions dropdown
  - active inline-edit rows resolve action context from the current draft row values
  - clicking a row action while the active row is dirty asks whether to discard the draft before continuing

Action condition notes:

- `FilterCondition` is evaluated against current row values and supports `#{fieldName}` references
- bare function conditions are not supported; wrap function logic with `dependsOn([...], evaluator)`
- if there is no row-field dependency, prefer plain `boolean`

Action callbacks in table receive row execution context:

```ts
onClick: ({ id, modelName, scope, mode, isDirty, values, row }) => void
```

### Row Action: Minimal Example

```tsx
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { toast } from "sonner";

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
  <Action
    type="custom"
    labelName="Copy User ID"
    placement="more"
    onClick={({ id }) => {
      navigator.clipboard.writeText(String(id));
      toast.success(`User ID "${id}" copied.`);
    }}
  />
</ModelTable>
```

### Row Action: Complete Type Examples

```tsx
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { ModelTable } from "@/components/views/table/ModelTable";
import { ExternalLink, Lock, Pencil, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog
      title="Unlock Account"
      abstractModelName="UnlockAccountAction"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
    />
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  {/* custom + inline */}
  <Action
    type="custom"
    labelName="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  {/* default + more */}
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

  {/* dialog + more */}
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

  {/* link + more */}
  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
    target="_blank"
  />
</ModelTable>;
```

Bulk actions (toolbar selection actions):

- supported placements: `toolbar | more`
- supported types: `default | dialog`
- execution context: `{ ids, rows, modelName }`
- render behavior:
  - only shown when rows are selected
  - `placement="toolbar"`: shown between `Columns` and `More`
  - `placement="more"`: shown in `More` dropdown bulk section (above Import/Export)
  - built-in `Delete selected` is also in this bulk section

### BulkAction: Minimal Example

```tsx
import { BulkAction } from "@/components/common/BulkAction";
import { Field } from "@/components/fields";

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
  <BulkAction
    labelName="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
  />
</ModelTable>;
```

### BulkAction: Common Setup Example

```tsx
import { ActionDialog } from "@/components/views/dialogs";
import { BulkAction } from "@/components/common/BulkAction";
import { Field } from "@/components/fields";

function BulkLockReasonDialog() {
  return (
    <ActionDialog
      title="Lock Selected Accounts"
      abstractModelName="BulkLockAccounts"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
    />
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
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
    component={BulkLockReasonDialog}
  />
</ModelTable>
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

## SideTreeConfig Notes

- `filterField` is required and mapped to table query filters.
- If multiple tree nodes are selected, table filter becomes `OR` over selected IDs.
- Keep `idKey` values unique and stable.
- `disabledKey` is optional (no implicit default field).

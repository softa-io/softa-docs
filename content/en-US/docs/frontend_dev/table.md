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
- `widgetType`, `labelName`, `filters`, `defaultValue`, `onChange`, and static `required` / `readonly` overrides are reused by both read cells and inline editors
- for relation columns (`ManyToOne` / `OneToOne`) in inline edit, `filters` may use `#{fieldName}` and resolves against the current editing row before the relation query is sent
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged; use `@{literal}` when backend should treat a token-like string as a literal
- `hidden` only supports `boolean` in table declarations; `hidden={true}` removes the whole column
- conditional `required` / `readonly` are supported in inline edit, but conditional `hidden` is not

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

Condition function example:

```tsx
<Field
  fieldName="itemName"
  required={({ values, scope, rowId }) =>
    scope === "model-table" && Boolean(rowId) && values.active === true
  }
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
- `required` / `readonly` support `boolean`, `FilterCondition`, and `(ctx) => boolean`
- inline-edit conditions are evaluated against the current row object with `scope="model-table"`, plus `rowIndex` and `rowId`
- relation-field filters using `#{fieldName}` are also evaluated against the current row object
- if a relation-field filter dependency is missing, that row's relation query stays disabled instead of loading unfiltered options
- only metadata-editable and not effectively readonly columns become inline editors; unsupported columns stay read-only

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
| `enableImport` | `boolean` | No | `true` | Enable import entry in More menu. |
| `enableExport` | `boolean` | No | `true` | Enable export entry in More menu. |
| `bulkEditFields` | `string[]` | No | - | Optional bulk-edit allowlist. If omitted, built-in Bulk Edit uses all metadata fields. |
| `excludeFields` | `string[]` | No | - | Optional bulk-edit denylist. Always excluded from built-in Bulk Edit (in addition to reserved fields). |
| `tabs` | `ModelTableTab[]` | No | - | Optional tab filters at header level. |
| `defaultTabId` | `string` | No | First tab id, otherwise `"all"` | Initial active tab id. |
| `freezeColumnIndex` | `number` | No | `1` | Initial frozen columns count from the left. |
| `sideTree` | `SideTreeConfig` | No | - | Left tree filter panel config. |
| `sideTreeWidth` | `number` | No | `280` | Initial side tree width. |
| `sideTreeMinWidth` | `number` | No | `220` | Side tree min width. |
| `sideTreeMaxWidth` | `number` | No | `560` | Side tree max width. |

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
- dynamic props via `ActionValue<T>` (`T` or `(context) => T`) for `disabled`, `visible`, `confirmMessage`, `successMessage`, `errorMessage`, `payload`
- In table context:
  - `inline`: shown directly in the last column
  - `more`: shown in last-column More Actions dropdown

Action callbacks in table receive row execution context:

```ts
onClick: ({ id, modelName, row }) => void
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
      defaultValues={{ reason: "" }}
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
      defaultValues={{ reason: "" }}
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

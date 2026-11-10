# ModelTable

Composable data table view with:

- metadata-driven columns
- server-side query integration
- toolbar filter/sort/group controls
- optional side tree filter panel
- **automatic permission gating** by `modelName` (see §"Permission Integration")

## Related Docs

- [ModelCard](./card) — card grid view (shared toolbar dialogs, side panel, and data hooks)
- [Dialogs](./dialogs)
- [ModelForm](./form)
- [Actions](../actions)
- [ListToolbar](../components/list-toolbar) — the toolbar row's layout, and the pinned filters' pills, for a list that is not a ModelTable too
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
        label="Lock Account"
        operation="lockAccount"
        placement="more"
        confirmMessage="Lock this user account?"
        successMessage="User account locked."
      />
      <Action
        type="dialog"
        label="Unlock Account"
        operation="unlockAccount"
        placement="more"
        successMessage="User account unlocked."
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
- `children` can mix `<Field />`, `<Action />`, `<BulkAction />` and `<PinnedFilter />` (see [Pinned Filters](#pinned-filters))
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
- `widgetType`, `label`, `filters`, `onChange`, and static `required` / `readonly` overrides are reused by both read cells and inline editors
- `defaultValue` is create-only; in table flows it is used for relation row creation and inline editors, not for read-mode cells
- inline-edit field values use the same UI value contracts as forms; for example `File -> FileInfo | null`, `MultiFile -> FileInfo[]`, and `JSON` / `DTO` / `Filters` / `Orders` stay structured
- table read cells intentionally do not consume `widgetProps`; v1 uses a unified compact table renderer instead of form-style widget variants
- for relation columns (`ManyToOne` / `OneToOne`) in inline edit, `filters` may use `{{ fieldName }}` and resolves against the current editing row before the relation query is sent (unified template syntax `{{ expr }}`)
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged; literals use `{{ 'value' }}` or backend tokens like `{{ NOW }}` as needed
- `hidden` only supports `boolean` in table declarations; `hidden={true}` removes the whole column
- conditional `required` / `readonly` are supported in inline edit, but conditional `hidden` is not

Detailed field value contracts are documented in [Field & Widget](../fields/fields).

### Cascaded columns (related fields)

A column can pull a value from a related (`ManyToOne` / `OneToOne`) record using dot-notation in `fieldName`:

```tsx
<ModelTable modelName="AppEnv">
  <Field fieldName="name" />
  <Field fieldName="lastActivityId.status" widgetType="StatusIcon" />
  <Field fieldName="ownerId.email" />
</ModelTable>
```

The list query controller folds the matching SubQuery into `searchPage` automatically — no need to hand-roll `initialParams.subQueries` for the displayed paths. Cascaded columns are always read-only (no inline-edit support) and use the leaf field's metadata (`fieldType` / `widgetType` / `label`) for rendering. Hand-rolled `initialParams.subQueries` still merges with the auto-collected ones for advanced cases.

Full reference & semantics: [Cascaded Field Path](../fields/fields#cascaded-field-path-display) in the fields README.

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
    filters={[["companyId", "=", "{{ companyId }}"]]}
  />
  <Field fieldName="label" readonly={[["active", "=", false]]} />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` example:

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="label"
  required={dependsOn(
    ["active"],
    ({ values, scope, rowId }) =>
      scope === "model-table" && Boolean(rowId) && values.active === true,
  )}
/>;
```

Behavior:

- default is `inlineEdit={false}`
- `false`: each row is a link to its detail page in read mode, or to the address `rowHref` gives it (see [Row Links](#row-links)); `enableClick={false}` leaves rows inert, and `onRowClick` calls the page back instead
- `true`: row click activates inline edit for that row, and rows are no links (takes precedence over `rowHref`, `onRowClick` and `enableClick`)
- editable cells render `Field` directly inside the table cell
- active row shows row-level `Save` / `Cancel`
- `Save` stays disabled until the active row has actual changes
- `Save` submits only changed editable fields for that row via update API
- `Cancel` restores the row from the latest loaded server snapshot
- switching to another row while current row is dirty asks for discard confirmation
- `required` / `readonly` support `boolean`, `FilterCondition`, and `dependsOn([...], evaluator)`
- inline-edit conditions are evaluated against the current row object with `scope="model-table"`, plus `rowIndex` and `rowId`
- relation-field filters using `{{ fieldName }}` are also evaluated against the current row object
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

## Tab filters

`ModelTable` itself does not have a `tabs` prop. For tab-based filter switching
(or mixed view kinds like Board + Table under one header), wrap the table in
`<MultiView>` — see [MultiView](./multi-view).

## Developer Types

`ModelTableRowWith<TExtra>` is useful when you want strong row typing:

```ts
type UserAccountRow = ModelTableRowWith<{
  username: string;
  status: string;
  locked: boolean;
}>;
```

## Side Panel (Optional)

`ModelTable` supports a left filter panel via `<SideTree>` / `<SideCard>` /
`<SideList>` children. Selection AND-merges into the table query.

```tsx
<ModelTable modelName="SysField">
  <SideTree
    modelName="SysModel"
    filterField="modelId"
    labelField="label"
    parentField="parentId"
  />
  <Field fieldName="modelName" />
  ...
</ModelTable>
```

For full reference (props, slots, custom panels), see
[Side Panel](../components/side-panel).

## Pinned Filters

A filter a list is always read through — the request type and the submitter on My Tasks, a report's day window or period — is declared as a `<PinnedFilter>` child of the table and shown as a pill in the toolbar, after the search box: its name and what it is set to, in one button that opens the control. It is the side panel's counterpart in the toolbar: the table keeps its value with the rest of the list's query state, AND-merges what it puts on the list into the query, remembers it for the tab and puts it back with Clear all.

```tsx
import { PinnedFilter } from "@/components/views/table/pinned-filter";

<ModelTable modelName="FlowApprovalTask" dataSource={source}>
  <PinnedFilter fieldName="flowId" label="Type" control={FlowTypeSelect} defaultValue={null} />
  <PinnedFilter fieldName="initiatorId" label="Submitter" control={SubmitterPicker} defaultValue={null} />
  <Field fieldName="instanceTitle" label="Request" />
</ModelTable>

// A filter that is no one field's names itself and says what its value puts on the list.
<ModelTable modelName="BirthdayCountdown" filters={["status", "=", "Active"]}>
  <PinnedFilter id="days" label="Days Until Birthday" control={DaysWithinFilter} defaultValue={30} toFilter={buildBirthMonthDayFilter} />
  <Field fieldName="fullName" />
</ModelTable>
```

- `control` is the value control, a component handed `PinnedFilterControlProps<TValue>`: `value`, `onChange`, `label`, `options`, and for its pill `active` and `onReset`. The value's type is read from it, not from `defaultValue`. A control draws itself with one of the pills in `src/components/views/shared/list-toolbar/` (see [ListToolbar](../components/list-toolbar)) — `PinnedFilterPopover` (boxes to tick, dates to pick — its popover holds the control), `PinnedFilterSelect` (one of a few values, its `SelectItem`s as children) or `PinnedFilterSearch` (one record found by a search, its list mounted, and so searched, only while open) — giving it `label`, `active`, `onReset` and what the value reads as on the pill (`summary`: "All types", "2026-01-01 – 2026-03-31"). A date range needs no control of its own: `DateRangeFilter` from the same folder, with `toFilter={(range) => dateRangeCondition("field", range)}`. `options` is passed through from the declaration, for the choices a page gives a pick-list (the document types a report lists).
- `toFilter(value)` is the condition a value puts on the list, or nothing (null / undefined) for none. Without it the filter compares `fieldName` with the value: `=` the value, `IN` a list of values, a reference (`{ id, displayName }`) by its id, and nothing for an empty value (null, `""`, `[]`). A filter with no field gives an `id` and a `toFilter`; one with neither a `fieldName` nor an `id`, one with no field and no `toFilter`, and two sharing an id are refused when the table renders.
- `defaultValue` is what the list starts from. A pill whose value is other than its default is marked, with an × beside it that puts it back; Clear all puts every one back. What is picked is kept as JSON in the tab's remembered view (`pinnedFilters` on the snapshot, see [View State Persistence](#view-state-persistence)), so coming back from a record, switching tabs or refreshing finds the list narrowed as it was left. A filter never touched, or put back, reads its default each time, so a default that moves with the date (this month) moves with it; a remembered value of another kind than the default (text where the default is a range) is from an older page and is dropped.
- The conditions join the query like any other filter (see [Filter precedence](#filter-precedence-and-merge-behavior)): changing a value reads the list again from its first page, a data source's `fetch` gets them in `filters`, and an export carries them. They make no chip — the pill shows its own value — and a data source's `queryFields` does not narrow them: they are the page's declaration, not a field picked in a generic control.
- Putting a filter back, by its × or with Clear all, draws its control afresh, so the control's own draft (a custom day count, a date range not yet valid) starts over with it. A control that keeps a draft seeds it from `value` as it mounts and needs nothing else.
- A cell that depends on a pinned filter reads its value with `usePinnedFilterValue(id)`: the roster reports' resignation date, blank until the period picked on the toolbar reaches it.
- The toolbar row is a `ListToolbar`, so it wraps rather than squeezes, on every table: the search box and the pills keep their own width, and the buttons — the toolbar's own and the page's (Create, `<Action placement="toolbar">`, a selection's bulk actions) — go to a line of their own, right-aligned, when they do not fit beside them; the two sets part as well if even one line cannot hold both. On a table with pinned filters the toolbar's own buttons (Filter, Sort, Group, Columns, More) also keep only their icons while the toolbar is narrower than 64rem — a container query on the toolbar (`collapseLabels`) — each still named for assistive technology and on hover, and More keeps its count; the page's buttons always keep their labels. So a page with many pills and many buttons reads as a line of filters over a line of buttons, and selecting rows on a narrower screen can move the buttons to that second line (My Tasks at 1440px, once its batch actions show). A table without pinned filters keeps its labels: its buttons go to the second line sooner instead.

Controls in use: `FlowTypeSelect` and `SubmitterPicker` (`src/app/flow/approval-inbox/components/approval-list-filters.tsx`), `FlowDesignPicker`, `FlowStatusSelect`, `EmployeePicker` and `DepartmentFilter` (`src/app/flow/flow-instance/components/monitor-filters.tsx`), `DaysWithinFilter`, `DocumentTypeFilter` and `PeriodPicker` (`src/app/corehr/report/components/`), and the shared `DateRangeFilter` (the PCP report, Flow Instances).

## Column Header Filter

Each column header exposes a filter popover (the funnel icon) that produces a `ColumnFilterValue`. Column filters feed into the same merge pipeline as the top-level `filters`, workspace, side panel, and toolbar filters — see [Filter precedence](#filter-precedence-and-merge-behavior).

Available operators are derived from each column's `fieldType`. The single source of truth is `src/components/views/table/utils/filter-operators.ts`. Unary operators (`IS SET` / `IS NOT SET`) require no value.

`Date` / `DateTime` columns additionally expose **quick range presets** (Today, Last N days, Next N days, This week / month / year, etc.) and one-click `Is set` / `Is not set` entries inside the same popover. See [Date And Time Widgets → Quick range filter](../fields/widgets#quick-range-filter-column-header) for the preset registry, interaction rules, time-zone handling, and persistence semantics.

## Field Capability Rules

Whether a field shows up in the toolbar's filter / sort / groupby selectors and whether its column header renders a filter / sort icon is decided by a single set of helpers in `src/components/views/table/utils/field-capability.ts`. Toolbar selectors and column headers use the same helpers so they always agree.

- `isFilterableField` — excludes `dynamic=true`, except a cascaded field (`cascadedField = "deptId.companyId"`): a condition that names one directly is rewritten by the backend `WhereBuilder` to its path and joined. Every other `FieldType` (including `File`, `MultiFile`, `JSON`, `Filters`, `Orders`, `DTO`) keeps filter capability because `filter-operators.ts` defines operators for them (at minimum `IS SET` / `IS NOT SET`).
- `isFilterablePathLeaf` — a field reached through a relation (the `departmentId` of `employeeId.departmentId`) must be stored: the backend joins to the related record and compares that field's column, and rewrites a cascaded field to its path only when a condition names it directly, so a cascaded field at the end of a path cannot run. One-to-many and many-to-many fields are dynamic, so they stay out too. Every condition picker that opens relations (the list's Filter dialog, the role data scope, the `Filters` builder) ends its paths with it.
- `isSortableField` — excludes `dynamic=true` (cascaded fields included) **and** the eight non-sortable `FieldType` values: `File`, `MultiFile`, `OneToMany`, `ManyToMany`, `JSON`, `Filters`, `Orders`, `DTO`.
- `isGroupableField` — shares the same rule as `isSortableField`.

A `dynamic` field that cannot be filtered never appears in the filter selector, and no `dynamic` field appears in the sort / groupby selectors; column headers render the filter and sort icons by the same rules.

The toolbar's Filter dialog also opens the list model's many-to-one and one-to-one relations, listing the fields one level on under their dotted path (`useListFilterFields` in `hooks/useRelationFilterFields.ts`): a leave request can be filtered by its employee's department (`employeeId.departmentId`), an employee by their profile's status (`employeeProfileId.status`). A relation's metadata is read when it is opened, once a search is typed, or when a rule in use names it. A field reached through a relation must be able to end a path (`isFilterablePathLeaf`), be one a column could show (`isColumnCandidateField`), and be one the caller sees — the backend matches no row for a condition on a field the caller cannot see; a one-to-one child also leaves out its reference back to the list's model and its audit fields, as the Columns dialog does. The rule stores the dotted path, which the backend joins on; a condition through a relation is bounded by the caller's own range on the related model and by its sensitive-field grants, so a filter never answers a question about a row or a field the caller cannot read. The active filter summary shows such a rule by its labels the same way, reading only the relations its rules name. A list answered by a data source (`queryFields`) opens no relation. The card view's toolbar offers the same fields and relations.

`FilterDialog` edits its draft itself (`updateFilterNode` / `removeFilterNode` in `utils/filter-tree.ts`, which never leave a filter empty: removing the last rule leaves a blank one), so a caller passes only how to create a rule and a group. Under the title it says what a filter does, and with relation groups that a relation opens to its record's fields; a caller whose offer differs passes `description`: a pay group's scope (only the fields payroll groups employees by), a flow's rule (through relations, up to two levels, read when the flow starts — or, for a change trigger, the changed record's own fields only).

## Unified Active Toolbar State

The row under the toolbar shows how the person has narrowed, sorted or grouped the list, each with a way to undo it:

- Tree filter tag
- Column filter tags
- Condition filter preview
- Sort summary
- Group summary

It holds what differs from the list's own view only, so a list as its page opens it has no row:

- The page's own sort (`orders` / `initialParams.orders`) makes no chip — the column header's arrow already shows it. Another sort does, and its × puts the page's sort back; a list whose page sorts it but which the person left unsorted shows `Sort: None`.
- The page's base condition (`filters` / `initialParams.filters` / the tab's) makes no chip either: the Filter dialog states it, whole and wrapped, above the rules as "Always applied" — the place a person looks to see why someone is or is not in the list.
- [Pinned filters](#pinned-filters) make no chip: their pills show their values.

`Clear all` clears all active toolbar states together, and puts the sort back to the page's default rather than to none — a list ordered on purpose would otherwise come back in arbitrary order, and stay that way for the tab, since the cleared state is what the tab remembers. It also puts every pinned filter back to its default.

## View State Persistence

The table remembers its **query state** so that navigating into a record detail page and clicking Back — or refreshing the same tab — returns you to exactly where you were instead of resetting to the default view.

Persisted query state: pagination (page number + page size), sorting, group-by, the toolbar filter tree, column header filters, the search term, side-panel (`SideTree` / `SideList` / `SideCard`) selection, and the values picked in [pinned filters](#pinned-filters). State is stored in `sessionStorage`, scoped per `view kind + modelName + route + active MultiView tab`, via the shared `src/components/views/shared/view-state/` module.

Behavior:

- Restore is "always on mount": re-entering the same view in the same tab (including from the sidebar) restores the last query state. `Clear all` resets it, so the next visit starts fresh.
- `sessionStorage` survives reloads and same-tab Back/forward, and is isolated per browser tab. It is cleared when the tab is closed and is not shared to newly opened tabs — query state is intentionally ephemeral and not part of the URL (the list URL stays clean and is not a shareable filtered view).
- Row selection is never persisted.
- Column layout (order / visibility / pinning / freeze) is a durable preference and is **not** persisted by this mechanism yet.
- Side-panel selection persists the *selection source* (selected ids + filter field + operator + minimal labels), not the derived filter condition. On restore the panel re-highlights, the query is filtered, and the toolbar "Filter status" tag is shown — all derived from that one source. For `SideTree`, highlight restore matches node ids; when `filterValueField` is customized (filter value ≠ node id) the query still restores correctly while the tree highlight keys off node id.

`ModelBoard` (search term only) and `ModelCard` (pagination + sort + filter + search) share the same mechanism.

## Data Freshness

Restoring *where you were* is only half of Back navigation — the data may have changed while you were on the detail page (form save, action buttons, server-side cascades, other users). Two layers keep views fresh:

- **Stale-while-revalidate everywhere**: the global query default is `staleTime: 0` (`src/providers/query-provider.tsx`), so every mount renders cached data instantly — no skeleton flash — while a background refetch replaces it with fresh data. This covers the table's main query, side panels, sidecar, and detail `getById` alike, and is the safety net for changes no invalidation call can enumerate. Hooks with genuinely static data (metadata, option sets, dial codes, default values) pin their own longer `staleTime`.
- **Prefix invalidation on write**: every mutation path (form save, default / dialog / custom actions, bulk operations, delete) calls `invalidateModelQueries`, which invalidates *all* cached queries whose key starts with the model name — table pages, side panels, board counts, sidecar joins, and record caches alike. This is what refreshes views that are still mounted when the write happens.

Nothing is read again when the window comes back into focus (the global `refetchOnWindowFocus: false`): a write made in another tab shows on the next mount or invalidation. A list whose rows are decided in another tab asks for the read on focus through its data source ([Data Source](#data-source)).

## Data Source

`dataSource` reads the rows from an endpoint of the page's own instead of `/{model}/searchPage` — for a list the generic model API cannot serve its readers, such as the approval center's inbox, which the server scopes to the caller:

```tsx
const source = useApprovalTasksSource("Pending", ["nodeLabel", "submittedTime", "startTime"]);
const hrefOf = useApprovalRequestHref(); // each row's link: its request page, or a pay run's in a tab of its own

<ModelTable<FlowApprovalTaskView>
  modelName="FlowApprovalTask"
  dataSource={source}
  rowHref={hrefOf}
  renderRowActions={(task) => <TaskActions task={task} />}
>
  <Field fieldName="nodeLabel" label="Task" />
  <Field fieldName="initiatorId" label="Submitter" renderCell={(row) => actorLabel(row.initiator)} />
  <Field fieldName="startTime" label="Received" />
</ModelTable>
```

It is `{ key, fetch, queryFields?, refetchOnWindowFocus? }` (`ModelTableDataSource`, on `PageDataSource` in `src/hooks/useSearchPageQuery.ts`). `fetch({ filters, orders, pageNumber, pageSize })` returns one `Page`. `key` is the cache key the source's pages are kept under, the params appended to it: start it with the model name, so the invalidation a write to the model runs (`invalidateModelQueries`, an approval action's `["FlowApprovalTask"]`) refreshes the list as it refreshes a searchPage one. A different key is a different list, and it starts on its first page. `refetchOnWindowFocus: true` reads the pages again whenever the window comes back into focus, against the app's default of no read on focus ([Data Freshness](#data-freshness)): for a list whose rows move while its reader is in another tab — My Tasks and My Requests, whose pay run approvals open in a tab of their own and are decided there.

Everything else still comes from the model's metadata, as for a searchPage list: the columns, their labels and field types, the search box over the model's `searchName` (`["searchName", "CONTAINS", term]`), the column-header filters, sorting, paging, the Columns dialog, the remembered query state and the column arrangement. They are folded into `filters` / `orders` as they would be for searchPage — the `filters` prop and the workspace filter included — and only those and the page reach the source: field lists, sub-queries, grouping and aggregates are searchPage's and are never sent. Without an `orders` prop no sort is sent until the user picks one, so the source's own default order holds; one sent replaces it.

Filters and sorts name the model's stored fields only: a `dynamic` field offers neither, cascaded ones included, and neither does a path into another record or a one-to-one link, whose children the Filter dialog would open. `queryFields` narrows that to the fields the source answers for — column headers filter and sort on those only, and the Filter and Sort dialogs list those only — which is how a page keeps out of its filters a raw id (an `initiatorId` column whose cell shows a name) or a relation whose picker its readers cannot read. A filter value on a field the model is named by (its `searchName`, its primary key) is typed rather than picked, since the picker lists rows through the model's generic `searchName` (`FilterOwnModelRowsContext` in `filters/FilterValueInput.tsx`).

Whatever runs on the model's generic endpoints is off, whatever the page or the caller's grants say: Create, Import, Export, Bulk edit, bulk Delete, inline edit, the Group control, pivot columns, side panels (`SideTree` / `SideCard` / `SideList`), sidecars and the per-row access check (`getRecordAccess`). The page's own actions — `<Action>`, `renderRowActions`, `renderBulkActions` — still run, against whatever endpoints they call.

A narrowing the page shows in the toolbar, such as a request type picked there, is a [pinned filter](#pinned-filters): its condition reaches `fetch` in `filters` with the rest of the query, the list starts again at page one when it changes, and the tab remembers it. The source itself names no such choice, in its `fetch` or its `key`.

## Row Links

A row that opens a page is a link to it: to its record's detail page by default (`${pathname}/${id}?mode=read`, or under `linkTo`), or to the address `rowHref(row)` returns. The browser treats it as the link it is: a plain click opens it in this tab, Cmd/Ctrl-click and the middle button open it in a new tab, Shift-click in a new window, the context menu offers Open in New Tab and Copy Link, and a hover shows its address in the status bar. Tab reaches each row once and Enter opens it.

```tsx
// Flow Designs: a flow opens in its designer, for whoever may open it; for anyone else the rows open nothing.
<ModelTable
  modelName="FlowDesign"
  enableClick={false}
  rowHref={mayOpenDesigner ? (row) => flowDesignEditRoute(row.id) : undefined}
>
  {/* … */}
</ModelTable>

// My Tasks: each request on its page here, a pay run's approval on the pay run in a tab of its own —
// (task) => "/home/approvals/record/LeaveRequest/9" | { href: "/payroll/tenant-run/pay-run/5", target: "_blank" }
const hrefOf = useApprovalRequestHref();
<ModelTable<FlowApprovalTaskView> modelName="FlowApprovalTask" dataSource={source} rowHref={hrefOf}>
  {/* … */}
</ModelTable>
```

`rowHref(row)` returns a string for an address opened in this tab, `{ href, target: "_blank" }` for a page worked on in a tab of its own (the link carries `rel="noopener noreferrer"`), or null for a row that is no link and does nothing on a click (one the caller may not open). It wins over `onRowClick`, `linkTo` and `enableClick`. With inline edit on, the click still edits and rows are no links; with `enableClick={false}` and no `rowHref` they are inert.

How it is built (`components/row-link.tsx`, used by `PaginatedDataGrid` and the approval center's `TaskTable`): every cell of the row but its own controls — the selection checkbox, the row actions and inline-edit columns, the expander — holds the row's link, covering the cell, since a cell of a frozen column is `position: sticky` and would hold a link stretched from another cell to itself. The first such cell's content sits inside the link that is read out and focused, so the link's name is that cell's text; each other cell holds a link beneath its content, out of the tab order and hidden from assistive technology (`aria-hidden`, `tabindex="-1"`). A cell's content lets the pointer through to the link (`[data-row-link-cell]` in `src/styles/globals.css`), except the cell's own controls — a link of its own, a button that previews a file or reveals a value, a field, a trigger whose hint opens on hover (`[data-slot$="-trigger"]`, `aria-haspopup`) — which keep their clicks and never open the row. A cell's text's hover hint (the `title` that shows a value cut short in full) is taken over by the link as the pointer comes in. Only a plain click is followed by the table itself, with the router (and, to a record's page, the list's ids for the page's previous / next); everything else is left to the browser.

What a row link costs: text in a linked row cannot be selected by dragging (a drag on a link drags the link), and a hover effect of a cell's content that is not one of its controls does not happen. A `renderCell` that needs a click of its own uses a `<button>` or a link, never a clickable `<span>`.

## Row Click, Row Actions And Selectable Rows

`onRowClick(row)` is called with the row a click lands on, instead of the record's page opening — for a click that does something other than go somewhere. A row that opens a page is a link instead (`rowHref`, [Row Links](#row-links)): a row only clickable cannot be opened in a new tab or reached from the keyboard. Rows are clickable whenever it is given, whatever `enableClick` says; `rowHref` wins over it; with inline edit on, the click still edits.

`renderRowActions(row)` draws the row's own actions in the actions column, ahead of the declared `<Action>`s: for actions that are components with dialogs of their own, which `<Action>` cannot express (an approver's Approve / Reject with their menu, Urge with its interval). The column takes the width of what it holds (`meta.fitContent` on the column, honoured by `PaginatedDataGrid`), as it does for declared inline `<Action>`s, whose labels a fixed width would cut into the column before it. A click in it — a dialog it opens included — does not reach the row.

`renderBulkActions(rows)` is the same for a selection: the page's own actions on the selected rows, drawn in the toolbar ahead of the declared toolbar `<BulkAction>`s while any row is selected — for actions that are components with their own dialogs, which `<BulkAction>` (an operation of the model's) cannot express: My Tasks' Approve / Return / Reject of a batch. Giving it makes the rows selectable.

`rowSelectionBlockedReason(row)` answers, while rows can be selected, why a row cannot be: its checkbox is drawn disabled with the reason on hover, and Select all on the page leaves it out (TanStack's per-row `enableRowSelection`). Return null for a row that can be selected. A checked row that the list, read again, shows can no longer be selected — an action moved it on: Flow Instances' Terminate cancels what it ends — drops out of the selection there and then: its box would be disabled and could not be unticked, and a bulk action would act on it again. A row that is still selectable stays checked.

## Core Props

| Prop               | Type                       | Required | Default | Notes                                                                                                                                      |
| ------------------ | -------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `modelName`        | `string`                   | Yes      | -       | Used to fetch metadata API.                                                                                                                |
| `label`        | `string`                   | No       | -       | Overrides the page title shown in the table header. Defaults to `metaModel.label` when omitted.                                        |
| `description`      | `string`                   | No       | -       | Overrides the subtitle shown in the table header. Defaults to `metaModel.description` when omitted.                                        |
| `inlineEdit`       | `boolean`                  | No       | `false` | Enable row-click inline edit mode. When enabled, active-row editable cells render `Field` components instead of navigating to detail.      |
| `orders`           | `OrderCondition`           | No       | -       | Recommended default sort. Supports a single tuple (`["createdTime", "DESC"]`) or multiple tuples. Wins over `initialParams.orders` and `MultiView.Tab.orders` (context). |
| `filters`          | `FilterCondition`          | No       | -       | Recommended base filter. Wins over `initialParams.filters` and `MultiView.Tab.filters` (context). AND-merged with workspace, search, column, side-panel, and toolbar filters at runtime. See [precedence rules](./multi-view#filter--order-precedence). |
| `initialParams`    | `QueryParamsWithoutFields` | No       | -       | Advanced initial query settings (`pageSize`, `groupBy`, `effectiveDate`, `subQueries`, `splitBy`, `aggFunctions`, `summary`). For `filters` / `orders`, prefer the top-level props. |
| `children`         | `ReactNode`                | No       | -       | Ordered `<Field />` declarations plus optional `<Action />`, `<BulkAction />`, `<PinnedFilter />` (see [Pinned Filters](#pinned-filters)), and one side panel (`<SideTree>`, `<SideCard>`, or `<SideList>`). At least one visible `<Field />` is required at runtime. |
| `enableBulkDelete` | `boolean`                  | No       | `true`  | Enable built-in bulk delete entry.                                                                                                         |
| `enableCreate`     | `boolean`                  | No       | `true`  | Enable built-in create button.                                                                                                             |
| `enableImport`     | `boolean`                  | No       | `true`  | Enable built-in import dialog entry in More menu.                                                                                          |
| `enableExport`     | `boolean`                  | No       | `true`  | Enable built-in export dialog entry in More menu.                                                                                          |
| `bulkEditFields`   | `string[]`                 | No       | -       | Optional bulk-edit allowlist. If omitted, built-in Bulk Edit uses all metadata fields.                                                     |
| `excludeFields`    | `string[]`                 | No       | -       | Optional bulk-edit denylist. Always excluded from built-in Bulk Edit (in addition to reserved fields).                                     |
| `linkTo`           | `string`                   | No       | -       | Subdirectory name (single segment) of the record page rows link to: `${pathname}/${linkTo}/${id}?mode=read`. Omit for default `${pathname}/${id}?mode=read`. |
| `enableClick`      | `boolean`                  | No       | `true`  | Whether each row links to its detail page. Set `false` for view-only / report tables that have no detail route, so rows are no links (no `cursor-pointer`, no navigation). Ignored when `inlineEdit` is enabled, or when `rowHref` / `onRowClick` is given. |
| `freezeColumnIndex`| `number`                   | No       | `1`     | Initial count of left-side data columns kept frozen. The select column remains pinned ahead of the frozen range when enabled.             |
| `dataSource`       | `ModelTableDataSource<TData>` | No    | -       | `{ key, fetch, queryFields?, refetchOnWindowFocus? }`: reads the rows through `fetch({ filters, orders, pageNumber, pageSize })` instead of `/{model}/searchPage`, cached under `key`, and again on window focus when `refetchOnWindowFocus` asks. Metadata still drives columns, search, column filters, sort, paging and remembered state; filters and sort name stored fields only (`queryFields` narrows them); create, import, export, bulk edit / delete, inline edit, grouping, pivot, side panels and sidecars are off. See [Data Source](#data-source). |
| `rowHref`          | `(row: TData) => string \| { href: string; target?: "_blank" } \| null` | No | - | Each row's address in place of the record's page: the row is a link to it (Cmd/Ctrl/middle-click, context menu, Tab + Enter); `target: "_blank"` opens a tab of its own; null leaves that row inert. Wins over `onRowClick`, `linkTo` and `enableClick`; inline edit still takes the click. See [Row Links](#row-links). |
| `onRowClick`       | `(row: TData) => void`     | No       | -       | Called with the clicked row instead of opening the record's page, for a click that opens no page (a row that does is a link, `rowHref`); rows are clickable whatever `enableClick` says, but no links. Inline edit, when on, still takes the click. |
| `renderRowActions` | `(row: TData) => ReactNode` | No      | -       | The row's own actions, drawn in the actions column ahead of the declared `<Action>`s, the column as wide as they are; a click in them does not reach the row. For actions that are components with their own dialogs. |
| `renderBulkActions` | `(rows: TData[]) => ReactNode` | No   | -       | The page's own actions on the selected rows, drawn in the toolbar ahead of the declared toolbar `<BulkAction>`s while any row is selected; giving it makes the rows selectable. For batch actions that are components with their own dialogs. |
| `rowSelectionBlockedReason` | `(row: TData) => string \| null` | No | - | While rows can be selected: why this one cannot (checkbox disabled, the reason on hover, left out of Select all), or null. |

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

`initialParams.filters` remains a normal server-side base filter for the table query itself. It does not resolve `{{ expr }}` references; that declarative syntax is only supported on relation-field `filters`.

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
<ModelTable modelName="UserAccount" orders={["updatedTime", "DESC"]} >
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### Recommended Example (top-level `filters` + `orders`)

```tsx
<ModelTable
  modelName="UserAccount"
  filters={[["status", "!=", "Deleted"], "AND", ["locked", "=", false]]}
  orders={["updatedTime", "DESC"]}
  initialParams={{ pageSize: 50, effectiveDate: "2026-03-01" }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

`filters` and `orders` go on the top level. `initialParams` carries the
remaining advanced fields.

### Advanced Example (`groupBy` / `aggFunctions` / `subQueries`)

```tsx
<ModelTable
  modelName="UserAccount"
  filters={["status", "=", "Active"]}
  initialParams={{
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

### Filter precedence and merge behavior

The base filter is resolved by **picking** the first non-undefined source
(no merge within this layer):

```
top-level filters  >  initialParams.filters  >  MultiView.Tab.filters (context)
```

The chosen base is then **AND-merged** with all other filter sources at
runtime:

- chosen base filter (above)
- workspace filter (`useWorkspaceFilter()` — security/scope)
- pinned filters (`<PinnedFilter>` values, see [Pinned Filters](#pinned-filters))
- side panel filter (`SideTree` / `SideCard` / `SideList` selection)
- search filter (`["searchName", "CONTAINS", keyword]`)
- column filter tags
- toolbar condition filter

The header search box is driven by model metadata (`resolveTableSearchConfig`): its placeholder reads `Search by <label>...` using the `label` of the field(s) the backend actually matches — the model's configured `searchName`, falling back to the `name` field. When the model declares neither `searchName` nor a `name` field there is nothing to free-text search against, so the search box is hidden entirely.

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

For the full layered model (including how `MultiView.Tab.filters` interacts
with this), see
[Filter & order precedence](./multi-view#filter--order-precedence).

## Permission Integration

`ModelTable` auto-gates by `modelName` against the generated `MODEL_PERMISSIONS` lookup — business pages do not call `usePermission` for standard CRUD or for any custom action that declares a `permission` field.

What gets gated for free, just from passing `modelName`:

| Built-in control       | Action segment checked  | Effect when denied                              |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| Toolbar "Create"       | `create`                | Hidden (alongside quickAdd)                     |
| Toolbar "Import"       | `import`                | Hidden                                          |
| Toolbar "Export"       | `export`                | Hidden                                          |
| Toolbar bulk "Delete"  | `delete`                | Hidden + row-selection auto-disabled if no other bulk action |
| Inline edit            | `update`                | Force-disabled even when `inlineEdit` prop is true |

Custom `<Action permission="…" />` / `<BulkAction permission="…" />` children are filtered before render — no flash, no click handler installed. Pass the manifest's action segment (`"transfer"`, `"initiate-signing"`, or any of the standard CRUD names) — `useActionPermission(modelName, permission)` does the lookup internally.

Status semantics (intentional three-state):

- **Granted** → control / action stays visible (business `enable*` and `hidden` still apply).
- **Denied** → control / action is hidden; row selection / inline edit also collapses if it depends on the missing right.
- **Unmanaged** → the `(modelName, action)` pair isn't in `MODEL_PERMISSIONS` because the model is ambiguous across pages (see `pnpm gen:permissions` warnings) or simply not declared. Auto-gate has no opinion and lets the page's own `enableCreate=` / `hidden=` / `usePermission` decide. Use this escape hatch for pages on shared models like `EmpDocument` / `LeaveRequest`.

Business props still win when set to `false` — a page that explicitly passes `enableCreate={false}` keeps Create hidden for SUPER_ADMIN too. SUPER_ADMIN short-circuits the permission check itself (every action returns `Granted`) but does NOT override an explicit business `false`.

**Projection models** (`MetaModel.projection === true`, from `@Model(projection = true)` — a read-only model over a table another model owns): every built-in write affordance closes on top of the permission gate — Create, Import, inline edit, bulk edit and bulk Delete all hide regardless of the user's grants (the backend rejects the writes anyway). Export stays, it is a read. This is a structural property of the model, not a permission — SUPER_ADMIN sees the same read-only table.

Example — auto-gated list with one custom action:

```tsx
<ModelTable modelName="Employee">
  <Field fieldName="fullName" />
  <Action
    type="custom"
    label="Transfer"
    placement="more"
    permission="transfer"        {/* gated by Employee.transfer */}
    onClick={openTransferDialog}
  />
</ModelTable>
```

The toolbar Create / Import / Export / bulk Delete are auto-shown / auto-hidden purely from `modelName="Employee"`; "Transfer" is auto-hidden when the user lacks `Employee.transfer`.

## Actions

Common `Action` / `BulkAction` API now lives in [Actions](../actions).
This section keeps only the `ModelTable` container rules and a complete table-level example.

Rules:

- `<Action placement="toolbar" />` renders in the table toolbar custom action area
- `<Action placement="inline" />` renders in the last-column inline action area
- `<Action placement="more" />` renders in the last-column More Actions dropdown
- active inline-edit rows resolve action context from the current draft row values
- clicking a row action while the active row is dirty asks whether to discard the draft before continuing
- `BulkAction` is selection-scoped and only shown when rows are selected
- `BulkAction placement="toolbar"` appears between `Columns` and `More`, after the page's own `renderBulkActions` (see [Row Click, Row Actions And Selectable Rows](#row-click-row-actions-and-selectable-rows))
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
      <Field fieldName="reason" label="Reason" widgetType="PlainText" />
    </ActionDialog>
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />

  <Action
    type="custom"
    label="Refresh"
    placement="toolbar"
    onClick={() => console.log("refresh")}
  />

  <Action
    type="custom"
    label="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  <Action
    label="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
    successMessage="Account locked."
  />

  <Action
    type="dialog"
    label="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
    successMessage="Account unlocked."
  />

  <Action
    type="link"
    label="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
  />

  <BulkAction
    label="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
    confirmMessage={({ ids }) => `Lock ${ids.length} selected accounts?`}
  />

  <BulkAction
    type="dialog"
    label="Unlock Selected"
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

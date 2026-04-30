# Side Panel

Left-aligned filter widgets that go **inside** a parent view (`ModelTable`,
`ModelCard`) as direct children. The user's selection in the panel publishes
a filter condition that the parent view AND-merges into its main query.

**Three components** sharing one base type and protocol:

| Component | UI paradigm | When to use |
| --------- | ----------- | ----------- |
| `<SideTree>` | Hierarchical tree | Parent-child data (department tree, model tree) |
| `<SideList>` | Flat row list | Simple list filter, optionally with template fields per row |
| `<SideCard>` | Rich cards with slots | List filter where each row needs header/body/footer + actions |

## Where they work

| Parent view | Supports side panel? |
| ----------- | -------------------- |
| `ModelTable` | ✅ |
| `ModelCard` | ✅ |
| `ModelForm` / `ModelSideForm` | `SideCard` / `SideList` only — used as the master list of master-detail UI |

Only **one** side panel element per parent view is supported.

## Quick Start — `<SideTree>`

```tsx
import { SideTree } from "@/components/views/shared/side-panel/SideTree";

<ModelTable modelName="SysField" orders={["modelName", "ASC"]}>
  <SideTree
    title="System Model"
    modelName="SysModel"
    filterField="modelId"
    labelField="labelName"
    parentField="parentId"
    treeLimit={1000}
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="labelName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

Selecting a node in the tree filters the table by `modelId = <node.id>`.

## Quick Start — `<SideCard>`

```tsx
import { SideCard } from "@/components/views/shared/side-panel/SideCard";
import { Group } from "@/components/fields/composition";
import { Action } from "@/components/actions/Action";

<ModelTable modelName="DesignWorkItem">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    searchable
    title="Apps"
  >
    <SideCard.Header>
      <Field fieldName="appName" />
    </SideCard.Header>
    <SideCard.Header align="right">
      <Field fieldName="status" widgetType="Badge" />
    </SideCard.Header>
    <Group separator="-">
      <Field fieldName="appCode" />
      <Field fieldName="appType" />
    </Group>
    <SideCard.Footer>
      <Field fieldName="updatedTime" />
    </SideCard.Footer>

    <Action type="link" labelName="Edit" placement="header" href="/design/app/{id}" />
    <Action type="custom" labelName="Archive" placement="more" onClick={(ctx) => { /* ... */ }} />
  </SideCard>

  <Field fieldName="name" />
  <Field fieldName="status" />
</ModelTable>
```

## Quick Start — `<SideList>`

```tsx
import { SideList } from "@/components/views/shared/side-panel/SideList";

<ModelTable modelName="DesignField">
  <SideList
    modelName="DesignModel"
    filterField="modelId"
    searchable
  >
    <Field fieldName="modelName" />
    <Field fieldName="labelName" />
  </SideList>

  <Field fieldName="fieldName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

## Common protocol

Every side panel publishes its selection through `SidePanelContainerContext`
(provided by the parent view). The protocol:

1. Panel queries records from `modelName` (its own data source, not the parent's).
2. User selects records — internal state via `useSideRecordList` (flat-list panels) or `TreePanel` (tree).
3. Panel calls `container.onFilterChange(filterField, selectedIds, selectedRecords, filterOperator?)`.
4. Parent view turns selection into a `FilterCondition` and AND-merges it into
   the main query alongside workspace / search / column / toolbar filters.

The filter shape from selected ids:

- 0 selected → no filter (cleared)
- 1 selected → `[filterField, operator, value]`
- N selected → `[v0, OR, v1, OR, …, OR, vN]`

`operator` defaults to `"="` and can be overridden via `filterOperator` (currently exposed on `SideTree` only).

## Component props

### Common base — `SidePanelBaseProps`

All three components extend this:

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `modelName` | `string` | No | parent's | Data source. Falls back to parent view's `modelName`. |
| `filterField` | `string` | Yes | - | Field on the parent's records to filter by. |
| `filterValueField` | `string` | No | `idField` (tree) / `id` (list/card) | Field on a panel record to extract as filter value. |
| `filterOperator` | `FilterOperator` | No | `"="` | Operator used in the generated filter condition. |
| `selectionMode` | `"single" \| "multi"` | No | `"single"` | Whether multiple selections are allowed. |
| `remoteSearch` | `boolean` | No | `false` | When true, search hits a remote API (`["searchName", "CONTAINS", keyword]`) instead of client-side filtering. Debounced 300ms. |
| `title` | `string` | No | - | Panel title at top. |
| `className` | `string` | No | - | Panel root className. |

### Flat-list base — `SideFlatListPanelBaseProps`

`SideList` and `SideCard` add:

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `filters` | `FilterCondition` | No | - | Base filter applied when querying source records. AND-merged with workspace filter. |
| `orders` | `OrderCondition` | No | - | Sort applied to source records. |
| `limit` | `number` | No | `200` | Max records loaded. |
| `searchable` | `boolean` | No | `false` | Enable search input. |
| `formView` | `ComponentType<SideFormCreateDialogProps>` | No | - | When `ModelSideForm.enableCreate` is set, the `+` button opens this dialog. |

### `SideTree`-specific props

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `labelField` | `string` | Yes | - | Field for tree node label. |
| `parentField` | `string` | Yes | - | Field for parent id (use `""` for flat trees). |
| `idField` | `string` | No | `"id"` | Field for tree node id. |
| `disabledField` | `string` | No | - | Field that, when truthy, marks node disabled. |
| `treeFields` | `string[]` | No | - | Extra fields to fetch. |
| `treeFilters` | `FilterCondition` | No | - | Extra filter on the tree's data source. |
| `treeLimit` | `number` | No | - | Query limit. |
| `orders` | `OrderCondition` | No | - | First order field becomes the tree sort key. |
| `defaultExpandedLevel` | `number` | No | - | Initial open-state depth. |
| `height` | `number` | No | `560` | Tree viewport height. |

### `SideCard` slots

`SideCard` accepts compound children:

| Slot | Renders at | Notes |
| ---- | ---------- | ----- |
| `<SideCard.Header>` | Card header row | Multiple instances allowed; `align="right"` flips to right side |
| `<SideCard.Header align="right">` | Right side of header row | Before the `...` menu |
| Top-level `<Field />` / any node | Card body | Renders in `RecordContext` — Fields go to display mode |
| `<SideCard.Footer>` | Card footer | |
| `<Action />` | Per-card action; placement decides where | See [Action placement](#sidecard-action-placement) below |

#### SideCard Action placement

| `placement` | Position | Visibility |
| ----------- | -------- | ---------- |
| `header` | In the card header row, beside header fields | Always visible |
| `inline` | Below the card body | Always visible |
| `more` | In a `...` dropdown menu (top-right corner) | On hover / open |

- Default placement is `inline` if omitted.
- Actions receive `ActionExecutionContext` with `id`, `row` (record data), `modelName`.
- Clicking an action does **not** trigger card selection.
- `hidden` / `disabled` are evaluated per card.

## Common behaviors

- Panel width is fixed at **280px**; no public width API.
- Multi-select selection becomes `OR`-merged across selected values when building the filter.
- `searchable=true` enables a search input; client-side by default (filters across all field values), or server-side via `remoteSearch=true` (debounced 300ms, calls `["searchName","CONTAINS",keyword]`).
- `SideCard` / `SideList` use `RecordContext` to provide each row's data — `Field` children automatically render in display mode (no `FieldPropsContext` setup needed).
- `SideTree` wraps the existing [`TreePanel`](../views/tree); `searchMode` defaults to `"local"`, or `"server"` when `remoteSearch=true`.
- `SideCard` and `SideList` can be used inside `ModelSideForm` as the master list of master-detail UI (see [ModelSideForm](../views/side-form)).

## Building a custom side panel

Three pieces of shared infrastructure available in this directory:

### `useSideRecordList` hook

For panels that show a flat list of records (anything SideList/SideCard-shaped). Handles:

- container context read + `modelName` fallback
- metadata + workspace filter
- search state + debounce + query params
- `useSearchListQuery` data fetch
- client-side search filtering (when `remoteSearch=false`)
- selection state (internal vs ModelSideForm-managed)
- publishing selection to container via `onFilterChange`
- auto-select first record in managed mode

```ts
import { useSideRecordList } from "@/components/views/shared/side-panel/use-side-record-list";

const {
  container, effectiveModelName, metaModel,
  searchTerm, setSearchTerm, filteredRecords, isLoading,
  selectedId, handleSelect,
} = useSideRecordList({
  modelName, filterField, filters, orders, limit, remoteSearch,
});
```

Just render whatever JSX you want — the hook owns the state machine.

### `buildSidePanelFilterCondition`

Used by parent views (ModelTable / ModelCard) to convert a panel's selected ids into a filter condition. Most callers won't touch this directly; it's already wired into the parent views. Re-exported in case you build a new parent-view kind:

```ts
import { buildSidePanelFilterCondition } from "@/components/views/shared/side-panel/build-filter";

const filter = buildSidePanelFilterCondition(filterField, selectedIds, {
  filterOperator: "=",
});
```

### `SidePanelBaseProps` / `SideFlatListPanelBaseProps`

Extend these when typing a new panel so it satisfies the same contract:

```ts
import type { SideFlatListPanelBaseProps } from "@/components/views/shared/side-panel/types";

interface MyPanelProps extends SideFlatListPanelBaseProps {
  // your panel-specific props
}
```

## Files in this directory

| File | Purpose |
| ---- | ------- |
| `SideTree.tsx` | Tree panel component |
| `SideList.tsx` | Flat-list panel component |
| `SideCard.tsx` | Rich-card panel component + `SidePanelContainerProvider` / `useOptionalSidePanelContainer` |
| `SidePanelSearch.tsx` | Internal search input used by SideList / SideCard |
| `use-side-record-list.ts` | Shared state hook for flat-list panels |
| `build-filter.ts` | Selected ids → `FilterCondition` |
| `types.ts` | Shared type hierarchy |
| `index.ts` | Barrel exports |

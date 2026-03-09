# Tree

Reusable tree view built on `react-arborist` + shadcn/ui.

## Related Docs
- [Fields and widgets](./field)

## Import

```tsx
import { Tree, TreePanel, type FlatNode, type TreePanelProps, type TreeProps } from "@/components/views/tree";
```

Public components for business usage:

- `Tree`
- `TreePanel`
- `SelectTreePanel`

## Quick Start

```tsx
import { Tree } from "@/components/views/tree";

<Tree modelName="SysModel" selectionMode="single" searchMode="local" />;
```

### Tree: Common Setup Example

```tsx
import { toast } from "sonner";
import { Tree } from "@/components/views/tree";

<Tree
  modelName="SysModel"
  title="System Model"
  selectionMode="multiple"
  selectStrategy="cascade"
  searchMode="local"
  dragEnabled
  defaultExpandedLevel={2}
  rowActions={(node) => (
    <button
      type="button"
      onClick={() => toast.info(`Clicked ${String(node.name ?? node.id)}`)}
    >
      Inspect
    </button>
  )}
  onSelectionChange={(ids) => {
    console.log("Selected ids:", ids);
  }}
/>;
```

## Data Source

`Tree` supports two source modes:

- `mockData`: local static/in-memory list.
- `modelName`: fetches data via `useSearchListQuery`.

When `mockData` is empty and `modelName` is provided, `Tree` requests data on render and builds query fields from `idKey`, `labelKey`, `parentKey`, `disabledKey`, and `sortKey` (deduplicated).

## Default Behavior

- `idKey = "id"`
- `labelKey = "name"`
- `parentKey = "parentId"`
- `disabledKey` has no default.
- `selectionMode = "single"`
- `selectStrategy = "cascade"`
- `searchMode = "off"`
- `dragEnabled = false`
- `defaultExpandedLevel = 3`
- `locatePulseDurationMs = 800`

## Tree Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `modelName` | `string` | One of `modelName` or `mockData` is required | - | Query-mode data source. |
| `mockData` | `FlatNode[]` | One of `modelName` or `mockData` is required | - | Local data source. |
| `title` | `ReactNode` | No | - | Optional tree title. |
| `treeFilters` | `FilterCondition` | No | - | Query filters for model mode. |
| `treeLimit` | `number` | No | - | Query limit for model mode. |
| `idKey` | `string` | No | `"id"` | Node id field key. |
| `labelKey` | `string` | No | `"name"` | Node label field key. |
| `parentKey` | `string` | No | `"parentId"` | Parent id field key. |
| `disabledKey` | `string` | No | - | Disabled status field key. |
| `sortKey` | `string` | No | - | Sort field key for tree build/update payload. |
| `selectionMode` | `"none" \| "single" \| "multiple"` | No | `"single"` | Selection mode. |
| `selectStrategy` | `"independent" \| "cascade"` | No | `"cascade"` | Effective in multi-select mode. |
| `searchMode` | `"off" \| "local" \| "server"` | No | `"off"` | Search strategy. |
| `dragEnabled` | `boolean` | No | `false` | Enables drag + draft + save flow. |
| `onSearch` | `(query) => Promise<FlatNode[]>` | No | - | Required only for `searchMode="server"`. |
| `onSelectionChange` | `(selectedIds, selectedNodes) => void` | No | - | Selection change callback. |
| `updateList` | `(payload) => Promise<unknown>` | No | - | Save handler for drag changes. |
| `searchDebounceMs` | `number` | No | `300` | Debounce in search modes. |
| `texts` | `Partial<TreeText>` | No | Built-in locale text | Text overrides. |
| `className` | `string` | No | - | Wrapper className. |
| `rowActions` | `(node) => ReactNode` | No | - | Per-row extra actions. |
| `width` | `number \| string` | No | `"100%"` | Tree width. |
| `height` | `number` | No | `320` | Tree height. |
| `rowHeight` | `number` | No | Density token value | Row height override. |
| `indent` | `number` | No | Density token value | Indent override. |
| `overscanCount` | `number` | No | `1` | Virtualization overscan. |
| `defaultExpandedLevel` | `number` | No | `3` | Initial open-state depth. |
| `padding` | `number` | No | - | Arborist padding. |
| `paddingTop` | `number` | No | - | Arborist top padding. |
| `paddingBottom` | `number` | No | - | Arborist bottom padding. |
| `rowClassName` | `string` | No | - | Row className. |
| `selectionFollowsFocus` | `boolean` | No | Arborist default | Forwarded to Arborist. |
| `onToggle` | `(id) => void` | No | - | Node toggle callback. |
| `onFocus` | `(node) => void` | No | - | Node focus callback. |
| `selectedIds` | `string[]` | No | - | Controlled selected ids. |
| `selectionResetVersion` | `number` | No | - | Increment to clear selection. |
| `collapseAllVersion` | `number` | No | - | Increment to trigger `closeAll()`. |
| `openStateResetVersion` | `number` | No | - | Increment to restore initial open-state. |
| `showSelectedRowClearAction` | `boolean` | No | `false` | Show row-level clear icon for selected rows. |
| `locateRequestVersion` | `number` | No | - | Increment to locate current selection. |
| `locatePulseDurationMs` | `number` | No | `800` | Locate highlight duration. |

## TreePanel Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | No | - | Panel header title. |
| `treeProps` | `TreeProps` | No | - | Props passed to inner `Tree`. |
| `canRenderTree` | `boolean` | No | `true` | Toggle body content between tree and empty state. |
| `emptyState` | `ReactNode` | No | Built-in empty text | Rendered when tree is unavailable. |
| `builtInActions` | `TreePanelBuiltInActions` | No | - | Built-in header/footer action config. |
| `headerActions` | `TreePanelHeaderAction[]` | No | `[]` | Extra header actions. |
| `footerActions` | `TreePanelFooterAction[]` | No | `[]` | Extra footer actions. |
| `className` | `string` | No | - | Panel className. |

### TreePanel: Minimal Example

```tsx
import { TreePanel } from "@/components/views/tree";

<TreePanel
  title="System Model"
  treeProps={{ modelName: "SysModel" }}
/>;
```

### TreePanel: Common Setup Example

```tsx
import { Locate, RotateCcw } from "lucide-react";
import { TreePanel } from "@/components/views/tree";

<TreePanel
  title="System Model"
  treeProps={{
    modelName: "SysModel",
    selectionMode: "multiple",
    searchMode: "local",
    defaultExpandedLevel: 2,
  }}
  builtInActions={{
    locate: {
      onClick: () => console.log("Locate selected"),
      icon: <Locate className="ui-icon-sm" />,
      show: true,
    },
    resetOpenState: {
      onClick: () => console.log("Reset open state"),
      icon: <RotateCcw className="ui-icon-sm" />,
      label: "Reset",
    },
  }}
  headerActions={[
    {
      key: "custom-header",
      icon: <span className="text-xs">H</span>,
      ariaLabel: "Custom header action",
      onClick: () => console.log("Header action"),
    },
  ]}
/>;
```

## SelectTreePanel Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `onChange` | `(value) => void` | Yes | - | Controlled value update callback. |
| `selectionMode` | `"single" \| "multiple"` | Yes | - | Selection behavior for trigger panel. |
| `value` | `ModelReference \| ModelReference[] \| null` | No | - | Controlled selected value(s). |
| `modelName` | `string` | No | - | Query-mode data source. |
| `mockData` | `FlatNode[]` | No | - | Local data source. |
| `treeFilters` | `FilterCondition` | No | - | Query filters for model mode. |
| `treeLimit` | `number` | No | - | Query limit for model mode. |
| `idKey` | `string` | No | `"id"` | Node id field key. |
| `labelKey` | `string` | No | `"name"` | Node label field key. |
| `parentKey` | `string` | No | `"parentId"` | Parent id field key. |
| `disabledKey` | `string` | No | - | Disabled status field key. |
| `sortKey` | `string` | No | - | Sort key for tree build. |
| `defaultExpandedLevel` | `number` | No | - | Forwarded to inner tree. |
| `height` | `number` | No | `360` | Popover tree height. |
| `className` | `string` | No | - | Wrapper className. |
| `placeholder` | `string` | No | `"Select..."` | Trigger placeholder text. |
| `disabled` | `boolean` | No | `false` | Disable trigger and actions. |
| `autoLocateOnOpen` | `boolean` | No | `true` | Auto-locate current selection on open. |
| `destroyOnClose` | `boolean` | No | `true` | Unmount tree panel when popover closes. |
| `searchMode` | `"off" \| "local" \| "server"` | No | `"local"` | Search mode in popover tree. |

### SelectTreePanel: Minimal Example

```tsx
import * as React from "react";
import { SelectTreePanel } from "@/components/views/tree";

export function UserPicker() {
  const [value, setValue] = React.useState(null);

  return (
    <SelectTreePanel
      selectionMode="single"
      modelName="SysUser"
      value={value}
      onChange={setValue}
    />
  );
}
```

### SelectTreePanel: Common Setup Example

```tsx
import * as React from "react";
import { SelectTreePanel } from "@/components/views/tree";
import type { ModelReference } from "@/types/ModelReference";

export function DepartmentPicker() {
  const [value, setValue] = React.useState<ModelReference[] | null>([]);

  return (
    <SelectTreePanel
      selectionMode="multiple"
      modelName="SysDepartment"
      value={value}
      onChange={setValue}
      placeholder="Select departments"
      searchMode="local"
      autoLocateOnOpen
      defaultExpandedLevel={2}
      treeFilters={["enabled", "=", true]}
      idKey="id"
      labelKey="labelName"
      parentKey="parentId"
      height={420}
    />
  );
}
```

## External Control Hooks (Version Props)

`selectionResetVersion`, `collapseAllVersion`, `openStateResetVersion`, and `locateRequestVersion` are edge-triggered counters:

- Keep value stable: no action.
- Increase value: action is executed once.

This avoids remounting and keeps tree interaction state predictable.

## Locate Behavior

When locate is triggered (`locateRequestVersion` increment):

1. Open selected node ancestors (`openParents`).
2. Scroll selected node into view (`scrollTo(..., "center")`).
3. Apply temporary highlight pulse.

Selection and filters are not changed by locate.

## Parent Reference Normalization

In model-query mode, `useTreeModelData` normalizes `parentKey` values:

- If `row[parentKey]` is an object containing an `id` key, it uses that `id`.
- Otherwise it keeps the original value unchanged.

This supports backend payloads where parent may be a `ModelReference` object.

## `TreePanel`

`TreePanel` is a layout wrapper for panel-style tree usage:

- title + header icon actions
- embedded `Tree` body
- footer button actions

`TreePanel` provides `builtInActions` defaults for common operations:

- `locate`
- `clearSelection`
- `collapsePanel`
- `resetOpenState`
- `collapseAll`

Each built-in action can be enabled by passing `onClick`, and can override `show`, `disabled`, `icon`, and text/label fields.

`SideTreePanel` in `ModelTable` now composes this component for shared panel behavior.

## `SelectTreePanel`

`SelectTreePanel` is the reusable tree-selector control built on top of `TreePanel`:

- single/multiple selection
- auto locate on open (`autoLocateOnOpen`, default `true`)
- single mode: click to commit and close
- multiple mode: click to stage, Apply to commit

## Notes

- Ensure values under `idKey` are unique across the loaded dataset.
- In search mode, drag is disabled while search is active.
- When source data changes, local selection and search query are reset.

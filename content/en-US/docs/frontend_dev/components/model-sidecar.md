# ModelSidecar

Auxiliary records attached to each row in a list / board / table view, batch-fetched once and exposed per-record via `RecordContext`.

## Why

It shows up everywhere: a list of envs that wants drift status next to each row; an Employee table that wants leave balance + recent leaves under each row; a Customer board that wants outstanding-AR badges on each card. Naively, the implementation becomes per-card queries (N+1) or page-level custom dashboards.

`ModelSidecar` solves this with **one batched query per sidecar model**, joined by primary id, dispatched to the right card via context — and **never pretends to be a real column**.

## Iron rule

> **Sidecar data does not become a sortable / filterable / exportable column.**
> If users need to sort, filter, or export by it, promote it to a real field — make it part of the primary model (virtual / cascaded / view) so it has a column contract.

Sidecar belongs in two places:

- **Inline accessory** — appended next to an existing field (badges, status indicators).
- **Row expansion (Master-Detail)** — full-width panel beneath the row.

That's it. No third placement.

## Quick start — inline slot in a Board / Card view

Declare sidecars on `<ModelBoard>` / `<ModelCard>` directly. The view derives `primaryIds` from its own records, AND-merges the active workspace filter into each sidecar's `filters`, batches the queries via `useQueries`, and exposes the data to slots inside cards. The toolbar gains a Refresh button that invalidates the main query and every sidecar model.

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";
import {
  SidecarSlot,
  useSidecar,
} from "@/components/views/shared/model-sidecar";

function MyBoardView() {
  return (
    <ModelBoard
      modelName="DesignAppEnv"
      groupBy={{ field: "envType" }}
      sidecars={[
        {
          id: "lastActivity",
          model: "DesignActivity",
          joinField: "envId",
          orders: ["id", "DESC"],
          reduce: "first",
        },
      ]}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
      </ModelBoard.Header>
      <Field fieldName="connectorType" />
      <SidecarSlot
        slotId="lastActivity"
        render={(lastActivity) => (
          <LastActivityRow lastActivity={lastActivity} />
        )}
      />
    </ModelBoard>
  );
}
```

Inside any per-card scope, call `useSidecar` directly when you need to combine multiple slots:

```tsx
function HealthDot() {
  const lastActivity = useSidecar<ActivityRow>("lastActivity");
  return <span className={dotColor(lastActivity)} />;
}
```

## Quick start — Master-Detail in `<ModelTable>`

```tsx
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";
import {
  SidecarStatPanel,
  SidecarTablePanel,
  SidecarListPanel,
} from "@/components/views/shared/model-sidecar";

<ModelTable
  modelName="Employee"
  sidecars={[
    { id: "leaveBalance", model: "LeaveBalance", joinField: "employeeId",
      reduce: "first" },
    { id: "recentLeaves", model: "LeaveRecord", joinField: "employeeId",
      orders: ["startDate", "DESC"], reduce: "all" },
    { id: "recentActivities", model: "EmployeeActivity", joinField: "employeeId",
      orders: ["createdTime", "DESC"], reduce: "all" },
  ]}
  expandChildren={(employee) => (
    <div className="grid gap-3 md:grid-cols-3">
      <SidecarStatPanel
        slotId="leaveBalance"
        label="Leave Balance"
        render={(data) => (
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Annual" value={data?.annualRemaining ?? 0} />
            <Stat label="Sick" value={data?.sickRemaining ?? 0} />
          </dl>
        )}
      />
      <SidecarTablePanel
        slotId="recentLeaves"
        label="Recent Leaves"
        maxRows={5}
        columns={[
          { header: "Type", render: (r) => r.leaveType },
          { header: "Start", render: (r) => formatDate(r.startDate) },
          { header: "Days", render: (r) => r.days, align: "right" },
          { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <SidecarListPanel
        slotId="recentActivities"
        label="Activities"
        maxRows={10}
        renderItem={(row) => <ActivityRow activity={row} />}
      />
    </div>
  )}
>
  <Field fieldName="name" />
  <Field fieldName="department" />
  <Field fieldName="status" />
</ModelTable>
```

`reduce: "all"` defaults `limitSize` to `primaryIds.length * 10`, which fits most "recent N per row" feeds. Override `limitSize` only when the panel intentionally pulls more or fewer rows per primary.

The expanded row spans every column. Each panel decides its own header semantics: `Stat` has none, `Table` auto-renders column headers from your `columns` prop, `List` shows the panel title only.

## API

### `sidecars` prop on `<ModelBoard>` / `<ModelTable>` / `<ModelCard>`

Pass an array of `SidecarConfig`. The view:

1. Derives `primaryIds` from its own rendered records (deduped, in order).
2. AND-merges the active workspace filter into each config's `filters` (skip with `inheritWorkspaceFilter: false`).
3. Wraps the rendered cards / rows in `<ModelSidecarProvider>` so `useSidecar` / `<SidecarSlot>` / panels resolve.
4. For Board / Card: renders a Refresh button on the toolbar that invalidates the primary model and every sidecar model. ModelTable's toolbar refresh is not yet implemented — use `queryClient.invalidateQueries({ queryKey: [model] })` manually if the page needs a refresh affordance.

This is the **default path**. Use it for every list-with-sidecar scenario unless you specifically need direct control.

### `<ModelSidecarProvider>` (low-level)

The standalone provider exists for cases where the view doesn't own the records list (e.g. a custom layout that mixes a primary list with detached panels). You manage `primaryIds` and apply workspace filtering yourself — typically via the exported `applyWorkspaceFilterToSidecars(sidecars, workspaceFilter)` helper.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `primaryIds` | `string[]` | Yes | Ids of the records currently rendered. Empty array → no fetch. |
| `configs` | `SidecarConfig[]` | Yes | One per sidecar slot. Order doesn't matter. |
| `children` | `ReactNode` | Yes | The view the sidecars decorate. |

### `SidecarConfig`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Slot id; must match the `slotId` you read with. |
| `model` | `string` | Sidecar model name. |
| `joinField` | `string` | FK on the sidecar model pointing to a primary id (e.g. `envId`). |
| `filters` | `FilterCondition?` | Extra scope, AND-merged with `[joinField, "IN", primaryIds]`. |
| `orders` | `OrderCondition?` | Sort. For `reduce: "first"`, picks which row wins. |
| `reduce` | `"first" \| "all"` | Singleton or list. See below. |
| `limitSize` | `number?` | Override fetch limit. |
| `inheritWorkspaceFilter` | `boolean?` | When the host view applies the workspace filter (the default behaviour of `<ModelBoard sidecars>` / `<ModelTable sidecars>` / `<ModelCard sidecars>`), set `false` to opt out — useful for cross-workspace lookups (system reference data, etc.). Direct uses of `<ModelSidecarProvider>` ignore this field. |

#### `reduce` semantics

- **`"first"`** → returns `T \| undefined`. Pair with `useSidecar<T>` / `SidecarSlot<T>` / `SidecarStatPanel<T>`. Default `limitSize = primaryIds.length`.
- **`"all"`** → returns `T[]` (always an array; empty when no rows match). Pair with `SidecarTablePanel<T>` / `SidecarListPanel<T>`. Default `limitSize = primaryIds.length * 10`.

For 1:1 joins you can use `"first"` without `orders` — there's only one row anyway.

For high-cardinality 1:N (one primary may have hundreds of children), don't crank `limitSize` indefinitely. **Best-effort batching is not a substitute for top-N-per-group**; do that aggregation in the backend.

### Hooks

```ts
useSidecar<T>(slotId): T | undefined
```

Reads the current record's sidecar value. Resolves the primary id from the surrounding `RecordContext`. Returns `undefined` if no record context, no slot, or primary id not in the prefetched batch. For `reduce: "all"` always returns an array (or `undefined` if no context).

```ts
useSidecarLoading(slotId): boolean
```

Whether the slot's underlying query is still loading.

```ts
useModelSidecarRegistry(): ModelSidecarRegistry
useOptionalModelSidecarRegistry(): ModelSidecarRegistry | null
```

Low-level access. The registry exposes `getChannel(slotId)` and `refetchAll()`. Most consumers shouldn't need this — use the hooks above.

### Slot

```tsx
<SidecarSlot<T>
  slotId="lastActivity"
  render={(data, { isLoading }) => /* … */}
/>
```

A render-prop wrapper around `useSidecar` + `useSidecarLoading`. Use for inline accessories.

### Panels (Master-Detail building blocks)

| Panel | Shape | Reduce | Has column header? |
| --- | --- | --- | --- |
| `SidecarStatPanel<T>` | KV / metrics — single record's worth | `"first"` | No |
| `SidecarTablePanel<T>` | Multi-record × multi-field sub-table | `"all"` | Yes (auto from `columns`) |
| `SidecarListPanel<T>` | Multi-record activity feed | `"all"` | No |

All three accept `label?` (panel title), `emptyText?`, and `className?`.

`SidecarTablePanel` and `SidecarListPanel` accept `maxRows?` (cap rendered rows) and `footer?` (e.g. a "View all (N)" link).

## `<ModelTable expandChildren>`

```tsx
<ModelTable
  modelName="Employee"
  expandChildren={(employee) => /* panels go here */}
>
  …
</ModelTable>
```

When `expandChildren` is set, ModelTable adds a chevron column on the left and renders the returned ReactNode in an extra row beneath each expanded row. The expansion content is wrapped in `RecordContextProvider`, so `useSidecar` / `<SidecarSlot>` / panels inside it work without further setup.

Notes:

- **Virtualization** is automatically disabled when `expandChildren` is provided.
- **Pinned columns** still pin correctly — their `left` offsets are shifted by the chevron column width.
- The expander column is independent of `select` / `actions` columns; they coexist.

## Pitfalls

- **Refresh after mutation.** Sidecar queries are keyed on the sidecar model's name (e.g. `["DesignActivity", …]`). When an action mutates the primary model, the framework's invalidation only touches `[primaryModel, …]` — sidecars don't auto-refetch. The Refresh button on the Board / Card toolbar (auto-rendered when `sidecars` is set) handles this; use it after async actions that update sidecar state. ModelTable's toolbar refresh is not yet wired up — invalidate manually if you need it.
- **Shape mismatch.** If the join field on the sidecar comes back as a `ModelReference` (`{id, displayName}`) the framework's `getModelRefId` handles it. If your backend returns a bare string id on some sidecars and an object on others, normalize at the API layer — don't make the framework guess.
- **Loading flicker.** Sidecar queries fire after the host view's primary records arrive. The first paint of cards will show empty sidecar values; once data arrives, badges fill in. Use `useSidecarLoading(slotId)` if you need to render skeletons.
- **Direct `<ModelSidecarProvider>` use.** When you bypass the host-view integration (rare), you own `primaryIds` referential stability — memoize the array: `useMemo(() => records.map(r => r.id), [records])`. The host views do this for you.

## When to *not* use it

- The auxiliary data already lives on the primary model (e.g. `lastDeployedAt` is a real field). Just use `<Field>`.
- Users need to sort / filter / export by the indicator. Promote to a real field; sidecar isn't the right tool.
- The relation is "look up one specific related record by a known id" rather than "join across a list of primary ids". A normal `useGetByIdQuery` is enough.

## File map

```
ModelSidecarProvider.tsx     # Provider + context + useQueries-based batch fetcher
useSidecar.ts                # useSidecar / useSidecarLoading
SidecarSlot.tsx              # Inline render-prop slot
applyWorkspaceFilter.ts      # Helper used by host-view integrations
panels/
  SidecarPanelShell.tsx      # Shared shell (border / title / loading / empty)
  SidecarStatPanel.tsx       # Metric / KV
  SidecarTablePanel.tsx      # Multi-record sub-table with column headers
  SidecarListPanel.tsx       # Activity feed
types.ts                     # SidecarConfig / SidecarReduce / channel types
```

The `sidecars` prop on `ModelBoard` / `ModelTable` / `ModelCard` is the public surface; everything above is reachable but rarely needed in business code.

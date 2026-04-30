# ModelBoard

Composable Kanban / multi-column board view with:

- metadata-driven card rendering via `RecordContext` (delegated to `ModelCardItem`)
- one-shot main query with **client-side grouping**
- per-column count + per-column "Load more"
- **two column-source modes**: static enum field, or dynamic lookup from another model
- compound-component slot system shared with `ModelCard` (Header / body / Footer / Action)

## Related Docs

- [ModelCard](./card) — card grid view (shares card item rendering, slot layout, action system)
- [ModelTable](./table) — tabular view; pair Board with Table via `<Tabs>` for power-user fallback

## Quick Start — Enum form (static columns)

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export default function VersionsPage() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
      orders={["updatedTime", "DESC"]}
      groupBy={{
        type: "enum",
        field: "status",
        columns: [
          { value: "Draft", label: "Draft" },
          { value: "Sealed", label: "Sealed" },
          { value: "Frozen", label: "Frozen" },
        ],
      }}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
        <Field fieldName="versionType" widgetType="Badge" />
      </ModelBoard.Header>
      <Field fieldName="sealedTime" />
    </ModelBoard>
  );
}
```

Each column corresponds to one `value` in `groupBy.columns`. Records whose
`groupBy.field` value is not in the listed values are dropped.

## Quick Start — Lookup form (dynamic columns)

```tsx
<ModelBoard
  modelName="DesignDeployment"
  initialParams={{ filters: ["appId", "=", appId] }}
  orders={["createdTime", "DESC"]}
  groupBy={{
    type: "lookup",
    sourceModel: "DesignAppEnv",
    sourceFilters: [["appId", "=", appId], "AND", ["active", "=", true]],
    sourceOrders: ["sequence", "ASC"],
    columnIdField: "id",         // env.id → column id
    columnLabelField: "name",    // env.name → column header text
    cardFilterField: "envId",    // deployment.envId → which column
    columnHeaderRender: (env) => <EnvColumnHeader env={env} />,
  }}
>
  <ModelBoard.Header>
    <Field fieldName="targetVersionId" />
    <Field fieldName="deployStatus" widgetType="Badge" />
  </ModelBoard.Header>
  <Field fieldName="startedTime" />
</ModelBoard>
```

The board first queries `sourceModel` to derive columns, then runs the main
query. Each column's filter is `[cardFilterField, "=", columnId]`.

## Data flow

1. Resolve columns:
   - **enum**: synchronously from props.
   - **lookup**: fetch `sourceModel` records via `searchList` (`limitSize = 200`) and map each to a column.
2. **Main bulk fetch** (`searchList`, one call): `limitSize = initialFetchSize` (default 100), filters/orders from props plus the search term. No pagination — bulk read for client-side grouping.
3. **Group in memory**: each main-batch record falls into the column whose `matches` predicate returns true.
4. **Per-column count** (one call total): a single `count` call with `groupBy: [groupByField]` returns counts for every column at once. The board parses array-of-rows or record-map response shapes.
5. **Load more** (`searchPage`, on demand): when a column's `count > rendered`, a "Load more" button appears. Click runs a paged `searchPage` request scoped to that column starting just past the main batch boundary (`floor(baseInColumn / loadMorePageSize) + 1`). Records are appended after deduplicating by id against both the main batch and prior expansions.

## Slot system

`ModelBoard.Header`, top-level body children, `ModelBoard.Footer`, and `Action`
elements follow the same rules as `ModelCard`. See the [ModelCard README](./card#card-slot-declaration) for full details. In short:

| Where defined                | Renders at                                | Effective placement |
| ---------------------------- | ----------------------------------------- | ------------------- |
| Inside `ModelBoard.Header`   | CardHeader right side, always visible     | `"header"`          |
| Top-level body child         | CardContent right side                    | `"inline"`          |
| Either, with `placement="more"` | `...` dropdown (merged with Delete)    | `"more"`            |

`Action` filtering by record condition (`hidden`, `disabled`) works the same as
in `ModelCard` / `ModelTable`.

## Click navigation

Click navigation is constrained to the current route subtree:

1. `linkTo="x"` (or inherited from `<MultiView.Tab>`) → `${pathname}/x/{id}?mode=read`
2. Default — `${pathname}/{id}?mode=read` (current directory's `[id]/page.tsx`)

Free-form click handlers and cross-route URLs are intentionally not supported.
This keeps every record click within the current route's permission scope.

## Pairing with Table view

`ModelBoard` does not include a built-in view toggle. Pages that want a "Board /
Table" switch wrap both views in a `<Tabs>`:

```tsx
<Tabs defaultValue="board">
  <TabsList>
    <TabsTrigger value="board">Board</TabsTrigger>
    <TabsTrigger value="table">Table</TabsTrigger>
  </TabsList>
  <TabsContent value="board">
    <ModelBoard {...props} />
  </TabsContent>
  <TabsContent value="table">
    <ModelTable {...sameQueryProps} />
  </TabsContent>
</Tabs>
```

## Core props

| Prop               | Type                                                         | Required | Default | Notes                                                                                              |
| ------------------ | ------------------------------------------------------------ | -------- | ------- | -------------------------------------------------------------------------------------------------- |
| `modelName`        | `string`                                                     | Yes      | -       | Model name for metadata and data API.                                                              |
| `groupBy`          | `EnumGroupBy \| LookupGroupBy`                               | Yes      | -       | Column source.                                                                                     |
| `labelName`        | `string`                                                     | No       | -       | Page title; defaults to `metaModel.labelName`.                                                     |
| `description`      | `string`                                                     | No       | -       | Subtitle; defaults to `metaModel.description`.                                                     |
| `orders`           | `OrderCondition`                                             | No       | -       | Recommended default sort. Wins over `initialParams.orders` and `MultiView.Tab.orders` (context).   |
| `filters`          | `FilterCondition`                                            | No       | -       | Recommended base filter. Wins over `initialParams.filters` and `MultiView.Tab.filters` (context). AND-merged with workspace/runtime filters. See [precedence](./multi-view#filter--order-precedence). |
| `initialParams`    | `QueryParamsWithoutFields`                                   | No       | -       | Advanced query params. `pageSize` and `fields` are managed internally; for `filters` / `orders`, prefer top-level props. |
| `enableCreate`     | `boolean`                                                    | No       | `true`  | Show Create button in toolbar.                                                                     |
| `enableDelete`     | `boolean`                                                    | No       | `false` | Show `...` delete action on each card.                                                             |
| `initialFetchSize` | `number`                                                     | No       | `100`   | Main query `pageSize`. Records are grouped client-side.                                            |
| `loadMorePageSize` | `number`                                                     | No       | `20`    | Page size for `Load more` requests.                                                                |
| `linkTo`           | `string`                                                     | No       | -       | Subdirectory name (single segment) for click navigation. Goes to `${pathname}/${linkTo}/${id}?mode=read`. Omit for default `${pathname}/${id}?mode=read`. |
| `children`         | `ReactNode`                                                  | No       | -       | `ModelBoard.Header`, `Field` / any node, `ModelBoard.Footer`, `Action` elements.                   |

## When to use Board vs Card vs Table

| View      | Best fit                                                  |
| --------- | --------------------------------------------------------- |
| Table     | Many records, power users, batch operations, exports.     |
| Card      | Visually rich list with no strong grouping dimension.     |
| **Board** | Records have a discrete grouping dimension (status, env, owner, tag) and you want lane-based status at a glance. |

## Drag-and-drop column reassignment

Set `enableDragDrop` to allow cards to be dragged between columns. By default,
on drop the board calls:

```ts
modelService.updateOne(modelName, { id, ...toColumn.movePatch })
```

where `movePatch` re-routes the record to the new column:

- enum form: `{ [groupBy.field]: column.value }` — the option-set code string
- lookup form: `{ [cardFilterField]: column.id }` — the new lookup target id

For business actions that need server-side validation (e.g. version state
machine `Draft → Sealed`), supply a custom `onCardMove` handler instead:

```tsx
<ModelBoard
  modelName="DesignAppVersion"
  enableDragDrop
  onCardMove={async ({ recordId, toColumnId, fromColumnId }) => {
    // Translate Draft→Sealed into the sealVersion operation
    if (fromColumnId === "Draft" && toColumnId === "Sealed") {
      await actionDispatcher.run("sealVersion", recordId);
      return;
    }
    throw new Error(`Move from ${fromColumnId} to ${toColumnId} is not allowed`);
  }}
  groupBy={{ ... }}
>
  ...
</ModelBoard>
```

After a successful move the board invalidates queries under `[modelName, ...]`
so the main list, grouped count and any per-column expansions all re-fetch.

## Limitations (v1)

- No filter / sort dialogs in the toolbar (use the paired `ModelTable` view for those).
- No tabs or side panel filters.
- Lookup source is fetched once with `limitSize = 200`; not paginated. If you have more than 200 candidate columns, pre-filter via `sourceFilters`.
- Grouped count assumes the backend honours `count({ filters, groupBy: [field] })` and returns either a `{value: count}` map or `[{field: value, count: N}, ...]` rows.

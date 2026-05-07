# ModelBoard

Composable Kanban / multi-column board view with:

- metadata-driven card rendering via `RecordContext` (delegated to `ModelCardItem`)
- one-shot main query with **client-side grouping**
- per-column count + per-column "Load more"
- **metadata-driven column source**: `Option` field → option-set; `ManyToOne` / `OneToOne` field → related model
- compound-component slot system shared with `ModelCard` (Header / body / Footer / Action)

## Related Docs

- [ModelCard](./card) — card grid view (shares card item rendering, slot layout, action system)
- [ModelTable](./table) — tabular view; pair Board with Table via `<Tabs>` for power-user fallback

## Quick Start

The only required `groupBy` field is `field` — the record field the board groups by. The board reads its metadata to decide where the columns come from.

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export default function VersionsPage() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
      orders={["updatedTime", "DESC"]}
      groupBy={{ field: "status" }}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
        <Field fieldName="versionType" />
      </ModelBoard.Header>
      <Field fieldName="sealedTime" />
    </ModelBoard>
  );
}
```

`status` is an `Option` field, so the board fetches its option-set and renders one column per item, in the option-set's own order.

## Field metadata drives column source

| `metaField.fieldType`       | Column source                                     | Column id          | Column label                                  | Match predicate                                |
| --------------------------- | ------------------------------------------------- | ------------------ | --------------------------------------------- | ---------------------------------------------- |
| `Option`                    | `useOptionSet(metaField.optionSetCode)`           | `item.itemCode`    | `item.itemName`                               | `getOptionCode(record[field]) === itemCode`    |
| `ManyToOne` / `OneToOne`    | `searchList(metaField.relatedModel)`              | `record.id`        | `record[metaField.relatedField ?? "name"]`    | `getModelRefId(record[field]) === id`          |
| Anything else               | Throws at render. Pass `groupBy.columns` to opt out. | —              | —                                             | —                                              |

`groupBy.sourceFilters` overrides `metaField.filters` for lookup mode. The active workspace filter is always AND-merged on top so the source is scoped to the current app/portfolio.

## Lookup-mode example with custom column header

```tsx
<ModelBoard
  modelName="DesignDeployment"
  orders={["createdTime", "DESC"]}
  groupBy={{
    field: "envId",
    sourceFilters: ["active", "=", true],
    sourceOrders: ["sequence", "ASC"],
    columnHeaderRender: (env) => <EnvColumnHeader env={env} />,
  }}
>
  <ModelBoard.Header>
    <Field fieldName="targetVersionId" />
    <Field fieldName="deployStatus" />
  </ModelBoard.Header>
  <Field fieldName="startedTime" />
</ModelBoard>
```

`envId` is a `ManyToOne` to `DesignAppEnv`; the board fetches the related envs and uses each as a column. `columnHeaderRender` receives the source record (option item in Option mode).

## Data flow

1. Resolve metadata: `useMetadataQuery(modelName)` → look up `metaField` for `groupBy.field`.
2. Resolve columns from the field's metadata:
   - **Option**: fetch option-set via `useOptionSet`. Items are returned in the set's own order.
   - **Lookup**: fetch related-model records via `searchList` (`limitSize = 200`).
3. **Main bulk fetch** (`searchList`, one call): `limitSize = initialFetchSize` (default 100), filters/orders from props plus the search term. No pagination — bulk read for client-side grouping. Gated on column readiness.
4. **Group in memory**: each main-batch record falls into the column whose `matches` predicate returns true.
5. **Per-column count** (one call total): a single `count` call with `groupBy: [field]` returns counts for every column at once. The board parses array-of-rows or record-map response shapes.
6. **Load more** (`searchPage`, on demand): when a column's `count > rendered`, a "Load more" button appears. Click runs a paged `searchPage` request scoped to that column starting just past the main batch boundary (`floor(baseInColumn / loadMorePageSize) + 1`). Records are appended after deduplicating by id against both the main batch and prior expansions.

## Cascaded fields in card body

Body slots accept dot-notation `<Field>` declarations to pull related-record fields onto each card:

```tsx
<ModelBoard modelName="AppEnv" groupBy={{ field: "envType" }}>
  <Field fieldName="name" />
  <Field fieldName="lastDeploymentId.deployStatus" widgetType="StatusIcon" />
  <Field fieldName="lastDeploymentId.finishedTime" widgetType="Relative" />
</ModelBoard>
```

The board walker collects every cascaded path declared at the top level, calls `POST /metadata/resolveCascadedPaths` once per board mount, folds the matching SubQuery into the bulk `searchList` request, and exposes the resolutions to `<Field>` for display rendering. Cascaded paths inside a custom function component (e.g. a sub-component nested in body) are NOT visible to the walker — declare them at the top level. Full reference: [Cascaded Field Path](../fields/fields#cascaded-field-path-display).

## Slot system

`ModelBoard.Header`, top-level body children, `ModelBoard.Footer`, and `Action` elements follow the same rules as `ModelCard`. See the [ModelCard README](./card#card-slot-declaration) for full details. In short:

| Where defined                | Renders at                                | Effective placement |
| ---------------------------- | ----------------------------------------- | ------------------- |
| Inside `ModelBoard.Header`   | CardHeader right side, always visible     | `"header"`          |
| Top-level body child         | CardContent right side                    | `"inline"`          |
| Either, with `placement="more"` | `...` dropdown (merged with Delete)    | `"more"`            |

`Action` filtering by record condition (`hidden`, `disabled`) works the same as in `ModelCard` / `ModelTable`.

## Click navigation

Click navigation is constrained to the current route subtree:

1. `linkTo="x"` (or inherited from `<MultiView.Tab>`) → `${pathname}/x/{id}?mode=read`
2. Default — `${pathname}/{id}?mode=read` (current directory's `[id]/page.tsx`)

Free-form click handlers and cross-route URLs are intentionally not supported. This keeps every record click within the current route's permission scope.

## Pairing with Table view

`ModelBoard` does not include a built-in view toggle. Pages that want a "Board / Table" switch wrap both views in a `<Tabs>`:

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
| `groupBy`          | `ModelBoardGroupBy`                                          | Yes      | -       | At minimum `{ field }`. See [Field metadata drives column source](#field-metadata-drives-column-source). |
| `labelName`        | `string`                                                     | No       | -       | Page title; defaults to `metaModel.labelName`.                                                     |
| `description`      | `string`                                                     | No       | -       | Subtitle; defaults to `metaModel.description`.                                                     |
| `orders`           | `OrderCondition`                                             | No       | -       | Recommended default sort. Wins over `initialParams.orders` and `MultiView.Tab.orders` (context).   |
| `filters`          | `FilterCondition`                                            | No       | -       | Recommended base filter. Wins over `initialParams.filters` and `MultiView.Tab.filters` (context). AND-merged with workspace/runtime filters. See [precedence](./multi-view#filter--order-precedence). |
| `initialParams`    | `QueryParamsWithoutFields`                                   | No       | -       | Advanced query params. `pageSize` and `fields` are managed internally; for `filters` / `orders`, prefer top-level props. |
| `enableCreate`     | `boolean`                                                    | No       | `true`  | Show Create button in toolbar.                                                                     |
| `enableColumnCreate` | `boolean`                                                  | No       | `false` | Show a "+" button in each column header. Navigates to `${pathname}/new?{groupBy.field}={column.id}`; the receiving form pre-fills the column's value. See [Per-column Create](#per-column-create). |
| `enableDelete`     | `boolean`                                                    | No       | `false` | Show `...` delete action on each card.                                                             |
| `initialFetchSize` | `number`                                                     | No       | `100`   | Main query `pageSize`. Records are grouped client-side.                                            |
| `loadMorePageSize` | `number`                                                     | No       | `20`    | Page size for `Load more` requests.                                                                |
| `disableLoadMore`  | `boolean`                                                    | No       | `false` | Hide the per-column "Load more" button even when `count > rendered`. Use when the backend cannot paginate by `groupBy.field`; column count still reflects the true total. |
| `enableDragDrop`   | `boolean`                                                    | No       | `false` | Enable drag-and-drop reassignment between columns. See [Drag-and-drop column reassignment](#drag-and-drop-column-reassignment). |
| `onCardMove`       | `(ctx: CardMoveContext) => void \| Promise<void>`            | No       | -       | Custom move handler invoked instead of the default `updateOne` when a card is dropped on a different column. |
| `linkTo`           | `string`                                                     | No       | -       | Subdirectory name (single segment) for click navigation. Goes to `${pathname}/${linkTo}/${id}?mode=read`. Omit for default `${pathname}/${id}?mode=read`. |
| `sidecars`         | `SidecarConfig[]`                                            | No       | -       | Auxiliary records joined to each card by primary id. Adds a Refresh button to the toolbar that invalidates the main query and every sidecar model. See [ModelSidecar](../components/model-sidecar). |
| `children`         | `ReactNode`                                                  | No       | -       | `ModelBoard.Header`, `Field` / any node, `ModelBoard.Footer`, `Action` elements.                   |

## `groupBy` props

| Prop                  | Type                                              | Required | Default                                | Notes |
| --------------------- | ------------------------------------------------- | -------- | -------------------------------------- | ----- |
| `field`               | `string`                                          | Yes      | -                                      | Record field to group by. Its metadata picks the column source. |
| `sourceFilters`       | `FilterCondition`                                 | No       | `metaField.filters` if present         | Lookup mode only. AND-merged with workspace filter. |
| `sourceOrders`        | `OrderCondition`                                  | No       | -                                      | Lookup mode only. Option mode trusts the option-set's own order. |
| `columns`             | `{ value, label }[]`                              | No       | derived from metadata                  | Bypass metadata-driven resolution. Useful for narrowing or relabelling. |
| `columnHeaderRender`  | `(source: Record<string, unknown>) => ReactNode`  | No       | -                                      | Receives the option item (Option mode) or source record (lookup mode). Not invoked when `columns` is passed explicitly. |

## Per-column Create

Set `enableColumnCreate` to surface a "+" button in each column header. Clicking it navigates to `${pathname}/new?{groupBy.field}={column.id}`. `ModelForm` reads URL query params on the new-mode route and merges any matching field names into the form's default values:

| `metaField.fieldType`              | Coercion from query string |
| ---------------------------------- | -------------------------- |
| `String`, `Option`, `Date`, `DateTime`, `Time` | passthrough as string      |
| `Boolean`                          | `value === "true"`         |
| `Integer`, `Long`, `Double`, `BigDecimal` | `Number(value)` (skipped if NaN) |
| `ManyToOne`, `OneToOne`            | `{ id: value }` (display name resolved by the widget when needed) |
| Other                              | ignored                    |

URL params win over `defaultValues` and workspace defaults so an explicit "+ Dev" click reflects the user's intent. Editing routes ignore search-param defaults — they only apply in new mode.

This is opt-in for now: state-machine boards (Draft → Sealed → Frozen) usually don't want a per-column "+", so leave `enableColumnCreate` at its `false` default unless the columns model genuinely creatable categories (env type, owner, etc.).

## When to use Board vs Card vs Table

| View      | Best fit                                                  |
| --------- | --------------------------------------------------------- |
| Table     | Many records, power users, batch operations, exports.     |
| Card      | Visually rich list with no strong grouping dimension.     |
| **Board** | Records have a discrete grouping dimension (status, env, owner, tag) and you want lane-based status at a glance. |

## Drag-and-drop column reassignment

Set `enableDragDrop` to allow cards to be dragged between columns. By default, on drop the board calls:

```ts
modelService.updateOne(modelName, { id, [groupBy.field]: column.id })
```

`column.id` is the option `itemCode` (Option mode) or the related record's primary key (lookup mode).

For business actions that need server-side validation (e.g. version state machine `Draft → Sealed`), supply a custom `onCardMove` handler instead:

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
  groupBy={{ field: "status" }}
>
  ...
</ModelBoard>
```

After a successful move the board invalidates queries under `[modelName, ...]` so the main list, grouped count and any per-column expansions all re-fetch.

## Limitations (v1)

- No filter / sort dialogs in the toolbar (use the paired `ModelTable` view for those).
- No tabs or side panel filters.
- Lookup source is fetched once with `limitSize = 200`; not paginated. If you have more than 200 candidate columns, narrow via `groupBy.sourceFilters`.
- Grouped count assumes the backend honours `count({ filters, groupBy: [field] })` and returns either a `{value: count}` map or `[{field: value, count: N}, ...]` rows.

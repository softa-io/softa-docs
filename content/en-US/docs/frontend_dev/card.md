# ModelCard

Composable card grid view with:

- metadata-driven card rendering via `RecordContext`
- server-side paginated query
- toolbar search / filter / sort controls
- optional side panel filter (SideTree, SideCard, SideList)
- per-card delete action
- click navigation (default ModelForm, static href, dynamic href, custom callback)

## Related Docs

- [ModelTable](../table) — table grid view (shared toolbar dialogs, side panel, and data hooks)
- [ModelForm](../form) — detail form opened by default card click
- [Action](../../actions) — action system (used in side panels)
- [Field](../../fields) — field widgets rendered inside cards via `RecordContext`

## Quick Start

```tsx
import { Field } from "@/components/fields";
import { ModelCard } from "@/components/views/card";

export default function DesignAppPage() {
  return (
    <ModelCard modelName="DesignApp" enableDelete href="/studio/workbench">
      <ModelCard.Header>
        <Field fieldName="appName" />
      </ModelCard.Header>
      <Field fieldName="appCode" />
      <Field fieldName="appType" />
      <Field fieldName="status" />
      <ModelCard.Footer>
        <Field fieldName="updatedTime" />
      </ModelCard.Footer>
    </ModelCard>
  );
}
```

## Card Slot Declaration

`ModelCard` uses a compound component pattern for slot extraction. Direct children are categorized as:

| Slot               | Component           | Renders at              |
| ------------------ | ------------------- | ----------------------- |
| Header             | `ModelCard.Header`  | Card header area        |
| Body (default)     | `Field` / any child | Card content area       |
| Footer             | `ModelCard.Footer`  | Card footer area        |
| Side Panel         | `SideTree` / `SideCard` / `SideList` | Left side panel |

Children that are not wrapped in `ModelCard.Header` or `ModelCard.Footer` are rendered as body content. `Field` components inside any slot render in display mode via `RecordContext` — the same mechanism used by `SideCard`.

Example with all slots:

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
  <Field fieldName="portfolioId" />
  <Field fieldName="appType" />
  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## Click Navigation

Card click behavior is resolved in priority order:

1. **`onCardClick`** — custom callback, full control
2. **`href`** — route navigation (string or function)
3. **Default** — opens ModelForm in read mode (`/current-path/{id}?mode=read`)

### Static Route

Use a plain string when all cards navigate to the same destination:

```tsx
<ModelCard modelName="DesignApp" href="/studio/workbench">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

### Dynamic Route

Use a function when the route depends on the record id:

```tsx
<ModelCard modelName="DesignApp" href={(id) => `/studio/design-app/${id}`}>
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

The function receives `(id: string, record: Record<string, unknown>)`, so you can also build routes from record fields:

```tsx
<ModelCard
  modelName="DesignApp"
  href={(id, record) => `/studio/${record.appType}/${id}`}
>
  ...
</ModelCard>
```

### Custom Callback

For non-navigation actions (open dialog, set state, etc.):

```tsx
<ModelCard
  modelName="DesignApp"
  onCardClick={(id, record) => {
    console.log("selected:", id, record);
  }}
>
  ...
</ModelCard>
```

### Default (ModelForm)

When neither `href` nor `onCardClick` is provided, clicking a card navigates to the ModelForm detail page in read mode — the same behavior as clicking a row in `ModelTable`:

```tsx
// Clicking card with id "abc" navigates to /studio/design-app/abc?mode=read
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## Delete Action

When `enableDelete={true}`, each card shows a `...` menu on hover with a "Delete" option. Clicking it triggers a confirmation dialog, then calls the delete API and refreshes the card grid.

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## Side Panel

`ModelCard` supports the same side panel components as `ModelTable`. Declare one side panel as a direct child:

```tsx
import { SideTree } from "@/components/views/shared/side-panel/SideTree";

<ModelCard modelName="DesignApp" enableDelete>
  <SideTree
    title="Portfolio"
    modelName="DesignPortfolio"
    filterField="portfolioId"
    labelField="name"
    parentField="parentId"
    selectionMode="single"
  />
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
  <Field fieldName="status" />
</ModelCard>
```

Side panel behavior is identical to `ModelTable`:

- Selection builds filter conditions merged with `AND`
- Fixed width 280px
- Supports `SideTree`, `SideCard`, `SideList`
- Active tree filter is shown as a badge in the toolbar active state bar

See [ModelTable Side Panel](../table/README.md#side-panel-optional) for full side panel prop reference.

## Tabs

`ModelCard` supports the same `tabs` prop as `ModelTable`:

```tsx
import type { ModelTableTab } from "@/components/views/table/types/types";

const tabs: ModelTableTab[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active", filter: ["status", "=", "Active"] },
  { id: "draft", label: "Draft", filter: ["status", "=", "Draft"] },
];

<ModelCard modelName="DesignApp" tabs={tabs}>
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="status" />
</ModelCard>
```

## Grid Layout

Cards render in a responsive CSS Grid:

| Screen       | Default Columns |
| ------------ | --------------- |
| `< sm`       | 1               |
| `sm` – `lg`  | 2               |
| `lg` – `xl`  | 3               |
| `>= xl`      | 4               |

Override with the `columns` prop:

```tsx
<ModelCard modelName="DesignApp" columns={3}>
  ...
</ModelCard>
```

## Toolbar

The card toolbar is a simplified subset of `ModelTable`'s toolbar:

| Feature       | ModelCard | ModelTable |
| ------------- | --------- | ---------- |
| Search        | Yes       | Yes        |
| Filter dialog | Yes       | Yes        |
| Sort dialog   | Yes       | Yes        |
| Create button | Yes       | Yes        |
| Columns       | -         | Yes        |
| Group         | -         | Yes        |
| Bulk Edit     | -         | Yes        |
| Import/Export | -         | Yes        |
| Row Selection | -         | Yes        |

Active filter/sort states are shown as clearable badges below the toolbar.

## Core Props

| Prop          | Type                                                          | Required | Default | Notes                                                                                                        |
| ------------- | ------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `modelName`   | `string`                                                      | Yes      | -       | Model name for metadata and data API.                                                                        |
| `orders`      | `OrderCondition`                                              | No       | -       | Default sort. Supports single `["field", "DESC"]` or multi `[["a", "ASC"], ["b", "DESC"]]`.                 |
| `initialParams` | `QueryParamsWithoutFields`                                  | No       | -       | Advanced initial query settings (`filters`, `pageSize`, etc.).                                               |
| `children`    | `ReactNode`                                                   | No       | -       | `ModelCard.Header`, `Field`, `ModelCard.Footer`, and one optional side panel.                                |
| `enableCreate`| `boolean`                                                     | No       | `true`  | Show Create button in toolbar.                                                                               |
| `enableDelete`| `boolean`                                                     | No       | `false` | Show `...` delete action on each card.                                                                       |
| `tabs`        | `ModelTableTab[]`                                             | No       | -       | Tab filter definitions.                                                                                      |
| `pageSize`    | `number`                                                      | No       | `20`    | Server-side page size.                                                                                       |
| `columns`     | `number`                                                      | No       | -       | Fixed grid columns (1–6). Default is responsive.                                                             |
| `href`        | `string \| ((id: string, record: Record<string, unknown>) => string)` | No | -   | Click navigation. String for static route, function for dynamic route.                                       |
| `onCardClick` | `(id: string, record: Record<string, unknown>) => void`       | No       | -       | Custom click handler. Takes priority over `href`.                                                            |

## Filter Merge Behavior

Same as `ModelTable`. Runtime filters are merged with `AND`:

- base filter (`initialParams.filters`)
- active tab filter
- side panel filter
- search filter (`["searchName", "CONTAINS", keyword]`)
- toolbar condition filter

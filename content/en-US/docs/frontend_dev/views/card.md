# ModelCard

Composable card grid view with:

- metadata-driven card rendering via `RecordContext`
- server-side paginated query
- toolbar search / filter / sort controls
- optional side panel filter (SideTree, SideCard, SideList)
- per-card delete action
- click navigation to record detail (constrained to current route subtree via `linkTo`)

## Related Docs

- [ModelTable](./table) — table grid view (shared toolbar dialogs, side panel, and data hooks)
- [ModelForm](./form) — detail form opened on card click
- [Action](../actions) — action system (used in side panels)
- [Field](../fields/fields) — field widgets rendered inside cards via `RecordContext`

## Quick Start

```tsx
import { Field } from "@/components/fields";
import { ModelCard } from "@/components/views/card";

export default function DesignAppPage() {
  return (
    <ModelCard modelName="DesignApp" enableDelete>
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
| Actions            | `Action`            | Inferred from position (see below) |
| Side Panel         | `SideTree` / `SideCard` / `SideList` | Left side panel — see [Side Panel](../components/side-panel) |

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

## Actions

`ModelCard` supports `Action` components for per-card operations. Placement is inferred from **where the `Action` is defined** in the JSX tree — not from the `placement` prop.

| Where defined              | Rendered at                                  | Effective placement |
| -------------------------- | -------------------------------------------- | ------------------- |
| Inside `ModelCard.Header`  | CardHeader right side, always visible        | `"header"`          |
| Top-level body child       | CardContent right side                       | `"inline"`          |
| Either, with `placement="more"` | `...` dropdown (merged with Delete)   | `"more"`            |

The explicit `placement` prop is only consulted to detect `"more"`. For `"header"` and `"inline"`, position in the tree takes precedence.

### Header actions

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      type="link"
      labelName="Edit"
      href="/studio/app/{id}/workbench"
    />
  </ModelCard.Header>
</ModelCard>
```

`Action` components inside `ModelCard.Header` render as `outline` buttons in the card header, to the right of the slot content.

### Inline (body) actions

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="status" />
  <Action
    labelName="Publish"
    operation="publish"
    confirmMessage="Publish this app?"
  />
</ModelCard>
```

Top-level `Action` children (not inside a slot wrapper) render to the right of the body content area.

### Dropdown (more) actions

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      labelName="Archive"
      operation="archive"
      placement="more"
    />
  </ModelCard.Header>
</ModelCard>
```

`placement="more"` routes the action into the `...` hover dropdown. When `enableDelete` is also set, the Delete option is appended at the bottom of the same dropdown (with a separator).

### Link actions with string template interpolation

String `href` values support `{placeholder}` template variables. Supported placeholders:

| Placeholder       | Resolves to                              |
| ----------------- | ---------------------------------------- |
| `{id}`            | Current record ID                        |
| `{modelName}`     | Model name of the card                   |
| `{anyFieldName}`  | Value of that field from the record      |

```tsx
// Record ID
<Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />

// Any record field
<Action type="link" labelName="Open" href="/studio/{appCode}/workbench" />

// Multiple placeholders
<Action type="link" labelName="Open" href="/studio/app/{id}/version/{currentVersion}" />
```

Use the function form when you need conditional logic:

```tsx
<Action
  type="link"
  labelName="Open"
  href={({ id }) => `/studio/app/${id}/workbench`}
/>
```

### Combined example

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    {/* → outline button in CardHeader */}
    <Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />
    {/* → ... dropdown */}
    <Action type="default" labelName="Archive" operation="archive" placement="more" />
  </ModelCard.Header>

  <Field fieldName="status" />
  {/* → inline button in CardContent */}
  <Action type="default" labelName="Publish" operation="publish" />

  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## Click Navigation

Card click behavior is constrained to the current route subtree:

1. `linkTo="x"` (or inherited from `<MultiView.Tab>`) → `${pathname}/x/{id}?mode=read`
2. Default — `${pathname}/{id}?mode=read` (current directory's `[id]/page.tsx`)

`linkTo` must be a single subdirectory name matching `/^[a-zA-Z0-9_-]+$/`.
Free-form click handlers and cross-route URLs are intentionally not supported
on `ModelCard` — keeping click targets within the current route subtree
aligns with permission boundaries.

### Default

```tsx
// Clicking card with id "abc" navigates to ${pathname}/abc?mode=read
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

### With `linkTo` (subdirectory)

When the detail page lives one segment deeper (typical inside a `MultiView`):

```tsx
// Clicking card with id "abc" navigates to ${pathname}/edit/abc?mode=read
<ModelCard modelName="DesignApp" linkTo="edit">
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
- All side panel components support `remoteSearch` prop to switch from client-side filtering to server-side search

See [ModelTable Side Panel](./table#side-panel-optional) for full side panel prop reference.

## Tab filters

`ModelCard` itself does not have a `tabs` prop. For tab-based filter switching
(or mixed view kinds), wrap the card grid in `<MultiView>` — see
[MultiView](./multi-view).

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
| `labelName`   | `string`                                                      | No       | -       | Overrides the page title in the header. Defaults to `metaModel.labelName`.                                   |
| `description` | `string`                                                      | No       | -       | Overrides the subtitle in the header. Defaults to `metaModel.description`.                                   |
| `orders`      | `OrderCondition`                                              | No       | -       | Recommended default sort. Wins over `initialParams.orders` and `MultiView.Tab.orders` (context).            |
| `filters`     | `FilterCondition`                                             | No       | -       | Recommended base filter. Wins over `initialParams.filters` and `MultiView.Tab.filters` (context). AND-merged with workspace/runtime filters. See [precedence](./multi-view#filter--order-precedence). |
| `initialParams` | `QueryParamsWithoutFields`                                  | No       | -       | Advanced initial query settings (`pageSize`, etc.). For `filters` / `orders`, prefer top-level props.        |
| `children`    | `ReactNode`                                                   | No       | -       | `ModelCard.Header`, `Field`, `ModelCard.Footer`, and one optional side panel.                                |
| `enableCreate`| `boolean`                                                     | No       | `true`  | Show Create button in toolbar.                                                                               |
| `enableDelete`| `boolean`                                                     | No       | `false` | Show `...` delete action on each card.                                                                       |
| `pageSize`    | `number`                                                      | No       | `20`    | Server-side page size.                                                                                       |
| `columns`     | `number`                                                      | No       | -       | Fixed grid columns (1–6). Default is responsive.                                                             |
| `linkTo`      | `string`                                                      | No       | -       | Subdirectory name (single segment) for click navigation. Goes to `${pathname}/${linkTo}/${id}?mode=read`. Omit for default `${pathname}/${id}?mode=read`. |

## Filter Merge Behavior

Same as `ModelTable`. Runtime filters are merged with `AND`:

- base filter (`initialParams.filters`)
- active tab filter
- side panel filter
- search filter (`["searchName", "CONTAINS", keyword]`)
- toolbar condition filter

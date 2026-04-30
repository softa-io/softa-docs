# MultiView

**Category:** Page composer — **not** a data view. MultiView wraps a single
`page.tsx` in a shared header + tab bar; it doesn't render data itself, it
**composes** other views (Model\* / custom dashboards / etc.) into a
tabbed page.

| Layer | Scope | Examples |
| ----- | ----- | -------- |
| App shell | Whole application | `Header` / `Sidebar` (in [layout/](../layout)) |
| **Page composer (this)** | One `page.tsx` | **`MultiView`** |
| Data view | One dataset | `ModelTable` / `ModelBoard` / `ModelCard` / `ModelForm` |

See [Index](../index) for the full layered taxonomy.

What MultiView gives you:

- shared header (title + description + tab pills) rendered by MultiView
- per-tab `view` is a component reference — a `ComponentType` that renders the tab body
- per-tab `filters` and `orders` injected into inner Model\* views via React Context
- active tab synced to `?tab=<id>` automatically (browser back/forward works)
- full state isolation across tabs (each tab unmounts and remounts on switch)
- model-agnostic: MultiView itself does not fetch metadata; each inner view owns its own model

## Related Docs

- [ModelTable](./table) — tabular view, used as a tab `view`
- [ModelBoard](./board) — Kanban view, used as a tab `view`
- [ModelCard](./card) — card grid view, used as a tab `view`

## Quick Start

Each tab body is extracted into its own `<view-kind>-view.tsx` file (e.g.
`board-view.tsx`, `table-view.tsx`) that exports a component. The page
composes them via MultiView:

```tsx
// design-app-version/board-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export function BoardView() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
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

```tsx
// design-app-version/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="DesignAppVersion">
      <Field fieldName="name" />
      <Field fieldName="status" />
      <Field fieldName="sealedTime" />
      <Field fieldName="updatedTime" />
    </ModelTable>
  );
}
```

```tsx
// design-app-version/page.tsx
"use client";
import { MultiView } from "@/components/views/multi-view";

import { BoardView } from "./board-view";
import { TableView } from "./table-view";

export default function DesignAppVersionPage() {
  return (
    <MultiView labelName="Design App Version">
      <MultiView.Tab
        id="board"
        label="Board"
        orders={["updatedTime", "DESC"]}
        view={BoardView}
      />
      <MultiView.Tab id="table" label="Table" view={TableView} />
    </MultiView>
  );
}
```

`labelName` is the page title text shown in the header. MultiView is
model-agnostic and does not fetch metadata — pass title text directly. Each
view component reads `filters` / `orders` / `linkTo` / `embedded` from
`useMultiViewContext()` (Model\* views do this internally).

The active tab id is automatically synced to `?tab=<id>`. First visit reads
the URL on mount; clicking a tab updates the URL via `router.push` (so
browser back/forward navigates between tabs). No opt-in flag needed.

## Concepts

### Tab `view` is a `ComponentType`

`view` is a **component reference** (not an element). MultiView instantiates
it as `<view />` when its tab is active. The component:

- typically wraps a single Model\* view (`ModelTable` / `ModelBoard` /
  `ModelCard`) — those Model\* components read `orders` / `filters` from the
  active tab via context
- can be any other component (custom dashboard, chart, third-party) —
  rendered as-is

`MultiView.Tab` does not accept `children`. Everything that belongs to the
tab body lives inside the view component. View-specific props (`groupBy`,
`columns`, etc.) stay on the inner Model\* element where they belong.

### Per-tab `filters` and `orders`

`filters` and `orders` declared on `MultiView.Tab` are exposed via React
Context. A Model\* element inside the tab's view component will pick them up
automatically:

```tsx
// sys-model/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="SysModel">
      <Field fieldName="modelName" />
      <Field fieldName="labelName" />
      {/* ... */}
    </ModelTable>
  );
}
```

```tsx
// sys-model/page.tsx
<MultiView labelName="Sys Model">
  <MultiView.Tab
    id="all"
    label="All"
    orders={["modelName", "ASC"]}
    view={TableView}
  />
  <MultiView.Tab
    id="timeline"
    label="Timeline Model"
    orders={["modelName", "ASC"]}
    filters={[["timeline", "=", true]]}
    view={TableView}
  />
</MultiView>
```

The same `TableView` component is reused across both tabs. Filters / orders
differ per tab via context; the body remounts on switch via `key={active.id}`.

For full precedence rules (within a layer + across layers), see
[Filter & order precedence](#filter--order-precedence) below.

### Different models per tab

Each view component provides its own `modelName` on its inner Model\*
element, so different tabs may show different models. Pair this with per-tab
`linkTo` so each tab's row clicks navigate to the correct detail subdirectory:

```tsx
// app-overview/page.tsx
import { VersionsView } from "./versions/table-view";
import { EnvsView } from "./envs/table-view";

<MultiView labelName="App Overview">
  <MultiView.Tab
    id="versions"
    label="Versions"
    linkTo="versions"   // row click → ./versions/{id}?mode=read
    view={VersionsView}
  />
  <MultiView.Tab
    id="envs"
    label="Environments"
    linkTo="envs"       // row click → ./envs/{id}?mode=read
    view={EnvsView}
  />
</MultiView>

// File structure:
//   /studio/app/[appId]/app-overview/page.tsx              ← MultiView
//   /studio/app/[appId]/app-overview/versions/table-view.tsx
//   /studio/app/[appId]/app-overview/versions/[id]/page.tsx
//   /studio/app/[appId]/app-overview/envs/table-view.tsx
//   /studio/app/[appId]/app-overview/envs/[id]/page.tsx
```

The shared header (title + description) is page-level text — it is not
derived from any model's metadata. Pass `labelName` / `description` directly.

### Click navigation (`linkTo`)

By default, clicking a record navigates to `${pathname}/${id}?mode=read` —
the current directory's `[id]/page.tsx`. This works for single-model pages
where the detail page lives directly under the list.

For multi-model MultiView (or any case where the detail page lives in a
subdirectory), use `linkTo` to specify the subdirectory name:

| Where set                          | Effect                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| `<MultiView.Tab linkTo="x">`       | Propagated to the active view via context.                      |
| `<ModelTable linkTo="x">` (etc.)   | Used directly. Wins over the Tab-level value if both are set.   |
| Omitted everywhere                 | Default: `${pathname}/${id}?mode=read`.                         |

`linkTo` must be a **single subdirectory name** matching `/^[a-zA-Z0-9_-]+$/`
(no slashes, no `..`, no leading dot). Invalid values fall back to the
default and emit a `console.warn` in development.

This constraint is intentional: click navigation always stays within the
current route subtree, aligned with permission boundaries. Free-form click
handlers and cross-route URLs are not supported on Model\* views — if you
genuinely need that, the page-level click can be implemented around the view
(not on it).

### Custom (non-model) views

Any component works. Custom views ignore the context and render as-is:

```tsx
import { EnvDashboard } from "./components/env-dashboard";
import { TableView } from "./table-view";

<MultiView labelName="Design App Env">
  <MultiView.Tab id="dashboard" label="Dashboard" view={EnvDashboard} />
  <MultiView.Tab
    id="table"
    label="Table"
    orders={["sequence", "ASC"]}
    view={TableView}
  />
</MultiView>
```

The shared header is owned by `MultiView`. If your custom view also renders
a title block, gate it on `useMultiViewContext()?.embedded` to avoid a
double header:

```tsx
import { useMultiViewContext } from "@/components/views/multi-view";
import { ViewTitle } from "@/components/views/shared/ViewTitle";

export function EnvDashboard() {
  const isEmbedded = !!useMultiViewContext()?.embedded;
  return (
    <div className="flex h-full flex-col">
      {!isEmbedded && (
        <div className="border-b border-border/60" style={{ padding: "var(--ui-page-padding)" }}>
          <ViewTitle labelName="Design App Env" />
        </div>
      )}
      {/* dashboard body — refresh button, cards, etc. */}
    </div>
  );
}
```

### URL sync

Active tab id is always synced to `?tab=<id>`:

- on mount, the URL value is read; if it matches a known tab id it becomes the
  initial active tab. Otherwise the first declared tab wins.
- on tab click, the active id is pushed via `router.push` so each switch
  creates a history entry — browser back / forward navigate between tabs.
- on external URL changes (back / forward), the active tab updates to match.

Multiple `MultiView`s on the same page share the `?tab` param. If their tab
ids are disjoint (e.g. `board` / `table` for one, `dashboard` / `chart` for
another), they coexist cleanly — each ignores values it does not recognise.

### Tab switching and caching

Switching tabs unmounts the previous view (`key={active.id}` on the body) and
mounts the new one. Inner Model\* views re-initialize their query hooks.
Whether a network call fires depends on TanStack Query caching:

| Query type                            | `staleTime` | Behavior across tab switches                                                                  |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Metadata (`useMetadataQuery`)         | `Infinity`  | Cached forever per modelName. Each model's metadata is fetched at most once per page lifecycle. |
| List / count / lookup (data queries)  | 5 minutes   | First activation of each tab fires a network call (different `filters` / `orders` → different queryKey → independent cache entries). Re-activating the same tab within 5 minutes is a cache hit (no network, instant render). After 5 minutes, the cache returns immediately and refetches in the background. |

Defaults are configured globally in `query-provider.tsx`. Tab switching does
not coalesce or share toolbar state across tabs in v1; each tab gets fresh
state on mount.

### Tab state isolation

Switching tabs unmounts the previous view and mounts the new one. Toolbar
filter, sort, search, pagination, and selection all reset on switch. There is
no shared state across tabs in v1. The `key={active.id}` remount makes this
guaranteed even when two tabs share the same view component (sys-model,
sys-field).

## Filter & order precedence

`filters` and `orders` show up at multiple layers — knowing when they
**override** vs when they **merge** is important.

### Three layers

| Layer | Sources | Role |
| ----- | ------- | ---- |
| **A. Developer-declared** | `ModelTable.filters` / `ModelTable.initialParams.filters` / `MultiView.Tab.filters` (context) | Page-level base condition |
| **B. System scope** | `workspaceFilter` from `useWorkspaceFilter()` | Forced data isolation (security boundary) |
| **C. User runtime** | Search input, column filters, toolbar filters, side panel selection | Live narrowing on the page |

### Filters: within Layer A → override; across layers → AND

**Within Layer A** (pick first non-undefined, no merge):

```
top-level filters  >  initialParams.filters  >  MultiView.Tab.filters (context)
```

If `<ModelTable filters={X}>` is rendered inside `<MultiView.Tab filters={Y}>`,
the effective base is `X` — `Y` is **overridden**, not AND-merged. Override
semantics avoid surprising "both filters silently combined" behavior.

**Across layers** (everything AND-merged):

```
finalFilter = (Layer A: chosen base)
        AND  (Layer B: workspaceFilter)
        AND  (Layer C: tree filter, search, column filters, toolbar filters)
```

Each layer adds its own constraint; the final query satisfies them all. This
is implemented in `buildModelTableFilterCondition`.

### Orders: within Layer A → override; user runtime → replacement

```
Within Layer A (pick first non-undefined):
  top-level orders  >  initialParams.orders  >  MultiView.Tab.orders (context)
                                              ↓
                                  (seeds initial sort state)
                                              ↓
At runtime (replacement, not merge):
  user toolbar sort  >  column header click sort
  (whichever the user touches replaces the previous sort entirely)
```

`workspaceFilter` does not participate in orders (it is a row-visibility
constraint, not a sort hint).

Why "replacement" and not "merge" at runtime? Sort always has a single
effective ordering (a list of priorities is still one ordering). When the
user picks a new sort, they are changing their mind, not adding constraints —
the previous sort is replaced.

### Common pitfall — Tab `filters` does NOT merge with inner `filters`

```tsx
// ❌ Probably not what you want
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// where SomeTable does:
<ModelTable filters={[["status", "=", "Live"]]} />
// Effective base filter:  [["status", "=", "Live"]]
// (Tab's [["active","=",true]] is overridden — NOT AND-merged)

// ✅ Don't redeclare on inner ModelTable; let Tab's filter pass through
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// where SomeTable does:
<ModelTable />
// Effective base filter:  [["active", "=", true]]

// ✅ Or write the AND explicitly
<ModelTable filters={[
  ["active", "=", true], "AND", ["status", "=", "Live"]
]} />
```

## API

### `<MultiView>` props

| Prop          | Type        | Required | Default                  | Notes                                                                |
| ------------- | ----------- | -------- | ------------------------ | -------------------------------------------------------------------- |
| `labelName`   | `string`    | No       | -                        | Title text in the shared header.                                     |
| `description` | `string`    | No       | -                        | Subtitle text in the shared header.                                  |
| `className`   | `string`    | No       | `"flex h-full flex-col"` | Outer wrapper className.                                             |
| `children`    | `ReactNode` | Yes      | -                        | One or more `<MultiView.Tab>` markers. Non-Tab children are ignored. |

Active tab tracking, default tab, and URL sync are managed internally — there
is no controlled-mode escape hatch. The first declared tab is the default
when the URL has no `?tab` param.

### `<MultiView.Tab>` props

| Prop      | Type              | Required | Default | Notes                                                                |
| --------- | ----------------- | -------- | ------- | -------------------------------------------------------------------- |
| `id`      | `string`          | Yes      | -       | Stable id used for active-tab tracking, the `?tab=<id>` URL value, and the body remount key. |
| `label`   | `string`          | Yes      | -       | Tab pill label.                                                      |
| `icon`    | `ReactNode`       | No       | -       | Optional icon shown before the label inside the pill.                |
| `filters` | `FilterCondition` | No       | -       | Tab-level base filter, propagated to the active view via context.    |
| `orders`  | `OrderCondition`  | No       | -       | Tab-level default order, propagated to the active view via context.  |
| `linkTo`  | `string`          | No       | -       | Subdirectory name for record click navigation. See "Click navigation" above. |
| `view`    | `ComponentType`   | Yes      | -       | Component instantiated when this tab is active. Must be a component reference, not a JSX element (`view={MyView}`, not `view={<MyView />}`). |

### `useMultiViewContext()`

Returns the active context value (or `null` outside `MultiView`):

```ts
type MultiViewContextValue = {
  filters?: FilterCondition;
  orders?: OrderCondition;
  linkTo?: string;
  /** Always true inside MultiView. Custom views check this to suppress duplicate headers. */
  embedded: true;
};
```

Inner Model\* views read this hook internally — most callers do not need it.
Custom views (dashboards, charts) read it to:

- skip a duplicate title block when embedded
- branch on whether they are inside a multi-view container

## When to use `MultiView`

| Page shape                                                | Use this                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| Single model, single view, no filter tabs                 | `ModelTable` / `ModelBoard` / `ModelCard` directly                |
| Single model, single view, multiple filter tabs           | `MultiView` with one shared `view` component reused across tabs   |
| Single model, multiple view kinds (Board / Table / etc.)  | `MultiView` with one tab per view component                       |
| Multiple related models in one container                  | `MultiView` with each tab providing its own view component (own `modelName`) |

## File organization

Conventional layout for a MultiView page:

```
<page>/
├── page.tsx                # MultiView composition (~30 lines)
├── board-view.tsx          # exports BoardView (when board tab exists)
├── table-view.tsx          # exports TableView (when table tab exists)
└── [id]/page.tsx           # detail (single model)
```

For multi-model MultiView with per-tab detail subdirectories:

```
<page>/
├── page.tsx
├── <entity-a>/
│   ├── table-view.tsx      # exports TableView
│   └── [id]/page.tsx       # detail for entity A
└── <entity-b>/
    ├── table-view.tsx      # exports TableView
    └── [id]/page.tsx       # detail for entity B
```

When two view files in the same page export the same name (`TableView`), use
import aliases at the call site:

```tsx
import { TableView as LoginHistoryView } from "./login-history/table-view";
import { TableView as AuthFailuresView } from "./auth-failures/table-view";
```

## Limitations (v1)

- No shared state across tabs. Each tab is fully unmounted on switch and
  toolbar filter / sort / search / pagination / selection are reset. A
  `keepMounted` option is the planned escape hatch if a future page needs
  cross-tab state preservation.
- The shared header renders only title + description + tab pills. Header-level
  action slots (an extra button beside the title, for example) are not
  supported — put per-view toolbars inside the view body instead. EnvDashboard
  does this with its Refresh button.
- Custom views that need the embedded flag must read `useMultiViewContext()`
  themselves. There is no prop injection (no `cloneElement`), so unrelated
  components never receive surprise props.
- Click navigation on Model\* views is constrained to `${pathname}/${linkTo?}/${id}`.
  No `onClick` / `href` escape hatches. If a view legitimately needs to
  navigate elsewhere, do it from a page-level wrapper rather than the view.
- URL sync uses Next.js `router.push`, so each tab click creates a history
  entry. This is intentional — browser back navigates to the previous tab.
- Multiple `MultiView`s on the same page share the `?tab` param. Use disjoint
  tab ids if you need them to coexist independently.
- `view` must be a component reference (e.g. `view={TableView}`), not a JSX
  element (`view={<TableView />}`). MultiView instantiates the component
  internally; this prevents the props-baked-in-at-element-creation pattern
  that would conflict with the context-injection model.

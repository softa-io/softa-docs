# Components

Organized by **scope** — what each component wraps and where it sits in the
page hierarchy. Five layers, from outermost to innermost:

```
┌──────────────────────────────────────────────────────┐
│ 1. App Shell  ─── wraps the whole app                │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 2. Page Composer  ─── wraps one page.tsx        │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │ 3. Data View  ─── renders one dataset      │ │ │
│  │  │  ┌───────────────────────────────────────┐ │ │ │
│  │  │  │ 4. Building Blocks  ─── inside views  │ │ │ │
│  │  │  │  ┌──────────────────────────────────┐ │ │ │ │
│  │  │  │  │ 5. UI Primitives                 │ │ │ │ │
│  │  │  │  └──────────────────────────────────┘ │ │ │ │
│  │  │  └───────────────────────────────────────┘ │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 1. App Shell

Application-wide chrome — the same on every page.

| Component | Role |
| --------- | ---- |
| `Header` | Top bar with module switcher, breadcrumbs, search, user menu |
| `Sidebar` | Collapsible nav from current module's manifest |
| `WorkspaceSwitcher` | Searchable workspace record picker |
| `BrowsePagesDialog` | Full-screen page browser |

→ [layout/](./layout)

## 2. Page Composer

Wraps a single `page.tsx` in a navigation shell. **Not a data view** — it
composes other views into a unified page-level UI.

| Component | Role |
| --------- | ---- |
| `MultiView` | Tabbed multi-view container with shared header + URL-synced active tab |

→ [views/multi-view/](./views/multi-view)

(`PageTabs` was a former member here; replaced by `MultiView`. Future page
composers — `WizardPage`, `MasterDetailPage`, etc. — would join this layer.)

## 3. Data Views

Render records of a model. Each is a distinct "view kind".

| Component | Role |
| --------- | ---- |
| `ModelTable` | Tabular grid with toolbar, inline edit, side panel, bulk ops |
| `ModelBoard` | Kanban-style column view with drag-drop and per-column "Load more" |
| `ModelCard` | Responsive card grid with template slots |
| `ModelForm` | Detail / create / edit form |
| `ModelSideForm` | Master-detail (left list + right form) |

→ [views/table/](./views/table) · [views/board/](./views/board) · [views/card/](./views/card) · [views/form/](./views/form) · [views/sideForm/](./views/sideForm)

All of these accept top-level `filters` / `orders` and inherit from
`MultiView.Tab` when nested. See
[views/multi-view/README.md#filter--order-precedence](./views/multi-view/README.md#filter--order-precedence)
for cross-layer rules.

## 4. Building Blocks

Reusable elements consumed by data views and composers. Not used directly in
`page.tsx` (with rare exceptions); they sit inside views.

| Component | Used in |
| --------- | ------- |
| `Field` | Column / form field declaration; renders read & edit modes |
| `Action` / `BulkAction` | Per-record / per-selection operations |
| `SideTree` / `SideCard` / `SideList` | Side panel filters inside Model\* views |
| `ViewTitle` | Title block in view headers (used by Model\* and MultiView) |

→ [fields/](./fields) · [actions/](./actions) · [views/shared/side-panel/](./views/shared/side-panel) · [views/shared/ViewTitle.tsx](./views/shared/ViewTitle.tsx)

## 5. UI Primitives

Low-level UI used by everything above. Mostly third-party adaptations or
narrow utilities.

| Component | Role |
| --------- | ---- |
| `ui/` (shadcn) | Button / Input / Dialog / Tabs / etc. |
| `TreePanel` | Tree rendering primitive (used by `SideTree`) |
| Dialog hosts | Action / table action dialog rendering |

→ [ui/] · [views/tree/](./views/tree) · [views/dialogs/](./views/dialogs)

---

## Choosing the right layer for a new component

Decision tree:

1. Does it appear on every page (e.g., always-visible nav)? → **App Shell**
2. Does it wrap a whole `page.tsx` and host other views inside? → **Page Composer**
3. Does it render records of a single model? → **Data View**
4. Is it a piece used inside a view (column, action, side filter)? → **Building Block**
5. Is it a low-level UI primitive with no model awareness? → **UI Primitive**

When in doubt between #2 and #3: page composers don't fetch data themselves;
data views do.

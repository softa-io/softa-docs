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

→ [views/table/](./views/table) · [views/board/](./views/board) · [views/card/](./views/card) · [views/form/](./views/form) · [views/side-form/](./views/side-form)

All of these accept top-level `filters` / `orders` and inherit from
`MultiView.Tab` when nested. See
[Filter & order precedence](./views/multi-view#filter--order-precedence)
for cross-layer rules.

## 4. Building Blocks

Reusable elements consumed by data views, composers, and pages. Split into
three sub-categories by **model awareness**:

### 4a. Generic UI widgets (no model awareness)

Plain visual widgets — input is simple data, no `modelName` / `FilterCondition`.

| Component | Role |
| --------- | ---- |
| `pagination-bar` | Page number / size controls |
| `empty-state` | Empty list placeholder |
| `status-badge` | Colored status pill |
| `user-avatar` | User avatar + name |
| `timeline` | Vertical event timeline |
| `datetime-picker` / `time-picker` | Date/time inputs |
| `density-switcher` | UI density toggle |
| `loading-skeleton` / `full-screen-loading` | Loading states |
| `check-list` / `option-select` | Selection inputs |

→ [common/](./components/common)

### 4b. Model-aware view children (used inside Model\* views)

Need `modelName` and integrate with the Model\* view via `SidePanelContainerContext`
or similar — **not** suitable for use outside a host view.

| Component | Used in |
| --------- | ------- |
| `SideTree` / `SideCard` / `SideList` | Side panel filters inside `ModelTable` / `ModelCard` |
| `RecordPickerField` / `RecordPickerList` | Relation record pickers used in fields and forms |

→ [components/side-panel/](./components/side-panel) · [components/picker/](./components/picker)

### 4c. Model-aware standalones (declared inside views, but stand alone)

Used inside Model\* / MultiView declarations as JSX children, but each is a
self-contained "thing":

| Component | Role |
| --------- | ---- |
| `Field` | Column / form field declaration; renders read & edit modes |
| `Action` / `BulkAction` | Per-record / per-selection operations |
| Cell renderers | `BooleanCell` / `OptionCell` / `ReferenceCell` / etc. used by ModelTable |

→ [fields/](./fields) · [actions/](./actions)

### Sub-category guide

When in doubt where a new component goes:

- Doesn't know about models? → **4a (`common/`)**
- Knows about models AND must live inside a Model\* host (publishes to or reads from a host context)? → **4b (`views/shared/`)**
- Knows about models AND is a self-contained child of a host? → **4c**

## 5. UI Primitives

Low-level UI used by everything above. Mostly third-party adaptations or
narrow utilities.

| Component | Role |
| --------- | ---- |
| `ui` (shadcn) | Button / Input / Dialog / Tabs / etc. |
| `TreePanel` | Tree rendering primitive (used by `SideTree`) |
| Dialog hosts | Action / table action dialog rendering |

→  [views/tree/](./views/tree) · [views/dialogs/](./views/dialogs)

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

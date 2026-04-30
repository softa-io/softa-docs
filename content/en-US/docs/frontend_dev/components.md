# Layout components

Client components for the application shell: top bar, sidebar, workspace switching, global page browser, and route-level tabs. They sit above feature pages and integrate with `@/navigation` manifests and workspace context—not with model metadata (those live under `src/components/views/`).

| File | Export | Role |
|------|--------|------|
| `header.tsx` | `Header` | Top shell: module switcher entry, breadcrumbs, search affordance, user menu, lazy-loaded dialogs |
| `sidebar.tsx` | `Sidebar` | Collapsible nav from the current module’s manifest; embeds `WorkspaceSwitcher` when the module defines workspace config |
| `WorkspaceSwitcher.tsx` | `WorkspaceSwitcher` | Searchable workspace record picker (e.g. app/tenant) when the active module has `workspace` in the navigation manifest |
| `browse-pages-dialog.tsx` | `BrowsePagesDialog` | Full-screen style dialog to browse and jump to pages across modules (opened from the header) |

Import paths use the `@/components/layout/...` alias, for example `@/components/layout/header`.

For tabbed views inside a single page (multiple lists or view kinds), see [MultiView](../views/multi-view).

---

## Header

**Import:** `import { Header } from "@/components/layout/header";`

**Props**

| Prop | Type | Notes |
|------|------|--------|
| `className` | `string` | Optional; merged with shell styles |
| `toggleMobileSidebar` | `() => void` | Opens/closes the sidebar on small viewports |

**Behavior**

- Renders at `var(--ui-shell-header-height)` with horizontal padding from `var(--ui-page-padding)`.
- **Module / browse:** Opens `BrowsePagesDialog` (code-split). When multiple modules exist, shows the current module label next to the trigger.
- **Breadcrumbs:** Uses `getBreadcrumbItems` from the navigation manifest; falls back to path segments for routes not yet registered.
- **Right cluster:** Global search input (placeholder UI; Cmd+K hint), notifications stub, help link, `DensitySwitcher`, user dropdown (personal settings, design system link, logout).
- **Dialogs:** `PersonalSettingsDialog` and `BrowsePagesDialog` are loaded with `next/dynamic` only when opened.

---

## Sidebar

**Import:** `import { Sidebar } from "@/components/layout/sidebar";`

**Props**

| Prop | Type | Notes |
|------|------|--------|
| `className` | `string` | Optional |
| `isDesktopCollapsed` | `boolean` | Narrow icon-only rail when true (desktop) |
| `toggleDesktopSidebar` | `() => void` | Collapse/expand on `sm+` |
| `isMobileOpen` | `boolean` | Full overlay sidebar on small screens |
| `toggleMobileSidebar` | `() => void` | Close mobile sheet after navigation |

**Behavior**

- Resolves the active module from `pathname` via `getCurrentModule(NAVIGATION_MANIFESTS, pathname)`.
- **Links:** `getSidebarSections` + `fillRouteTemplate` with `useWorkspaceContext` so routes that include a workspace param resolve to the active workspace.
- **Active item:** `isRouteTemplateMatch(pathname, route)`.
- **Workspace:** If `currentModule.workspace` is set, renders `WorkspaceSwitcher` below the brand row (when not collapsed).
- Nav items use semantic menu tokens (`ui-menu-item`, `--ui-menu-icon-size`, etc.).

---

## WorkspaceSwitcher

**Import:** `import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";`

**Props:** None (reads `useWorkspaceContext()`).

**Behavior**

- Returns `null` when the current module has no workspace config.
- Otherwise renders a combobox-style popover: loads workspace records via `modelService`, supports search, select, and optional clear when `module.workspace.clearable` allows it.
- Intended to be composed inside `Sidebar` (or anywhere that already has workspace context for the active module).

---

## BrowsePagesDialog

**Import:** `import { BrowsePagesDialog } from "@/components/layout/browse-pages-dialog";`

**Props**

| Prop | Type | Notes |
|------|------|--------|
| `open` | `boolean` | Controlled visibility |
| `onOpenChange` | `(open: boolean) => void` | Standard dialog callback |

**Behavior**

- Builds a searchable, filterable list from `getCommandPaletteItems(NAVIGATION_MANIFESTS)` with module/category filters and an optional “recent” mode backed by `localStorage` (`browse-recent-pages`).
- Navigates with `router.push` and respects workspace template filling like the sidebar.

`Header` lazy-loads this component; use the same pattern if you mount it elsewhere.

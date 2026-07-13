# Global Search

Cmd+K command palette and Header search box for navigating pages, looking up records (employees, departments), and resurfacing recently used items.

Use this document for:

- Mounting the palette and Header box in the app shell
- Configuring debounce / cache / Recent capacity
- Registering new searchable scopes
- Extending the Recent backend
- End-user wording (last section)

Related docs:

- [Navigation manifests](../frontend_dev/module): manifest registry, route templates, permission filtering — Global Search consumes this layer.
- [BrowsePagesDialog](../frontend_dev/layout#browsepagesdialog): the "browse all pages" sibling. Shares Recent storage with Global Search.

## Import

```tsx
import { GlobalSearchProvider } from "@/components/global-search/hooks/useGlobalSearch";
import { HeaderSearchBox } from "@/components/global-search/ui/HeaderSearchBox";
```

That's all the shell needs. Internal hooks and helpers are re-imported by sibling modules; you don't normally touch them.

## Quick Integration

Mount one provider at the root, inside `UserProvider` / `QueryProvider` / `WorkspaceProvider`. The palette is auto-rendered by the provider — do **not** render `<GlobalSearchPalette>` yourself.

```tsx
<UserProvider>
  <QueryProvider>
    <WorkspaceProvider>
      <GlobalSearchProvider>
        <Header />
        <main>{children}</main>
      </GlobalSearchProvider>
    </WorkspaceProvider>
  </QueryProvider>
</UserProvider>
```

Drop the Header box anywhere visible in page chrome:

```tsx
<HeaderSearchBox className="hidden w-[200px] md:block lg:w-[280px]" />
```

`Cmd+K` (mac) / `Ctrl+K` (win/linux) opens the palette anywhere. Header box and palette share the same Recent storage and selection logic — pick either entry point and behavior is consistent.

## Directory Layout

```
src/components/global-search/
├── recent/                          # Recent (frecency-sorted history) subsystem
│   ├── recentStore.ts               # LocalRecentStore + frecency() pure fn
│   ├── types.ts                     # RecentEntry / RecentStore contract
│   └── useRecentEntries.ts          # hook over RecentStore
├── hooks/                           # React hooks: state + side-effects
│   ├── useGlobalSearch.tsx          # provider + open/close + Cmd+K hotkey
│   ├── useGlobalSearchSelection.ts  # shared select side-effects (record + nav)
│   ├── useScopeSearch.ts            # scope router: menu local / records via API
│   ├── useSearchIndex.ts            # memoized manifest → SearchEntry[]
│   └── useSearchInput.ts            # input state machine: scope chip + query
├── ui/                              # render-only components, take props from hooks
│   ├── GlobalSearchPalette.tsx      # Cmd+K modal container
│   ├── HeaderSearchBox.tsx          # Header inline + popup container
│   ├── ScopeChip.tsx                # scope tag rendered before input
│   ├── SearchFooterShortcuts.tsx    # ↑↓ Navigate · ⏎ Select · Esc Close
│   ├── SearchInputTrailing.tsx      # input right side: spinner / clear / kbd
│   └── SearchResults.tsx            # Recent + grouped results + empty/loading
├── config.tsx                       # GlobalSearchConfig + Provider + hook
├── parseQuery.ts                    # SearchScope + SEARCH_SCOPES + parseQuery()
├── resolveSearchRoute.ts            # workspace [id] template fill helpers
└── searchIndex.ts                   # SearchEntry + manifest → entries adapter
```

The split is layered:

- **`recent/`** — persistence subsystem with its own types, store, hook. Cleanly swap out the backend (e.g. add server sync) without touching anywhere else.
- **`hooks/`** — own all state and side-effects (open/close, input, scope routing, selection). Imported by `ui/` and outside integrators.
- **`ui/`** — render-only components, take props from hooks. No state of their own beyond local refs.
- **Root files** (`config`, `parseQuery`, `searchIndex`, `resolveSearchRoute`) — types, registries, and pure helpers shared across all the above.

## Configuration

All tuning constants live in `GlobalSearchConfig`. Pass partial overrides to `<GlobalSearchProvider>`; missing keys fall back to defaults.

```tsx
<GlobalSearchProvider config={{ debounceMs: 300, recordLimit: 50 }}>
```

| Key                  | Default  | Effect                                                            |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `debounceMs`         | `200`    | Delay between user keystrokes and `searchName` API call.          |
| `recordLimit`        | `20`     | Max rows returned per `searchName` request.                       |
| `recordStaleTimeMs`  | `30_000` | TanStack Query cache window — repeated queries skip refetch.      |
| `recentLimit`        | `5`      | Default visible Recent count when caller doesn't pass `limit`.    |
| `recentCapacity`     | `80`     | Max entries kept in storage (frecency-evicted on overflow).       |
| `recentHalfLifeDays` | `7`      | Frecency decay rate. Smaller → recency dominates over use count.  |

Tuning notes:

- Drop `debounceMs` to ~100 if users type fast and the API is cheap.
- Raise `recordStaleTimeMs` to several minutes for read-mostly data.
- Drop `recentHalfLifeDays` to 1–2 if user tasks rotate quickly so stale items don't outrank fresh ones.

## Scope Registry

`SEARCH_SCOPES` in `parseQuery.ts` is the single source of truth for prefix-based scopes. Three states:

| State        | How                          | UX behavior                                                |
| ------------ | ---------------------------- | ---------------------------------------------------------- |
| Hidden       | Delete the entry             | Prefix not recognized; users can't reach the scope.        |
| Coming soon  | Keep entry, omit `record`    | Prefix recognized; result area shows "coming soon".        |
| Live         | Keep entry, fill `record`    | Real `searchName` API call.                                |

### Adding a new record scope

```ts
// 1. Extend the SearchScope union in parseQuery.ts
export type SearchScope =
  | "menu" | "employee" | "department" | "help"
  | "project";

// 2. Add an entry with record config
{
  scope: "project",
  prefix: "$",                                  // any single ASCII char
  label: "Project",
  description: "Search projects",
  record: {
    modelName: "Project",                       // backend: capitalized
    detailRoute: "/corehr/organization/project-team/[id]",
  },
}
```

`useScopeSearch`, the chip, the placeholder, and the API wiring all pick it up automatically — no other file changes needed.

### Custom param name in `detailRoute`

`detailRoute` uses `[id]` placeholder. If a future model needs a different param (e.g. `[employeeNumber]`), extend `ScopeRecordConfig` with an optional `paramName` field — not implemented yet, add it the first time it's needed.

## Public API

Modules an integrator typically imports:

| Module                       | Purpose                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `<GlobalSearchProvider>`     | Mount once at root. Auto-renders the palette and registers Cmd+K.                  |
| `useGlobalSearch()`          | Read `isOpen` and dispatch `open()` / `close()` / `toggle()`.                      |
| `<HeaderSearchBox>`          | Inline search box for the app header. Self-contained.                              |
| `useRecentEntries()`         | Read/write the user's Recent list. Shared with `BrowsePagesDialog`.                |
| `useSearchIndex()`           | Memoized `SearchEntry[]` from the navigation manifest.                             |
| `useGlobalSearchConfig()`    | Read merged config. Useful for downstream debug or admin panels.                   |

Not normally imported by integrators (used internally by the two panels): `useSearchInput`, `useScopeSearch`, `useGlobalSearchSelection`, `SearchResults`, `SearchInputTrailing`, `SearchFooterShortcuts`, `ScopeChip`, `parseQuery`, `resolveSearchRoute`.

## Extension Points

### Server-synced Recent

`RecentStore` is an interface. The default `LocalRecentStore` writes to `localStorage`. To sync across devices, implement `SyncedRecentStore` that calls a backend on `record/list/clear` and keeps a local cache. Replace the construction inside `useRecentEntries` (or thread it through context).

### Custom data sources

For non-record sources (in-app actions, help articles, full-text search), add a branch in `useScopeSearch` keyed on `scope`, emit `SearchEntry[]` from your adapter. The `kind` field on `SearchEntry` is open (`'page' | 'action' | 'record'`) for exactly this.

### Icon registry for record-kind entries

`SearchEntry.icon` is `LucideIcon` (runtime), `RecentEntry.iconKey` is a serializable string. To show icons on record results, register them in a global map (`{ employee: User, department: Building, ... }`) and resolve by `iconKey` at render time in `<SearchResults>`. Currently records fall back to `Circle`.

## Known Limitations

- **No subtitle on record results** — `searchName` only returns `id + displayName` by default. Pass `additionalFields` and extend the mapper in `useScopeSearch` once the backend field set is agreed.
- **`SearchScope` is a TS union** — adding a scope requires editing the union. Worth it for type narrowing; revisit if scopes ever become user-extensible at runtime.

## Tests

```
tests/recent-store.test.ts          # frecency + LocalRecentStore behavior (23 cases)
tests/search-index.test.ts          # manifest → SearchEntry adapter (10 cases)
tests/parse-query.test.ts           # prefix parser + SEARCH_SCOPES integrity (26 cases)
```

Run: `pnpm exec vitest run tests/recent-store.test.ts tests/search-index.test.ts tests/parse-query.test.ts`

UI components (panels, results, chip, footer) currently lack jsdom + RTL tests. Add when behavior gets non-trivial.

---

# User Guide

> This section is **end-user-facing** copy (HR / employees / platform admins). Avoid technical jargon. Move into the product Help center or onboarding flow as-is when ready; localize to user language at publish time.

## Opening the search panel

| Entry point                       | How                                                  |
| --------------------------------- | ---------------------------------------------------- |
| Anywhere in the app               | Press **⌘ K** (macOS) / **Ctrl K** (Windows / Linux) |
| Top-bar search box (desktop)      | Click the search box at the top of the page         |
| Top-bar search icon (mobile)      | Tap the magnifying-glass icon at the top right      |

All three reach the same data — pick whichever feels faster.

## Searching by typing

Type a few characters. The panel matches across **page names, module names, and (for the active category) employee or department names**.

```
employees       matches the "Employees" page, "Employee Documents", etc.
salary          matches any page whose name or description contains "salary"
```

## Filtering by category — prefix syntax

Start your input with a special character to focus the search on a single category:

| Prefix | Search target                   | Example         |
| ------ | ------------------------------- | --------------- |
| `/`    | Pages and features              | `/leave`        |
| `@`    | Employees                       | `@Alice Wang`   |
| `#`    | Departments                     | `#Engineering`  |
| `?`    | Help articles (coming soon)     | `?onboarding`   |

When a prefix is active, a small **category chip** (e.g. `Employee`) appears before the input. The prefix character itself is converted into the chip, so the input area stays clean and only shows your actual keyword.

## Clearing or switching the category

- Press **Backspace** with empty input → removes the chip, back to general search
- Click the **×** on the chip → same as above
- Click the **×** on the right of the input → clears your typed text only (the chip stays)

## Recent items

When you open the panel without typing anything, the top section shows your **Recent** list — pages and records you visited recently. The order combines two signals:

- **How recently you used it** — newer items rank higher
- **How often you've used it** — frequent items rank higher

So items you use a lot stay near the top even after a few days idle; occasional one-off visits naturally sink over time.

⚠️ Recent data is stored **on your current device / browser only**. Switching devices or clearing browser data starts a fresh list. Recent is not synced to the cloud and is never visible to other users.

## Keyboard shortcuts inside the panel

| Key                  | Action                                |
| -------------------- | ------------------------------------- |
| **↑ / ↓**            | Move the highlight up / down          |
| **⏎ (Enter)**        | Open the highlighted item             |
| **Esc**              | Close the panel                       |
| **⌘ K** / **Ctrl K** | Toggle the panel from anywhere        |

## Can't find what you're looking for?

- Check for typos in your keyword
- Try a plain search without a prefix — maybe the target is in another category
- `?` help articles aren't live yet — for product guidance, contact HR / IT
- Still nothing? You may not have **permission** to access that feature. Request access from your admin and try again.

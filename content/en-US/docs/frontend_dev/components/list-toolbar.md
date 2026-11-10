# List Toolbar (ListToolbar)

The toolbar row of a list screen, and the pills its filters are drawn as. The toolbars of `ModelTable`, `ModelCard` and `ModelBoard` are built from them; a list that is not a `ModelTable` — its rows assembled by an endpoint of its own, its cells editable in place — lays its toolbar out with the same pieces, so it wraps and reads the same way.

| File | What |
| --- | --- |
| `list-toolbar.tsx` | `ListToolbar` (the row), `ListToolbarGroup` (buttons that move together) and `ListToolbarLabel` (a button's label that gives way to its icon) |
| `pinned-filter-pill.tsx` | `PinnedFilterPill`, `PinnedFilterPopover`, `PinnedFilterSelect` — a filter as a pill |
| `pinned-filter-search.tsx` | `PinnedFilterSearch`, `PinnedFilterSearchOptions` — a pill that picks one record found by a search |
| `date-range-filter.tsx` | `DateRangeFilter` — a "From ~ To" pill — with `dateRangeCondition`, `dateRangeSummary`, `EMPTY_DATE_RANGE` |

Folder: `src/components/views/shared/list-toolbar/`.

## The row

```tsx
import { ListToolbar } from "@/components/views/shared/list-toolbar/list-toolbar";

<div className="border-b border-border/60" style={{ paddingInline: "var(--ui-page-padding)", paddingBlock: "var(--ui-form-row-gap)" }}>
  <ListToolbar
    search={<SearchField composing iconSize="md" placeholder="Search profiles" value={search} onValueChange={setSearch} />}
    filters={<DateRangeFilter label="Created" value={range} onChange={setRange} active={Boolean(range.from || range.to)} onReset={() => setRange(EMPTY_DATE_RANGE)} />}
    actions={<Button size="sm">Create</Button>}
  />
</div>
```

- `search` comes first. The toolbar sizes it — never under 12rem, up to 24rem — so pass the search box without a width of its own (no `containerClassName="w-72"`). Alone, it narrows down to 12rem before the buttons take a line of their own; with pills after it, a pill moves to the next line before the search box narrows past 16rem.
- `filters` follow it: the pills as they are — a fragment, not a box of their own — since each pill is an item of the row: the ones that do not fit beside the search box start the next line, and the buttons share that line with them while they fit. A board puts its card count there ("42 total").
- `actions` are pushed to the right. They wrap rather than squeeze the search box and the pills: all of them go to the next line, right-aligned, when they do not fit beside them; their groups — each a `ListToolbarGroup`, as `ModelTable` puts its own buttons in one and the page's in another — part when even a line cannot hold them all; and a group wider than a line on its own wraps its buttons. A few buttons that need not stay together go in as they are. On a phone the search box and the buttons take a line each, the buttons' line scrolling sideways.
- `collapseLabels` is for a toolbar with more to fit than a search box and its buttons: while it is narrower than 64rem, the labels wrapped in `ListToolbarLabel` give way to their buttons' icons, each still the button's accessible name. Give those buttons a `title` while it is on, since only the icon shows then. `ModelTable` turns it on when it has pinned filters, for its own Filter / Sort / Group / Columns / More; the page's buttons keep their labels. It is a named container query (`@container/list-toolbar`), so an enclosing container's width never collapses them.
- The band around the row — its border and padding — is the container's, not the row's: a page toolbar sits in a band with the page padding, a list inside a card (a role's members) only needs a margin below it (`className="mb-(--ds-space-5)"`).
- Anything that is not a list's toolbar — a tab strip with a search box beside it, a side list's header — keeps its own layout.

In use: `ModelTableToolbarControls` (every `ModelTable`), `ModelCardToolbar` (every `ModelCard`), `BoardToolbar` (every `ModelBoard`), Consultant Profiles (`src/app/system/consultant-profile/page.tsx`), a role's members (`MembersStep`, `RoleDetailView` in `src/app/user/access/roles/components/`).

## Pills

A pill is a filter as the toolbar shows it: its name and what it is set to in one button that opens the control, marked while the filter narrows the list (`active`: set to other than its default), with an × beside it that puts it back (`onReset`). In a `ModelTable` a `<PinnedFilter>` hands its control `label`, `value`, `onChange`, `active` and `onReset` (see [ModelTable pinned filters](../views/table)); a list that keeps its own filter state works out `active` and `onReset` itself and renders the same controls.

| Pill | For | What it takes besides `label`, `active`, `onReset` |
| --- | --- | --- |
| `PinnedFilterSelect` | One of a few values | `summary`, `value` and `onValueChange` (strings: map an "any" value to a sentinel), `SelectItem`s as children |
| `PinnedFilterPopover` | A control in a popover: boxes to tick, dates to pick | `summary`, the control as children; `open` / `onOpenChange` to control it, `role="combobox"` for a list to pick from |
| `PinnedFilterSearch` | One record found by a search | `value` (`{ id, displayName }` or null), `onChange`, `anyText` (the summary with nothing picked), `list` |
| `DateRangeFilter` | A date range, either side open | `value` and `onChange` (`{ from, to }`, `yyyy-MM-dd` or `""`) |

`summary` is what the value reads as on the pill: "All types", "Within 30 Days", "2026-01-01 – 2026-03-31". It is cut short past 15rem and shown whole on hover.

### A record found by a search

`PinnedFilterSearch` keeps what was picked as a reference, the id with the name it was picked by, so the pill reads it without a lookup — and a remembered pick reads the same when the list is opened again. Its `list` is a component that searches and lists: it is mounted while the popover is open only, so the search runs then, not every time the page loads. Write it around a search hook and `PinnedFilterSearchOptions`, which draws the search box, the entries (the picked one ticked, a code or a department beside each name) and more of them as the list is scrolled to its end:

```tsx
function DepartmentList({ selectedId, onPick }: PinnedFilterSearchListProps) {
  const [keyword, setKeyword] = useState("");
  const { departments, isLoading, paging } = useDepartmentSearch(keyword);
  return (
    <PinnedFilterSearchOptions
      entries={departments}
      isLoading={isLoading}
      paging={paging}
      selectedId={selectedId}
      onPick={onPick}
      onSearch={setKeyword}
      searchPlaceholder="Search departments..."
      emptyText="No departments found."
    />
  );
}

export function DepartmentFilter({ value, onChange, label, active, onReset }: PinnedFilterControlProps<ModelReference | null>) {
  return <PinnedFilterSearch label={label} value={value} onChange={onChange} active={active} onReset={onReset} anyText="All departments" list={DepartmentList} />;
}
```

The entries are shaped as the directory pickers and the name searches shape theirs (`value`, `label`, `hint`, `inactive`), so `usePeopleSearch`, `useDepartmentSearch` and the options of a name search over a model go in as they come. In `ModelTable`, a `<PinnedFilter fieldName="departmentId" defaultValue={null} control={DepartmentFilter} />` compares the field with the reference's id.

### A date range

`DateRangeFilter` holds the two dates in its popover. Each calendar greys out the days that would put From after To; a range that still arrives that way is reported under the boxes and never applied, the list keeping the last valid one. Its condition is `dateRangeCondition(field, range)`: `>=` with only a From, `<=` with only a To, `BETWEEN` with both, nothing with neither — and a row whose date is empty matches none of them.

```tsx
<PinnedFilter
  id="effectiveDate"
  label="Effective"
  control={DateRangeFilter}
  defaultValue={EMPTY_DATE_RANGE}
  toFilter={(range) => dateRangeCondition("effectiveDate", range)}
/>
```

It keeps a draft of its own while the range is invalid, and starts over from the applied range when it is drawn afresh: `ModelTable` draws a pinned filter's control afresh when its × or Clear all puts it back. A list that keeps its own state does the same by giving the control a new `key` when it resets it.

# common — Generic UI widgets

Plain visual widgets with **no model awareness**. Drop-in usable from
anywhere — pages, layouts, dialogs, view components. Inputs are simple data
(strings, numbers, callbacks); none of them know about `modelName`,
`MetaModel`, or `FilterCondition`.

For the broader taxonomy (where `common/` sits among the five layers), see
[Index](../index).

| File | Export | Category |
| ---- | ------ | -------- |
| `pagination-bar.tsx` | `PaginationBar` | Pagination |
| `empty-state.tsx` | `EmptyState` | Empty / loading |
| `loading-skeleton.tsx` | `LoadingSkeleton` | Empty / loading |
| `full-screen-loading.tsx` | `FullScreenLoading` (default export) | Empty / loading |
| `status-badge.tsx` | `StatusBadge` | Status / identity |
| `user-avatar.tsx` | `UserAvatar` | Status / identity |
| `timeline.tsx` | `Timeline` | Display |
| `check-list.tsx` | `CheckList` | Display |
| `date-picker.tsx` | `DatePicker` | Input |
| `datetime-picker.tsx` | `DateTimePicker` | Input |
| `time-picker.tsx` | `TimePicker` | Input |
| `time-column-panel.tsx` | `TimeColumnPanel` | Input (building block) |
| `time-utils.ts` | `resolveTimeConfig`, types | Utility |
| `option-select.tsx` | `OptionSelect` | Input |
| `density-switcher.tsx` | `DensitySwitcher` | App control |

Imports: `import { PaginationBar } from "@/components/common/pagination-bar";`

---

## Pagination

### `PaginationBar`

Standalone pagination row (page nav buttons + size dropdown + record count).
Used by `ModelTable` / `ModelCard` toolbars, but also usable in custom lists.

```tsx
<PaginationBar
  pageNumber={page}
  totalPages={totalPages}
  pageSize={pageSize}
  totalCount={totalCount}
  selectedCount={selectedIds.length}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `pageNumber` | `number` | Yes | - | 1-based current page |
| `totalPages` | `number` | Yes | - | Total page count (clamped to ≥ 1 in display) |
| `pageSize` | `number` | Yes | - | Current rows per page |
| `onPageChange` | `(n: number) => void` | Yes | - | Receives 1-based new page |
| `onPageSizeChange` | `(n: number) => void` | Yes | - | New page size value |
| `totalCount` | `number` | No | - | Shown as `Total N records`; omitted hides summary |
| `selectedCount` | `number` | No | `0` | Appended as `· Selected N` when > 0 |
| `availablePageSizes` | `number[]` | No | `[10,20,50,100]` | Dropdown options |
| `className` | `string` | No | - | |

---

## Empty / loading

### `EmptyState`

Centered "no data / no result" placeholder. Defaults to a database icon when
`icon` is omitted.

```tsx
<EmptyState
  title="No deployments yet"
  description="Pick an environment to see deployments."
  action={<Button>Get started</Button>}
/>

// compact variant — for inline empty states inside cards/panels
<EmptyState compact title="No items" />
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `title` | `string` | Yes | - | Primary text |
| `description` | `string` | No | - | Secondary explanation (max-width: `max-w-sm`) |
| `icon` | `ReactNode` | No | `<Database>` | Custom icon |
| `action` | `ReactNode` | No | - | Button or link below the text |
| `compact` | `boolean` | No | `false` | Smaller paddings / fonts; for inline use |
| `className` | `string` | No | - | |

### `LoadingSkeleton`

Pre-baked full-page skeleton (input row + body + pagination footer
placeholders). Use for pages that are about to render a Model\* view but
haven't loaded data yet.

```tsx
if (isLoading) return <LoadingSkeleton />;
```

No props.

### `FullScreenLoading`

Modal full-screen overlay with a spinner. Default export. Use for blocking
operations that span the whole app.

```tsx
import FullScreenLoading from "@/components/common/full-screen-loading";

{isSaving && <FullScreenLoading />}
```

No props.

---

## Status / identity

### `StatusBadge`

Colored pill badge backed by `class-variance-authority` variants. Doesn't
look up status meaning — caller picks the variant.

```tsx
<StatusBadge variant="success">Active</StatusBadge>
<StatusBadge variant="warning">Pending</StatusBadge>
<StatusBadge variant="error">Failed</StatusBadge>
<StatusBadge variant="info">Draft</StatusBadge>
<StatusBadge variant="neutral">Archived</StatusBadge>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `variant` | `"success" \| "warning" \| "error" \| "info" \| "neutral"` | No | `"neutral"` | Color theme |
| `className` | `string` | No | - | Merged with variant classes |
| ...HTMLSpanAttributes | - | - | - | Forwarded to underlying `<span>` |

### `UserAvatar`

Avatar circle. Renders a photo if `photoUrl` loads; otherwise falls back to
a `User` icon. The `photoUrl` host doesn't need to be in `next.config.js`'s
`remotePatterns` (uses plain `<img>`).

```tsx
<UserAvatar photoUrl={user.avatarUrl} />
<UserAvatar />  {/* fallback icon */}
<UserAvatar className="h-12 w-12" />  {/* custom size */}
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `photoUrl` | `string` | No | - | Avatar URL; auto-fallback on load error |
| `className` | `string` | No | `h-(--ds-h-xl) w-(--ds-h-xl)` | Override size with Tailwind classes |

---

## Display

### `Timeline`

Vertical event timeline with a connecting border. The first event is highlighted; later events render in muted color.

```tsx
<Timeline
  events={[
    {
      idField: "evt-1",
      timeField: "2026-04-30 09:30",
      userField: "Alice Lee",
      actionField: "submitted the request",
      detailsField: "Reason: vacation",
    },
    {
      idField: "evt-2",
      timeField: "2026-04-30 10:15",
      userField: "Bob Manager",
      actionField: "approved the request",
    },
  ]}
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `events` | `TimelineEvent[]` | Yes | - | Empty list renders nothing |
| `className` | `string` | No | - | |

`TimelineEvent` shape (each field already holds a formatted display value):

| Field | Type | Notes |
| ----- | ---- | ----- |
| `idField` | `string` | Used as React key; typically the event record id |
| `timeField` | `string` | Pre-formatted timestamp text |
| `userField` | `string` | Actor name |
| `actionField` | `string` | Verb phrase, e.g. `"approved the request"` |
| `detailsField` | `string?` | Optional secondary line |

### `CheckList`

Vertical checklist. Checked items show a green check + line-through; unchecked show an outlined circle.

```tsx
<CheckList
  items={[
    { idField: "1", labelField: "Submit form", statusField: true },
    { idField: "2", labelField: "Wait for approval", statusField: false, descriptionField: "Manager review pending" },
  ]}
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `items` | `CheckListItem[]` | Yes | - | Empty list renders nothing |
| `className` | `string` | No | - | |

`CheckListItem` shape:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `idField` | `string` | React key |
| `labelField` | `string` | Item label |
| `statusField` | `boolean` | `true` = checked (line-through, green); `false` = unchecked |
| `descriptionField` | `string?` | Optional secondary line |

---

## Input

All three pickers (`DatePicker` / `DateTimePicker` / `TimePicker`) share the same shape: **string in, string out**. The trigger label can be rendered in a different display format (e.g. 12-hour or locale-specific) via `displayFormat`, but the machine value always uses the canonical machine format so downstream pipelines (form values, `FilterCondition`, backend contract) never need to know about display mode.

The `triggerWrapper` prop lets a form adapter inject `<FormControl>{button}</FormControl>` so react-hook-form's a11y wiring (id / aria-describedby / aria-invalid) reaches the trigger button. Standalone callers omit it and the button is the trigger directly.

### `DatePicker`

Calendar-only date picker.

```tsx
<DatePicker value={value} onChange={setValue} />
<DatePicker value={value} onChange={setValue} dateFormat="yyyy-MM" />
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `value` | `string` | Yes | - | Date string in `dateFormat`; `""` = no selection |
| `onChange` | `(next: string) => void` | Yes | - | New value; `""` when cleared |
| `dateFormat` | `string` | No | `configs.dateTimeFormats.date` (`yyyy-MM-dd`) | Machine format. Pass `"yyyy-MM"` / `"MM-dd"` for partial-date pickers |
| `displayFormat` | `string` | No | = `dateFormat` | Trigger-label format |
| `disabled` | `boolean` | No | `false` | |
| `placeholder` | `string` | No | `"Pick a date"` | |
| `className` | `string` | No | - | Applied to trigger button |
| `triggerWrapper` | `(button) => ReactElement` | No | - | Form adapter wraps with `<FormControl>` |
| `triggerStyle` | `CSSProperties` | No | - | Inline style on trigger button |

### `DateTimePicker`

Calendar + 24h time-column panel side-by-side. Footer hosts Clear / Now / Apply.

```tsx
<DateTimePicker value={value} onChange={setValue} />
<DateTimePicker value={value} onChange={setValue} defaultTime="23:59:59" />
```

Machine format is fixed at `yyyy-MM-dd HH:mm:ss` (matches `configs.dateTimeFormats.dateTime`).

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `value` | `string` | Yes | - | `yyyy-MM-dd HH:mm:ss`; `""` = no selection |
| `onChange` | `(next: string) => void` | Yes | - | |
| `displayFormat` | `string` | No | `configs.dateTimeFormats.dateTime` | Trigger-label format. Pass e.g. `"yyyy-MM-dd hh:mm:ss a"` for 12-hour |
| `defaultTime` | `string` | No | `"00:00:00"` | Time-of-day to seed when the user picks a date but value has no time yet. Range filter end-points pass `"23:59:59"` |
| `disabled` | `boolean` | No | `false` | |
| `placeholder` | `string` | No | `"Pick date & time"` | |
| `className` | `string` | No | - | |
| `triggerWrapper` | `(button) => ReactElement` | No | - | |
| `triggerStyle` | `CSSProperties` | No | - | |

### `TimePicker`

Time-only picker (no calendar). Renders `TimeColumnPanel` inside a popover.

```tsx
<TimePicker value={value} onChange={setValue} timeFormat="HH:mm:ss" />
<TimePicker
  value={value}
  onChange={setValue}
  timeFormat="HH:mm"
  config={resolveTimeConfig({ min: "08:00", max: "18:00", minuteStep: 15 }, "HH:mm")}
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `value` | `string` | Yes | - | 24h ISO string in `timeFormat`; `""` = no selection |
| `onChange` | `(next: string) => void` | Yes | - | |
| `timeFormat` | `"HH:mm" \| "HH:mm:ss"` | Yes | - | Machine format; the panel's columns always render 24h |
| `displayFormat` | `string` | No | = `timeFormat` | date-fns format for the trigger label (e.g. `"hh:mm:ss a"` for 12h) |
| `config` | `ResolvedTimeConfig` | No | `resolveTimeConfig(undefined, timeFormat)` | Bounds / quick-options |
| `disabled` | `boolean` | No | `false` | |
| `placeholder` | `string` | No | `"Pick time"` | |
| `className` | `string` | No | - | |
| `triggerWrapper` | `(button) => ReactElement` | No | - | |
| `triggerStyle` | `CSSProperties` | No | - | |

### `TimeColumnPanel`

The bare scrollable HH / mm / (ss) column panel that powers `TimePicker` and `DateTimePicker`. Use directly only when you need the columns embedded in custom layout. Footer (Clear / Now / Apply) is conditional on `onClear` / `onApply` / `config.clearable` / `config.showQuickPick`.

### `resolveTimeConfig`

Pure resolver (no widget knowledge) for `TimePicker` / `TimeColumnPanel` config. Takes `Partial<TimePickerConfig>` and a `TimeFormat`, returns `ResolvedTimeConfig` with bounds parsed, step values validated, and `defaultTime` snapped to the step grid.

```ts
import { resolveTimeConfig } from "@/components/common/time-utils";

const config = resolveTimeConfig(
  { min: "08:00", max: "18:00", minuteStep: 15, quickOptions: ["09:00", "12:00"] },
  "HH:mm",
);
```

`TimePickerConfig` shape:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `min` / `max` | `string` | Inclusive bounds in `timeFormat` |
| `minuteStep` / `secondStep` | `number` | One of `[1,2,3,4,5,6,10,12,15,20,30,60]` (divisors of 60); `60` means only `00`; invalid values warn and fall back to 1 |
| `defaultTime` | `string` | Pre-fill on first open; auto-snapped UP to step grid |
| `quickOptions` | `string[]` | Quick-pick buttons rendered above the columns; out-of-range / off-grid entries auto-disable |
| `clearable` | `boolean` | Show Clear in footer (default `true`) |
| `showQuickPick` | `boolean` | Show Now in footer (default `true`) |

### `OptionSelect`

Standalone select bound to an option set (server-defined enum). Handles
loading / error states internally.

```tsx
<OptionSelect
  optionSetCode="DocumentStatus"
  value={status}
  onChange={setStatus}
  filters={[["disabled", "=", false]]}  // optional client-side prune
  placeholder="Pick a status"
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `optionSetCode` | `string` | Yes | - | Identifier of the option set on the server |
| `value` | `string \| number` | No | - | Currently selected `itemCode` |
| `onChange` | `(value: string \| undefined) => void` | No | - | New `itemCode` (or `undefined` when cleared) |
| `placeholder` | `string` | No | `"Please select..."` | |
| `disabled` | `boolean` | No | `false` | |
| `readOnly` | `boolean` | No | `false` | Visually displays without interactivity, full contrast |
| `filters` | `FilterCondition` | No | - | Client-side filter applied to fetched options |
| `className` | `string` | No | - | |

When loading → renders a `Skeleton`. On error → renders a disabled select with `"Failed to load options"`.

---

## App control

### `DensitySwitcher`

Toggles compact / comfortable UI density via `useDensity()` from
`@/providers/density-provider`. Used in the app `Header`. No props besides
`className`.

```tsx
<DensitySwitcher />
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `className` | `string` | No | - | |

---

## Adding a new common widget

A widget belongs in `common/` if **all** are true:

- It takes plain data (no `modelName` / `MetaModel` / `FilterCondition` props)
- It does not depend on Model\* view containers (`SidePanelContainerProvider` etc.)
- It can be used outside of a Model\* host (in dialogs, layouts, custom pages)

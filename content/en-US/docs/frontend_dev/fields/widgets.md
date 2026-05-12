# Widget Matrix

Use this document for:

- `FieldType -> WidgetType` compatibility
- widget examples
- widget-specific `widgetProps`

Related docs:

- [Fields](./fields): core `Field` props, conditions, `filters`, `Field.onChange`, value contracts
- [Relation fields](./relations): `RelationTable`, `SelectTree`, `OneToMany`, `ManyToMany`

## FieldType -> WidgetType Matrix

| FieldType     | Default behavior               | Supported WidgetType                                                              |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `String`      | single-line input              | `URL`, `Email`, `Phone`, `Text`, `RichText`, `TemplateEditor`, `Markdown`, `Code`, `Color`, `yyyy-MM`, `MM-dd`, `CronEditor` |
| `MultiString` | tag-style comma/enter input    | -                                                                                 |
| `Integer`     | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `Long`        | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `Double`      | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `BigDecimal`  | decimal string input           | `Monetary`, `Percentage`, `Slider`                                                |
| `Boolean`     | switch                         | `CheckBox`                                                                        |
| `Date`        | date picker                    | `Relative`                                                                        |
| `DateTime`    | datetime input                 | `Relative`                                                                        |
| `Time`        | time input                     | `HH:mm:ss`, `HH:mm`                                                               |
| `Option`      | single select                  | `Radio`, `StatusBar`, `StatusIcon`                                                |
| `MultiOption` | checkbox group                 | `CheckBox`                                                                        |
| `ManyToOne`   | reference select               | `SelectTree`                                                                      |
| `OneToOne`    | reference select               | `SelectTree`                                                                      |
| `ManyToMany`  | relation table + picker dialog | `SelectTree`, `TagList`                                                           |
| `OneToMany`   | relation table                 | -                                                                                 |
| `File`        | file upload                    | `Image`                                                                           |
| `MultiFile`   | multi-file upload              | `MultiImage`                                                                      |
| `JSON`        | CodeMirror JSON editor         | `JsonTree`                                                                        |
| `Filters`     | filter builder                 | -                                                                                 |
| `Orders`      | order builder                  | -                                                                                 |
| `DTO`         | CodeMirror JSON editor         | `JsonTree`                                                                        |

## String Widgets

### Default `String`

```tsx
<Field fieldName="name" />
```

### `URL`, `Email`, `Color`

```tsx
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="contactEmail" widgetType="Email" />
<Field fieldName="themeColor" widgetType="Color" />
```

### `Phone`

International phone input. Stores a single E.164 string (e.g. `"+6591234567"`). The widget composes a country picker (flag + dial code) with a national-number input that formats as the user types via `libphonenumber-js` `AsYouType`. Country list, names, and dial codes are fetched from the backend endpoint `GET /CountryRegion/listDialCodes` via `useDialCodes()` so the supported countries and i18n labels stay server-driven; `libphonenumber-js` handles validation/parsing/formatting locally.

Paste-friendly: pasting a value that begins with `+` re-parses to switch the country picker and reformat the national digits. Read-only mode renders the value in international format (e.g. `"+65 9123 4567"`).

```tsx
<Field fieldName="workPhone" widgetType="Phone" />
```

Value contract: E.164 `string` (`"+<dialCode><nationalDigits>"`), or empty string when no number is entered. Schema-level validation should use `phoneE164` / `phoneE164Optional` from `@/utils/schema-validators`.

### `Text`

```tsx
<Field fieldName="description" widgetType="Text" />
```

### `RichText`

Tiptap-based WYSIWYG rich text editor. Stores and reads HTML strings.

Toolbar: bold, italic, underline, strikethrough, headings (H1–H4), bullet/ordered lists, indent/outdent, text alignment, link, image upload, table, horizontal rule, highlight, undo/redo.

Image handling:

- **Upload** — toolbar image button opens a native file picker; the selected image is read as a base64 data URL and inserted inline. No external URL input.
- **Resize** — click an image to select it, then drag any of the four corner handles to resize. Width is stored on the node; height scales proportionally via `height: auto`.
- **Serialization** — images are stored in HTML with inline styles for portability: `<img src="..." width="400" style="width: 400px; max-width: 100%; height: auto;">`. Images without an explicit width get `style="max-width: 100%; height: auto;"`.

Two-level lazy loading: read-only mode renders raw HTML without loading the editor; edit mode lazy-loads the full Tiptap editor.

```tsx
<Field fieldName="content" widgetType="RichText" />
```

### `TemplateEditor`

Tiptap-based template editor for designing email templates, document templates, and other content intended for backend rendering and PDF generation.

Storage format: HTML with `data-tpl-*` attributes for template-specific nodes. The editor round-trips between stored HTML and Tiptap JSON automatically via custom `parseHTML` / `renderHTML` rules.

Features:

- **Field placeholders** — insert model fields as inline chips. HTML output: `<span data-tpl-field="fieldPath" data-tpl-label="label">{{fieldPath}}</span>`. The Insert Field picker (including related one-level paths and loop-table column choices) excludes `reversedFields` from `@/types/BaseModel` (e.g. `id`, `tenantId`, `version`, audit timestamps and user references), matching other flows that treat these as system-managed.
- **Custom variables** — insert single-use variables as inline chips. HTML output: `<span data-tpl-variable="employee_name" data-tpl-label="Employee Name" data-tpl-value-type="String" data-tpl-required="true">{{employee_name}}</span>`
- **Signature slots** — insert fixed-size inline signature placeholders that can live inside text flow. Multiple signature slots can be inserted on the same line, sit side by side, and leave room for typed spacing or text between slots. Default toolbar presets map to signing-party slots such as `Sender` and `Receiver`. HTML output: `<span data-tpl-signature="Sender" data-tpl-label="Sender Signature"></span>`
- **Relation field expansion** — expand `ManyToOne` / `OneToOne` relations one level to insert nested paths (e.g. `department.name`)
- **Loop tables** — insert `OneToMany` / `ManyToMany` relations as loop tables with selectable columns. HTML output: `<table data-tpl-loop="relationField" data-tpl-model="RelatedModel">` with `<th data-tpl-field="col">` headers
- **Toolbar actions** — `Insert Field`, `Insert Variable`, and `Insert Signature`, each individually configurable via widget props
- **Two-level lazy loading** — same as `RichText`: read-only renders HTML without Tiptap; edit mode lazy-loads the full editor
- **Saved-record preview** — `DocumentTemplate` RichText records can open `/admin/document-template/[id]/preview` in a new tab, use the left-side outline to jump between variables and signature slots, switch `Preview As` between `All`, `Sender`, and `Receiver`, and click highlighted placeholders in the document preview to fill custom variables and capture signatures locally

```tsx
<Field
  fieldName="offerLetterTemplate"
  widgetType="TemplateEditor"
  widgetProps={{ modelName: "Employee" }}
/>
```

```tsx
<Field
  fieldName="htmlTemplate"
  widgetType="TemplateEditor"
  widgetProps={{ modelName: "{{ modelName }}" }}
/>
```

`TemplateEditor` widget props:

| Prop                    | Type               | Default | Notes                                                                                                                                   |
| ----------------------- | ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `modelName`             | `string`           | -       | Model whose fields are available for insertion. Supports static values like `"Employee"` and field references like `"{{ modelName }}"`. |
| `minHeight`             | `number \| string` | `320px` | Minimum editor height.                                                                                                                  |
| `enableInsertField`     | `boolean`          | `true`  | Whether the toolbar shows `Insert Field`.                                                                                               |
| `enableInsertVariable`  | `boolean`          | `true`  | Whether the toolbar shows `Insert Variable`.                                                                                            |
| `enableInsertSignature` | `boolean`          | `true`  | Whether the toolbar shows `Insert Signature`.                                                                                           |

If `modelName` is omitted, falls back to the field's own `metaField.modelName`.

Custom variable schema:

| Attribute   | Type                                            | Notes                                                                                                              |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `code`      | `string`                                        | Required. Must start with a letter and then use only letters, numbers, or underscores. Unique within the template. |
| `label`     | `string`                                        | Required display label for editor/read-only preview.                                                               |
| `valueType` | `"String" \| "Date" \| "DateTime" \| "Boolean"` | Drives preview input type and formatting.                                                                          |
| `required`  | `boolean`                                       | Required variables show validation feedback in the preview page until filled.                                      |

Custom variable behavior:

- `Insert Variable` opens a dialog for `code`, `label`, `valueType`, and `required`
- `code` is required and must be unique within the template
- existing variable chips can be edited in the editor to update `code`, `label`, `valueType`, and `required`

Signature slot behavior:

- `Insert Signature` opens a dropdown with `Sender Signature` and `Receiver Signature`
- selecting `Sender Signature` inserts a signature slot with `code="Sender"`
- selecting `Receiver Signature` inserts a signature slot with `code="Receiver"`
- `code` is required and must be unique within the template
- default slot size is `240 x 120`; click a slot to select it and drag any corner handle to resize both width and height freely (min `120 x 60`)
- resized dimensions are stored on the node as `data-tpl-width` / `data-tpl-height` attributes and inline `style`; the signed image inside fills the slot via `width: 100%; height: 100%; object-fit: contain`
- multiple signature slots can be inserted on the same line
- adjacent signature slots can share the same row, with normal text or spacing inserted between them
- existing signature slots can be edited in the editor to update their `code` and `label`
- preview page supports hand-drawn signatures and local uploaded signature images

Role-aware preview and signing behavior:

- `/admin/document-template/[id]/preview` includes a `Preview As` selector with `All`, `Sender`, and `Receiver`
- `Preview As = All` keeps every signature slot editable for admin/template testing workflows
- `Preview As = Sender` only allows the `Sender` signature slot to open the signature dialog; other signature slots render as locked/read-only
- `Preview As = Receiver` only allows the `Receiver` signature slot to open the signature dialog; other signature slots render as locked/read-only
- the preview outline mirrors this state by marking the active party slot as editable and the other slot as locked
- `/admin/signing-document/[id]/sign` is the focused signing workspace for a single assigned slot and displays the resolved signing party label from `SigningDocument.signSlotCode`
- the signing workspace only submits the assigned `signSlotCode`; if no slot is assigned, signing is blocked and the page shows an empty-state warning instead of the signature capture workflow
- current preset role labels are `Sender` and `Receiver`; if additional parties are introduced later, update the shared signature preset definitions before extending template or signing flows

### `yyyy-MM`

Month-year picker stored as a `"yyyy-MM"` string (e.g. `"2024-03"`). Renders a popover panel with year navigation (arrows) and a month grid. Clicking the year label switches to a year-grid page view; clicking a year returns to the month grid.

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />

<Field
  fieldName="reportPeriod"
  widgetType="yyyy-MM"
  widgetProps={{ min: "2020-01", max: "2030-12", defaultPanelYear: 2026 }}
/>
```

`yyyy-MM` widget props:

| Prop               | Type      | Default      | Notes                                                                                  |
| ------------------ | --------- | ------------ | -------------------------------------------------------------------------------------- |
| `min`              | `string`  | `"1900-01"`  | Lower bound, inclusive. Format: `"yyyy-MM"`. Falls back to default if invalid.         |
| `max`              | `string`  | `"2100-12"`  | Upper bound, inclusive.                                                                |
| `clearable`        | `boolean` | `true`       | Show **Clear** button in the panel footer.                                             |
| `showQuickPick`    | `boolean` | `true`       | Show **This month** quick button (disabled when current month is out of `[min, max]`). |
| `yearStep`         | `number`  | `1`          | Year-grid stepping. `5` lays out 1900, 1905, 1910, … in the year view.                 |
| `defaultPanelYear` | `number`  | current year | First-open panel year when the field has no value. Clamped to `[min.year, max.year]`.  |
| `yearsPerPage`     | `number`  | `12`         | Year-grid page size. Common alternates: 16, 20.                                        |

Months outside `[min, max]` are rendered but disabled in the month grid; same for years outside the range in the year grid.

Value contract: `string` in `"yyyy-MM"` format, or `undefined` when cleared.

### `MM-dd`

Month-day picker stored as a `"MM-dd"` string (e.g. `"03-15"`). Renders a popover panel with a day-grid calendar. Clicking the month label in the header switches to a month-grid view; clicking a month returns to the day grid for that month. February 29 is always selectable (year-independent field).

```tsx
<Field fieldName="anniversary" widgetType="MM-dd" />

<Field
  fieldName="fiscalYearStart"
  widgetType="MM-dd"
  widgetProps={{ min: "01-01", max: "06-30", firstDayOfWeek: 1 }}
/>
```

`MM-dd` widget props:

| Prop                | Type                                | Default       | Notes                                                                                                                |
| ------------------- | ----------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `min`               | `string`                            | `"01-01"`     | Lower bound, inclusive. Format: `"MM-dd"`.                                                                           |
| `max`               | `string`                            | `"12-31"`     | Upper bound, inclusive. Cross-year ranges (`min > max`, e.g. `"10-01"` → `"03-31"`) are not supported and fall back. |
| `clearable`         | `boolean`                           | `true`        | Show **Clear** button.                                                                                               |
| `showQuickPick`     | `boolean`                           | `true`        | Show **Today** quick button (disabled when today is out of `[min, max]`).                                            |
| `firstDayOfWeek`    | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6`   | `0` (Sunday)  | Week start. Default `0` matches the international product positioning; set `1` for ISO/Monday, etc.                  |
| `defaultPanelMonth` | `1..12`                             | current month | First-open panel month when the field has no value. Clamped to `[min.month, max.month]`.                             |

Days and months outside `[min, max]` are rendered but disabled.

Value contract: `string` in `"MM-dd"` format, or `undefined` when cleared.

### `CronEditor`

Visual cron expression editor. Stores a standard cron string (5-part or 6-part). Opens a popover panel with tabbed editors for each cron position (Seconds, Minutes, Hours, Day, Month, Week). Each tab supports four modes: Every (wildcard), Specific values (multi-select grid), Range (from–to), and Interval (every N starting at X). The panel shows a live expression preview and the next scheduled run times.

```tsx
<Field fieldName="cronExpression" widgetType="CronEditor" />
```

```tsx
<Field
  fieldName="schedule"
  widgetType="CronEditor"
  widgetProps={{ format: "5-part" }}
/>
```

`CronEditor` widget props:

| Prop           | Type                   | Default  | Notes                                                  |
| -------------- | ---------------------- | -------- | ------------------------------------------------------ |
| `format`       | `"6-part" \| "5-part"` | `"6-part"` | 6-part includes seconds tab; 5-part hides it.        |
| `showPreview`  | `boolean`              | `true`   | Show next run times preview in the panel.              |
| `previewCount` | `number`               | `5`      | Number of next run times to display.                   |

Value contract: `string` in standard cron format (e.g. `"0 30 9 * * *"` for 6-part, `"30 9 * * *"` for 5-part), or empty string when cleared.

### `Markdown`

```tsx
<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>
```

`Markdown` widget props:

| Prop           | Type                             | Default   | Notes                                                                       |
| -------------- | -------------------------------- | --------- | --------------------------------------------------------------------------- |
| `mode`         | `"split" \| "edit" \| "preview"` | `"split"` | `split` shows editor + preview; `edit` editor only; `preview` preview only. |
| `height`       | `number \| string`               | -         | Fixed height for editor/preview panels.                                     |
| `minHeight`    | `number \| string`               | `320px`   | Minimum panel height.                                                       |
| `maxHeight`    | `number \| string`               | -         | Maximum panel height.                                                       |
| `lineNumbers`  | `boolean`                        | `true`    | Editor gutter line numbers.                                                 |
| `lineWrapping` | `boolean`                        | `true`    | Wrap long markdown lines.                                                   |
| `tabSize`      | `number`                         | `2`       | Editor indentation size.                                                    |
| `autoFocus`    | `boolean`                        | `false`   | Focus editor after mount.                                                   |

Editor toolbar (shown in `edit` and `split` modes):

- **Line count** — displays total line count (visible when `lineNumbers` is `true`)
- **Search** — opens CodeMirror search panel (also available via `Ctrl/Cmd+F`)
- **Copy** — copies full editor content to clipboard

When the field is read-only and the value is empty (or whitespace only), the editor body shows `CodeEditorEmptyState` (`shared/code-editor-empty-state.tsx`) with UI caption styling instead of an empty CodeMirror; default copy: “No content to display.” Custom hosts (for example Studio preview dialogs) can pass `emptyMessage` on `CodeEditorEmptyState` when composing it directly.

Preview is rendered by `react-markdown` with `remark-gfm` enabled by default.

### `Code`

```tsx
<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>
```

`Code` widget props:

| Prop               | Type                                                                                          | Default   | Notes                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `language`         | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"` | `"plain"` | Syntax highlighting language.                                                                                                            |
| `height`           | `number \| string`                                                                            | -         | Fixed editor height.                                                                                                                     |
| `minHeight`        | `number \| string`                                                                            | `240px`   | Minimum editor height.                                                                                                                   |
| `maxHeight`        | `number \| string`                                                                            | -         | Maximum editor height.                                                                                                                   |
| `lineNumbers`      | `boolean`                                                                                     | `true`    | Editor gutter line numbers.                                                                                                              |
| `lineWrapping`     | `boolean`                                                                                     | `true`    | Wrap long lines.                                                                                                                         |
| `tabSize`          | `number`                                                                                      | `2`       | Editor indentation size.                                                                                                                 |
| `autoFocus`        | `boolean`                                                                                     | `false`   | Focus editor after mount.                                                                                                                |
| `showDownload`     | `boolean`                                                                                     | `true`    | Toolbar **Download** control. Set `false` to hide. Hidden while the form is submitting (`isSubmitting`).                                 |
| `downloadFileName` | `string`                                                                                      | -         | Suggested download file name. Defaults to a sanitized `fieldName` plus an extension inferred from `language` (for example `script.sql`). |

Editor toolbar:

- **Line count** — displays total line count (visible when `lineNumbers` is `true`)
- **Search** — opens CodeMirror search panel (also available via `Ctrl/Cmd+F`)
- **Copy** — copies full editor content to clipboard
- **Download** — saves the current value as a text file in the browser (client-side Blob; no server call). Still available when the field is read-only.

When read-only and the value is empty (or whitespace only), the editor body shows `CodeEditorEmptyState` instead of an empty CodeMirror (same behavior and defaults as the `Markdown` widget section above).

## `MultiString`

```tsx
<Field fieldName="tags" />
```

## Numeric Widgets

### `Monetary`

```tsx
<Field fieldName="amount" widgetType="Monetary" />
```

### `Percentage`

```tsx
<Field fieldName="ratio" widgetType="Percentage" />
```

### `Slider`

```tsx
<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>
```

`Slider` widget props:

| Prop       | Type     | Default                          | Notes                 |
| ---------- | -------- | -------------------------------- | --------------------- |
| `minValue` | `number` | `0`                              | Minimum slider value. |
| `maxValue` | `number` | `100`                            | Maximum slider value. |
| `step`     | `number` | inferred from field type / scale | Step size.            |

## Boolean And Option Widgets

`Option` and `MultiOption` interactive widgets (`OptionSelect`, `Radio`, `StatusBar`, `CheckBox`) support client-side option filtering via `Field.filters` — the filter is matched on each option's `itemCode`. `Badge` is display-only and unaffected. See [Fields → `filters`](./fields#filters).

### `CheckBox`

```tsx
<Field fieldName="active" widgetType="CheckBox" />
```

### `Radio`

```tsx
<Field fieldName="status" widgetType="Radio" />
```

`Radio` widget props:

| Prop        | Type                         | Default      | Notes                        |
| ----------- | ---------------------------- | ------------ | ---------------------------- |
| `direction` | `"horizontal" \| "vertical"` | `"vertical"` | Radio item layout direction. |

### `StatusBar`

```tsx
<Field fieldName="status" widgetType="StatusBar" />
```

`StatusBar` widget props:

| Prop   | Type      | Default | Notes                       |
| ------ | --------- | ------- | --------------------------- |
| `wrap` | `boolean` | `true`  | Allow status items to wrap. |

### Read-only display (default)

`Option` / `MultiOption` fields **automatically** render as a read-only display when the surrounding context is read-only — no `widgetType` declaration needed.

- Any selected option carrying `itemTone` → coloured `StatusBadge`.
- No `itemTone` on any selected option → plain text (`itemName`, comma-separated for MultiOption).
- Empty value → `-`.

```tsx
// In a card body, board card, table cell, or read-only form:
<Field fieldName="status" />
<Field fieldName="tags" />
```

### `StatusIcon`

Compact icon-only indicator for `Option` fields. Use this in dense table cells, board cards, and status strips where a colored icon conveys the state more directly than a labeled badge.

```tsx
<Field fieldName="deployStatus" widgetType="StatusIcon" />
```

**Zero per-page config** — colour and icon are read entirely from the option-set's `itemTone` and `itemIcon` metadata. To change the visual for a status, edit the option-set, not the page.

`StatusIcon` widget props:

| Prop            | Type     | Default | Notes                                       |
| --------------- | -------- | ------- | ------------------------------------------- |
| `iconClassName` | `string` | -       | Extra className applied to the rendered icon. |

For value-driven use outside a `Field` (e.g. when the value comes from sidecar data with no surrounding `RecordContext`), import the underlying primitive directly:

```tsx
import { StatusIcon } from "@/components/fields/widgets/option/StatusIconWidget";

<StatusIcon value={lastDeployment.deployStatus} />
```

#### Option metadata → presentation

The `OptionReference` shape that drives all presentation:

```ts
{
  itemCode: string;
  itemName: string;
  itemTone?: "Success" | "Warning" | "Error" | "Info" | "Neutral";
  itemIcon?: string;  // key into STATUS_ICON_REGISTRY
}
```

Tone codes match the backend `OptionItemTone` enum (Title-Case). `itemTone` resolves to a colour preset:

| `itemTone` | Text colour                | Default icon                |
| ---------- | -------------------------- | --------------------------- |
| `Success`  | `text-emerald-600`         | `Check` (`CheckCircle2`)    |
| `Warning`  | `text-amber-600`           | `Alert` (`AlertCircle`)     |
| `Error`    | `text-destructive`         | `X` (`XCircle`)             |
| `Info`     | `text-sky-600`             | `Info` (`Info`)             |
| `Neutral`  | `text-muted-foreground`    | `Pending` (`CircleDashed`)  |

`itemIcon` keys match the backend `OptionItemIcon` enum and resolve through the frontend's `STATUS_ICON_REGISTRY`. Current registry keys:

| Key       | Component       | Notes                              |
| --------- | --------------- | ---------------------------------- |
| `Check`   | `CheckCircle2`  |                                    |
| `X`       | `XCircle`       |                                    |
| `Ban`     | `Ban`           |                                    |
| `Alert`   | `AlertCircle`   |                                    |
| `Pause`   | `PauseCircle`   |                                    |
| `Info`    | `Info`          |                                    |
| `Eye`     | `Eye`           |                                    |
| `Loader`  | `Loader2`       | Animates by default (`spin: true`) |
| `Clock`   | `Clock`         |                                    |
| `Pending` | `CircleDashed`  |                                    |
| `Undo`    | `Undo2`         |                                    |
| `Lock`    | `Lock`          |                                    |

Adding a new icon key requires (a) adding the code to the backend `OptionItemIcon` enum + the system option-set, (b) adding the entry to `icon-registry.ts`. Keep the set small — most cases are covered by the 5 tone-default icons.

## Date And Time Widgets

### `HH:mm` / `HH:mm:ss`

Time picker stored as `"HH:mm"` (e.g. `"09:30"`) or `"HH:mm:ss"` (e.g. `"09:30:15"`). Renders a popover with a column-list panel — one column per unit (hours / minutes / [seconds]) where candidates are generated from the configured step. Selecting a cell commits the new value; cross-column boundary disabling enforces `[min, max]` exactly. Replaces the native `<input type="time">` for cross-browser consistency.

```tsx
<Field fieldName="startTime" widgetType="HH:mm" />

<Field
  fieldName="meetingTime"
  widgetType="HH:mm"
  widgetProps={{
    min: "09:00",
    max: "18:00",
    minuteStep: 15,
    quickOptions: ["09:00", "10:30", "14:00", "16:30"],
  }}
/>

<Field
  fieldName="processStartTime"
  widgetType="HH:mm:ss"
  widgetProps={{ secondStep: 15, defaultTime: "00:00:00" }}
/>
```

`HH:mm` / `HH:mm:ss` widget props:

| Prop            | Type       | Default                  | Notes                                                                                                                                                            |
| --------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min`           | `string`   | `"00:00"` / `"00:00:00"` | Lower bound, inclusive. Format matches the widget's own format string.                                                                                           |
| `max`           | `string`   | `"23:59"` / `"23:59:59"` | Upper bound, inclusive.                                                                                                                                          |
| `clearable`     | `boolean`  | `true`                   | Show **Clear** button.                                                                                                                                           |
| `showQuickPick` | `boolean`  | `true`                   | Show **Now** quick button (disabled when current time is out of `[min, max]`).                                                                                   |
| `minuteStep`    | `number`   | `1`                      | Minute candidate granularity. Legal: `1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30`. Out-of-set values fall back to `1` with a dev-mode warn.                            |
| `secondStep`    | `number`   | `1`                      | Second candidate granularity. Only used by `HH:mm:ss`; ignored for `HH:mm`. Same legal set as `minuteStep`.                                                      |
| `defaultTime`   | `string`   | -                        | First-open prefilled value when the field has no value. Snapped up to the step grid; falls back to `min` if it can't fit in `[min, max]`.                        |
| `quickOptions`  | `string[]` | -                        | Custom preset chips above the columns (e.g. `["09:00", "12:00", "18:00"]`). Each option must be in `[min, max]` and aligned to the step grid; otherwise disabled. |
| `use12Hours`    | `boolean`  | `false`                  | Type-only placeholder — not implemented in this version.                                                                                                         |

Footer behavior:

- **Apply** (✓ icon, always shown): Confirms current panel state and closes the popover. If the field is empty, fills with `min` first.
- **Now** (when `showQuickPick=true`): Sets the wall-clock time, subject to `[min, max]`. Does not close the popover, so the user can adjust further before Apply.
- **Clear** (when `clearable=true`): Sets the field to empty. Does not close the popover.

Off-grid existing values (e.g. saved `"09:23"` with `minuteStep=15`) are preserved on the trigger button verbatim. The columns won't show a "selected" highlight for off-grid components; picking from the grid snaps to the grid.

Value contract: `string` in the widget's format, or `undefined` when cleared.

### `Relative`

Renders a `Date` / `DateTime` value as a human-readable distance from now (e.g. `"2 days ago"`, `"in 3 hours"`). The absolute timestamp is exposed via the `title` attribute as a hover tooltip so precise time stays accessible.

```tsx
<Field fieldName="updatedTime" widgetType="Relative" />
<Field fieldName="dueDate" widgetType="Relative" widgetProps={{ strict: false }} />
```

**Display-only widget.** Never exposes an editor — even on editable fields. Apply only to readonly fields or read-only surfaces (cards, tables, read-only forms). On an editable field the value will appear as plain text and the user cannot change it.

`Relative` widget props:

| Prop        | Type      | Default | Notes                                                                                          |
| ----------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `addSuffix` | `boolean` | `true`  | Include the `"ago"` / `"in"` modifier. Set `false` for raw distance like `"5 minutes"`.        |
| `strict`    | `boolean` | `true`  | Strict unit (`"2 days"`) vs natural phrasing (`"about 2 days"`). Strict avoids the `"about"` qualifier and uses a single unit. |

The relative phrase is rendered once at mount; it does not auto-update with the wall clock. The hover tooltip with the absolute timestamp is the affordance for precision, which is sufficient for typical card / table surfaces. If you need ticking updates, drive a re-render from the parent component (e.g. an interval) — the widget will pick up the new "now" on each render.

For value-driven use outside a `Field` (e.g. when the value comes from sidecar data with no surrounding form context), import the underlying primitive directly:

```tsx
import { RelativeTimeDisplay } from "@/components/fields/widgets/relative";

<RelativeTimeDisplay value={drift.lastCheckedTime} className="text-muted-foreground" />
```

### Quick range filter (column header)

`Date` / `DateTime` columns expose a date-range preset panel inside the column-header filter popover, sitting alongside the standard operator + value form. Users pick a semantic range with one click; the precise operator path stays available for fine control.

**Preset registry**

Presets are tagged with a `direction` (`past` / `future` / `neutral`) so the panel can adapt to the field's temporal nature. `neutral` presets always show; `past` / `future` show based on the panel's `mode`.

| Section | Direction | Items                                                                    |
| ------- | --------- | ------------------------------------------------------------------------ |
| Quick   | mixed     | `Today` (neutral), `Yesterday` (past), `Tomorrow` (future)               |
| Past    | past      | `Last 7 / 15 / 30 / 60 / 90 days` (rolling, **includes today**)          |
| Period  | neutral   | `This week`, `This month`, `This year`                                   |
| Future  | future    | `Next 7 / 15 / 30 / 60 / 90 days` (rolling, **includes today**, mirror)  |
| Unary   | —         | `Is set`, `Is not set` (one-click, no value required)                    |

**`filterDateRange` — choosing past / future / both**

Set `filterDateRange` on `<Field />` inside `ModelTable` / `RelationTable` to control which directions surface in that column's filter:

```tsx
// Default (no prop) — past + neutral. Right for created/updated time, hire date, etc.
<Field fieldName="createdTime" />

// Future + neutral — right for due dates, scheduled events, contract end.
<Field fieldName="contractEndDate" filterDateRange="future" />

// Both — right for double-sided fields (birthday, anniversary).
<Field fieldName="birthdayDate" filterDateRange="both" />
```

Concrete use case: surfacing employees whose birthday falls in the next 30 days is one click — `<Field fieldName="birthdayDate" filterDateRange="both" />` then pick `Next 30 days`.

`filterDateRange` is a UI-only declaration ("how should this column surface filters"), not backend metadata. It mirrors `filterBySource` in spirit — a call-site decision that does not belong in the model definition. Has no effect outside table contexts.

**Interaction**

- Clicking a preset auto-switches the operator to `BETWEEN` (or the matching unary), applies, and closes the popover. The operator dropdown does not need to be touched.
- Editing the operator or start / end date manually clears the preset highlight and waits for the explicit `Apply` button.
- Highlight is derived from the current `(operator, value)` against the registry. A "Today" filter saved yesterday opens highlighted as "Yesterday" the next day — reflecting current semantics rather than the original click.

**Time zone & week**

- Ranges resolve in `configs.timeZone` (or browser tz when unset), via `@date-fns/tz` for DST-safe boundaries.
- `weekStartsOn` defaults to Monday (`1`) and is overridable per call.

**Rolling-window semantics**

- Both `Last N days` and `Next N days` **include today**. So `Last 7 days` = `[today − 6, today]` and `Next 7 days` = `[today, today + 6]`, each spanning 7 calendar days.
- "Strictly future N days" can be expressed by combining `Tomorrow` + `Next N days` if needed.

**Persistence semantics**

- Presets are snapshotted to absolute `yyyy-MM-dd` start / end at click time. Saved views and shared URLs do not drift over time.
- Backend contract is unchanged: presets are sent as standard `BETWEEN` / `IS SET` / `IS NOT SET` `FilterCondition` units; no new operator is introduced.

**Single-source helpers** live at `src/components/views/table/utils/date-range-presets.ts`:

- `resolvePresetRange(id, options?)` — preset id → `{ start, end }` Date pair
- `matchPreset(bounds, options?)` — bounds → preset id or `null` (used for UI highlight)
- `filterPresetsByMode(presets, mode)` — filter registry by `"past" | "future" | "both"`
- `DATE_RANGE_PRESETS` — ordered registry for UI iteration; each entry carries `direction`

## Relation Widgets

### `SelectTree`

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

### `TagList`

```tsx
<Field fieldName="userIds" widgetType="TagList" tableView={UserTableView} />
```

See [Relation Fields](./relations) for relation-specific behavior, query rules, and `RelationTable`.

## File And Image Widgets

### `Image`

```tsx
<Field fieldName="avatar" widgetType="Image" />

<Field
  fieldName="photo"
  widgetType="Image"
  widgetProps={{
    display: "avatar",
    avatarSize: "xl",
    previewUrl: userInfo.photoUrl,
    crop: { enabled: true, aspect: 1, shape: "round" },
  }}
/>
```

`Image` widget props:

| Prop           | Type                           | Default                                                                  | Notes                                                                    |
| -------------- | ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `accept`       | `string`                       | `"image/*"`                                                              | Native file input accept string.                                         |
| `aspectRatio`  | `number \| string`             | -                                                                        | Preview ratio only.                                                      |
| `objectFit`    | `"cover" \| "contain"`         | `"cover"`                                                                | Preview image fit mode.                                                  |
| `uploadText`   | `string`                       | `"Upload image"` or `"Upload photo"`                                     | Empty-state upload text.                                                 |
| `helperText`   | `string`                       | -                                                                        | Widget-local helper text.                                                |
| `display`      | `"card" \| "avatar"`           | `"card"`                                                                 | `avatar` is the compact profile-photo layout.                            |
| `avatarSize`   | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"`                                                                   | Only used when `display="avatar"`.                                       |
| `previewUrl`   | `string`                       | -                                                                        | Existing image URL when the field value is still a saved file id string. |
| `crop.enabled` | `boolean`                      | `false`                                                                  | Enable crop flow before upload.                                          |
| `crop.aspect`  | `number`                       | `1` in `avatar` mode; otherwise derived from `aspectRatio`, else `4 / 3` | Crop ratio. `1` means square.                                            |
| `crop.shape`   | `"rect" \| "round"`            | `"rect"`                                                                 | Crop shape.                                                              |
| `crop.zoom`    | `boolean`                      | `true`                                                                   | Enable zoom control.                                                     |
| `crop.minZoom` | `number`                       | `1`                                                                      | Minimum zoom.                                                            |
| `crop.maxZoom` | `number`                       | `3`                                                                      | Maximum zoom.                                                            |

### `MultiImage`

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

`MultiImage` adds:

| Prop       | Type                    | Default | Notes                              |
| ---------- | ----------------------- | ------- | ---------------------------------- |
| `maxCount` | `number`                | -       | Maximum number of uploaded images. |
| `columns`  | `2 \| 3 \| 4 \| 5 \| 6` | `4`     | Gallery grid columns.              |

## Structured Value Widgets

### `JsonTree`

```tsx
<Field fieldName="config" widgetType="JsonTree" />
```

JSON editor widget props:

| Prop           | Type               | Default | Notes                        |
| -------------- | ------------------ | ------- | ---------------------------- |
| `height`       | `number \| string` | -       | Fixed editor height.         |
| `minHeight`    | `number \| string` | `240px` | Minimum editor height.       |
| `maxHeight`    | `number \| string` | -       | Maximum editor height.       |
| `lineNumbers`  | `boolean`          | `true`  | Editor gutter line numbers.  |
| `lineWrapping` | `boolean`          | `true`  | Wrap long lines.             |
| `tabSize`      | `number`           | `2`     | Indentation size.            |
| `formatOnBlur` | `boolean`          | `true`  | Reformat valid JSON on blur. |
| `autoFocus`    | `boolean`          | `false` | Focus editor after mount.    |

### `Filters`

```tsx
<Field fieldName="filters" />
```

`Filters` widget props:

| Prop            | Type       | Default | Notes                         |
| --------------- | ---------- | ------- | ----------------------------- |
| `allowedFields` | `string[]` | -       | Whitelist searchable fields.  |
| `excludeFields` | `string[]` | -       | Hide fields from the builder. |

### `Orders`

```tsx
<Field fieldName="orders" />
```

`Orders` widget props:

| Prop            | Type       | Default | Notes                      |
| --------------- | ---------- | ------- | -------------------------- |
| `allowedFields` | `string[]` | -       | Whitelist sortable fields. |
| `excludeFields` | `string[]` | -       | Hide fields from builder.  |

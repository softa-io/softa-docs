# Widget Matrix

Use this document for:

- `FieldType -> WidgetType` compatibility
- widget examples
- widget-specific `widgetProps`

Related docs:

- [Fields](./index): core `Field` props, conditions, `filters`, `Field.onChange`, value contracts
- [Relation fields](./relations): `RelationTable`, `SelectTree`, `OneToMany`, `ManyToMany`

## FieldType -> WidgetType Matrix

| FieldType     | Default behavior               | Supported WidgetType                                                              |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `String`      | single-line input              | `URL`, `Email`, `Text`, `RichText`, `TemplateEditor`, `Markdown`, `Code`, `Color`, `yyyy-MM`, `MM-dd`, `CronEditor` |
| `MultiString` | tag-style comma/enter input    | -                                                                                 |
| `Integer`     | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `Long`        | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `Double`      | numeric input                  | `Monetary`, `Percentage`, `Slider`                                                |
| `BigDecimal`  | decimal string input           | `Monetary`, `Percentage`, `Slider`                                                |
| `Boolean`     | switch                         | `CheckBox`                                                                        |
| `Date`        | date picker                    | -                                                                                 |
| `DateTime`    | datetime input                 | -                                                                                 |
| `Time`        | time input                     | `HH:mm:ss`, `HH:mm`                                                               |
| `Option`      | single select                  | `Radio`, `StatusBar`, `Badge`                                                     |
| `MultiOption` | checkbox group                 | `CheckBox`, `Badge`                                                               |
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
```

Value contract: `string` in `"yyyy-MM"` format, or `undefined` when cleared.

### `MM-dd`

Month-day picker stored as a `"MM-dd"` string (e.g. `"03-15"`). Renders a popover panel with a day-grid calendar. Clicking the month label in the header switches to a month-grid view; clicking a month returns to the day grid for that month. February 29 is always selectable (year-independent field).

```tsx
<Field fieldName="anniversary" widgetType="MM-dd" />
```

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

### `Badge`

Read-only badge display for `Option` and `MultiOption` fields. Renders the current value as colored `StatusBadge`(s) using `getOptionStatusBadgeVariant` — the same color logic as table cell auto-rendering.

- **`Option`** — renders a single badge for the selected value.
- **`MultiOption`** — renders one badge per selected value.

```tsx
<Field fieldName="status" widgetType="Badge" />
<Field fieldName="tags" widgetType="Badge" />
```

No widget props. Badge variant is derived from `itemColor` / text patterns (see table below).

### Option Color → Badge Auto-Rendering

When `OptionReference.itemColor` has a value, `Option` and `MultiOption` table cells automatically render as `StatusBadge` — no `widgetType="StatusBar"` required.

Supported `itemColor` values and their badge variants:

| `itemColor` keyword | Badge variant | Visual                           |
| ------------------- | ------------- | -------------------------------- |
| `green`             | `success`     | green border / background / text |
| `yellow`, `orange`  | `warning`     | amber border / background / text |
| `red`               | `error`       | red border / background / text   |
| `blue`              | `info`        | blue border / background / text  |
| _(other / empty)_   | `neutral`     | slate border / background / text |

Color matching is case-insensitive and uses `includes`, so values like `"Green"`, `"light-green"`, or `"#green-500"` all match.

When `itemColor` is empty, the mapper also falls back to `itemName` / `itemCode` text pattern matching:

| Text pattern (in `itemName` or `itemCode`)            | Badge variant |
| ----------------------------------------------------- | ------------- |
| `success`, `active`, `enabled`, `approved`            | `success`     |
| `pending`, `warning`, `draft`                         | `warning`     |
| `error`, `failed`, `inactive`, `disabled`, `rejected` | `error`       |
| `processing`, `running`, `published`                  | `info`        |

## Date And Time Widgets

```tsx
<Field fieldName="startTime" widgetType="HH:mm" />
<Field fieldName="startTime" widgetType="HH:mm:ss" />
```

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

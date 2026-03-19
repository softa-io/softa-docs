# Widget Matrix

Use this document for:

- `FieldType -> WidgetType` compatibility
- widget examples
- widget-specific `widgetProps`

Related docs:

- [Fields](./index): core `Field` props, conditions, `filters`, `Field.onChange`, value contracts
- [Relation fields](./relations): `RelationTable`, `SelectTree`, `OneToMany`, `ManyToMany`

## FieldType -> WidgetType Matrix

| FieldType     | Default behavior               | Supported WidgetType                                            |
| ------------- | ------------------------------ | --------------------------------------------------------------- |
| `String`      | single-line input              | `URL`, `Email`, `Text`, `RichText`, `TemplateEditor`, `Markdown`, `Code`, `Color` |
| `MultiString` | tag-style comma/enter input    | -                                                               |
| `Integer`     | numeric input                  | `Monetary`, `Percentage`, `Slider`                              |
| `Long`        | numeric input                  | `Monetary`, `Percentage`, `Slider`                              |
| `Double`      | numeric input                  | `Monetary`, `Percentage`, `Slider`                              |
| `BigDecimal`  | decimal string input           | `Monetary`, `Percentage`, `Slider`                              |
| `Boolean`     | switch                         | `CheckBox`                                                      |
| `Date`        | date picker                    | `yyyy-MM`, `MM-dd`                                              |
| `DateTime`    | datetime input                 | -                                                               |
| `Time`        | time input                     | `HH:mm:ss`, `HH:mm`                                             |
| `Option`      | single select                  | `Radio`, `StatusBar`                                            |
| `MultiOption` | checkbox group                 | `CheckBox`                                                      |
| `ManyToOne`   | reference select               | `SelectTree`                                                    |
| `OneToOne`    | reference select               | `SelectTree`                                                    |
| `ManyToMany`  | relation table + picker dialog | `SelectTree`, `TagList`                                         |
| `OneToMany`   | relation table                 | -                                                               |
| `File`        | file upload                    | `Image`                                                         |
| `MultiFile`   | multi-file upload              | `MultiImage`                                                    |
| `JSON`        | CodeMirror JSON editor         | `JsonTree`                                                      |
| `Filters`     | filter builder                 | -                                                               |
| `Orders`      | order builder                  | -                                                               |
| `DTO`         | CodeMirror JSON editor         | `JsonTree`                                                      |

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

Toolbar: bold, italic, underline, strikethrough, headings (H1–H4), bullet/ordered lists, indent/outdent, text alignment, link, image, table, horizontal rule, highlight, undo/redo.

Two-level lazy loading: read-only mode renders raw HTML without loading the editor; edit mode lazy-loads the full Tiptap editor.

```tsx
<Field fieldName="content" widgetType="RichText" />
```

### `TemplateEditor`

Tiptap-based template editor for designing email templates, document templates, and other content intended for backend rendering and PDF generation.

Storage format: HTML with `data-tpl-*` attributes for template-specific nodes. The editor round-trips between stored HTML and Tiptap JSON automatically via custom `parseHTML` / `renderHTML` rules.

Features:

- **Field placeholders** — insert model fields as inline chips. HTML output: `<span data-tpl-field="fieldPath" data-tpl-label="label">{{fieldPath}}</span>`
- **Relation field expansion** — expand `ManyToOne` / `OneToOne` relations one level to insert nested paths (e.g. `department.name`)
- **Loop tables** — insert `OneToMany` / `ManyToMany` relations as loop tables with selectable columns. HTML output: `<table data-tpl-loop="relationField" data-tpl-model="RelatedModel">` with `<th data-tpl-field="col">` headers
- **Field picker** — toolbar "Insert Field" button opens a popover listing fields grouped by direct / relation / collection
- **Two-level lazy loading** — same as `RichText`: read-only renders HTML without Tiptap; edit mode lazy-loads the full editor

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

| Prop        | Type               | Default  | Notes                                                    |
| ----------- | ------------------ | -------- | -------------------------------------------------------- |
| `modelName` | `string`           | -        | Model whose fields are available for insertion. Supports static values like `"Employee"` and field references like `"{{ modelName }}"`. |
| `minHeight` | `number \| string` | `320px`  | Minimum editor height.                                   |

If `modelName` is omitted, falls back to the field's own `metaField.modelName`.

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

| Prop           | Type                                                                                               | Default   | Notes                         |
| -------------- | -------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| `language`     | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"`   | `"plain"` | Syntax highlighting language. |
| `height`       | `number \| string`                                                                                 | -         | Fixed editor height.          |
| `minHeight`    | `number \| string`                                                                                 | `240px`   | Minimum editor height.        |
| `maxHeight`    | `number \| string`                                                                                 | -         | Maximum editor height.        |
| `lineNumbers`  | `boolean`                                                                                          | `true`    | Editor gutter line numbers.   |
| `lineWrapping` | `boolean`                                                                                          | `true`    | Wrap long lines.              |
| `tabSize`      | `number`                                                                                           | `2`       | Editor indentation size.      |
| `autoFocus`    | `boolean`                                                                                          | `false`   | Focus editor after mount.     |

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

## Date And Time Widgets

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="anniversary" widgetType="MM-dd" />
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
<Field fieldName="userIds" widgetType="TagList" tableView={userTableView} />
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

| Prop            | Type       | Default | Notes                        |
| --------------- | ---------- | ------- | ---------------------------- |
| `allowedFields` | `string[]` | -       | Whitelist searchable fields. |
| `excludeFields` | `string[]` | -       | Hide fields from the builder.|

### `Orders`

```tsx
<Field fieldName="orders" />
```

`Orders` widget props:

| Prop            | Type       | Default | Notes                     |
| --------------- | ---------- | ------- | ------------------------- |
| `allowedFields` | `string[]` | -       | Whitelist sortable fields.|
| `excludeFields` | `string[]` | -       | Hide fields from builder. |

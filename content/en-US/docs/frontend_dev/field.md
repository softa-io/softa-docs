# Fields

Metadata-driven field system used by `ModelForm`, relation dialogs, and inline editors.

## Related Docs

- `src/components/views/form/README.md`: `ModelForm`, `FormBody`, `FormToolbar`, page-level shell
- `src/components/views/table/README.md`: `ModelTable` and table-side renderers
- `src/components/views/tree/README.md`: low-level `Tree`, `TreePanel`, `SelectTreePanel`

## Import

Recommended business-facing import:

```tsx
import { Field } from "@/components/fields";
```

Other public exports:

```tsx
import {
  Field,
  defineRelationTableView,
  type RelationFormView,
  type RelationTableView,
} from "@/components/fields";
```

## Recommended Usage

Use `Field` as the single entry in app code:

```tsx
<Field fieldName="name" />
<Field fieldName="description" widgetType="Text" />
<Field fieldName="avatar" widgetType="Image" />
<Field fieldName="notes" widgetType="Markdown" />
```

The runtime resolves:

- `fieldType` from metadata
- the default field adapter from `fieldType`
- the optional widget renderer from `widgetType`

Prefer direct use of `StringField`, `ReferenceField`, `JsonField`, `FieldDispatcher`, or widget components only in internal infrastructure code.

## Field Props

`Field` is metadata-driven and supports field-level overrides.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `fieldName` | `string` | Yes | Metadata field key in current model. |
| `widgetType` | `WidgetType` | No | Optional widget override. Must be compatible with metadata `fieldType`. |
| `widgetProps` | `Record<string, unknown>` | No | Widget-specific config only. Parsed inside each widget. |
| `placeholder` | `string` | No | Field-level input placeholder. Prefer this over `widgetProps.placeholder`. |
| `hideLabel` | `boolean` | No | Hides the whole label block. |
| `fullWidth` | `boolean` | No | Layout hint for text-like and relation fields. |
| `readOnly` | `boolean` | No | Force read-only mode. |
| `labelName` | `string` | No | Metadata label override. |
| `description` | `string` | No | Metadata description override. |
| `required` | `boolean` | No | Metadata required override. |
| `readonly` | `boolean` | No | Metadata readonly override. |
| `defaultValue` | `unknown` | No | Metadata default value override. |
| `filters` | `string` | No | Metadata filter override, mainly for relation fields. |
| `tableView` | `RelationTableView` | No | OneToMany / ManyToMany table config. |
| `formView` | `RelationFormView` | No | Relation dialog/detail form config. |
| `isPaged` | `boolean` | No | Enables relation-table pagination mode. |

## FieldType And WidgetType Matrix

Current supported combinations:

| FieldType | Default behavior | Supported WidgetType |
| --- | --- | --- |
| `String` | single-line input | `URL`, `Email`, `Text`, `RichText`, `Markdown`, `Code`, `Color` |
| `MultiString` | tag-style comma/enter input | - |
| `Integer` | numeric input | `Monetary`, `Percentage`, `Slider` |
| `Long` | numeric input | `Monetary`, `Percentage`, `Slider` |
| `Double` | numeric input | `Monetary`, `Percentage`, `Slider` |
| `BigDecimal` | decimal string input | `Monetary`, `Percentage`, `Slider` |
| `Boolean` | switch | `CheckBox` |
| `Date` | date picker | `yyyy-MM`, `MM-dd` |
| `DateTime` | datetime input | - |
| `Time` | time input | `HH:mm:ss`, `HH:mm` |
| `Option` | single select | `Radio`, `StatusBar` |
| `MultiOption` | checkbox group | `CheckBox` |
| `ManyToOne` | reference select | `SelectTree` |
| `OneToOne` | reference select | `SelectTree` |
| `ManyToMany` | relation table + picker dialog | - |
| `OneToMany` | relation table | - |
| `File` | file upload | `Image` |
| `MultiFile` | multi-file upload | `MultiImage` |
| `JSON` | CodeMirror JSON editor | `JsonTree` |
| `Filters` | filter builder | - |
| `Orders` | order builder | - |
| `DTO` | CodeMirror JSON editor | `JsonTree` |

## Field Groups

### String Fields

#### Default `String`

No `widgetType` means a normal single-line input.

```tsx
<Field fieldName="name" />
```

#### `URL`, `Email`, `Color`

These are still lightweight string input modes:

```tsx
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="contactEmail" widgetType="Email" />
<Field fieldName="themeColor" widgetType="Color" />
```

#### `Text`

Multi-line textarea mode. `fullWidth` defaults to `true`.

```tsx
<Field fieldName="description" widgetType="Text" />
```

#### `RichText`

Rich HTML editor backed by `jodit-react`. The widget is lazy-loaded.

```tsx
<Field fieldName="content" widgetType="RichText" />
```

#### `Markdown`

Markdown editor + preview widget.

```tsx
<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>
```

`Markdown` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `mode` | `"split" \| "edit" \| "preview"` | `"split"` | `split` shows editor + preview; `edit` editor only; `preview` preview only. |
| `height` | `number \| string` | - | Fixed height for editor/preview panels. |
| `minHeight` | `number \| string` | `320px` | Minimum panel height. |
| `maxHeight` | `number \| string` | - | Maximum panel height. |
| `lineNumbers` | `boolean` | `true` | Editor gutter line numbers. |
| `lineWrapping` | `boolean` | `true` | Wrap long markdown lines. |
| `tabSize` | `number` | `2` | Editor indentation size. |
| `autoFocus` | `boolean` | `false` | Focus editor after mount. |

Preview is rendered by `react-markdown` with `remark-gfm` enabled by default.

#### `Code`

Source editor widget backed by CodeMirror.

```tsx
<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>
```

`Code` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `language` | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"` | `"plain"` | Syntax highlighting language. |
| `height` | `number \| string` | - | Fixed editor height. |
| `minHeight` | `number \| string` | `240px` | Minimum editor height. |
| `maxHeight` | `number \| string` | - | Maximum editor height. |
| `lineNumbers` | `boolean` | `true` | Editor gutter line numbers. |
| `lineWrapping` | `boolean` | `true` | Wrap long lines. |
| `tabSize` | `number` | `2` | Editor indentation size. |
| `autoFocus` | `boolean` | `false` | Focus editor after mount. |

### MultiString

`MultiStringField` is a tag-style input. Values are committed by `Enter`, `,`, or blur and stored as a comma-separated string in the form state.

```tsx
<Field fieldName="tags" />
```

### Numeric Fields

Default numeric behavior:

- `Integer`, `Long`, `Double` use number-like inputs
- `BigDecimal` keeps decimal string semantics

#### `Monetary`

Adds a currency-style decorated input.

```tsx
<Field fieldName="amount" widgetType="Monetary" />
```

#### `Percentage`

Adds a percentage-style decorated input.

```tsx
<Field fieldName="ratio" widgetType="Percentage" />
```

#### `Slider`

```tsx
<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>
```

`Slider` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `minValue` | `number` | `0` | Minimum slider value. |
| `maxValue` | `number` | `100` | Maximum slider value. |
| `step` | `number` | inferred from field type / scale | Step size. |

### Boolean And Option Fields

#### `Boolean`

Default behavior is a `Switch`.

```tsx
<Field fieldName="active" />
```

Use `CheckBox` for checkbox UI:

```tsx
<Field fieldName="active" widgetType="CheckBox" />
```

#### `Option`

Default behavior is a select dropdown.

```tsx
<Field fieldName="status" />
```

Use `Radio` or `StatusBar` when needed:

```tsx
<Field fieldName="status" widgetType="Radio" />
<Field fieldName="status" widgetType="StatusBar" />
```

`Radio` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `direction` | `"horizontal" \| "vertical"` | `"vertical"` | Radio item layout direction. |

`StatusBar` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `wrap` | `boolean` | `true` | Allow status items to wrap. |

#### `MultiOption`

Default behavior is checkbox group mode.

```tsx
<Field fieldName="permissions" />
```

### Date And Time Fields

#### `Date`

Default behavior is a standard date picker.

```tsx
<Field fieldName="birthday" />
```

Special date widgets:

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="anniversary" widgetType="MM-dd" />
```

#### `DateTime`

Default behavior is datetime input.

```tsx
<Field fieldName="startAt" />
```

#### `Time`

Default widget is `HH:mm:ss`.

```tsx
<Field fieldName="startTime" />
<Field fieldName="startTime" widgetType="HH:mm" />
<Field fieldName="startTime" widgetType="HH:mm:ss" />
```

### Reference And Relation Fields

#### `ManyToOne` / `OneToOne`

Default behavior is searchable reference selection:

```tsx
<Field fieldName="departmentId" />
```

Use `SelectTree` for hierarchical selection:

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

#### `OneToMany`

Rendered as relation table with inline or dialog editing. Public usage is still through `Field`.

```tsx
<Field fieldName="optionItems" tableView={optionItemsTableView} />
```

Common props:

- `tableView`: relation table columns / sorting / page size
- `formView`: dialog form for row create/edit
- `isPaged`: enable pagination / remote relation mode

Default submit behavior is incremental patch map:

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

#### `ManyToMany`

Rendered as relation table + picker dialog.

```tsx
<Field fieldName="userIds" tableView={userTableView} />
```

Default submit behavior is incremental patch map:

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

### File Fields

#### `File`

Default behavior is generic file upload.

```tsx
<Field fieldName="attachment" />
```

Use `Image` for image preview/upload mode:

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

#### `MultiFile`

Default behavior is generic multi-file upload.

```tsx
<Field fieldName="attachments" />
```

Use `MultiImage` for gallery upload mode:

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

`Image` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `accept` | `string` | `"image/*"` | Native file input accept string. |
| `aspectRatio` | `number \| string` | - | Preview ratio only. |
| `objectFit` | `"cover" \| "contain"` | `"cover"` | Preview image fit mode. |
| `uploadText` | `string` | `"Upload image"` or `"Upload photo"` | Empty-state upload text. |
| `helperText` | `string` | - | Widget-local helper text. |
| `display` | `"card" \| "avatar"` | `"card"` | `avatar` is the compact profile-photo layout. |
| `avatarSize` | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"` | Only used when `display="avatar"`. |
| `previewUrl` | `string` | - | Existing image URL when the field value is still a saved file id string. |
| `crop.enabled` | `boolean` | `false` | Enable crop flow before upload. |
| `crop.aspect` | `number` | `1` in `avatar` mode; otherwise derived from `aspectRatio`, else `4 / 3` | Crop ratio. `1` means square. |
| `crop.shape` | `"rect" \| "round"` | `"rect"` | Crop shape. |
| `crop.zoom` | `boolean` | `true` | Enable zoom control. |
| `crop.minZoom` | `number` | `1` | Minimum zoom. |
| `crop.maxZoom` | `number` | `3` | Maximum zoom. |

`MultiImage` adds:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `maxCount` | `number` | - | Maximum number of uploaded images. |
| `columns` | `2 \| 3 \| 4 \| 5 \| 6` | `4` | Gallery grid columns. |

### JSON, DTO, Filters, Orders

#### `JSON` / `DTO`

Default behavior is CodeMirror-based JSON editor.

```tsx
<Field fieldName="config" />
<Field fieldName="payload" />
```

Use `JsonTree` for read-oriented tree view:

```tsx
<Field fieldName="config" widgetType="JsonTree" />
```

JSON editor widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `height` | `number \| string` | - | Fixed editor height. |
| `minHeight` | `number \| string` | `240px` | Minimum editor height. |
| `maxHeight` | `number \| string` | - | Maximum editor height. |
| `lineNumbers` | `boolean` | `true` | Editor gutter line numbers. |
| `lineWrapping` | `boolean` | `true` | Wrap long lines. |
| `tabSize` | `number` | `2` | Indentation size. |
| `formatOnBlur` | `boolean` | `true` | Reformat valid JSON on blur. |
| `autoFocus` | `boolean` | `false` | Focus editor after mount. |

#### `Filters`

Always uses the filter builder by default.

```tsx
<Field fieldName="filters" />
```

`Filters` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `allowedFields` | `string[]` | - | Whitelist searchable fields. |
| `excludeFields` | `string[]` | - | Hide fields from the builder. |

#### `Orders`

Always uses the order builder by default.

```tsx
<Field fieldName="orders" />
```

`Orders` widget props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `allowedFields` | `string[]` | - | Whitelist sortable fields. |
| `excludeFields` | `string[]` | - | Hide fields from the builder. |

## Layout Notes

`fullWidth` is meaningful for:

- `Text`
- `RichText`
- `Markdown`
- `Code`
- `OneToMany`
- `ManyToMany`

Default is `true` for those layouts.

## ReadOnly Notes

Prefer `readOnly` over disabled controls when the user still needs to read or copy values clearly.

General guidance:

- `readOnly`: detail page, audit page, inspect-only state
- `disabled`: blocked by workflow, permissions, prerequisites, or submitting state

## Examples

```tsx
<Field fieldName="email" widgetType="Email" />

<Field fieldName="bio" widgetType="Text" fullWidth />

<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "preview", minHeight: 360 }}
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "sql", lineWrapping: false, minHeight: 320 }}
/>

<Field
  fieldName="avatar"
  widgetType="Image"
  widgetProps={{
    aspectRatio: "1 / 1",
    display: "avatar",
    crop: { enabled: true, shape: "round" },
  }}
/>

<Field
  fieldName="optionItems"
  tableView={optionItemsTableView}
  formView={OptionItemsFormView}
  isPaged
/>
```

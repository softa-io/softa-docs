# Fields

Metadata-driven field system used by `ModelForm`, relation dialogs, and inline editors.

## Related Docs
- [Form components](./form): `ModelForm`, `FormBody`, `FormToolbar`, page-level shell
- [Table components](./table): `ModelTable` and table-side renderers
- [Tree components](./tree): low-level `Tree`, `TreePanel`, `SelectTreePanel`

## Import

Recommended business-facing import:

```tsx
import { Field } from "@/components/fields";
```

Other public exports:

```tsx
import {
  Field,
  RelationTableView,
  type FieldCondition,
  type FieldConditionContext,
  type FieldOnChangeProp,
  type RelationFormView,
  type RelationTableViewProps,
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

`Field` is metadata-driven and supports field-level overrides and runtime conditions.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `fieldName` | `string` | Yes | Metadata field key in current model. |
| `widgetType` | `WidgetType` | No | Optional widget override. Must be compatible with metadata `fieldType`. |
| `widgetProps` | `Record<string, unknown>` | No | Widget-specific config only. Parsed inside each widget. Form widgets and inline editors use it; table read cells do not. |
| `placeholder` | `string` | No | Field-level input placeholder. Prefer this over `widgetProps.placeholder`. |
| `hideLabel` | `boolean` | No | Hides the whole label block. |
| `fullWidth` | `boolean` | No | Layout hint for text-like and relation fields. |
| `readOnly` | `boolean` | No | Force read-only mode. |
| `labelName` | `string` | No | Metadata label override. |
| `required` | `FieldCondition` | No | Dynamic required control. Supports `boolean`, `FilterCondition`, or function. |
| `readonly` | `FieldCondition` | No | Dynamic readonly control. Supports `boolean`, `FilterCondition`, or function. |
| `hidden` | `FieldCondition` | No | Dynamic visibility control. Hidden fields are not rendered and their validation is suppressed. |
| `defaultValue` | `unknown` | No | Create-only default override. Writes the initial form value and has higher priority than `metaField.defaultValue` and dialog/page `defaultValues`. |
| `filters` | `string \| FilterCondition` | No | Relation filter override. `Field.filters` overrides `metaField.filters`. Supports JSON-string metadata filters and declarative `#{fieldName}` references. |
| `onChange` | `FieldOnChangeProp` | No | Remote field linkage. Supports shorthand `string[]` or `{ update?, with? }`. |
| `tableView` | `ReactElement<RelationTableViewProps>` | No | OneToMany / ManyToMany table config. Must be a `<RelationTableView />` element. |
| `formView` | `RelationFormView` | No | Relation dialog/detail form config. |
| `isPaged` | `boolean` | No | Enables relation-table pagination mode. |

`FieldCondition`:

```ts
type FieldCondition =
  | boolean
  | FilterCondition
  | ((ctx: FieldConditionContext) => boolean);
```

`FieldConditionContext`:

```ts
interface FieldConditionContext {
  fieldName: string;
  metaField: MetaField;
  values: Record<string, unknown>;
  value: unknown;
  scope: "form" | "model-table" | "relation-table";
  rowIndex?: number;
  rowId?: string;
  isEditing: boolean;
  recordId?: string;
}
```

Behavior notes:

- `boolean`: simplest and most direct.
- `FilterCondition`: recommended declarative form for common business rules.
- `dependsOn([...], evaluator)`: explicit function-based condition with precise field subscriptions.
- invalid `FilterCondition` configs emit a dev warning and resolve to `false`.
- bare function conditions are not supported; wrap them with `dependsOn([...], evaluator)`.
- the same condition model is also used by `Action.disabled` and `Action.visible` in form and table toolbars.
- `hidden` suppresses both rendering and validation.
- in `ModelTable` / `RelationTableView` inline edit, condition `values` is the current row object, not the whole form object.
- in table declarations, `hidden` only supports `boolean` and hides the whole column.
- `widgetProps` is not propagated into `ModelTable` / `RelationTableView` read-mode cell renderers.
- `defaultValue` is intended for static field-level create defaults. Use dialog/page `defaultValues` only for runtime/contextual prefills such as route params, parent row values, or non-rendered fields.
- `required={false}` can relax metadata `required`; `readonly={false}` can override metadata readonly.

Examples:

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field fieldName="status" readonly={true} />

<Field fieldName="itemColor" hidden={["active", "=", false]} />

<Field
  fieldName="description"
  readonly={[
    ["status", "IN", ["approved", "archived"]],
    "OR",
    [["type", "=", "SYSTEM"], "AND", ["editable", "!=", true]],
  ]}
/>

<Field
  fieldName="itemName"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

## Relation `filters`

`filters` is mainly used by relation fields:

- `ManyToOne` / `OneToOne` searchable reference queries
- `SelectTree` relation picker queries
- `OneToMany` / `ManyToMany` remote relation-table queries
- `ManyToMany` picker dialog queries

Accepted input:

- `FilterCondition` in app code
- JSON string form from metadata / backend payloads

Recommended declarative value syntax inside filter values:

- `#{fieldName}`: resolve from current frontend scope before request
- `TODAY`, `NOW`, `USER_ID`, `USER_EMP_ID`, `USER_POSITION_ID`, `USER_DEPT_ID`, `USER_COMP_ID`: pass through unchanged and let backend replace environment variables
- `@{literal}`: pass through unchanged and force literal interpretation on backend

Examples:

```tsx
<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
    "AND",
    ["type", "=", "@{TODAY}"],
  ]}
/>
```

Behavior:

- `Field.filters` overrides `metaField.filters`
- if `Field.filters` is omitted, relation widgets fall back to `metaField.filters`
- `#{fieldName}` is resolved against current scope values:
  - `ModelForm`: current form values
  - `ModelTable` inline edit: current editing row
  - `RelationTableView` inline edit: current relation row
- resolved field values are normalized before request:
  - `ManyToOne` / `OneToOne` -> `id`
  - `Option` -> `itemCode`
  - `MultiOption` -> `itemCode[]`
- if any `#{fieldName}` dependency is missing, the relation query is treated as not ready and is not sent
- frontend does not evaluate backend environment tokens such as `TODAY`; they are passed through unchanged

`RelationTableView.initialParams.filters` supports the same syntax and is merged with effective field filters using `AND`.

## Remote `Field.onChange`

`Field` supports remote linkage through a top-level `onChange` prop:

```ts
type FieldOnChangeProp =
  | string[]
  | {
      update?: string[];
      with?: string[] | "all";
    };
```

Common examples:

```tsx
<Field fieldName="itemCode" onChange={["itemName", "itemColor"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["itemName"], with: ["active"] }}
/>

<Field
  fieldName="itemCode"
  onChange={{ with: "all" }}
/>
```

Behavior:

- `onChange={["a", "b"]}` is shorthand for `onChange={{ update: ["a", "b"] }}`.
- `update` present: only those fields are extracted from response `values`.
- `update` omitted: all response `values` keys within current scope are applied.
- `with` omitted: request only sends `id` in edit mode plus current field `value`.
- `with: ["a", "b"]`: request adds `values` with those fields in submit/API shape.
- `with: "all"`: request adds current scope values in submit/API shape.

Current supported scopes:

- `ModelForm`
- `ModelTable` inline edit current row
- `RelationTableView` inline edit current row

Current non-goals:

- standalone top-level `OneToMany` / `ManyToMany` container interactions are not source triggers
- standalone dialog forms do not automatically provide this runtime yet

Auto trigger rules:

- `blur`: text-like and editor-like fields such as `String`, `MultiString`, numeric inputs, `JSON`, `Filters`, `Orders`, `Code`, `Markdown`, `RichText`
- `change`: commit-style fields such as `Boolean`, `Date`, `DateTime`, `Time`, `Option`, `MultiOption`, `ManyToOne`, `OneToOne`, `File`, `MultiFile`

Backend contract used by frontend:

```http
POST /<modelName>/onChange/<fieldName>
```

Request payload:

```json
{
  "id": "123",
  "value": "ITEM-001",
  "values": {
    "active": true
  }
}
```

Response payload:

```json
{
  "values": {
    "itemName": "Open",
    "itemColor": "#22c55e"
  },
  "readonly": {
    "itemName": true
  },
  "required": {
    "itemColor": true
  }
}
```

Response rules:

- `values` only patches returned keys; missing keys are left unchanged.
- returned `null` means explicit clear.
- `readonly` / `required` are applied independently of `update`.
- remote `readonly` / `required` override metadata and local conditions until a later response or scope reset.

Scope notes:

- in `ModelForm`, `with: "all"` uses current form submit shape; registered top-level relation fields use relation patch payloads instead of raw UI rows.
- in `ModelTable` / `RelationTableView` inline edit, `values` and `with: "all"` are the current row only, not the whole table or parent form.

## Cascaded Fields

`MetaField.cascadedField` enables implicit auto-fill in edit scopes without requiring the source field to declare `Field.onChange`.

Example:

```ts
deptId.cascadedField = "employeeId.departmentId";
companyId.cascadedField = "employeeId.department.companyId";
```

Behavior:

- supported in `ModelForm`, `ModelTable` inline edit, and `RelationTableView` inline edit
- source field must be `ManyToOne` or `OneToOne` and define `relatedModel`
- when the source field changes, frontend requests `/<relatedModel>/getById` once and reads all dependent cascade paths from that response
- multiple targets depending on the same source are resolved in one lookup
- if the source field also declares `Field.onChange`, both effects run in parallel
- if both effects write the same target field, `cascadedField` wins
- clearing the source field clears all dependent cascaded targets without calling `getById`
- invalid cascade metadata is ignored with a dev warning

Syntax notes:

- format is `<sourceField>.<path>`
- `<sourceField>` must be a field in the same current scope
- `<path>` is read from the source model `getById` response and may be nested

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

Dependent relation filter example:

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

Notes:

- `filters` is applied to the default searchable reference query
- when `#{companyId}` has no current value, the selector stays query-disabled instead of loading all departments

Use `SelectTree` for hierarchical selection:

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

#### `OneToMany`

Rendered as relation table with inline or dialog editing. Public usage is still through `Field`.

```tsx
const optionItemsTableView = (
  <RelationTableView
    initialParams={{
      orders: [["sequence", "ASC"]],
      pageSize: 10,
      filters: [["companyId", "=", "#{companyId}"]],
    }}
  >
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTableView>
);

<Field fieldName="optionItems" tableView={optionItemsTableView} />
```

Common props:

- `tableView`: relation table columns via `<Field />` children, plus non-field query params via `initialParams`
- `formView`: dialog form for row create/edit
- `isPaged`: enable pagination / remote relation mode
- `tableView.initialParams.filters` uses the same declarative syntax as `Field.filters` and is merged with the effective field filter using `AND`

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
const userTableView = (
  <RelationTableView
    initialParams={{
      orders: [["username", "ASC"]],
      pageSize: 10,
      filters: [["companyId", "=", "#{companyId}"]],
    }}
  >
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="status" />
  </RelationTableView>
);

<Field fieldName="userIds" tableView={userTableView} />
```

Default submit behavior is incremental patch map:

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

Remote query notes:

- `ManyToMany` picker dialog merges `RelationTableView.initialParams.filters`, the effective field filter, internal relation-scoped filters, search filter, and column filters using `AND`
- unresolved `#{fieldName}` dependencies pause remote picker / relation-table queries until the source value exists

### Runtime Value Contracts

`Field.defaultValue`, container `defaultValues`, `form.getValues()`, and `useWatch()` all work with field UI values, not raw API payload values.

- `File`: UI value is `FileInfo | null`; submit value is `fileId | null`
- `MultiFile`: UI value is `FileInfo[]`; submit value is `fileId[] | null`
- `JSON` / `DTO`: committed values stay structured object/array data (or `null`)
- `Filters`: committed value stays `FilterCondition | null`
- `Orders`: committed value stays structured order tuples/arrays (or `null`)
- backend payloads and metadata defaults may still arrive as strings; the field runtime normalizes them into these UI shapes on load
- when you pass page/dialog `defaultValues`, use the UI shapes above directly instead of pre-stringifying values

### File Fields

#### `File`

Default behavior is generic file upload.

Runtime value contract:

- form/UI value is `FileInfo | null`
- submit automatically extracts `fileId`

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

Table read behavior:

- `ModelTable` and `RelationTableView` read `FileInfo.url` directly for preview/link rendering
- `widgetType="Image"` uses a compact thumbnail-only table cell and opens a preview dialog on click
- plain `File` uses a downloadable filename link
- table read cells intentionally ignore `widgetProps` such as `display="avatar"` and always use the compact table style

#### `MultiFile`

Default behavior is generic multi-file upload.

Runtime value contract:

- form/UI value is `FileInfo[]`
- submit automatically extracts `fileId[]`

```tsx
<Field fieldName="attachments" />
```

Use `MultiImage` for gallery upload mode:

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

Table read behavior:

- `ModelTable` and `RelationTableView` expect `FileInfo[]`
- `widgetType="MultiImage"` uses a compact thumbnail summary plus `+N` and opens a gallery preview dialog on click
- plain `MultiFile` uses the first filename link plus `+N`
- read-mode table rows stay single-line / no-wrap; only active inline edit rows may expand for file widgets

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

Runtime value contract:

- committed form value stays a structured object/array (or `null`)
- the editor keeps a temporary text draft while focused, but blur/commit writes structured data back into the form
- custom `defaultValues`, `getValues()`, and custom payload builders should treat these fields as structured data, not JSON strings

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

Runtime value contract:

- committed form value stays `FilterCondition | null`
- prefer passing `FilterCondition` directly in `defaultValue` / `defaultValues`; string input is only normalized on load

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

Runtime value contract:

- committed form value stays structured order tuples/arrays (or `null`)
- prefer passing structured order values directly in `defaultValue` / `defaultValues`; string input is only normalized on load

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
  tableView={
    <RelationTableView initialParams={{ orders: [["sequence", "ASC"]], pageSize: 10 }}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTableView>
  }
  formView={OptionItemsFormView}
  isPaged
/>
```

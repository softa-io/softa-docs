# Fields

Metadata-driven field system used by `ModelForm`, relation dialogs, and inline editors.

`Field` is the main business-facing entry for app code.

Use this README for:

- `Field` props and overrides
- `required` / `readonly` / `hidden`
- `dependsOn(...)`
- relation `filters`
- remote `Field.onChange`
- runtime value contracts
- field-type-level front-end behavior

Related docs:

- `./relation-fields.md`: `RelationTable`, `SelectTree`, `OneToMany`, `ManyToMany`
- `./widget-matrix.md`: `FieldType -> WidgetType` matrix and widget-specific examples
- [ModelForm](../form): page shell
- [ModelTable](../table): read cells and inline edit
- [Tree](../tree): internal tree primitives used by `sideTree` and `SelectTree`

## Import

Recommended business-facing import:

```tsx
import { Field } from "@/components/fields";
```

Additional public exports:

```tsx
import {
  Field,
  RelationTable,
  type FieldCondition,
  type FieldConditionContext,
  type FieldOnChangeProp,
  type RelationFormView,
  type RelationTableProps,
} from "@/components/fields";
```

Internal note:

- `ResolvedFields` is internal and should stay behind infrastructure code rather than becoming a business-facing field API

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

Use direct adapter components and low-level widgets only inside field infrastructure.

Quick relation examples:

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

```tsx
const userTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="email" />
  </RelationTable>
);

<Field fieldName="userIds" tableView={userTableView} />;
```

## Core Props

`Field` is metadata-driven and supports field-level overrides and runtime conditions.

| Prop           | Type                               | Required | Notes                                                                                                                                                     |
| -------------- | ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldName`    | `string`                           | Yes      | Metadata field key in current model.                                                                                                                      |
| `fieldType`    | `FieldType`                        | No       | Optional field-type override. If omitted, runtime uses metadata `fieldType`.                                                                              |
| `widgetType`   | `WidgetType`                       | No       | Optional widget override. Must be compatible with resolved `fieldType`.                                                                                   |
| `widgetProps`  | `Record<string, unknown>`          | No       | Widget-specific config only. Form widgets and inline editors use it; table read cells do not.                                                            |
| `placeholder`  | `string`                           | No       | Field-level input placeholder. Prefer this over `widgetProps.placeholder`.                                                                                |
| `hideLabel`    | `boolean`                          | No       | Hides the whole label block.                                                                                                                              |
| `fullWidth`    | `boolean`                          | No       | Layout hint for text-like and relation fields.                                                                                                            |
| `labelName`    | `string`                           | No       | Metadata label override.                                                                                                                                  |
| `required`     | `FieldCondition`                   | No       | Dynamic required control. Supports `boolean`, `FilterCondition`, or `dependsOn(...)`.                                                                    |
| `readonly`     | `FieldCondition`                   | No       | Dynamic readonly control. Supports `boolean`, `FilterCondition`, or `dependsOn(...)`.                                                                    |
| `hidden`       | `FieldCondition`                   | No       | Dynamic visibility control. Hidden fields are not rendered and their validation is suppressed.                                                            |
| `defaultValue` | `unknown`                          | No       | Create-only default override. Has higher priority than `metaField.defaultValue` and dialog/page `defaultValues`.                                         |
| `filters`      | `string \| FilterCondition`        | No       | Relation filter override. `Field.filters` overrides `metaField.filters`. Supports JSON-string metadata filters and `#{fieldName}` references.            |
| `onChange`     | `FieldOnChangeProp`                | No       | Remote field linkage. Supports shorthand `string[]` or `{ update?, with? }`.                                                                              |
| `tableView`    | `ReactElement<RelationTableProps>` | No       | Relation-table config for `OneToMany` / `ManyToMany`. Must be a `<RelationTable />` element. See `./relation-fields.md`.                                |
| `formView`     | `RelationFormView`                 | No       | Relation dialog/detail view config. See `./relation-fields.md`.                                                                                            |
| `isPaged`      | `boolean`                          | No       | Enables paged relation-table mode for `OneToMany` / `ManyToMany`. See `./relation-fields.md`.                                                            |

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
- the same condition model is also used by `Action.disabled` and `Action.hidden` in form and table toolbars.
- `hidden` suppresses both rendering and validation.
- in `ModelTable` / `RelationTable` inline edit, condition `values` is the current row object, not the whole form object.
- in table declarations, `hidden` only supports `boolean` and hides the whole column.
- `widgetProps` is not propagated into `ModelTable` / `RelationTable` read-mode cell renderers.
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

## `dependsOn(...)`

Use `dependsOn([...], evaluator)` when a field rule depends on other values and you want explicit subscriptions.

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

Why prefer `dependsOn(...)` over a bare function:

- the dependency list is explicit
- runtime subscriptions stay precise
- the evaluator is still fully programmable

Use `boolean` first, `FilterCondition` for declarative business rules, and `dependsOn(...)` when you truly need computed logic.

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

Example:

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
  - `RelationTable` inline edit: current relation row
- resolved field values are normalized before request:
  - `ManyToOne` / `OneToOne` -> `id`
  - `Option` -> `itemCode`
  - `MultiOption` -> `itemCode[]`
- if any `#{fieldName}` dependency is missing, the relation query is treated as not ready and is not sent
- frontend does not evaluate backend environment tokens such as `TODAY`; they are passed through unchanged

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
- `RelationTable` inline edit current row

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
- in `ModelTable` / `RelationTable` inline edit, `values` and `with: "all"` are the current row only, not the whole table or parent form.

## Cascaded Fields

`MetaField.cascadedField` enables implicit auto-fill in edit scopes without requiring the source field to declare `Field.onChange`.

Example:

```ts
deptId.cascadedField = "employeeId.departmentId";
companyId.cascadedField = "employeeId.department.companyId";
```

Behavior:

- supported in `ModelForm`, `ModelTable` inline edit, and `RelationTable` inline edit
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

## Field-Type Overview

This section explains the default front-end behavior by `fieldType`. For widget-specific variants and props tables, see `./widget-matrix.md`.

### String And Text

- `String`: default single-line text input
- `MultiString`: tag-style input; values are committed by `Enter`, `,`, or blur and stored as a comma-separated string in the form state
- common `String` widget variants:
  - `URL`
  - `Email`
  - `Color`
  - `Text`
  - `RichText`
  - `Markdown`
  - `Code`

Examples:

```tsx
<Field fieldName="name" />
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="Markdown" />
```

### Numeric Types

- `Integer`, `Long`, `Double`: number-like inputs
- `BigDecimal`: decimal string semantics are preserved
- common numeric widget variants:
  - `Monetary`
  - `Percentage`
  - `Slider`

```tsx
<Field fieldName="amount" widgetType="Monetary" />
<Field fieldName="ratio" widgetType="Percentage" />
<Field fieldName="score" widgetType="Slider" />
```

### Boolean And Option Types

- `Boolean`: default is `Switch`
- `Option`: default is single-select dropdown
- `MultiOption`: default is checkbox-group style multi-select

Common widget variants:

- `CheckBox`
- `Radio`
- `StatusBar`

```tsx
<Field fieldName="active" />
<Field fieldName="active" widgetType="CheckBox" />
<Field fieldName="status" widgetType="Radio" />
```

### Date And Time Types

- `Date`: standard date picker
- `DateTime`: datetime input
- `Time`: time input

Special format-oriented widgets:

- `Date`: `yyyy-MM`, `MM-dd`
- `Time`: `HH:mm`, `HH:mm:ss`

```tsx
<Field fieldName="birthday" />
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="startTime" widgetType="HH:mm" />
```

### Reference Types

- `ManyToOne` / `OneToOne`: default searchable relation selector
- use `filters` for dependent query constraints
- use `widgetType="SelectTree"` for hierarchical selection

```tsx
<Field fieldName="departmentId" />
<Field fieldName="departmentId" widgetType="SelectTree" />
```

See `./relation-fields.md` for `SelectTree`, `RelationTable`, `OneToMany`, and `ManyToMany`.

### File Types

- `File`: generic upload by default, `Image` for image-oriented mode
- `MultiFile`: generic multi-upload by default, `MultiImage` for gallery-oriented mode

```tsx
<Field fieldName="attachment" />
<Field fieldName="avatar" widgetType="Image" />
<Field fieldName="photos" widgetType="MultiImage" />
```

Table/read behavior:

- `ModelTable` and `RelationTable` read `FileInfo.url` directly for preview and download rendering
- table read cells intentionally ignore form-oriented `widgetProps`

### Structured Value Types

- `JSON` / `DTO`: structured object or array values, default editor is JSON-oriented
- `Filters`: filter-builder value
- `Orders`: order-builder value

```tsx
<Field fieldName="config" />
<Field fieldName="filters" />
<Field fieldName="orders" />
```

## Runtime Value Contracts

`Field.defaultValue`, container `defaultValues`, `form.getValues()`, and `useWatch()` all work with field UI values, not raw API payload values.

| Field type                | UI / form value                     | Submit / API shape                          |
| ------------------------- | ----------------------------------- | ------------------------------------------- |
| `File`                    | `FileInfo \| null`                  | `fileId \| null`                            |
| `MultiFile`               | `FileInfo[]`                        | `fileId[] \| null`                          |
| `JSON` / `DTO`            | structured object / array or `null` | structured object / array or `null`         |
| `Filters`                 | `FilterCondition \| null`           | `FilterCondition \| null`                   |
| `Orders`                  | structured order tuples or `null`   | structured order tuples or `null`           |
| `OneToMany`               | relation rows / row drafts          | incremental patch map                       |
| `ManyToMany`              | `ModelReference[]` or relation rows | incremental patch map                       |

Notes:

- backend payloads and metadata defaults may still arrive as strings; the field runtime normalizes them into UI shapes on load
- when you pass page/dialog `defaultValues`, use the UI shapes above directly instead of pre-stringifying values
- `ManyToMany` with `widgetType="TagList"` still submits the normal incremental patch map
- top-level relation field details are documented in `./relation-fields.md`

### `FileInfo`

`File` and `MultiFile` fields use `FileInfo` objects in UI state.

Important runtime behavior:

- preview and download rendering use `FileInfo.url`
- `File` read cells fall back to filename links
- `MultiFile` read cells show the first filename plus `+N`

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

Prefer `readonly` over disabled controls when the user still needs to read or copy values clearly.

General guidance:

- `readonly`: detail page, audit page, inspect-only state
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
```

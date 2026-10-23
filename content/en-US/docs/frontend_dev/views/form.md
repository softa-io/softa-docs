# ModelForm

Metadata-driven create/edit form container based on `react-hook-form` and Zod.

## Related Docs

- [Fields](../fields/fields)
- [Relation fields](../fields/relations)
- [Widget matrix](../fields/widgets)
- [Group (inline field layout)](../fields#group)
- [Actions](../actions)
- [Dialogs](./dialogs)
- [ModelTable](./table)

## Import

```tsx
import { ModelForm } from "@/components/views/form/ModelForm";
```

## Quick Start

Recommended usage in `src/app/**/[id]/page.tsx`:

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/actions/Action";
import { FormSection } from "@/components/views/form/components/FormSection";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";

export default function EditUserAccountPage() {
  return (
    <ModelForm modelName="UserAccount">
      <FormHeader />
      <FormToolbar>
        <Action
          label="Lock Account"
          operation="lockAccount"
          placement="more"
          confirmMessage="Lock this user account?"
          successMessage="User account locked."
        />
        <Action
          type="dialog"
          label="Unlock Account"
          operation="unlockAccount"
          placement="more"
          successMessage="User account unlocked."
          component={UserAccountUnlockActionDialog}
        />
      </FormToolbar>

      <FormBody>
        <FormSection label="General" hideHeader>
          <Field fieldName="username" />
          <Field fieldName="nickname" />
          <Field fieldName="email" />
          <Field fieldName="mobile" />
          <Field fieldName="status" />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

`ModelForm` now provides runtime/provider + page shell spacing, and automatically resolves route `id`:

- `params.id === "new"` => create mode (`id = null`)
- `params.id` exists and is not `"new"` => edit mode
- if route has no `id` param => create mode by default

Validation behavior:

- default is `onBlur`
- `reValidateMode` is `onChange`

### Dialog Mode (Action type="form")

`ModelForm` can run inside a dialog when opened via `<Action type="form" />`. In this mode it automatically adapts:

- **ID resolution**: ignores route `params.id` (uses only the `id` prop; defaults to create mode)
- **Create/update success**: closes the dialog instead of `router.push`
- **Cancel**: closes the dialog instead of navigating back
- **relatedField injection**: the parent record `id` is merged into `defaultValues` as `{ [relatedField]: parentId }` and included in the API payload — even if the field is not displayed in the form

No special props are needed on `ModelForm` itself — dialog mode is detected automatically via `ActionFormRuntimeContext`.

Example:

```tsx
// Parent form page
<FormToolbar>
  <Action
    type="form"
    label="Add Config Group"
    placement="toolbar"
    component={ConfigGroupForm}
    relatedField="tenantConfigId"
  />
</FormToolbar>

// Child form component (used as Action.component)
function ConfigGroupForm() {
  return (
    <ModelForm modelName="TenantConfigGroup">
      <FormToolbar />
      <FormBody enableAuditLog={false}>
        <FormSection label="General" hideHeader>
          <Field fieldName="groupName" />
          <Field fieldName="description" />
          {/* tenantConfigId is not displayed but is auto-injected into the API payload */}
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

Need custom variations? Use `useModelFormContext()` in children and rearrange `FormHeader/FormToolbar/FormBody` directly.

Canonical field usage now lives in [Fields](../fields/fields).
Widget compatibility and widget-specific examples live in [Widget matrix](../fields/widgets).
Relation field behavior lives in [Relation fields](../fields/relations).
Use those documents for:

- `Field` props and metadata overrides
- `FieldType -> WidgetType` compatibility
- widget-specific `widgetProps`
- relation field behavior (`Reference`, `OneToMany`, `ManyToMany`)

The quick examples below are kept as local shortcuts, but the fields README is the source of truth.

Default recommendation is `Field` (metadata auto-dispatch by `fieldType`) with metadata overrides and condition-based control.

Example metadata overrides on `Field`:

```tsx
<Field
  fieldName="name"
  label="Custom Label"
  readonly
  required={false}
  hideLabel={true}
  fullWidth={false}
  widgetType="URL"
  filters={[["active", "=", true]]}
  defaultValue="https://example.com"
/>
```

`Field.defaultValue` is a create-time field override. Prefer it for static page-specific defaults; keep dialog/page `defaultValues` for dynamic prefills such as route params or parent-context values.

When you do pass container-level `defaultValues`, use field UI values directly:

- `File`: `FileInfo | null`
- `MultiFile`: `FileInfo[]`
- `JSON` / `DTO`: structured object/array values
- `Filters`: `FilterCondition`
- `Orders`: structured order tuples/arrays

Detailed field value contracts are documented in [Field](../fields/fields).

Example conditional field control:

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field fieldName="status" readonly={true} />

<Field fieldName="itemTone" hidden={["active", "=", false]} />

<Field
  fieldName="description"
  readonly={[
    ["status", "IN", ["approved", "archived"]],
    "OR",
    [["type", "=", "SYSTEM"], "AND", ["editable", "!=", true]],
  ]}
/>

<Field
  fieldName="label"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

Example remote field linkage:

```tsx
<Field fieldName="itemCode" onChange={["label", "itemTone"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["label"], with: ["active"] }}
/>
```

Example relation filter linkage:

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
  ]}
/>
```

Relation filter notes in `ModelForm`:

- `{{ companyId }}` resolves from current form values before the relation query is sent (unified template syntax `{{ expr }}`)
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged; literals use `{{ 'value' }}` or backend tokens like `{{ NOW }}` as needed
- `Field.filters` overrides `metaField.filters`; if omitted, metadata filters still apply
- unresolved `{{ expr }}` dependencies pause the relation query instead of loading unfiltered data

Examples of using `widgetType` to drive renderer behavior:

```tsx
<Field
  fieldName="startTime"
  widgetType="HH:mm"
/>

<Field
  fieldName="photo"
  widgetType="Image"
/>

<Field
  fieldName="gallery"
  widgetType="MultiImage"
  widgetProps={{ maxFiles: 6, columns: 3, aspectRatio: "4 / 3", helperText: "Recommended 1200x900" }}
/>

<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>

<Field
  fieldName="content"
  widgetType="RichText"
/>

<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>

<Field
  fieldName="startTime"
  placeholder="Select start time"
/>
```

`File` / `MultiFile` automatically use current `ModelForm` record id in edit mode.

### Widget Props

Use `placeholder` for field-level input placeholder text.
Use `widgetProps` only for widget-specific configuration.

Scope note:

- `widgetProps` applies to `ModelForm` widgets and table inline editors because those paths render `Field` directly
- `ModelTable` / `RelationTable` read-mode cells intentionally do not consume `widgetProps`; table image/file cells use the shared compact renderer described in [ModelTable](./table)

Current supported examples:

```tsx
<Field
  fieldName="progress"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 10, step: 0.5 }}
/>

<Field
  fieldName="avatar"
  widgetType="Image"
  widgetProps={{
    aspectRatio: "1 / 1",
    objectFit: "cover",
    helperText: "Square image recommended",
    crop: { enabled: true, aspect: 1, shape: "round" },
  }}
/>

<Field
  fieldName="photos"
  widgetType="MultiImage"
  widgetProps={{
    maxFiles: 8,
    columns: 4,
    aspectRatio: "16 / 9",
    uploadText: "Upload gallery",
    crop: { enabled: true, aspect: 16 / 9 },
  }}
/>

<Field
  fieldName="status"
  widgetType="Radio"
  required
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{
    language: "sql",
    minHeight: 320,
    maxHeight: 560,
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
  }}
/>

<Field
  fieldName="config"
  widgetProps={{
    minHeight: 320,
    maxHeight: 560,
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    formatOnBlur: true,
  }}
/>
```

`JsonField` now uses `react-codemirror` by default. Common JSON editor `widgetProps`:

- `height`: fixed editor height
- `minHeight`: minimum editor height
- `maxHeight`: maximum editor height
- `lineNumbers`: show or hide gutter line numbers
- `lineWrapping`: wrap long lines
- `tabSize`: indentation size
- `formatOnBlur`: format valid JSON after blur
- `autoFocus`: focus editor on mount

`CodeWidget` supports these common `widgetProps`:

- `language`: `plain`, `java`, `html`, `json`, `markdown`, `python`, `sql`, `yaml`, `yml`
- `height`: fixed editor height
- `minHeight`: minimum editor height
- `maxHeight`: maximum editor height
- `lineNumbers`: show or hide gutter line numbers
- `lineWrapping`: wrap long lines
- `tabSize`: indentation size
- `autoFocus`: focus editor on mount

`MarkdownWidget` supports these common `widgetProps`:

- `mode`: `split`, `edit`, `preview` (default: `split`)
- `height`: fixed editor/preview height
- `minHeight`: minimum editor/preview height
- `maxHeight`: maximum editor/preview height
- `lineNumbers`: show or hide editor line numbers
- `lineWrapping`: wrap long lines in editor mode
- `tabSize`: indentation size
- `autoFocus`: focus editor on mount

`MarkdownWidget` uses `react-markdown` for preview and enables `remark-gfm` by default.

`mode` behavior:

- `split`: show editor and preview side by side on desktop; stack vertically on smaller screens
- `edit`: show editor only
- `preview`: show preview only

### Field Full Width

`Field` supports `fullWidth` for these field renderers:

- `StringField + PlainTextWidget` (`fieldType="String"` + `widgetType="PlainText"`)
- `StringField + RichTextWidget` (`fieldType="String"` + `widgetType="RichText"`)
- `StringField + MarkdownWidget` (`fieldType="String"` + `widgetType="Markdown"`)
- `StringField + CodeWidget` (`fieldType="String"` + `widgetType="Code"`)
- `OneToManyField`
- `ManyToManyField`

Default is `fullWidth={true}` for all fields above.
Set `fullWidth={false}` to render in normal grid width.

```tsx
<Field fieldName="description" widgetType="PlainText" />
<Field fieldName="notes" widgetType="RichText" fullWidth={false} />
<Field fieldName="optionItems" fullWidth={false} />
<Field fieldName="userIds" fullWidth={false} />
```

### Field Label Visibility

`Field` supports `hideLabel` to control whether the entire field label block (`FormLabelWithTooltip`) is rendered.

- Default: `hideLabel={false}` (show label)
- Set `hideLabel={true}` to hide the entire label block (label text + tooltip icon)

```tsx
<Field fieldName="description" hideLabel={true} />
```

### ReadOnly vs Disabled

Use `readOnly` and `disabled` with different intent:

- `readOnly`: user can view value clearly, and the field remains part of the normal detail-reading experience. Prefer this for detail pages, audit-style viewing, and fields that should stay easy to scan/copy.
- `disabled`: control is temporarily or structurally unavailable. Prefer this for permission restrictions, unmet prerequisites, async submitting/loading, workflow/state locks, or feature gating.

In HR SaaS forms, detail pages should generally prefer `readOnly` over `disabled`.

For `widgetType="Code"` and `widgetType="Markdown"`, a read-only field whose value is empty shows the shared `CodeEditorEmptyState` hint instead of an empty CodeMirror (see `src/components/fields/widgets/README.md`).

## XToMany Fields (Incremental Submit by Default)

`ReferenceField` now only handles:

- `ManyToOne`
- `OneToOne`

`OneToMany` and `ManyToMany` are handled by dedicated field components internally and are still used through:

```tsx
<Field fieldName="..." />
```

### OneToMany

- UI: local relation table in form body
- supports: add, edit, delete
- no `formView`: row edit uses table-cell inline edit (click row to enter edit)
- with `formView`: row edit/create uses runtime `ModelDialog`
- submit default: patch map (incremental)

Inline edit behavior (`OneToMany`, without `formView`):

- row enters edit mode only after row click (no auto-select on page enter)
- edited value is written directly to main form relation array and saved with parent `Save/Create`
- editable cells are limited to declared `<RelationTable><Field /></RelationTable>` columns intersected with editable related-model fields
- inline edit is available only in local table mode (`!isPaged` or remote conditions not met)
- row-level `required` / `readonly` conditions evaluate against the current relation row with `scope="relation-table"`
- row-level `Field.onChange` remote linkage also runs in `scope="relation-table"` and only patches the current relation row
- `RelationTable.pageSize` only affects paged relation tables (`isPaged`)

Enable patterns:

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
      <Field fieldName="active" />
    </RelationTable>
  );
}

function MultiSortTableView() {
  return (
    <RelationTable
      orders={[
        ["sequence", "ASC"],
        ["itemCode", "DESC"],
      ]}
      pageSize={20}
    >
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
    </RelationTable>
  );
}

// Enable table-cell inline edit (recommended for local relation editing)
<Field fieldName="optionItems" tableView={OptionItemsTableView} />

// Disable inline edit and use dialog editing
<Field
  fieldName="optionItems"
  tableView={OptionItemsTableView}
  formView={OptionItemsFormView}
/>

// Paged relation table (pagination enabled; may switch to remote searchPage mode)
<Field fieldName="optionItems" tableView={OptionItemsTableView} isPaged />
```

Submit payload shape:

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

Create mode constraint:

- only `Create` is allowed

Update mode:

- `Create` / `Update` / `Delete` are allowed

OneToMany view binding example:

```tsx
import { Field, RelationTable } from "@/components/fields";

function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" readonly={[["active", "=", false]]} />
      <Field fieldName="active" />
    </RelationTable>
  );
}

function OptionItemsFormView() {
  return (
    <ModelDialog title="Option Item">
      <FormBody enableAuditLog={false}>
        <FormSection label="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="label" />
          <Field fieldName="sequence" />
          <Field fieldName="active" />
          <Field fieldName="description" />
        </FormSection>
      </FormBody>
    </ModelDialog>
  );
}

export default function SysOptionSetFormPage() {
  return (
    <ModelForm modelName="SysOptionSet">
      <FormHeader />
      <FormToolbar />

      <FormBody>
        <FormSection>
          <Field fieldName="optionSetCode" />
          <Field fieldName="name" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>

        <FormSection>
          <Field
            fieldName="optionItems"
            tableView={OptionItemsTableView}
            formView={OptionItemsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

### ManyToMany

- UI: local relation table in form body
- supports: add, delete
- add opens a related-model picker table dialog (search/sort/columns/pagination)
- optional `formView` can mount a custom read-only `ModelDialog` for row detail
- submit default: patch map (incremental)

Submit payload shape:

```json
{
  "Add": ["1", "2", "3"],
  "Remove": ["4", "5"]
}
```

Create mode constraint:

- only `Add` is allowed

Update mode:

- `Add` / `Remove` are allowed

ManyToMany view binding example:

```tsx
import { Field, RelationTable } from "@/components/fields";

function RoleUsersTableView() {
  return (
    <RelationTable orders={["username", "ASC"]} pageSize={10}>
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
    </RelationTable>
  );
}

function RoleUsersFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection label="General" hideHeader>
        <Field fieldName="username" />
        <Field fieldName="nickname" />
        <Field fieldName="email" />
        <Field fieldName="mobile" />
        <Field fieldName="status" />
      </FormSection>
    </ModelDialog>
  );
}

export default function RoleFormPage() {
  return (
    <ModelForm modelName="Role">
      <FormHeader />
      <FormToolbar />

      <FormBody>
        <FormSection label="General" hideHeader>
          <Field fieldName="name" />
          <Field fieldName="code" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>
        <FormSection>
          <Field
            fieldName="users"
            tableView={RoleUsersTableView}
            formView={RoleUsersFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

Notes:

- `tableView` controls relation-table columns through a zero-prop view component that returns `<RelationTable />` with child `<Field />` declarations plus optional `RelationTable.orders` / `RelationTable.pageSize`.
- `RelationTable.orders` supports either a single tuple (`["username", "ASC"]`) or multiple tuples (`[["username", "ASC"], ["email", "DESC"]]`).
- remote relation table and picker queries use the effective field filter (`Field.filters ?? metaField.filters`), relation-scoped filters, and runtime search / column filters.
- `isPaged` (OneToMany/ManyToMany fields only):
  - `false` (default): include relation `subQuery` in `getById`; relation table does not paginate in UI and renders all local rows.
  - `true`: relation table enables pagination UI; when `recordId + relatedModel + scoped relation filter` are ready, data is loaded by `relatedModel.searchPage` (remote mode), otherwise paginated locally.
- relation table pageSize default is `50`; page-size selector is shown only when pagination is enabled (`isPaged=true`).
- ManyToMany picker dialog (`Add`) is server-driven; search/sort/page changes trigger `searchPage` requests.
- `formView` is optional. In `ManyToMany`, row-click opens `ModelDialog` in read mode; add/remove still uses picker behavior.
- unresolved `{{ expr }}` dependencies pause remote relation queries and picker queries until the dependent parent form value exists

### OneToOne (Owned Inline)

For **owned** OneToOne relationships (e.g. `UserProfile → UserAccount`), passing `formView` to a `OneToOne` field renders its related-model fields inline inside the parent form, rather than showing a reference selector.

- UI: inline `FormSection`(s) inside the parent form body
- supports: edit all declared sub-fields
- sub-fields register in the **parent RHF instance** as `{fieldName}.{subField}` (e.g. `userId.username`)
- `getById` automatically adds `subQueries: { userId: { fields: [...] } }` derived statically from the `formView` JSX — no extra config needed
- submit default: incremental (update sends `{ id, ...onlyChangedSubFields }`; create sends full sub-object without `id`)
- field conditions (`dependsOn`, `showWhen`) inside `formView` resolve against the sub-object scope and are correctly prefixed when watching parent form values
- `ManyToOne` fields do **not** support `formView`; a dev-mode `console.error` is shown if misused

Usage:

```tsx
function UserAccountOneToOneView() {
  return (
    <FormSection label="Account">
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
      <Field fieldName="policyId" />
    </FormSection>
  );
}

export default function UserProfileFormPage() {
  return (
    <ModelForm modelName="UserProfile">
      <FormHeader />
      <FormToolbar />

      <FormBody>
        <FormSection label="General" hideHeader>
          <Field fieldName="fullName" />
          <Field fieldName="birthDate" />
          <Field fieldName="gender" />
        </FormSection>

        {/* OneToOne inline: renders UserAccount fields inside this form */}
        <Field fieldName="userId" formView={UserAccountOneToOneView} />
      </FormBody>
    </ModelForm>
  );
}
```

Submit payload shape (update, only `nickname` changed):

```json
{
  "id": "...",
  "userId": {
    "id": "...",
    "nickname": "Alice"
  }
}
```

Submit payload shape (create):

```json
{
  "userId": {
    "username": "alice",
    "nickname": "Alice",
    "email": "alice@example.com",
    "mobile": null,
    "status": "ACTIVE",
    "policyId": "1"
  }
}
```

When `formView` is **not** provided, `OneToOne` behaves identically to `ManyToOne` and renders a reference selector widget.

### Compatibility

Backend still supports full submit for XToMany fields.
Frontend `ModelForm` defaults to incremental submit (`PatchType` map) to avoid full-list overwrite risk in paginated relation editing.

## Validation order

The resolver ModelForm hands to react-hook-form is three layers, innermost first:

1. **Field-level schema** — `buildZodObjectFromMetaModel`: type shape, the column's own `required`, `length` / `scale`, and the value domain from `constraints` (`min` / `max` / `pattern`); `.pick(displayedFieldNames)` keeps only what is on screen; then the page's `schemaBuilder` wraps it.
2. **`withFieldConstraintsResolver`** — the metadata conditions over the whole row: `requiredWhen` / `invalidWhen`, and the rows of a OneToMany field judged by the related model's constraints (`relatedMetaModelsByPath`). A field the schema already rejected keeps the schema's message.
3. **`withFieldConditionResolver`** — prunes errors on fields a page-level `hidden` condition removed.

The browser's own validation is off (`noValidate` on the `<form>`, and on `DialogForm` / `WizardDialog`): a number field renders its `min` / `max` on the input for the spinner, and native validation would otherwise block the submit with a browser bubble before the resolver runs, so the rejection toast and the field focus never happen.

Relation dialogs (`ModelDialog` → `DialogForm`) run the same three layers on the row they edit, judging only the fields the dialog displays.

Layer 2 gets `relatedMetaModelsByPath` from the compiled form plan, which learns a form's nested models by walking `children` statically. A page that renders a relation through a component of its own is opaque to that walk, so the map comes back empty and the rows inside are judged by nothing — such a page passes the map itself through the prop of the same name.

`requiredWhen` belongs to layer 2 even in its unconditional `true` form, because the backend's rule for it is "may omit, may not clear": on update it fires only when the write names the field, so a row saved before the rule existed stays editable. Only layer 2 can tell those apart — it is given the values the form started from (`initialValues`). Layer 1 owns the column's own `required` and nothing conditional.

The resolver's context (`@mode`, `USER_ID`, the declared field types) is read **when the resolver runs**, not when it is built: react-hook-form captures the resolver on the first render, and the signed-in user is filled in by an effect after it.

A write the server refuses per field (`ApiError.fieldErrors`, from field constraints or a `ModelWriteValidator`) is placed on the fields with `form.setError(field, { type: "server" })` — only for names this form renders, so a server-only column cannot park an invisible error that blocks submit — next to the toast the API client already shows.

## Page Structure

Recommended default layout:

- Header: title + description
- Sticky toolbar:
  - left: built-in `FormEditStatus + FormPrimaryActions` (+ `FormWorkflowActions` when `ModelForm/ModelSideForm enableWorkflow=true`)
  - right: business actions area (custom actions + built-in Duplicate/Delete + More Actions)
- Body: `FormBody` renders either stacked sections or true tabs, plus the built-in audit panel layout
- Audit: `FormBody(enableAuditLog)` controls audit panel; right on large screens and bottom on small screens

## Record-level access

In edit mode the form asks the server what the caller may do with the record (`POST /{model}/getRecordAccess`); in create mode, which sensitive sets a new record may show (`GET /{model}/getCreateAccess`). The answer is provided through `RecordAccessContext` and used three ways: `Edit` / `Delete` follow the actions available on the record (overriding a permission the user holds through another role); a `FormSection` whose `sensitiveFieldSet` is hidden on the record does not render; one that is visible but granted only by roles that cannot edit the record renders its fields read-only (`ReadonlyFieldScope`). The answer also comes by field (`hiddenFields` / `readonlyFields`, keyed by the field's own model): any `Field` the record hides shows its label and a lock instead of an input or value (`NoAccessLock`, the same mark list cells use), and one it keeps read-only renders read-only — inside a section that names its set or not, and for a one-to-one child's field shown on the parent's form as for the form's own. The form submits changed fields only, so a hidden field's empty value is never written back. While the answer is loading, `Edit` and `Delete` stay hidden and so do sections gated by a `sensitiveFieldSet` (the form itself is not locked), so nothing the record denies flashes on screen; once the request settles without an answer (no record, or it failed), the user-level gates apply as before. The form re-asks whenever the record is reloaded (a save may change what it allows); while that answer loads the previous one for the same record stays in effect, so buttons and sections do not unmount and remount — only opening a different record waits again. The query key carries a reload counter, never the record's values. A component that also renders outside ModelForm can tell the two kinds of `null` apart with `useHasRecordAccessProvider()`: inside the form it reads the form's answer (and falls back to the user-level gates when that failed) instead of fetching one of its own.

## Props

### ModelForm Props

| Prop            | Type                      | Required | Default                               | Notes                                                                                       |
| --------------- | ------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `modelName`     | `string`                  | Yes      | -                                     | Model name used to request metadata from API (`/metadata/getMetaModel`).                    |
| `id`            | `string \| null`          | No       | Route `params.id` (`"new"` => `null`) | Optional override.                                                                          |
| `schemaBuilder` | `(context) => ZodTypeAny` | No       | -                                     | Runtime schema extender. Receives `{ metaModel, baseSchema }` built from resolved metadata. |
| `readOnly`      | `boolean`                 | No       | `false`                               | Force read-only mode.                                                                       |
| `defaultValues` | `Record<string, unknown>` | No       | -                                     | Extra default values merged into metadata defaults. Useful for injecting parent context such as `relatedField` values. |
| `copyFromId`    | `string \| null`          | No       | -                                     | New mode only: prefill the form with the copyable field values (`getCopyableFields`) of this source record (duplicate flow). Full-page forms normally use the `?copyFrom=<id>` search param instead; embedded forms pass this prop. Explicit context (`defaultValues`, search params, related field) wins over copied values. |
| `enableWorkflow`       | `boolean`                 | No       | `false`                               | Show workflow action group in toolbar left area (edit mode only). |
| `enableCreate`         | `boolean`                 | No       | auto                                  | Built-in `Create New` action switch. Three-state, see "Three-state `enable*` resolution" below: `false` hides, `true` shows even on a read-only form, omitted shows only while the form is not read-only. |
| `enableDuplicate`      | `boolean`                 | No       | auto                                  | Built-in duplicate action switch. Same three-state resolution as `enableCreate`. Also requires `MetaModel.copyable === true`. |
| `enableDelete`         | `boolean`                 | No       | auto                                  | Built-in delete action switch. Same three-state resolution as `enableCreate`. |
| `enableUpdate`         | `boolean`                 | No       | auto                                  | Toolbar `Edit` button switch for route read-mode. `false` hides it; the form's own read-only state is unaffected. Gated on `update` (or `updatePermissionId`). |
| `updatePermissionId`   | `string`                  | No       | -                                     | Permission id authorizing edit on this page, overriding the `MODEL_PERMISSIONS` model-keyed `update` lookup. For pages managed by a `customPermission` on a different model (workflow draft pages). |
| `confirmDeleteMessage` | `string`                  | No       | `Delete this {modelLabel}? This action cannot be undone.` | Confirm text for built-in delete action. |
| `timeline`      | `ModelFormTimelineConfig` | No       | -                                     | Timeline-model behavior toggles (`enableAddVersion` / `enableVersionPanel` / `versionSummaryFields`, all optional). Only consulted when `metaModel.timeline` is true; see "Timeline Models" below. |
| `sliceId`       | `string \| null`          | No       | `?sliceId=` search param              | Timeline models, edit mode only: load this specific version (slice) instead of the as-of row (`searchList` by `sliceId` across the timeline). Full-page forms normally use the `?sliceId=<x>` search param (ignored in dialog mode); embedded forms pass the prop. |
| `relatedMetaModelsByPath` | `Record<string, MetaModel>` | No | - | Metadata for related models the form plan cannot reach, keyed by the field path that holds them (`employeeProfileId`, not `EmployeeProfile`). The plan learns a form's nested models by walking `children` statically, so a relation rendered through a page's own component is invisible to it: the nested rows are then not validated against their own model's field rules, and the widgets inside them get no metadata to take a star or a bound from. A page in that position (a wizard step, a bespoke inline view) usually already holds the metadata for its submit payload and can state it here. Merged under what the plan found, so a path the walker did reach wins. |
| `beforeSubmit`  | `(values, savedRecord, recordAccess) => boolean \| Promise<boolean>` | No | - | Asked after validation passes and before the write; resolve `false` to cancel the save (e.g. a declined confirmation). `savedRecord` is the loaded row in edit mode, `null` in create mode. `recordAccess` is the form's own record-level access answer (see "Record-level access"): `null` when there is none to consult, `undefined` while loading — read it here rather than querying it again in the page. |
| `children`      | `ReactNode`               | Yes      | -                                     | Form page layout content (`FormHeader/FormToolbar/FormBody`).                               |

Runtime field conditions:

- `Field.required`, `Field.readonly`, `Field.hidden` support `boolean | FilterCondition | dependsOn(...)`.
- Conditions are evaluated against current form values.
- `FilterCondition` automatically tracks both operand fields and local `{{ fieldName }}` references.
- Function conditions must be wrapped with `dependsOn([...], evaluator)`; bare function conditions are not supported.
- `hidden` fields are not rendered and their validation errors are suppressed.
- `required={false}` can relax metadata `required` at runtime; `readonly={false}` can override metadata readonly.
- The same runtime behavior is used by `ModelForm` and dialog-based forms built on `DialogForm`.

Remote `Field.onChange` in `ModelForm`:

- request path is `POST /<modelName>/onChange/<fieldName>`
- request always sends current field `value`; edit mode also sends `id`
- `with` omitted: only `id + value`
- `with: ["a", "b"]`: sends only declared dependent fields in submit/API shape
- `with: "all"`: sends current form submit shape
- top-level registered XToMany fields are serialized as relation patch payloads, not raw UI rows
- response `values` patch only returned keys; `null` clears a field
- response `readonly` / `required` are field-name lists naming every field in that state; a field declared in `update` but left out of the list is reset to its metadata and local conditions
- response `readonly` / `required` override local effective state until reset, cancel, reload, or a later response
- this remote linkage runtime is implemented for `ModelForm`; it is not automatically available in standalone `DialogForm`

### FormHeader Props

| Prop          | Type        | Required | Default                                      | Notes                                     |
| ------------- | ----------- | -------- | -------------------------------------------- | ----------------------------------------- |
| `title`       | `string`    | No       | `metaModel.label` (fallback `pageTitle`) | Optional override.                        |
| `description` | `string`    | No       | `metaModel.description`                      | Optional override.                        |
| `extras`      | `ReactNode` | No       | -                                            | Extra header content rendered near title. For timeline models in edit mode, the header automatically renders a `FormSliceBadge` before `extras`: the loaded version's effective range (`Current · 2026-01-01 → ongoing`, `9999-12-31` shown as `ongoing`) with a Current / Past / Future tone. It answers "which version am I looking at"; nothing renders for non-timeline models or in create mode. |
| `children`    | `ReactNode` | No       | -                                            | Display-mode content below description. `Field` children render as read-only values via `FieldDisplayScope`. Use `Group` for inline layout. |

**FormHeader with display-mode children:**

```tsx
<FormHeader>
  <Group separator="·">
    <Field name="employeeCode" />
    <Field name="departmentName" />
  </Group>
</FormHeader>
```

### FormBody Props

| Prop             | Type                                        | Required | Default      | Notes                                                                    |
| ---------------- | ------------------------------------------- | -------- | ------------ | ------------------------------------------------------------------------ |
| `sectionNav`     | `boolean`                                   | No       | `false`      | Enables sidebar section nav. When `true`, nav renders when the section/tab has at least 2 sections. |
| `enableAuditLog` | `boolean`                                   | No       | `true`       | Toggle audit panel (only renders in edit mode). The panel also stays hidden when the model's own `MetaModel.enableAuditLog` is `false`, whatever this prop says. |
| `enableVersionPanel` | `boolean`                               | No       | `true`       | Toggle the Versions panel of a timeline model (still also gated by `timeline.enableVersionPanel`). Turn it off in a dialog that edits one row of a relation table: the table already lists the versions, and the row is local form state until the parent saves. |
| `children`       | `ReactNode`                                 | Yes      | -            | Content nodes. `FormSection`/`Field` nodes at root level render as shared content above tabs; root `FormTab` nodes activate tabs mode. `FormTab` cannot be nested inside another `FormTab`. |

`FormBody` infers layout mode from its root children. Any root `FormTab` activates tabs mode; `FormSection` and `Field` nodes placed outside `FormTab` are rendered above the tab strip as shared content visible across all tabs.
`FormBody` also includes a built-in content surface style by default: `rounded-(--ui-card-radius) border border-border bg-card p-(--ui-card-padding)`. Use `className` to add extra styles or override defaults when needed.

### FormTab Props

`FormTab` is the root content block for tabbed `FormBody` layouts. It can contain multiple `FormSection` blocks or direct content nodes.

| Prop        | Type        | Required | Default | Notes                                                |
| ----------- | ----------- | -------- | ------- | ---------------------------------------------------- |
| `label`  | `string`    | Yes      | -       | Visible tab label.                                                                    |
| `value`      | `string`    | No       | auto    | Optional stable tab id; auto-derived from label.                                      |
| `sectionNav` | `boolean`   | No       | -       | Overrides `FormBody`'s `sectionNav` for this tab only. Takes priority when defined.   |
| `children`   | `ReactNode` | No       | -       | Tab panel content. `FormSection` remains recommended.                                  |

### FormSection Props

`FormSection` is the default content block inside `FormBody`. It provides section title/description rendering, a responsive field grid, local section actions, and section-nav registration.

| Prop          | Type                  | Required | Default  | Notes                                                                                 |
| ------------- | --------------------- | -------- | -------- | ------------------------------------------------------------------------------------- |
| `label`   | `string`              | No       | -        | Visible section label; also used as the section-nav anchor text.                      |
| `description` | `string`              | No       | -        | Optional helper text rendered under the section header.                               |
| `className`   | `string`              | No       | -        | Extra wrapper class for the section container.                                        |
| `columns`     | `1 \| 2 \| 3 \| 4`    | No       | `2`      | Responsive grid column count for section content on `md+` layouts.                    |
| `hideHeader`  | `boolean`             | No       | `false`  | Hides the visual section header, but the section can still participate in nav.        |
| `divided`     | `boolean`             | No       | `false`  | Adds a top border between sections. Suppressed on the first section (`:first-child`). |
| `children`    | `ReactNode`           | No       | -        | Usually `Field` nodes plus optional section-scoped `Action` nodes.                    |
| `permission`  | `string`              | No       | -        | Section-level permission gate keyed on the enclosing form's model; the whole section is omitted when the user lacks `(modelName, permission)`. An unmanaged / ambiguous pair (`undefined` status) passes through. |
| `permissionId` | `string`             | No       | -        | Explicit permission id gate; wins over `permission` when both are set. Use for cross-model gates (e.g. a Banking section on Employee). |
| `sensitiveFieldSet` | `string \| string[]` | No | -        | Sensitive field set gate: shown when the caller holds ANY of the ids. Inside a form with a record-level answer it follows that answer (hidden while it loads, read-only when only non-editing roles grant the set; on a record that hides the set while the caller holds it on other records it is still drawn and its fields show a lock, as list cells do); otherwise the user-level map decides, admins always pass. ANDed with `permission*`. |

Notes:

- `FormSection` registers itself to the nearest `FormBody` section registry automatically — unless it is gated out by `permission` / `permissionId` / `sensitiveFieldSet`: a section that does not render does not appear in the section nav either, and it registers once the gate opens (e.g. when the record-level answer arrives).
- Nav label falls back to `"Section"` when `label` is omitted.
- Generic labels (`"Section"`) are auto-renamed in nav as `Section 1`, `Section 2`, and so on.
- `hideHeader` only affects the rendered header; it does not disable section-nav registration.
- `divided` is most useful when sections have no `label` (i.e. the header itself is hidden) and visual separation is still needed. When `label` is present the heading already provides visual separation, so `divided` is typically unnecessary.
- `FormSection` supports only local UI actions: `type="link"` and `type="custom"` with `placement="header"` or `placement="inline"`.

### Section Nav

`FormSectionNav` is built into `FormBody`; pages usually do not render it directly.

Behavior:

- `FormBody` collects descendant `FormSection` anchors and renders nav from their registration order.
- `sectionNav` is `false` by default; set to `true` to enable the sidebar nav.
- Nav renders only when the current view has at least 2 registered sections.
- In tabs mode, `FormTab`'s own `sectionNav` takes priority over `FormBody`'s setting for that tab. Omitting it on `FormTab` inherits `FormBody`'s value.
- Clicking a nav item smoothly scrolls the form's own scroll container, not the browser window.
- The nav never grows past the visible part of the form's scroll container: its height is capped to that (re-measured on resize) and the list scrolls on its own, without moving the form when it reaches its end. The highlighted section is kept in view inside the list as the content scrolls. Without the cap, a nav taller than a short window scrolled away with the content and the later sections only appeared once the content reached its end.
- In stacked mode, sidebar nav is desktop-oriented: it appears from `xl` layout when there is no right audit column, and from `2xl` when audit log is rendered on the right.

Stacked example:

```tsx
<FormBody sectionNav>
  <FormSection label="General" hideHeader>
    <Field fieldName="name" />
    <Field fieldName="code" />
  </FormSection>

  <FormSection label="Security">
    <Field fieldName="passwordMinLength" />
    <Field fieldName="passwordComplexityEnabled" />
  </FormSection>

  <FormSection label="Audit">
    <Field fieldName="createdBy" readOnly />
    <Field fieldName="createdDate" readOnly />
  </FormSection>

  <FormSection label="Advanced">
    <Field fieldName="description" />
  </FormSection>
</FormBody>
```

Tabbed example:

```tsx
import { FormBody, FormTab } from "@/components/views/form/components/FormBody";

<FormBody>
  <FormTab label="Profile" sectionNav>
    <FormSection label="General">
      <Field fieldName="name" />
      <Field fieldName="code" />
    </FormSection>

    <FormSection label="Advanced">
      <Field fieldName="description" />
    </FormSection>
  </FormTab>

  <FormTab label="Members">
    <Field fieldName="userIds" />
  </FormTab>
</FormBody>
```

### FormToolbar Props

| Prop        | Type        | Required | Default | Notes                                                |
| ----------- | ----------- | -------- | ------- | ---------------------------------------------------- |
| `children`  | `ReactNode` | No       | -       | Custom actions. Recommended: `<Action type="..." />`. |
| `className` | `string`    | No       | -       | Extra wrapper class for toolbar container.           |
| `leading`   | `ReactNode` | No       | -       | Fills the left zone, e.g. a compact record summary. Toolbar-placed actions then move to the right zone, after Edit / Save and before Create New / More. |

An empty toolbar is not drawn. When nothing inside it rendered — no button, no add-version date input, no edit-status pill — the frame (border, padding, sticky bar) is hidden too, so a reader with no action on the page sees the title run straight into the content instead of an empty box. Each control still decides its own visibility (Edit by the update permission, Create New / More Actions by theirs, Save / Cancel by the mode); the toolbar asks what actually rendered, through the `[data-form-toolbar]` rule in `src/styles/globals.css`, rather than recomputing those conditions. Anything new placed in the toolbar is covered as long as it renders a `button` or `input`; a purely textual item would need the same `data-form-edit-status` marker to keep the toolbar visible. Content passed as `leading` (e.g. a record summary) keeps it visible too, so a reader with no action still sees it.

### Actions In `ModelForm`

Common `Action` / `BulkAction` API now lives in [Actions](../actions).
This section keeps only the `ModelForm` container rules and a complete page-level example.

Container support:

| Container     | Supported Action Types                | Supported Placements |
| ------------- | ------------------------------------- | -------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom` | `toolbar`, `more`    |
| `FormSection` | `link`, `custom`                      | `header`, `inline`   |

Rules:

- `FormToolbar` is the action area for page-level business actions
- `FormSection` is a local UI action area and does not execute model API actions directly
- for API actions (`default` / `dialog`), place actions in `FormToolbar`
- built-in workflow/create/duplicate/delete toolbar behavior is configured on `ModelForm`/`ModelSideForm` props
- edit mode with unsaved changes: clicking business actions asks whether to discard changes before continuing
- create mode: built-in `Duplicate` / `Delete` remain visible but disabled
- built-in `Duplicate` only appears when the model metadata is `copyable` (`MetaModel.copyable === true`); non-copyable models never expose the action regardless of `enableDuplicate`
- built-in `Duplicate` never inserts directly: it loads the source record's copyable values via `getCopyableFields` and opens a prefilled new-mode form (full-page forms navigate to `new?copyFrom=<id>`; ModelSideForm enters inline create mode with the prefill), so the user can adjust unique/business fields before saving through the normal create flow; which fields are copyable (decided by each field's `MetaField.copyable`) is resolved by the backend

Complete example:

```tsx
import { Action } from "@/components/actions/Action";
import { FormSection } from "@/components/views/form/components/FormSection";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";
import { ExternalLink, Lock, RefreshCw, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" label="Reason" widgetType="PlainText" />
    </ActionDialog>
  );
}

<ModelForm modelName="UserAccount">
  <FormToolbar>
    <Action
      label="Lock"
      operation="lockAccount"
      placement="toolbar"
      icon={Lock}
      confirmMessage="Lock this account?"
    />
    <Action
      type="dialog"
      label="Unlock"
      operation="unlockAccount"
      placement="more"
      icon={ShieldCheck}
      component={UnlockDialog}
    />
  </FormToolbar>

  <FormBody>
    <FormSection label="Credentials">
      <Action
        type="link"
        label="Open Docs"
        placement="header"
        icon={ExternalLink}
        href="https://docs.example.com/credentials"
      />
      <Action
        type="custom"
        label="Regenerate Preview"
        placement="inline"
        icon={RefreshCw}
        onClick={() => console.log("regenerate")}
      />

      <Field fieldName="username" />
      <Field fieldName="status" />
    </FormSection>
  </FormBody>
</ModelForm>;
```

## Context API

Inside `ModelForm` children, use `useModelFormContext()` to access:

- `pageTitle`, `pageDescription`
- `isEditing`, `isSubmitting`, `effectiveReadOnly`
- `form` (`react-hook-form` instance)
- `onCancel()`
- `metaModel`, `id`

## Cascaded Field Path

`<Field fieldName="lastActivityId.status" />` (dot-notation) reads a related record's field and renders it read-only. The form plan walker collects every cascaded path declared in the body, calls `POST /metadata/resolveCascadedPaths` once to resolve all leaf metaFields, folds the matching SubQueries into `getById`, and exposes the resolutions to `<Field>` via `CascadedResolutionsProvider`.

```tsx
<ModelForm modelName="AppEnv" recordId={envId}>
  <Field fieldName="name" />
  <Field fieldName="lastActivityId" />                {/* normal ManyToOne */}
  <Field fieldName="lastActivityId.status" />   {/* cascaded — readonly */}
  <Field fieldName="lastActivityId.finishedTime" />   {/* shares base, auto-merged */}
  <Field fieldName="ownerId.departmentId.name" />       {/* depth-3 */}
</ModelForm>
```

Notes:

- always read-only — never registers with RHF, never appears in `formState.dirtyFields`
- effective metadata (fieldType / widgetType / label / optionSetCode) comes from the **leaf** field; `props.label` / `props.widgetType` still override
- works inside `ModelSideForm` automatically (it composes `ModelForm`)
- nested cascaded paths inside `formView` callbacks (depth > 0) are not yet resolved — dev `console.warn` and "-" placeholder

Full reference & semantics: [Cascaded Field Path](../fields/fields#cascaded-field-path-display) in the fields README.

## Permission Integration

`ModelForm` auto-gates by `modelName` against the generated `MODEL_PERMISSIONS` lookup — business pages do not call `usePermission` for the standard toolbar controls or for any custom `<Action permission="…">` child.

What gets gated for free, just from passing `modelName`:

| Built-in control       | Action segment checked  | Effect when denied                                                |
| ---------------------- | ----------------------- | ----------------------------------------------------------------- |
| Toolbar "Save" / write | `update`                | Form is forced into read-only mode (no Save button, fields frozen) |
| Toolbar "Edit" button  | `update`                | Hidden — `enableUpdate` resolves to false                          |
| Toolbar "Create New"   | `create`                | Hidden — `enableCreate` resolves to false                          |
| Toolbar "Duplicate"    | `create`                | Hidden — `enableDuplicate` resolves to false                       |
| Toolbar "Delete"       | `delete`                | Hidden — `enableDelete` resolves to false                          |

Custom `<Action permission="…" />` children inside `<FormToolbar>` and `<FormSection>` are filtered before render — same semantics as `ModelTable`. Pass the manifest action segment (e.g. `permission="transfer"`).

Status semantics match `ModelTable`:

- **Granted** → control / action stays visible.
- **Denied** → control / action hidden; form is forced read-only when `update` is denied (even if the URL is `?mode=edit`, the user lands in read mode — server enforces this independently, this is UX).
- **Unmanaged** → `(modelName, action)` not in `MODEL_PERMISSIONS` (ambiguous across pages). Auto-gate has no opinion, so the control follows the form's mode: shown while editable, hidden once the form is hard read-only. Page can still pass explicit `readOnly` / `enable*` props.

Business props still win when set to `false` (page explicitly hides Edit even for SUPER_ADMIN). SUPER_ADMIN short-circuits permission lookups internally.

### Three-state `enable*` resolution

`enableCreate` / `enableDuplicate` / `enableDelete` / `enableUpdate` and `timeline.enableAddVersion` are resolved from the page prop plus the permission status, and the resolved value stays **three-state** all the way to the toolbar. The three values are not two — each means something different:

| Resolved | Meaning | Not read-only | Hard read-only (`readOnly` prop forced) |
| --- | --- | --- | --- |
| `false` | Closed — page opted out, or the permission is denied, or the model is a projection | hidden | hidden |
| `undefined` | Nobody objected — no page prop, and the permission is either granted or not declared for this `(model, action)` | shown | **hidden** |
| `true` | The page asked for this control explicitly | shown | shown |

Only a real page prop of `true` produces `true`. A *granted* permission resolves to `undefined`, not `true` — holding `create` is not a request to override a read-only decision the page made. Denial order is page opt-out, then permission, so `enableCreate={true}` can never hand a control to a user the grant map denies.

"Hard read-only" means the `readOnly` prop forced the form read-only. Route read-mode (`?mode=read` on an editable record, where the user can click Edit to resume) is *not* hard read-only, so `undefined` still shows there — that is the normal detail-page toolbar.

**Read-only detail pages therefore need no `enable*` props at all.** `<ModelForm modelName="X" readOnly={true}>` closes Create New / Duplicate / Delete / Add Version on its own. Pass `enable*={false}` only to close a control that would otherwise be available, and `enable*={true}` only when a read-only form genuinely must keep a write affordance.

**Projection models** (`MetaModel.projection === true`, from `@Model(projection = true)` — a read-only model over a table another model owns): the form is forced into read-only in every mode (create included) and Edit / Create New / Duplicate / Delete / Add Version and the timeline version panel's Correct / Delete all close, on top of permissions — the backend rejects every write on such a model. Structural, not a permission: SUPER_ADMIN gets the same read-only form.

Example:

```tsx
<ModelForm modelName="Employee">
  <FormToolbar>
    <Action
      type="custom"
      label="Transfer"
      permission="transfer"          {/* gated by Employee.transfer */}
      onClick={openTransferDialog}
    />
  </FormToolbar>
  <FormSection label="Profile">
    <Field fieldName="fullName" />
    ...
  </FormSection>
</ModelForm>
```

`Save` / `Cancel` / `Edit` / `Delete` are auto-shown / auto-hidden purely from `modelName="Employee"`; "Transfer" is auto-hidden when the user lacks `Employee.transfer`.

## Built-in Behavior

- Create/edit mode defaults and reset handling.
- Reset behavior is snapshot-guarded:
  - record/model identity change => reset
  - pristine form + remote snapshot changed => reset
  - dirty form + background refetch => do not overwrite current edits
- Metadata resolution policy: always fetch from `/metadata/getMetaModel`; first response is cached by React Query and reused.
- Metadata-driven field props are resolved by the internal field runtime; business code should stay on `Field`.
- Cancel / Back behavior (split by mode and placement):
  - edit / create mode: `Cancel` button lives in the toolbar next to `Save` (`FormPrimaryActions`); confirms when dirty, resets to the latest loaded snapshot, returns to read-only mode
  - read mode: `Back` button lives in the page header right side (`FormBackButton`, hidden inside `ModelSideForm`); navigates to the route derived from the breadcrumb (`resolveBackRoute` = navigation manifest + pathname). MultiView `linkTo` detail routes (`/list/<tab>/<id>`) resolve to the tab crumb `/list?tab=<tab>` instead of the route-less `/list/<tab>`, so Back never 404s and lands on the originating tab — no carried query state, refresh / deep-link resolve identically
- Save/create mutation handling with toasts.
- A **rejected** Save is reported too, never silent: `describeSubmitBlock` turns the resolver's errors into an error toast naming the first invalid field and its message (`Cannot save — ID Type: This field is required`), plus a count of the other invalid fields, and the form then scrolls that control into view. The control is located by `fieldControlSelector` — `[name]`, `[id]` or the `data-field-path` every `FormItem` and relation widget publishes — because most widgets (combobox, date picker, tree picker) put no `name` on the DOM, and a focus attempt that finds nothing used to be the *only* response to an invalid submit.
- Audit query is built in via `useGetChangeLogQuery(modelName, id)` with:
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- **Timeline models get the audit log of the version** — `useGetSliceChangeLogQuery(modelName, sliceId)`, slice read off the loaded record, same paging (`includeCreation` is spelled `getCreate` here). Works on both routes into the form: the Versions panel's `?sliceId=` link and a list's as-of read. The entity-level `getChangeLog` is refused for a timeline model, so it is never issued for one.
- Global audit API switch:
  - `configs.env.enableChangeLog` (`NEXT_PUBLIC_ENABLE_CHANGE_LOG`, default `true`) — read at runtime through `/runtime-env.js` (`src/lib/runtime-env.ts`), not baked into the bundle; a deployment sets it from the same value as the backend's `system.enable-change-log` (`SYSTEM_ENABLECHANGELOG`), so the panel follows the backend's own switch
  - when disabled, `FormAuditPanel` does not issue change-log API requests and shows a disabled hint text
- Model-level audit switch: a model declared `@Model(enableAuditLog = false)` (reports, derived data rewritten in bulk) builds no change log, and its metadata says `enableAuditLog: false`. `FormBody` then renders no Audit Log panel at all — no side column, no request — instead of a list that would always be empty. Only an explicit `false` counts: a backend that predates the switch omits the field, and the panel stays on.
- `FormWorkflowActions` + `WorkflowActionGroup` supports workflow states:
  - `draft`: submit
  - `pending`: withdraw/approve/reject
  - `approved`: withdraw approval
  - `rejected`: resubmit
- Workflow actions are disabled while form is dirty or submitting.
- Audit event rendering rules:
  - `update`: `<=5` expanded, `>5` show first 5 + `Show all fields (N)`
  - `create`: collapsed by default
  - `delete`: operation info only
- **An `update` entry lists the columns the write TOUCHED, not every column the row has.** The two payloads on a change log are not symmetrical: `dataBeforeChange` is the whole original row, `dataAfterChange` holds only the changed columns (the backend publisher strips the primary key and the audit columns from it). The diff is therefore driven by the keys of `dataAfterChange`, with `dataBeforeChange` consulted only for what each of those columns used to hold. Unioning the two key sets — which this panel used to do — reports every untouched column as `value → —`, and buries the one field that changed among them.
- **Standalone use, and several records in one list.** `FormAuditPanel` renders outside a form context when given `modelName` + `recordId`, under the same `Audit Log` heading it carries inside one — a host that shows the framework's audit log calls it what the rest of the product calls it. `sources` (`AuditSource[]` = `{ modelName, recordId?, label?, kind?, referencing?, rowLabel? }`) replaces the pair with several records merged into one list, newest first across all of them, each entry tagged with its `label` (the tag is suppressed when the list has one source, where it would be a column of the same word). A source with no `recordId` is skipped — an unsaved row has no history and asking for one is a request the backend rejects. A source can instead name a set of rows by `referencing: { model, id, field }` — every row of its model whose many-to-one `field` points at record `id` of `model`, the rows since deleted included — asked through `getRecordChangeLog`'s `referencing` parameter, which matches the reference each log carries; the record's own entries come back with them and are listed under `referencing.label`, or left out without one. For rows the record's own model has no relation field to reach. A model whose display name cannot name its rows (a plain id column) names them with `rowLabel(row)`, fed everything the row's logs recorded of it; the pointing field, and any reference left as an id, are dropped from a row's details. Not for timeline models: a slice's history is asked for by `sliceId` on a different endpoint and the two cannot be interleaved. A host that must first work out WHICH records to ask about passes `sourcesLoading` / `sourcesError` while it does: until the sources are known, the empty state would be a confident wrong answer, so the panel shows loading or a failed read instead.
- **A record kept across several models.** Inside a form the panel lists, beside the record's own history, the history of the rows its relations hold — on by default (`relatedFields="auto"`). A change log is kept per model and per row, so an edit to a satellite — an employee's Preferred Name on the person's profile, a family-member row — is logged against the satellite and is otherwise missing from the record's audit list. `"auto"` takes every one-to-one and one-to-many field the form renders (from the form's read plan): a relation the page edits in place belongs to the record, while one it does not show — the departments an employee manages — is another record's history, which the metadata alone cannot tell apart. Many-to-one fields never count. `excludeRelatedFields` leaves named relations out of `"auto"`; an explicit array names them by hand, and `relatedFields={[]}` keeps the record's own history only. Ignored when `sources` is given. The whole history is one request to `GET /ChangeLog/getRecordChangeLog`, which gathers the rows and pages them as one list on the backend: a one-to-one by the row it points at now, a one-to-many by the reference each log carries — so a deleted child row's history is listed too — and by the current rows' ids for logs written before logs carried references. Only the history of a child row deleted before then is out of reach. Fields the reader's sensitive field sets hide are removed by the backend, and an update that touched only those is not listed or counted.
- **How entries read.** Log entries sharing a trace id are one save and are shown as one entry, each line tagged with the record it came from (the tag moves onto the entry when a single record is behind it). A child row (`AuditSource.kind: "child"`) added or removed is one line naming the row by its model's display name, not its every column. A satellite created in the same save as the record joins the record's initial snapshot; created later, its values read as fields set from nothing. Computed fields are dropped — they change only because a field they are derived from did — and an update left with no lines is not shown.

## Timeline Models

Active only when `metaModel.timeline` is true; non-timeline models ignore everything in this section.

- **Slice badge**: in edit mode, `FormHeader` automatically renders the loaded version's effective range with a Current / Past / Future tone (`Current · 2026-01-01 → ongoing`; `9999-12-31` renders as `ongoing`). Nothing renders in create mode.
- **Version list data**: `useVersionListQuery(modelName, id)` fetches ALL slices of one entity (`acrossTimeline: true`, newest effective range first). Every form-owned caller narrows the query to the structural keys + summary fields via `buildVersionListFields`, so the panel, the collision check and the delete-confirm count share ONE cache entry. Its query key follows the `[modelName, ...]` convention, so `invalidateModelQueries` refreshes it after addVersion / update / deleteBySliceId mutations.
- **`timeline` prop** (`ModelFormTimelineConfig`): `enableAddVersion` / `enableVersionPanel` / `versionSummaryFields` — toggles for the built-in Add Version action and the Versions panel.
- **Add Version action**: a built-in toolbar action on persisted timeline records; in create mode it renders disabled with a hint (same convention as Duplicate / Delete). Gate: `metaModel.timeline` AND create permission (server-side `addVersion` runs the create pipeline, so a user may add versions without update permission) AND `timeline.enableAddVersion !== false`. Entering the mode discards pending edits first (confirm dialog when dirty) so the form starts from a clean baseline.
- **Add-version mode**: the toolbar shows a required "Effective from" date (defaults to today) with a live hint — "The new version is created exactly from the values shown on this form", switching to "A version already starts on this date — submitting corrects that version instead" on a same-start collision (dates come from `useVersionListQuery`, loaded only while the mode is active). Fields unlock even when entered from route read-mode. Record-level actions (Create New / Duplicate / Delete) hide while the mode is active; the submit button reads `Add Version` and stays disabled until an effective date is set.
- **Add-version submit**: the FULL form row — `id` + `effectiveStartDate` + every displayed field — via `addVersionAndFetch`. WYSIWYG: the new version is exactly what the user sees, baselined on the loaded version (submitting with zero edits creates a copy of it). The API itself also accepts partial rows (absent fields are copied forward from the adjacent slice server-side) — that remains the integration-caller affordance; the form deliberately does not use it, so what is on screen never diverges from what is saved. XToMany relation patches are excluded in this mode — they are keyed to the source slice's rows. On success the form returns to read mode as-of today; opening the new version directly lands with the Versions panel.
- **Cancel** in add-version mode discards the draft and exits the mode without navigating.
- **Versions panel**: on timeline models with a persisted record, `FormBody` renders a `Versions` side panel above the audit log (same right column / bottom stack). Each row shows the effective range with a Current / Past / Future badge and a summary (`timeline.versionSummaryFields`, defaulting to the model `displayName`); the loaded version is highlighted. Row actions: `Open` / `Correct` navigate via the `?sliceId=` search param (read / edit mode; hidden inside side-form shells, which have no slice routing), `Delete` removes the version after a destructive confirm. `Correct` and `Delete` follow the toolbar permission convention (update / delete status; hidden when denied, shown for unmanaged models). Deleting the ONLY version deletes the entity itself (a timeline entity IS its slices), so the confirm escalates to record-level wording and the call routes through entity deletion — `onDelete` FK strategies apply (inside side-form shells the sole-version delete stays disabled: no list navigation target). Expanding a row loads that version's slice-level change log (`getSliceChangeLog`). Rows are rendered newest first; non-contiguous versions get a dashed `No coverage: <start> → <end>` separator between them — gaps are legal on the backend (as-of reads inside one return nothing) and the separator makes them visible instead of silently implied. Disable the panel with `timeline.enableVersionPanel: false`.
- **Terminate / Reopen**: the tail (newest) version row carries a `Terminate…` action — a dialog asking for the end date (defaults to today, must not precede the tail version's start; to end earlier, delete trailing versions first and the end date transfers backward per the backend heal rule). Confirming calls `setEndDate(id, endDate)`. A terminated tail shows a destructive `Terminated` chip and the action flips to `Reopen`, which confirms and calls `setEndDate(id, "9999-12-31")` — the record becomes open-ended again. Both are gated on the update permission status (same convention as `Correct`) and stay available in embedded hosts (they mutate without navigating). Note the dialog's past-date warning: terminating with a date before today immediately hides the record from every as-of list and its detail page — it stays reachable only through the Versions panel's `Open` links (`?sliceId=`), which is also where you reopen it.
- **Loading a specific version**: with `sliceId` (prop or search param) the form loads that slice across the timeline instead of the as-of row — the badge shows its real range, edit mode corrects exactly that version (`update` keyed by `sliceId`), and Add Version branches from it.
- **Entity deletion**: the built-in Delete confirm on timeline models states the blast radius — "All N versions will be removed" (N from the Versions panel's cached query).

## Page Navigation (Back + Prev/Next in Header)

The page header right side hosts two navigation primitives that operate at the page/record level (not the form-data level), keeping `FormToolbar` focused on form lifecycle actions:

- `FormBackButton` (read-only mode only) — returns to the breadcrumb-derived route (`resolveBackRoute`): the registered list page for normal detail, or the tab crumb `/list?tab=<tab>` for MultiView `linkTo` detail. Purely path/manifest derived (no carried query state). Hidden in `ModelSideForm` and in edit/create mode (where `Cancel` in the toolbar handles the equivalent intent).
- `FormSiblingNav` — `‹ index/total ›` buttons that jump to the previous/next sibling record.

Sibling navigation requires that the user arrived via a row/card click in a sibling list view (`ModelTable` / `ModelBoard` / `ModelCard`) of the same model:

- Source of truth is a module-level snapshot at `src/components/views/form/hooks/siblingNavStore.ts`. The list view writes the currently visible (sorted, server-paged) ids into the snapshot at click time; `FormSiblingNav` reads it on render.
- Scope per view:
  - `ModelTable`: ids of the current page (server-side filter + sort applied).
  - `ModelBoard`: ids within the column the clicked card belongs to.
  - `ModelCard`: ids of the current page.
- Buttons are hidden when there is no snapshot (e.g. direct URL, page reload, or a different model). They are disabled at the first/last record, while submitting, and while the form is dirty (so unsaved edits never get lost on click).
- The snapshot is intentionally ephemeral: in-memory only, not persisted to URL, sessionStorage, or React state. It survives client-side route changes (`router.push`) but resets on full reload.

## Dialog Architecture

Detailed dialog API, props, and full examples are maintained in:
[Dialogs](./dialogs).

Quick selection:

- `ActionDialog`: invoke model operation `/{modelName}/{operation}` (single/bulk).
- `ModelDialog`: relation-field runtime dialog, no explicit `modelName` needed.

To avoid documentation drift, this file only keeps form-page guidance; dialog details are centralized in dialogs README.

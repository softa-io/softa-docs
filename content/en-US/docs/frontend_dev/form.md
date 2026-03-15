# ModelForm

Metadata-driven create/edit form container based on `react-hook-form` and Zod.

## Related Docs

- [Fields](./fields/index)
- [Relation fields](./fields/relations)
- [Widget matrix](./fields/widgets)
- [Action](./action)
- [Dialog](./dialog)
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
import { FormSection } from "@/components/common/form-section";
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
          labelName="Lock Account"
          operation="lockAccount"
          placement="more"
          confirmMessage="Lock this user account?"
          successMessage="User account locked."
          errorMessage="Failed to lock user account."
        />
        <Action
          type="dialog"
          labelName="Unlock Account"
          operation="unlockAccount"
          placement="more"
          successMessage="User account unlocked."
          errorMessage="Failed to unlock user account."
          component={UserAccountUnlockActionDialog}
        />
      </FormToolbar>

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
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

Need custom variations? Use `useModelFormContext()` in children and rearrange `FormHeader/FormToolbar/FormBody` directly.

Canonical field usage now lives in [Fields](./fields/index).
Widget compatibility and widget-specific examples live in [Widget matrix](./fields/widgets).
Relation field behavior lives in [Relation fields](./fields/relations).
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
  labelName="Custom Label"
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

Detailed field value contracts are documented in [Field](./fields/index).

Example conditional field control:

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

Example remote field linkage:

```tsx
<Field fieldName="itemCode" onChange={["itemName", "itemColor"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["itemName"], with: ["active"] }}
/>
```

Example relation filter linkage:

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
  ]}
/>
```

Relation filter notes in `ModelForm`:

- `#{companyId}` resolves from current form values before the relation query is sent
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged
- `@{literal}` can be used when backend should treat a token-like string as a literal
- `Field.filters` overrides `metaField.filters`; if omitted, metadata filters still apply
- unresolved `#{...}` dependencies pause the relation query instead of loading unfiltered data

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
  widgetProps={{ maxCount: 6, columns: 3, aspectRatio: "4 / 3", helperText: "Recommended 1200x900" }}
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
    maxCount: 8,
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

- `StringField + TextWidget` (`fieldType="String"` + `widgetType="Text"`)
- `StringField + RichTextWidget` (`fieldType="String"` + `widgetType="RichText"`)
- `StringField + MarkdownWidget` (`fieldType="String"` + `widgetType="Markdown"`)
- `StringField + CodeWidget` (`fieldType="String"` + `widgetType="Code"`)
- `OneToManyField`
- `ManyToManyField`

Default is `fullWidth={true}` for all fields above.
Set `fullWidth={false}` to render in normal grid width.

```tsx
<Field fieldName="description" widgetType="Text" />
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
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);

const multiSortTableView = (
  <RelationTable
    orders={[
      ["sequence", "ASC"],
      ["itemCode", "DESC"],
    ]}
    pageSize={20}
  >
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
  </RelationTable>
);

// Enable table-cell inline edit (recommended for local relation editing)
<Field fieldName="optionItems" tableView={optionItemsTableView} />

// Disable inline edit and use dialog editing
<Field
  fieldName="optionItems"
  tableView={optionItemsTableView}
  formView={OptionItemsFormView}
/>

// Paged relation table (pagination enabled; may switch to remote searchPage mode)
<Field fieldName="optionItems" tableView={optionItemsTableView} isPaged />
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

const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" readonly={[["active", "=", false]]} />
    <Field fieldName="active" />
  </RelationTable>
);

function OptionItemsFormView() {
  return (
    <ModelDialog title="Option Item">
      <FormBody
        className="rounded-lg border border-border bg-card p-6"
        enableAuditLog={false}
        sectionNavMode="never"
      >
        <FormSection labelName="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="itemName" />
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

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection>
          <Field fieldName="optionSetCode" />
          <Field fieldName="name" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>

        <FormSection>
          <Field
            fieldName="optionItems"
            tableView={optionItemsTableView}
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

const userRoleUserIdsTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="mobile" />
    <Field fieldName="status" />
  </RelationTable>
);

function UserRoleUserIdsFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection labelName="General" hideHeader>
        <Field fieldName="username" />
        <Field fieldName="nickname" />
        <Field fieldName="email" />
        <Field fieldName="mobile" />
        <Field fieldName="status" />
      </FormSection>
    </ModelDialog>
  );
}

export default function UserRoleFormPage() {
  return (
    <ModelForm modelName="UserRole">
      <FormHeader />
      <FormToolbar />

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="name" />
          <Field fieldName="code" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>
        <FormSection>
          <Field
            fieldName="userIds"
            tableView={userRoleUserIdsTableView}
            formView={UserRoleUserIdsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

Notes:

- `tableView` controls relation-table columns through child `<Field />` declarations and optional `RelationTable.orders` / `RelationTable.pageSize`.
- `RelationTable.orders` supports either a single tuple (`["username", "ASC"]`) or multiple tuples (`[["username", "ASC"], ["email", "DESC"]]`).
- remote relation table and picker queries use the effective field filter (`Field.filters ?? metaField.filters`), relation-scoped filters, and runtime search / column filters.
- `isPaged` (OneToMany/ManyToMany fields only):
  - `false` (default): include relation `subQuery` in `getById`; relation table does not paginate in UI and renders all local rows.
  - `true`: relation table enables pagination UI; when `recordId + relatedModel + scoped relation filter` are ready, data is loaded by `relatedModel.searchPage` (remote mode), otherwise paginated locally.
- relation table pageSize default is `50`; page-size selector is shown only when pagination is enabled (`isPaged=true`).
- ManyToMany picker dialog (`Add`) is server-driven; search/sort/page changes trigger `searchPage` requests.
- `formView` is optional. In `ManyToMany`, row-click opens `ModelDialog` in read mode; add/remove still uses picker behavior.
- unresolved `#{fieldName}` dependencies pause remote relation queries and picker queries until the dependent parent form value exists

### Compatibility

Backend still supports full submit for XToMany fields.
Frontend `ModelForm` defaults to incremental submit (`PatchType` map) to avoid full-list overwrite risk in paginated relation editing.

## Page Structure

Recommended default layout:

- Header: title + description
- Sticky toolbar:
  - left: built-in `FormEditStatus + FormPrimaryActions` (+ `FormWorkflowActions` when `enableWorkflow=true`)
  - right: business actions area (custom actions + built-in Duplicate/Delete + More Actions)
- Body: `FormBody` renders section nav (auto) + form content + audit panel
- Audit: `FormBody(enableAuditLog)` controls audit panel; right on large screens and bottom on small screens

## Props

### ModelForm Props

| Prop            | Type                      | Required | Default                               | Notes                                                                                       |
| --------------- | ------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `modelName`     | `string`                  | Yes      | -                                     | Model name used to request metadata from API (`/metadata/getMetaModel`).                    |
| `id`            | `string \| null`          | No       | Route `params.id` (`"new"` => `null`) | Optional override.                                                                          |
| `schemaBuilder` | `(context) => ZodTypeAny` | No       | -                                     | Runtime schema extender. Receives `{ metaModel, baseSchema }` built from resolved metadata. |
| `readOnly`      | `boolean`                 | No       | `false`                               | Force read-only mode.                                                                       |
| `children`      | `ReactNode`               | Yes      | -                                     | Form page layout content (`FormHeader/FormToolbar/FormBody`).                               |

Runtime field conditions:

- `Field.required`, `Field.readonly`, `Field.hidden` support `boolean | FilterCondition | dependsOn(...)`.
- Conditions are evaluated against current form values.
- `FilterCondition` automatically tracks both operand fields and local `#{fieldName}` references.
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
- response `readonly` / `required` override local effective state until reset, cancel, reload, or a later response
- this remote linkage runtime is implemented for `ModelForm`; it is not automatically available in standalone `DialogForm`

### FormHeader Props

| Prop          | Type        | Required | Default                                      | Notes                                     |
| ------------- | ----------- | -------- | -------------------------------------------- | ----------------------------------------- |
| `title`       | `string`    | No       | `metaModel.labelName` (fallback `pageTitle`) | Optional override.                        |
| `description` | `string`    | No       | `metaModel.description`                      | Optional override.                        |
| `extras`      | `ReactNode` | No       | -                                            | Extra header content rendered near title. |

### FormBody Props

| Prop             | Type                            | Required | Default  | Notes                                            |
| ---------------- | ------------------------------- | -------- | -------- | ------------------------------------------------ |
| `sectionNavMode` | `"auto" \| "always" \| "never"` | No       | `"auto"` | `auto` shows section nav when section count > 3. |
| `enableAuditLog` | `boolean`                       | No       | `true`   | Toggle audit panel (only renders in edit mode).  |
| `children`       | `ReactNode`                     | Yes      | -        | Form sections / content nodes.                   |

### FormToolbar Props

| Prop                   | Type        | Required | Default                                                   | Notes                                                                                                                                                      |
| ---------------------- | ----------- | -------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`             | `ReactNode` | No       | -                                                         | Custom actions. Recommended: `<Action type=\"...\" />`.                                                                                                    |
| `enableWorkflow`       | `boolean`   | No       | `false`                                                   | Toggle workflow action group in toolbar left area. Only shown in edit mode and not read-only.                                                              |
| `enableCreate`         | `boolean`   | No       | `true`                                                    | Built-in `Create New` action in the right toolbar group. Explicit prop value wins; when omitted, hard read-only forms hide it by default.                  |
| `enableDuplicate`      | `boolean`   | No       | `true`                                                    | Built-in duplicate action. Explicit prop value wins; when omitted, hard read-only forms hide it by default. In create state it stays visible but disabled. |
| `enableDelete`         | `boolean`   | No       | `true`                                                    | Built-in delete action. Explicit prop value wins; when omitted, hard read-only forms hide it by default. In create state it stays visible but disabled.    |
| `confirmDeleteMessage` | `string`    | No       | `Delete this {modelLabel}? This action cannot be undone.` | Confirm text for built-in delete action.                                                                                                                   |

### Actions In `ModelForm`

Common `Action` / `BulkAction` API now lives in [Action](./action).
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
- edit mode with unsaved changes: clicking business actions asks whether to discard changes before continuing
- create mode: built-in `Duplicate` / `Delete` remain visible but disabled
- built-in `Duplicate` still uses backend `copyById`; exclusion of `BaseModel.reversedFields` is handled by backend duplicate semantics

Complete example:

```tsx
import { Action } from "@/components/actions/Action";
import { FormSection } from "@/components/common/form-section";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";
import { ExternalLink, Lock, RefreshCw, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" labelName="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelForm modelName="UserAccount">
  <FormToolbar>
    <Action
      labelName="Lock"
      operation="lockAccount"
      placement="toolbar"
      icon={Lock}
      confirmMessage="Lock this account?"
    />
    <Action
      type="dialog"
      labelName="Unlock"
      operation="unlockAccount"
      placement="more"
      icon={ShieldCheck}
      component={UnlockDialog}
    />
  </FormToolbar>

  <FormBody>
    <FormSection labelName="Credentials">
      <Action
        type="link"
        labelName="Open Docs"
        placement="header"
        icon={ExternalLink}
        href="https://docs.example.com/credentials"
      />
      <Action
        type="custom"
        labelName="Regenerate Preview"
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

## Built-in Behavior

- Create/edit mode defaults and reset handling.
- Reset behavior is snapshot-guarded:
  - record/model identity change => reset
  - pristine form + remote snapshot changed => reset
  - dirty form + background refetch => do not overwrite current edits
- Metadata resolution policy: always fetch from `/metadata/getMetaModel`; first response is cached by React Query and reused.
- Metadata-driven field props are resolved by the internal field runtime; business code should stay on `Field`.
- Cancel behavior:
  - edit mode: `Cancel` confirms (when dirty), resets form to latest loaded data, then switches to read-only mode
  - read mode: `Back` navigates to list page
- Save/create mutation handling with toasts.
- Audit query is built in via `useGetChangeLogQuery(modelName, id)` with:
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- Global audit API switch:
  - `configs.env.enableChangeLog` (`NEXT_PUBLIC_ENABLE_CHANGE_LOG`, default `true`)
  - when disabled, `FormAuditPanel` does not issue change-log API requests and shows a disabled hint text
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

## Dialog Architecture

Detailed dialog API, props, and full examples are maintained in:
[Dialog](./dialog).

Quick selection:

- `ActionDialog`: invoke model operation `/{modelName}/{operation}` (single/bulk).
- `ModelDialog`: relation-field runtime dialog, no explicit `modelName` needed.

To avoid documentation drift, this file only keeps form-page guidance; dialog details are centralized in dialogs README.

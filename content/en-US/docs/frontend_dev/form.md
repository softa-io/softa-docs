# ModelForm

Metadata-driven create/edit form container based on `react-hook-form` and Zod.

## Related Docs
- [Dialog components](./dialog)
- [Table components](./table)

## Import

```tsx
import { ModelForm } from "@/components/views/form/ModelForm";
```

## Quick Start

Recommended usage in `src/app/**/[id]/page.tsx`:

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
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

Need custom variations? Use `useModelFormContext()` in children and rearrange `FormHeader/FormToolbar/FormBody` directly.

Default recommendation is `Field` (metadata auto-dispatch by `fieldType`) with metadata overrides only.

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
  filters='[["active","=",true]]'
  defaultValue="https://example.com"
/>
```

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
  fieldName="content"
  widgetType="RichText"
/>
```

`File` / `MultiFile` automatically use current `ModelForm` record id in edit mode.

### Field Full Width

`Field` supports `fullWidth` for these field renderers:

- `TextField` (`fieldType="String"` + `widgetType="Text"`)
- `RichTextField` (`fieldType="String"` + `widgetType="RichText"`)
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
- row edit/create uses built-in runtime local-draft editor dialog
- optional `formView` can mount a custom `ModelDialog` component
- submit default: patch map (incremental)

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
import { defineRelationTableView, Field } from "@/components/fields";

export const optionItemsInitialParams = defineRelationTableView({
  fields: ["sequence", "itemCode", "itemName", "active"],
  orders: [["sequence", "ASC"]],
  pageSize: 10,
});

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
          <Field fieldName="optionItems"
            tableView={optionItemsInitialParams}
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
import { defineRelationTableView, Field } from "@/components/fields";

export const userRoleUserIdsInitialParams = defineRelationTableView({
  fields: ["username", "nickname", "email", "mobile", "status"],
  orders: [["username", "ASC"]],
  pageSize: 10,
});

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
          <Field fieldName="userIds"
            tableView={userRoleUserIdsInitialParams}
            formView={UserRoleUserIdsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

Notes:

- `tableView` controls relation-table query/columns behavior (`fields/orders/pageSize/...`).
- `isPaged` (OneToMany/ManyToMany fields only):
  - `false` (default): include relation `subQuery` in `getById` and render local table sort/page (no pagination limit, full relation data).
  - `true`: skip relation `subQuery`; relation table loads by `relatedModel.searchPage` when `recordId` is available.
- Without `tableView.renderers`, Boolean values are rendered as default badges (`True`/`False`).
- `tableView.renderers[fieldName]`: customize table cell rendering (status badge, tags, localized text).
- `tableView.sortAccessors[fieldName]`: optional advanced hook for local relation table sort value mapping.
- relation table pageSize default is `50` and can be changed in the page bar.
- ManyToMany picker dialog (`Add`) is server-driven; search/sort/page changes trigger `searchPage` requests.
- `formView` is optional. In `ManyToMany`, row-click opens `ModelDialog` in read mode; add/remove still uses picker behavior.

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

| Prop        | Type                                           | Required | Default | Notes                                         |
| ----------- | ---------------------------------------------- | -------- | ------- | --------------------------------------------- |
| `modelName` | `string`                                       | Yes      | -       | Model name used to request metadata from API (`/metadata/getMetaModel`). |
| `id`        | `string \| null`                               | No       | Route `params.id` (`"new"` => `null`) | Optional override. |
| `zodSchema` | `ZodTypeAny`                                   | No       | -       | Optional schema override.                     |
| `schemaBuilder` | `(context) => ZodTypeAny`                  | No       | -       | Runtime schema extender. Receives `{ metaModel, baseSchema }` built from resolved metadata. |
| `readOnly`  | `boolean`                                      | No       | `false` | Force read-only mode.                         |
| `children`  | `ReactNode`                                    | Yes      | -       | Form page layout content (`FormHeader/FormToolbar/FormBody`). |

Schema precedence: `schemaBuilder` > `zodSchema` > metadata-derived base schema.

### FormHeader Props

| Prop          | Type        | Required | Default | Notes |
| ------------- | ----------- | -------- | ------- | ----- |
| `title`       | `string`    | No       | `metaModel.labelName` (fallback `pageTitle`) | Optional override. |
| `description` | `string`    | No       | `metaModel.description` | Optional override. |
| `extras`      | `ReactNode` | No       | -       | Extra header content rendered near title. |

### FormBody Props

| Prop             | Type                            | Required | Default | Notes                                                                 |
| ---------------- | ------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `sectionNavMode` | `"auto" \| "always" \| "never"` | No       | `"auto"` | `auto` shows section nav when section count > 3.     |
| `enableAuditLog` | `boolean`                       | No       | `true` | Toggle audit panel (only renders in edit mode).      |
| `children`       | `ReactNode`                     | Yes      | -       | Form sections / content nodes.                                        |

### FormToolbar Props

| Prop                | Type                      | Required | Default | Notes                                                                                         |
| ------------------- | ------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| `children`          | `ReactNode`               | No       | -       | Custom actions. Recommended: `<Action type=\"...\" />`.                                       |
| `enableWorkflow`    | `boolean`                 | No       | `false` | Toggle workflow action group in toolbar left area. Only shown in edit mode and not read-only.|
| `enableDuplicate`   | `boolean`                 | No       | `true` | Built-in duplicate action; shown only when edit mode has record id.         |
| `enableDelete`      | `boolean`                 | No       | `true` | Built-in delete action; shown only when edit mode has record id.            |
| `duplicatePlacement`| `"toolbar" \| "more"`     | No       | `"more"` | Placement of built-in Duplicate action.                                     |
| `deletePlacement`   | `"toolbar" \| "more"`     | No       | `"more"` | Placement of built-in Delete action.                                        |
| `moreActionsLabel`  | `string`                  | No       | `"More Actions"` | Label for More Actions trigger.                                   |
| `confirmDeleteMessage` | `string`               | No       | `Delete this {modelLabel}? This action cannot be undone.` | Confirm text for built-in delete action. |

### Action Props

Use a single `Action` component with discriminated `type`.

`Action` supports both static values and context-driven values via:

```ts
type ActionValue<T> = T | ((context: { id: string | null; modelName?: string; row?: Record<string, unknown> }) => T);
```

| Prop             | Type                                    | Required | Default | Notes                                                                 |
| ---------------- | --------------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom"` | No | `"default"` | Action behavior. Omit to use direct API invoke.          |
| `labelName`      | `ReactNode`                             | Yes      | -       | Action label.                                                         |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | No | FormToolbar:`"toolbar"`, FormSection:`"inline"` | Depends on parent container. |
| `confirmMessage` | `ActionValue<string>`                   | No       | -       | Optional confirmation prompt before action execution.                 |
| `successMessage` | `ActionValue<string>`                   | No       | -       | Success toast message for `default` and `dialog` actions.             |
| `errorMessage`   | `ActionValue<string>`                   | No       | -       | Error toast message for `default` and `dialog` actions.               |
| `icon`           | `ComponentType<{ className?: string }>` | No       | -       | Action icon.                                                          |
| `destructive`    | `boolean`                               | No       | `false` | Destructive styling.                                                  |
| `disabled`       | `ActionValue<boolean>`                  | No       | `false` | Disabled state.                                                       |
| `visible`        | `ActionValue<boolean>`                  | No       | `true` | Visibility control.                                                   |

Behavior-specific props:

| Component                  | Required Behavior Props | Default | Notes |
| -------------------------- | ----------------------- | ------- | ----- |
| `type` omitted or `type="default"` | `operation` | - | Calls `POST /{modelName}/{operation}` with current record `id` in query params and optional `payload` in body. `payload` supports `ActionValue<Record<string, unknown>>`. |
| `type="dialog"` | `operation`, `component` | - | `component={MyDialogComponent}`. Open/close, operation, success/error messaging are injected from `Action`. |
| `type="link"`   | `href`                  | `target="_self"` | `href` supports `string` or `({ id, modelName }) => string`. |
| `type="custom"` | `onClick`               | - | Use for pure UI/local behaviors. Signature: `onClick({ id, modelName, row }) => void`. |

Action type examples:

```tsx
// 1) default (type omitted): direct API invoke
<Action
  labelName="Lock Account"
  operation="lockAccount"
  placement="more"
  confirmMessage="Lock this user account?"
  successMessage="User account locked."
  errorMessage="Failed to lock user account."
/>

// 2) dialog: open custom dialog component, operation injected into dialog runtime
<Action
  type="dialog"
  labelName="Unlock Account"
  operation="unlockAccount"
  placement="more"
  component={UserAccountUnlockActionDialog}
  successMessage="User account unlocked."
  errorMessage="Failed to unlock user account."
/>

// 3) link: open URL
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
  target="_blank"
/>

// 4) custom: local UI logic
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
/>
```

### Action Support by Container

| Container | Supported Action Types | Supported Placements |
| --- | --- | --- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom` | `toolbar`, `more` |
| `FormSection` | `link`, `custom` | `header`, `inline` |

`FormSection` is a local UI action area and does not execute model API actions directly.
For API actions (`default` / `dialog`), place actions in `FormToolbar`.

### FormToolbar Action Examples

Minimal example:

```tsx
import { Action } from "@/components/common/Action";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";

<FormToolbar>
  <Action
    labelName="Lock Account"
    operation="lockAccount"
    placement="more"
  />
</FormToolbar>;
```

Common setup example:

```tsx
import { Action } from "@/components/common/Action";
import { ActionDialog } from "@/components/views/dialogs";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ExternalLink, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function UnlockDialog() {
  return (
    <ActionDialog
      title="Unlock Account"
      abstractModelName="UnlockAccountAction"
      abstractFields={[
        {
          fieldName: "reason",
          fieldType: "String",
          widgetType: "Text",
          labelName: "Reason",
        },
      ]}
      defaultValues={{ reason: "" }}
    />
  );
}

<FormToolbar enableWorkflow>
  {/* default */}
  <Action
    labelName="Lock"
    operation="lockAccount"
    placement="toolbar"
    icon={Lock}
    confirmMessage="Lock this account?"
    successMessage="Account locked."
    errorMessage="Failed to lock account."
  />

  {/* dialog */}
  <Action
    type="dialog"
    labelName="Unlock"
    operation="unlockAccount"
    placement="more"
    icon={ShieldCheck}
    component={UnlockDialog}
  />

  {/* link */}
  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
    target="_blank"
  />

  {/* custom */}
  <Action
    type="custom"
    labelName="Run Health Check"
    placement="more"
    icon={PlayCircle}
    onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
  />
</FormToolbar>;
```

### FormSection Action Examples

Minimal example:

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";

<FormSection labelName="Advanced">
  <Action
    type="custom"
    labelName="Validate Inputs"
    placement="inline"
    onClick={() => console.log("validate")}
  />
  {/* section fields... */}
</FormSection>;
```

Common setup example:

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";
import { ExternalLink, RefreshCw } from "lucide-react";

<FormSection
  labelName="Credentials"
  description="Manage key pair and endpoint."
>
  {/* header action */}
  <Action
    type="link"
    labelName="Open Docs"
    placement="header"
    icon={ExternalLink}
    href="https://docs.example.com/credentials"
    target="_blank"
  />

  {/* inline action */}
  <Action
    type="custom"
    labelName="Regenerate Preview"
    placement="inline"
    icon={RefreshCw}
    onClick={() => console.log("regenerate")}
  />

  {/* section fields... */}
</FormSection>;
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
- Metadata resolution policy: always fetch from `/metadata/getMetaModel`; first response is cached by React Query and reused.
- Metadata-driven field props via `FieldPropsProvider`.
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
 - [Dialog components](./dialog)

Quick selection:

- `ActionDialog`: invoke model operation `/{modelName}/{operation}` (single/bulk).
- `ModelDialog`: relation-field runtime dialog, no explicit `modelName` needed.
- `WizardDialog`: multi-step flow with custom submit.

To avoid documentation drift, this file only keeps form-page guidance; dialog details are centralized in dialogs README.

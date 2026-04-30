# Actions

Reusable action DSL used by `ModelForm` and `ModelTable`.

Use this document for:

- `Action`
- `BulkAction`
- action type selection
- shared action props
- placement rules in form and table containers

Related docs:

- [ModelForm](./views/form): layout and form container behavior
- [ModelTable](./views/table): layout, side tree, query behavior
- [ActionDialog & ModelDialog](./views/dialogs)

## Import

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
```

## Choose The Right Component

| Component    | Use when                                               | Typical scope                                           |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| `Action`     | Single-record action, row action, form action, or link | `ModelForm`, `ModelTable`, `ModelCard`, `RelationTable` |
| `BulkAction` | Selection-based action over multiple table rows        | `ModelTable` only                                       |

## `Action`

Use a single `Action` component with discriminated `type`.

`Action` supports both static values and context-driven values via:

```ts
type ActionValue<T> =
  | T
  | ((context: {
      id: string | null;
      modelName?: string;
      scope: "form" | "model-table";
      mode: "create" | "edit" | "read";
      isDirty: boolean;
      values?: Record<string, unknown>;
      row?: Record<string, unknown>;
    }) => T);
```

### Shared Props

| Prop             | Type                                                    | Required | Default             | Notes                                                     |
| ---------------- | ------------------------------------------------------- | -------- | ------------------- | --------------------------------------------------------- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom" \| "form"` | No       | `"default"`         | Action behavior. Omit to use direct API invoke.           |
| `labelName`      | `ReactNode`                                             | Yes      | -                   | Action label.                                             |
| `style`          | `"primary" \| "danger"`                                 | No       | -                   | Visual style. Omit for neutral default appearance. See [Action Style](#action-style). |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"`           | No       | container-dependent | Placement support depends on parent container.            |
| `confirmMessage` | `ActionValue<string>`                                   | No       | -                   | Optional confirmation prompt before action execution.     |
| `successMessage` | `ActionValue<string>`                                   | No       | -                   | Success toast message for `default` and `dialog` actions. |
| `icon`           | `ComponentType<{ className?: string }>`                 | No       | -                   | Action icon.                                              |
| `disabled`       | `boolean \| FilterCondition \| dependsOn(...)`          | No       | `false`             | Disabled state.                                           |
| `hidden`         | `boolean \| FilterCondition \| dependsOn(...)`          | No       | `false`             | Hide the action when the condition resolves to `true`.    |

### Behavior-Specific Props

| Component                          | Required Behavior Props     | Default                                 | Notes                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type` omitted or `type="default"` | `operation`                 | -                                       | Calls `POST /{modelName}/{operation}` with current record `id` in query params.                                                                                                                                                                                                                                                        |
| `type="dialog"`                    | `operation`, `component`    | -                                       | `component={MyDialogComponent}`. Open/close, operation, and success messaging are injected from `Action`; failures use API response toasts.                                                                                                                                                                                            |
| `type="link"`                      | `href`                      | opens in current tab (`target="_self"`) | `href` supports a template string (see below) or `({ id, modelName }) => string`. Use `target="_blank"` to open a new tab.                                                                                                                                                                                                             |
| `type="custom"`                    | `onClick`                   | -                                       | Use for pure UI/local behaviors. Signature: `onClick({ id, modelName, scope, mode, isDirty, values, row }) => void`.                                                                                                                                                                                                                   |
| `type="form"`                      | `component`, `relatedField` | -                                       | Opens a dialog containing an independent `ModelForm`. `component` renders the child form view; `relatedField` names the child-model field that references the parent record. The parent `id` is automatically injected into `ModelForm.defaultValues` as `{ [relatedField]: parentId }` and included in the create/update API payload. |

### Action Execution Context

Every `ActionValue<T>`, `disabled`, and `hidden` callback receives the same context object:

| Property    | Type                           | Description                                                 |
| ----------- | ------------------------------ | ----------------------------------------------------------- |
| `id`        | `string \| null`               | Current record id (`null` in create mode).                  |
| `modelName` | `string \| undefined`          | Model name of the host container.                           |
| `scope`     | `"form" \| "model-table"`      | Which container the action lives in.                        |
| `mode`      | `"create" \| "edit" \| "read"` | Current form/row lifecycle phase (see below).               |
| `isDirty`   | `boolean`                      | Whether the form/row has unsaved changes.                   |
| `values`    | `Record<string, unknown>`      | Current form values (form scope) or row data (table scope). |
| `row`       | `Record<string, unknown>`      | Row data (table scope only, `undefined` in form scope).     |

#### `mode` values

| Mode       | Meaning                                       | When                                                                                          |
| ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `"create"` | New record, form is editable, `id` is `null`. | Form is in create mode (no existing record).                                                  |
| `"edit"`   | Existing record, form fields are editable.    | User clicked Edit on a read-only record, or form opened directly in edit mode.                |
| `"read"`   | Existing record, form fields are read-only.   | Detail form with `detailStartsInReadOnly` before the user clicks Edit, or route `?mode=read`. |

Key behavior: **business actions (toolbar `Action` components) are NOT automatically disabled in `read` mode.** Read mode only locks form fields — actions like status transitions remain clickable. If an action should be disabled in read mode, declare it explicitly via the `disabled` prop.

### Action Style

Use `style` to express the visual intent of an action button. Omitting `style` renders the action with a neutral appearance (ghost or outline, determined by the container).

| Value       | Appearance          | When to use                                          |
| ----------- | ------------------- | ---------------------------------------------------- |
| `"primary"` | Prominent / filled  | The main recommended action in a toolbar or section. |
| `"danger"`  | Red / destructive   | Irreversible or high-risk operations.                |
| _(omitted)_ | Neutral ghost/outline | All other actions.                                 |

```tsx
// Primary: highlight the key action
<Action labelName="Submit for Approval" operation="submit" style="primary" />

// Danger: signal risk explicitly
<Action labelName="Deactivate Account" operation="deactivate" style="danger" confirmMessage="Deactivate this account?" />

// No style: neutral appearance
<Action labelName="Export" operation="export" />
```

> **Auto-detection**: If `style` is omitted, actions whose `operation` or `labelName` contains keywords like `delete`, `remove`, `disable`, `deactivate`, `archive`, or `reject` are automatically treated as `"danger"`. Explicitly setting `style="danger"` is recommended for clarity.

### Condition props (`disabled` / `hidden`)

`disabled` and `hidden` share the same runtime condition model as `Field`:

- `boolean` — static value, no field dependency
- `FilterCondition` — evaluated against current scope values, automatically tracks `{{ fieldName }}` references
- `dependsOn([...], evaluator)` — explicit field dependencies with callback access to the full `ActionExecutionContext`

Bare function conditions are not supported; wrap function logic with `dependsOn([...], evaluator)`.

> **Implicit rule (form scope)**: Actions inside a form (`FormToolbar` / `FormSection`) are automatically disabled in `create` mode, since their `operation` is dispatched against an existing record `id`. Do **not** repeat `mode === "create"` checks in `disabled`. The user-supplied condition is short-circuited in create mode and never invoked. `disabledReason` is still resolved when disabled, so a `mode === "create"` branch there is fine if you want to show "Save the record first."

#### Common `disabled` / `hidden` patterns

```tsx
// Disabled in read mode only (create is already covered implicitly)
disabled={dependsOn(["id"], ({ mode }) => mode === "read")}

// Hidden unless status is a specific value (FilterCondition shorthand)
hidden={["status", "!=", "InProgress"]}

// Hidden based on multiple status values
hidden={dependsOn(["status"], ({ values }) => {
  const code = getOptionCode(values?.status);
  return code !== "InProgress" && code !== "Done";
})}

// Always disabled (static)
disabled={true}

// Disabled when form has unsaved changes
disabled={dependsOn([], ({ isDirty }) => isDirty)}
```

### Action Type Examples

```tsx
// 1) default (type omitted): direct API invoke
<Action
  labelName="Lock Account"
  operation="lockAccount"
  placement="more"
  confirmMessage="Lock this user account?"
  successMessage="User account locked."
/>

// 2) dialog: open custom dialog component, operation injected into dialog runtime
<Action
  type="dialog"
  labelName="Unlock Account"
  operation="unlockAccount"
  placement="more"
  component={UserAccountUnlockActionDialog}
  successMessage="User account unlocked."
/>

// 3) link: open URL in current tab by default — string template or function
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href="/{modelName}/audit?id={id}"
/>
// Explicit new-tab behavior:
<Action
  type="link"
  labelName="Open Docs"
  placement="more"
  href="https://docs.example.com"
  target="_blank"
/>
// Function form (required when you need conditional logic):
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
/>

// 4) custom: local UI logic
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => console.log(`${modelName} health check started.`)}
/>

// 5) form: open independent ModelForm in dialog
<Action
  type="form"
  labelName="Add Config Group"
  placement="toolbar"
  component={ConfigGroupForm}
  relatedField="tenantConfigId"
/>
```

### `type="form"` Component Definition

The `component` is a standard React component that renders a `ModelForm` with its own `modelName`. When opened via `Action type="form"`, `ModelForm` automatically adapts to dialog mode:

- ignores route `params.id` (uses only the `id` prop)
- on create/update success: closes the dialog instead of navigating
- on cancel: closes the dialog instead of navigating
- `relatedField` value is injected into `defaultValues` and included in the API payload, even if the field is not displayed

```tsx
import { FormSection } from "@/components/views/form/components/FormSection";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";

function ConfigGroupForm() {
  return (
    <ModelForm modelName="TenantConfigGroup">
      <FormToolbar />
      <FormBody enableAuditLog={false}>
        <FormSection labelName="General" hideHeader>
          <Field fieldName="groupName" />
          <Field fieldName="description" />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

## `BulkAction`

`BulkAction` is the selection-scoped variant for `ModelTable`.

Execution context:

```ts
{
  ids: string[];
  rows: Record<string, unknown>[];
  modelName?: string;
}
```

Supported behavior:

- types: `default | dialog`
- placements: `toolbar | more`
- common visual props follow the same pattern as `Action`: `labelName`, `style`, `confirmMessage`, `successMessage`, `icon`, `disabled`

Behavior-specific props:

| Component                          | Required Behavior Props  | Notes                                                               |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `type` omitted or `type="default"` | `operation`              | Executes the bulk operation with selected ids.                      |
| `type="dialog"`                    | `operation`, `component` | Opens a dialog whose submit is bound to the bulk operation runtime. |

## Actions In `ModelForm`

Container support:

| Container     | Supported Action Types                        | Supported Placements |
| ------------- | --------------------------------------------- | -------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom`, `form` | `toolbar`, `more`    |
| `FormSection` | `link`, `custom`                              | `header`, `inline`   |

Rules:

- `FormToolbar` is the action area for page-level business actions
- `FormSection` is a local UI action area and does not execute model API actions directly
- for API actions (`default` / `dialog`), place actions in `FormToolbar`
- built-in workflow/create/duplicate/delete toolbar behavior is configured on `ModelForm`/`ModelSideForm` props
- edit mode with unsaved changes: clicking business actions asks whether to discard changes before continuing
- create mode: built-in `Duplicate` / `Delete` remain visible but disabled

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
        target="_blank"
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

## Actions In `ModelCard`

Rules:

- Placement is inferred from where `Action` is **declared in the JSX tree**, not the `placement` prop
- `Action` inside `<ModelCard.Header>` → renders as an `outline` button in the card header
- `Action` as a top-level body child → renders as an `outline` button to the right of the card body content
- `<Action placement="more" />` → renders in the per-card `...` hover dropdown (merged with the built-in Delete option when `enableDelete` is set)
- `hidden` / `disabled` are evaluated per-card using `RecordContext` values (same as ModelTable row actions)
- All action types are supported: `default`, `dialog`, `link`, `custom`

String `href` values support `{placeholder}` interpolation. Supported placeholders:

| Placeholder      | Resolves to                         |
| ---------------- | ----------------------------------- |
| `{id}`           | Current record ID                   |
| `{modelName}`    | Model name of the card              |
| `{anyFieldName}` | Value of that field from the record |

```tsx
// Record ID
<Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />

// Any record field
<Action type="link" labelName="Open" href="/studio/{appCode}/workbench" />

// Multiple placeholders
<Action type="link" labelName="Open" href="/studio/app/{id}/version/{currentVersion}" />

// Function form (for conditional logic)
<Action type="link" labelName="Edit" href={({ id }) => `/studio/app/${id}/workbench`} />
```

Complete example:

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />
    <Action
      labelName="Archive"
      operation="archive"
      placement="more"
    />
  </ModelCard.Header>
  <Field fieldName="status" />
  <Action labelName="Publish" operation="publish" />
  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## Actions In `ModelTable`

Rules:

- `<Action placement="toolbar" />` renders in the table toolbar custom action area
- `<Action placement="inline" />` renders in the last-column inline action area
- `<Action placement="more" />` renders in the last-column More Actions dropdown
- active inline-edit rows resolve action context from the current draft row values
- clicking a row action while the active row is dirty asks whether to discard the draft before continuing
- `BulkAction` is selection-scoped and only shown when rows are selected
- `BulkAction placement="toolbar"` appears between `Columns` and `More`
- `BulkAction placement="more"` appears in the toolbar More dropdown bulk section

Complete example:

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { ModelTable } from "@/components/views/table/ModelTable";
import { ExternalLink, Lock, Pencil, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" labelName="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />

  <Action
    type="custom"
    labelName="Refresh"
    placement="toolbar"
    onClick={() => console.log("refresh")}
  />

  <Action
    type="custom"
    labelName="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => console.log("quick edit:", id)}
  />

  <Action
    labelName="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
  />

  <Action
    type="dialog"
    labelName="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
  />

  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
  />

  <BulkAction
    labelName="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
  />

  <BulkAction
    type="dialog"
    labelName="Unlock Selected"
    operation="unlockByIds"
    placement="more"
    component={UnlockDialog}
  />
</ModelTable>;
```

## Actions In `RelationTable`

`<Action />` can be declared as a child of `<RelationTable />` (inside a relation field's `tableView`) to attach per-row actions to a `OneToMany` / `ManyToMany` relation table.

Rules:

- `<Action placement="inline" />` renders as an icon/button in the row's `Actions` column
- `<Action placement="more" />` renders in the row's overflow dropdown
- `placement="toolbar"` / `"header"` are not supported here (relation tables have no toolbar)
- actions dispatch against the **related model**, not the parent form's model — `operation` is called with the related record id, and query invalidation targets the related model
- only rows with an `id` render actions; newly-added unsaved rows show an empty cell
- `disabled` / `hidden` evaluate against saved row data only; they do not track unsaved inline-edit values (unlike `ModelTable`)
- `ActionExecutionContext.scope` is reported as `"model-table"` (relation rows reuse the same dispatcher)
- `BulkAction` is not supported in `RelationTable`

Example — declare row actions on an embedded relation table:

```tsx
import { Action } from "@/components/actions/Action";
import { Field, RelationTable } from "@/components/fields";

function AgreementLineTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]}>
      <Field fieldName="sequence" />
      <Field fieldName="productCode" />
      <Field fieldName="quantity" />

      <Action
        type="link"
        labelName="Open"
        placement="inline"
        href="/sales/agreement-line/{id}"
      />
      <Action
        labelName="Recalculate"
        operation="recalculate"
        placement="more"
        successMessage="Line recalculated."
      />
    </RelationTable>
  );
}

<Field fieldName="lines" tableView={AgreementLineTableView} />;
```

See also [Relation Fields — Row Actions](./fields/relations.md#row-actions).

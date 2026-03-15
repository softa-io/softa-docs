# Actions

Reusable action DSL used by `ModelForm` and `ModelTable`.

Use this document for:

- `Action`
- `BulkAction`
- action type selection
- shared action props
- placement rules in form and table containers

Related docs:

- [ModelForm](./form): layout and form container behavior
- [ModelTable](./table): layout, side tree, query behavior
- [ActionDialog & ModelDialog](./dialog)

## Import

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
```

## Choose The Right Component

| Component    | Use when                                                | Typical scope             |
| ------------ | ------------------------------------------------------- | ------------------------- |
| `Action`     | Single-record action, row action, form action, or link  | `ModelForm`, `ModelTable` |
| `BulkAction` | Selection-based action over multiple table rows         | `ModelTable` only         |

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

| Prop             | Type                                           | Required | Default | Notes |
| ---------------- | ---------------------------------------------- | -------- | ------- | ----- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom"` | No       | `"default"` | Action behavior. Omit to use direct API invoke. |
| `labelName`      | `ReactNode`                                    | Yes      | -       | Action label. |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | No       | container-dependent | Placement support depends on parent container. |
| `confirmMessage` | `ActionValue<string>`                          | No       | -       | Optional confirmation prompt before action execution. |
| `successMessage` | `ActionValue<string>`                          | No       | -       | Success toast message for `default` and `dialog` actions. |
| `errorMessage`   | `ActionValue<string>`                          | No       | -       | Error toast message for `default` and `dialog` actions. |
| `icon`           | `ComponentType<{ className?: string }>`        | No       | -       | Action icon. |
| `disabled`       | `boolean \| FilterCondition \| dependsOn(...)` | No       | `false` | Disabled state. |
| `hidden`         | `boolean \| FilterCondition \| dependsOn(...)` | No       | `false` | Hide the action when the condition resolves to `true`. |

### Behavior-Specific Props

| Component                          | Required Behavior Props  | Default          | Notes |
| ---------------------------------- | ------------------------ | ---------------- | ----- |
| `type` omitted or `type="default"` | `operation`              | -                | Calls `POST /{modelName}/{operation}` with current record `id` in query params. |
| `type="dialog"`                    | `operation`, `component` | -                | `component={MyDialogComponent}`. Open/close, operation, success/error messaging are injected from `Action`. |
| `type="link"`                      | `href`                   | opens in new tab | `href` supports `string` or `({ id, modelName }) => string`. |
| `type="custom"`                    | `onClick`                | -                | Use for pure UI/local behaviors. Signature: `onClick({ id, modelName, scope, mode, isDirty, values, row }) => void`. |

Action condition notes:

- `disabled` and `hidden` share the same runtime condition model as `Field`: `boolean`, `FilterCondition`, `dependsOn([...], evaluator)`
- `FilterCondition` is evaluated against current scope values and automatically tracks `#{fieldName}` references
- bare function conditions are not supported; wrap function logic with `dependsOn([...], evaluator)`
- if there is no field dependency, prefer plain `boolean`

### Action Type Examples

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
/>

// 4) custom: local UI logic
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => console.log(`${modelName} health check started.`)}
/>
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
- common visual props follow the same pattern as `Action`: `labelName`, `confirmMessage`, `successMessage`, `errorMessage`, `icon`, `disabled`

Behavior-specific props:

| Component                          | Required Behavior Props  | Notes |
| ---------------------------------- | ------------------------ | ----- |
| `type` omitted or `type="default"` | `operation`              | Executes the bulk operation with selected ids. |
| `type="dialog"`                    | `operation`, `component` | Opens a dialog whose submit is bound to the bulk operation runtime. |

## Actions In `ModelForm`

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
    type="default"
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

# Dialog Views

Reusable dialog view layer for action-driven forms, model CRUD forms, and multi-step wizards.

## Import

```tsx
import { ActionDialog, ModelDialog, WizardDialog } from "@/components/views/dialogs";
```

## Component Choice

| Component | Use when | Submit behavior |
| --- | --- | --- |
| `ActionDialog` | Execute `/{modelName}/{operation}` with optional form fields | Built-in invoke action API (`invokeAction` or `invokeBulkAction`) |
| `ModelDialog` | Create/update one model record with metadata-driven fields | Built-in CRUD (`createOneAndFetch` / `updateByIdAndFetch`) |
| `WizardDialog` | Multi-step flow (model-related or non-model) | Custom `onSubmit` |

## Public API Only

Use only exports from `@/components/views/dialogs`:

- `ActionDialog`
- `ModelDialog`
- `WizardDialog`

Files under `components/views/dialogs/components/*` are internal building blocks.

## ActionDialog

Best for operation dialogs such as `lockAccount`, `unlockAccount`, `submitApproval`.

Features:

- single record action (`id` in params)
- bulk action (`ids` merged into payload body)
- metadata-based fields via `abstractFields` or full `metaModel`
- runtime injection when used by `<Action type="dialog" />` / `<BulkAction type="dialog" />`

### ActionDialog Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | Yes | - | Dialog title. |
| `open` | `boolean` | No | Runtime context or `false` | Can be injected by `Action`/`BulkAction` runtime. |
| `onOpenChange` | `(open: boolean) => void` | No | Runtime context | Required if no runtime provider is present. |
| `operation` | `string` | No | Runtime context | Required if no runtime provider is present. |
| `modelName` | `string` | No | Runtime/form/table context | Auto-resolved from surrounding context when omitted. |
| `rowId` | `IdType \| null` | No | Runtime/form context id | Single-record target id. |
| `ids` | `IdType[] \| null` | No | Runtime bulk ids | Bulk mode when non-empty. |
| `payload` | `Record<string, unknown>` | No | `{}` | Merged with form values before submit. |
| `defaultValues` | `Record<string, unknown>` | No | `{}` | Initial form values. |
| `metaModel` | `MetaModel` | No | - | Use explicit metadata model. |
| `abstractModelName` | `string` | No | `"DialogForm"` | Used when building abstract metadata from fields. |
| `abstractModelLabelName` | `string` | No | `title` or `abstractModelName` | Display name for abstract metadata model. |
| `abstractFields` | `AbstractMetaField[]` | No | - | Field metadata for non-entity dialog forms. |
| `buildPayload` | `(context) => payload` | No | - | Transform merged payload before API call. |
| `description` | `ReactNode` | No | - | Dialog description. |
| `confirmLabel` | `string` | No | `"Confirm"` | Confirm button label. |
| `cancelLabel` | `string` | No | `"Cancel"` | Cancel button label. |
| `pendingLabel` | `string` | No | `"Submitting..."` | Confirm button text during submit. |
| `successMessage` | `string` | No | Runtime message or `"Action completed."` | Success toast text. |
| `errorMessage` | `string` | No | Runtime message or `"Action failed."` | Error toast text. |
| `confirmDisabled` | `boolean` | No | `false` | Disable confirm button. |
| `closeOnSuccess` | `boolean` | No | `true` | Auto-close after successful submit. |
| `resetOnClose` | `boolean` | No | `true` | Reset form state when dialog closes. |
| `onSuccess` | `() => void` | No | - | Callback after successful submit. |
| `onError` | `(error) => void` | No | - | Callback after failed submit. |
| `children` | `ReactNode \| (renderProps) => ReactNode` | No | - | Form content. |

### Example: used by `Action type="dialog"`

```tsx
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";

export function UserAccountUnlockActionDialog() {
  return (
    <ActionDialog
      title="Unlock User Account"
      description="Provide an optional reason for audit logging."
      abstractModelName="UserAccountUnlockAction"
      abstractFields={[
        {
          fieldName: "reason",
          fieldType: "Text",
          labelName: "Reason (Optional)",
        },
      ]}
      defaultValues={{ reason: "" }}
      buildPayload={({ payload }) => {
        const reason =
          typeof payload.reason === "string" ? payload.reason.trim() : "";
        return { reason: reason || undefined };
      }}
      confirmLabel="Confirm Unlock"
      pendingLabel="Unlocking..."
    >
      <Field fieldName="reason" />
    </ActionDialog>
  );
}
```

### Example: standalone controlled usage

```tsx
<ActionDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  rowId={id}
  operation="lockAccount"
  title="Lock User Account"
  confirmLabel="Confirm Lock"
/>
```

## ModelDialog

Metadata-driven create/update dialog for one record.

- `mode="create"`: create record
- `mode="update"`: update record (`rowId` required)
- mode omitted: inferred from `rowId`

### ModelDialog Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `open` | `boolean` | Yes | - | Controlled dialog open state. |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Controlled open-state handler. |
| `modelName` | `string` | Yes | - | Metadata and CRUD target model. |
| `mode` | `"create" \| "update"` | No | Inferred from `rowId` | `rowId` present => `update`, otherwise `create`. |
| `rowId` | `IdType \| null` | No | - | Required when `mode="update"`. |
| `schemaBuilder` | `(context) => ZodTypeAny` | No | - | Runtime schema extender. |
| `zodSchema` | `ZodTypeAny` | No | Metadata-derived schema | Used when `schemaBuilder` is not provided. |
| `defaultValues` | `DefaultValues` | No | Metadata defaults or transformed record | Merged over resolved metadata/record defaults. |
| `title` | `ReactNode` | No | - | Dialog title. |
| `description` | `ReactNode` | No | - | Dialog description. |
| `children` | `ReactNode \| (renderProps) => ReactNode` | No | - | Dialog form content. |
| `readOnly` | `boolean` | No | `false` | Inherited from `DialogForm`. |
| `confirmLabel` | `string` | No | `"Confirm"` | Inherited from `DialogForm`. |
| `cancelLabel` | `string` | No | `"Cancel"` | Inherited from `DialogForm`. |
| `pendingLabel` | `string` | No | `"Submitting..."` | Inherited from `DialogForm`. |
| `successMessage` | `string` | No | - | Inherited from `DialogForm`. |
| `errorMessage` | `string` | No | - | Inherited from `DialogForm`. |
| `confirmDisabled` | `boolean` | No | `false` | Inherited from `DialogForm`. |
| `closeOnSuccess` | `boolean` | No | `true` | Inherited from `DialogForm`. |
| `resetOnClose` | `boolean` | No | `true` | Inherited from `DialogForm`. |
| `onSubmit` | `(values, context) => Promise \| unknown` | No | Built-in CRUD | Default submit: create => `createOneAndFetch`, update => `updateByIdAndFetch`. |
| `onSuccess` | `(result) => void` | No | - | Inherited from `DialogForm`. |
| `onError` | `(error) => void` | No | - | Inherited from `DialogForm`. |

### ModelDialog: Minimal Example

```tsx
import { ModelDialog } from "@/components/views/dialogs";

<ModelDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  title="Create Account"
/>;
```

### ModelDialog: Common Setup Example

```tsx
import { Field } from "@/components/fields";
import { ModelDialog } from "@/components/views/dialogs";

<ModelDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  rowId={id}
  title="Edit Account"
>
  <Field fieldName="username" />
  <Field fieldName="email" />
</ModelDialog>
```

## WizardDialog

Step-by-step dialog with shared form state across steps.

### WizardDialog Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `open` | `boolean` | Yes | - | Controlled dialog open state. |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Controlled open-state handler. |
| `steps` | `WizardStep[]` | Yes | - | Step definitions. |
| `onSubmit` | `(values, context) => Promise \| unknown` | Yes | - | Final submit handler. |
| `title` | `ReactNode` | No | - | Dialog title (fallback when step title missing). |
| `description` | `ReactNode` | No | - | Dialog description (fallback when step description missing). |
| `contentClassName` | `string` | No | - | Custom content container className. |
| `initialStepIndex` | `number` | No | `0` | Initial step index. |
| `metaModel` | `MetaModel` | No | - | Explicit metadata model. |
| `abstractModelName` | `string` | No | `"WizardForm"` | Used when building abstract metadata from fields. |
| `abstractModelLabelName` | `string` | No | `title` or `abstractModelName` | Display name for abstract metadata model. |
| `abstractFields` | `AbstractMetaField[]` | No | - | Field metadata for non-entity wizard forms. |
| `zodSchema` | `ZodTypeAny` | No | - | Optional schema override. |
| `defaultValues` | `DefaultValues` | No | `{}` | Initial form values. |
| `recordId` | `string \| number \| null` | No | - | Passed to field props resolver. |
| `readOnly` | `boolean` | No | `false` | Force read-only mode. |
| `cancelLabel` | `string` | No | `"Cancel"` | Cancel button label. |
| `backLabel` | `string` | No | `"Back"` | Back button label. |
| `nextLabel` | `string` | No | `"Next"` | Next button label. |
| `finishLabel` | `string` | No | `"Finish"` | Finish button label. |
| `pendingLabel` | `string` | No | `"Submitting..."` | Submit button text during submit. |
| `successMessage` | `string` | No | - | Success toast text. |
| `errorMessage` | `string` | No | - | Error toast text. |
| `closeOnSuccess` | `boolean` | No | `true` | Auto-close after successful submit. |
| `resetOnClose` | `boolean` | No | `true` | Reset form and step state when dialog closes. |
| `onSuccess` | `(result) => void` | No | - | Callback after successful submit. |
| `onError` | `(error) => void` | No | - | Callback after failed submit. |

### WizardDialog: Minimal Example

```tsx
import { WizardDialog } from "@/components/views/dialogs";

<WizardDialog
  open={open}
  onOpenChange={setOpen}
  steps={[
    {
      key: "basic",
      content: <div>Basic Step</div>,
    },
  ]}
  onSubmit={async () => {}}
/>;
```

### WizardDialog: Common Setup Example

```tsx
import { Field } from "@/components/fields";
import { WizardDialog } from "@/components/views/dialogs";

<WizardDialog
  open={open}
  onOpenChange={setOpen}
  title="Create Robot"
  abstractModelName="CreateRobotWizard"
  abstractFields={[
    { fieldName: "name", fieldType: "String", required: true },
    { fieldName: "provider", fieldType: "Option", optionSetCode: "AI_PROVIDER", required: true },
    { fieldName: "prompt", fieldType: "Text" },
  ]}
  steps={[
    {
      key: "basic",
      title: "Basic",
      fields: ["name", "provider"],
      content: (
        <>
          <Field fieldName="name" />
          <Field fieldName="provider" />
        </>
      ),
    },
    {
      key: "prompt",
      title: "Prompt",
      content: <Field fieldName="prompt" />,
    },
  ]}
  onSubmit={async (values) => {
    // custom submit
  }}
/>
```

## Related

- [Form page usage](./form)
- [Table action usage](./table)

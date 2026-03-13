# Dialog Views

Reusable dialog view layer for action-driven forms, relation field dialogs, and multi-step wizards.

When dialog content uses `Field`, it supports the same runtime condition props as `ModelForm`:

- `required`
- `readonly`
- `hidden`

These accept `boolean | FilterCondition | ((ctx) => boolean)` and participate in dialog-side validation as well.

Relation-field `filters` in dialog content follow the same rule as `ModelForm`:

- `#{fieldName}` resolves from current dialog form values before the relation query is sent
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged
- `@{literal}` is passed through unchanged so backend can treat it as a forced literal

`Field.onChange` remote linkage is different:

- implemented today for `ModelForm`, `ModelTable` inline row, and `RelationTableView` inline row
- not automatically provided for standalone `ActionDialog` / `WizardDialog` / generic dialog forms

## Related Docs
- [Fields and widgets](./field)
- [Form components](./form)
- [Table components](./table)

## Import

```tsx
import { ActionDialog, ModelDialog, WizardDialog } from "@/components/views/dialogs";
```

## Component Choice

| Component | Use when | Submit behavior |
| --- | --- | --- |
| `ActionDialog` | Execute `/{modelName}/{operation}` with optional form fields | Built-in invoke action API (`invokeAction` or `invokeBulkAction`) |
| `ModelDialog` | Use inside relation field `formView` to define dialog layout with `FormHeader/FormToolbar/FormBody` | Runtime-injected relation context + built-in local draft submit |
| `WizardDialog` | Multi-step flow (model-related or non-model) | Custom `onSubmit` |

## Public API Only

Use only exports from `@/components/views/dialogs`:

- `ActionDialog`
- `ModelDialog`
- `WizardDialog`

Files under `components/views/dialogs/components/*` are internal building blocks.

## ModelDialog

`ModelDialog` is a relation-runtime dialog wrapper for `OneToMany`/`ManyToMany` `formView`.

- no `modelName` prop required
- `open`, `mode`, `rowId`, `defaultValues`, `onSubmit` are injected by relation field runtime
- recommended for page-like dialog layout reuse (`FormHeader/FormToolbar/FormBody`)
- in `ManyToMany` row detail, runtime forces read mode (`Confirm` disabled, view-only)
- for relation row editor customization, configure field-level `formView` with `ModelDialog`

### ModelDialog Example

```tsx
function OptionItemsDialogView() {
  return (
    <ModelDialog title="Option Item">
      <FormHeader />
      <FormBody enableAuditLog={false} sectionNavMode="never">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="itemName" />
          <Field fieldName="sequence" />
          <Field fieldName="active" />
        </FormSection>
      </FormBody>
    </ModelDialog>
  );
}
```

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
| `defaultValues` | `Record<string, unknown>` | No | `{}` | Runtime/contextual prefills for action forms in field UI shape. Use `FileInfo` / `FileInfo[]` for file fields and structured objects/arrays for `JSON` / `DTO` / `Filters` / `Orders`. Prefer `Field.defaultValue` or `metaField.defaultValue` for static defaults. |
| `metaModel` | `MetaModel` | No | - | Use explicit metadata model. |
| `abstractModelName` | `string` | No | `"DialogForm"` | Used when building abstract metadata from fields. |
| `abstractModelLabelName` | `string` | No | `title` or `abstractModelName` | Display name for abstract metadata model. |
| `abstractFields` | `AbstractMetaField[]` | No | - | Field metadata for non-entity dialog forms. |
| `buildPayload` | `(context) => payload` | No | - | Transform merged payload before API call. `context.payload` is already in submit/API shape after field codecs and relation patches are applied. |
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
| `defaultValues` | `DefaultValues` | No | `{}` | Runtime/contextual prefills for the dialog form in field UI shape. Use `FileInfo` / `FileInfo[]` for file fields and structured objects/arrays for `JSON` / `DTO` / `Filters` / `Orders`. Prefer `Field.defaultValue` or `metaField.defaultValue` for static create defaults. |
| `recordId` | `string \| null` | No | - | Passed to field props resolver. |
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

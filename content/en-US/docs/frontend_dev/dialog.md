# Dialog Views

Reusable dialog view layer for action-driven forms and relation field dialogs.

When dialog content uses `Field`, it supports the same runtime condition props as `ModelForm`:

- `required`
- `readonly`
- `hidden`

These accept `boolean | FilterCondition | dependsOn(...)` and participate in dialog-side validation as well.

Relation-field `filters` in dialog content follow the same rule as `ModelForm`:

- `#{fieldName}` resolves from current dialog form values before the relation query is sent
- backend env tokens such as `TODAY`, `NOW`, `USER_ID`, `USER_COMP_ID` are passed through unchanged
- `@{literal}` is passed through unchanged so backend can treat it as a forced literal

`Field.onChange` remote linkage is different:

- implemented today for `ModelForm`, dialog-based editors (`ActionDialog`, `ModelDialog`), `ModelTable` inline row, and `RelationTable` inline row
- see [Fields](./fields/index), [ModelForm](./form), and [ModelTable](./table) for the current remote linkage contract

## Import

```tsx
import { ActionDialog, ModelDialog } from "@/components/views/dialogs";
```

## Component Choice

| Component | Use when | Submit behavior |
| --- | --- | --- |
| `ActionDialog` | Execute `/{modelName}/{operation}` with optional lightweight form inputs | Built-in invoke action API (`invokeAction` or `invokeBulkAction`) |
| `ModelDialog` | Use inside relation field `formView` to define dialog layout with `FormHeader/FormToolbar/FormBody` | Runtime-injected relation context + built-in local draft submit |

## Public API

Preferred business-facing exports from `@/components/views/dialogs`:

- `ActionDialog`
- `ModelDialog`

Files under `components/views/dialogs/components/*` are internal building blocks and should not be imported from business code.

## ModelDialog

`ModelDialog` is the lightest way to define relation `formView` content.

- public surface: `title`, `children`
- no `modelName` prop required
- open state, mode, row id, defaults, and submit behavior are injected by relation runtime
- recommended for page-like dialog layout reuse (`FormHeader/FormBody`)

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
- runtime injection when used by `<Action type="dialog" />` / `<BulkAction type="dialog" />`
- declare payload fields with child `<Field />` elements
- `Field.fieldName` is required; `fieldType` defaults to `"String"` and `labelName` defaults to `fieldName`
- explicit `Field` props win; missing metadata falls back to the bound `metaField` when one can be resolved

### ActionDialog Props

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | Yes | - | Dialog title. |
| `description` | `ReactNode` | No | - | Dialog description. |
| `children` | `ReactNode \| (renderProps) => ReactNode` | No | - | Form content. Child `<Field />` declarations are converted into internal abstract fields automatically. |

### Example: used by `Action type="dialog"`

```tsx
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";

export function UserAccountUnlockActionDialog() {
  return (
    <ActionDialog
      title="Unlock User Account"
      description="Provide an optional reason for audit logging."
    >
      <Field
        fieldName="reason"
        labelName="Reason (Optional)"
        widgetType="Text"
      />
    </ActionDialog>
  );
}
```

## Related

- Form page usage: [ModelForm](./form)
- Table action usage: [ModelTable](./table)

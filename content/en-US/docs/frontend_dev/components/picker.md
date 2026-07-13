# Record Picker

Small radio-style picker for selecting a single record from a model. Designed
for use inside dialog forms — typically `ActionDialog` — where the user
needs to pick one record before submitting (e.g. "deploy this version to
which environment").

Two layered components:

| Component | Use when |
| --------- | -------- |
| `RecordPickerList` | You need a controlled (value / onChange) list. |
| `RecordPickerField` | You're inside a `react-hook-form` provider (e.g. `ActionDialog` body) and want the picker bound to a form field with validation. |

Most callers use `RecordPickerField`. `RecordPickerList` is the lower-level
escape hatch.

## Quick Start (`RecordPickerField` inside `ActionDialog`)

```tsx
import { RecordPickerField } from "@/components/views/shared/picker";
import { Server } from "lucide-react";

function DeployToEnvDialog() {
  return (
    <ActionDialog title="Deploy to Environment">
      <RecordPickerField
        name="envId"
        required="Pick an environment to deploy."
        modelName="DesignAppEnv"
        filters={["active", "=", true]}
        orders={["sequence", "ASC"]}
        icon={Server}
        titleField="name"
        badgeField="envType"
        descriptionField="currentVersionId"
      />
    </ActionDialog>
  );
}
```

The picker writes the chosen record's id into `envId`. The dialog's submit
payload becomes `{ envId: "<chosen-id>", ...other-form-fields }`. If the user
clicks Confirm without picking, the inline message
`"Pick an environment to deploy."` shows below the picker (validation gates
the Confirm button).

## Display semantics

`titleField` / `badgeField` / `descriptionField` are field names on the
picked model. The picker reads each field's `fieldType` from the model's
metadata to choose the right display extractor:

| Field type | Extractor |
| ---------- | --------- |
| `Option` / `MultiOption` | `label` (option-set localized label) |
| `ManyToOne` / `OneToOne` | `displayName` of the referenced record |
| anything else | `String(value)` |

This way, declaring `titleField="status"` for an option-set field renders the
option's display name, not the raw `itemCode`.

`titleField` defaults to `"name"`. Override when the model uses a different
display field.

## Components

### `RecordPickerField`

Form-bound. Wraps `RecordPickerList` with `react-hook-form`'s `<Controller>`,
exposing `name` / `required` like any other form field.

```tsx
<RecordPickerField
  name="versionId"
  required           // boolean — gates submit, no message
  modelName="DesignAppEnv"
  ...
/>

<RecordPickerField
  name="versionId"
  required="Please pick a version."  // string — same gating, shows message
  modelName="DesignAppEnv"
  ...
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `name` | `Path<TFormValues>` | Yes | - | react-hook-form field path |
| `required` | `boolean \| string` | No | - | `true`: required, no inline message. `string`: required, message shown below the picker on submit |
| `modelName` | `string` | Yes | - | Source model |
| `filters` | `FilterCondition` | No | - | Filter applied to source query |
| `orders` | `OrderCondition` | No | - | Sort applied to source query |
| `limitSize` | `number` | No | `50` | Cap on records pulled (pickers are short shortlists) |
| `enabled` | `boolean` | No | `true` | Disable the underlying query (e.g. while a parent value is loading) |
| `icon` | `LucideIcon` | No | - | Icon shown on the left of each card |
| `titleField` | `string` | No | `"name"` | Field for card title |
| `badgeField` | `string` | No | - | Field rendered as a small badge to the right of the title |
| `descriptionField` | `string` | No | - | Field rendered as a secondary description line |
| `emptyMessage` | `string` | No | `"No records found."` | Shown when the query returns no records |

Usage requires a surrounding `react-hook-form` provider. `ActionDialog`'s
`DialogForm` already supplies one — drop `RecordPickerField` directly in the
dialog body.

### `RecordPickerList`

Controlled list. Use when you can't bring a form provider, e.g. an
ad-hoc inline picker driven by component state.

```tsx
const [pickedId, setPickedId] = React.useState<string>();

<RecordPickerList
  modelName="DesignAppEnv"
  filters={[["status", "=", "Sealed"]]}
  value={pickedId}
  onChange={(id) => setPickedId(id)}
  titleField="name"
  badgeField="envType"
/>
```

| Prop | Type | Required | Default | Notes |
| ---- | ---- | -------- | ------- | ----- |
| `modelName` | `string` | Yes | - | Source model |
| `filters` | `FilterCondition` | No | - | Filter on source query |
| `orders` | `OrderCondition` | No | - | Sort on source query |
| `limitSize` | `number` | No | `50` | Cap on records pulled |
| `enabled` | `boolean` | No | `true` | Disable underlying query |
| `value` | `string \| undefined` | Yes | - | Selected record id |
| `onChange` | `(id: string, record: Record<string, unknown>) => void` | Yes | - | Fires on selection |
| `icon` | `LucideIcon` | No | - | Per-card left icon |
| `titleField` | `string` | No | `"name"` | Card title field |
| `badgeField` | `string` | No | - | Optional badge field |
| `descriptionField` | `string` | No | - | Optional description field |
| `emptyMessage` | `string` | No | `"No records found."` | |

Loading state renders a centered spinner; empty state shows `emptyMessage`.

## Visual structure of a card

```
┌──────────────────────────────────────┐
│ [icon]  Title  [badge]      [check] │   ← header row
│         Description text            │   ← optional description
└──────────────────────────────────────┘
```

- `[icon]`: shown when `icon` prop is set (LucideIcon component reference)
- `Title`: from `titleField`; metadata-aware extractor
- `[badge]`: small chip from `badgeField`; metadata-aware extractor
- `[check]`: shown only on the selected row (`CheckCircle2`)
- `Description`: from `descriptionField`; truncated on overflow

The selected card has a primary-color border + subtle ring + tinted
background. Unselected cards highlight on hover.

## Why a dedicated picker (vs `ManyToOne` field)?

A `Field` with `widgetType="ComboBox"` is the right widget for picking a
record **inside a normal form**. The picker is for **dialog flows** where:

- The dialog is the only form in play (no surrounding ModelForm)
- The list is a small, ranked shortlist (≤ 50 items by default)
- Rich display (icon + badge + description) is wanted out of the box
- Validation should gate the Confirm button with an inline error message

For hundreds of records or when nested in a ModelForm, prefer `Field` with a
relation field type.

## When to use which

| Scenario | Use |
| -------- | --- |
| Picker inside `ActionDialog` body | `RecordPickerField` (form-bound) |
| Picker inside any other `react-hook-form` provider | `RecordPickerField` |
| Picker driven by local `useState` (no form) | `RecordPickerList` (controlled) |
| Field in a normal `ModelForm` for a relation column | Plain `Field` with relation widget — not the picker |

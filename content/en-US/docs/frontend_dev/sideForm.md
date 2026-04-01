# ModelSideForm

Split-pane view: a side panel on the left selects a record, and a `ModelForm` on the right displays/edits it.

## Related Docs

- [ModelForm](../form/README.md) — the form rendered on the right side
- [ModelTable](../table/README.md) — table view (shared side panel components)
- [ModelCard](../card/README.md) — card grid view
- [Side Panel components](../shared/side-panel/) — SideTree, SideCard, SideList
- [Field](../../fields/README.md) — field widgets used in both side panel and form
- [Action](../../actions/README.md) — toolbar and form actions

## Quick Start

```tsx
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormSection } from "@/components/views/form/components/FormSection";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { SideTree } from "@/components/views/shared/side-panel/SideTree";
import { ModelSideForm } from "@/components/views/side-form/ModelSideForm";

export default function SettingPage() {
  return (
    <ModelSideForm modelName="Setting">
      {/* Left: side panel for record selection */}
      <SideTree
        modelName="SettingGroup"
        filterField="groupId"
        labelField="name"
        parentField="parentId"
      />

      {/* Right: standard ModelForm content */}
      <FormHeader />
      <FormToolbar />
      <FormBody>
        <FormSection labelName="General">
          <Field fieldName="key" />
          <Field fieldName="value" />
        </FormSection>
      </FormBody>
    </ModelSideForm>
  );
}
```

## How It Works

1. **Children are split** into one side panel element (`SideTree`, `SideCard`, or `SideList`) and form content (everything else).
2. The side panel is wrapped in `SidePanelContainerProvider` so its selection events flow back to `ModelSideForm`.
3. When a record is selected, a `ModelForm` is mounted with that record's `id`. The form supports full read/edit lifecycle — the same `ModelForm` used in standalone `[id]/page.tsx` routes.
4. Selection can be internal or controlled from the outside. In route-driven detail pages, pass `selectedRecordId` and handle `onSelectedRecordChange` to keep the URL in sync.
5. Switching records **re-mounts** the form (via a key change), giving each record a fresh form state.
6. If the form has **unsaved changes**, a confirmation dialog asks whether to discard before switching.
7. When no record is selected, a placeholder message is shown.

## Props

| Prop                   | Type        | Required | Default                                                   | Notes                                                                                                   |
| ---------------------- | ----------- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `modelName`            | `string`    | Yes      | -                                                         | The model to load into `ModelForm`.                                                                     |
| `labelName`            | `string`    | No       | -                                                         | Overrides the model label used in "No X selected" / "Create X" text and `FormHeader`. Defaults to `metaModel.labelName`. |
| `enableWorkflow`       | `boolean`   | No       | `false`                                                   | Show workflow action group in right-side form toolbar (edit mode only).                                |
| `enableCreate`         | `boolean`   | No       | `true`                                                    | Master switch for create entry points (side panel + empty state + toolbar Create New).                 |
| `enableDuplicate`      | `boolean`   | No       | auto                                                      | Built-in duplicate action switch in right-side toolbar. `false` disables.                               |
| `enableDelete`         | `boolean`   | No       | auto                                                      | Built-in delete action switch in right-side toolbar. `false` disables.                                  |
| `confirmDeleteMessage` | `string`    | No       | `Delete this {modelLabel}? This action cannot be undone.` | Confirm text for built-in delete action in right-side toolbar.                                          |
| `selectedRecordId`     | `string \| null` | No   | uncontrolled                                              | Controlled record id for detail-route variants of the same side-form page.                              |
| `onSelectedRecordChange` | `(id: string \| null, record?: Record<string, unknown>) => void` | No | - | Fired when the side panel selects a different record in controlled mode.                                |
| `children`             | `ReactNode` | Yes      | -                                                         | One side panel element + standard form components.                                                       |

`ModelSideForm` forwards toolbar-related props to its internal `ModelForm`. `FormToolbar` itself only needs to render custom actions.

If `selectedRecordId` is omitted, `ModelSideForm` manages selection internally. If it is provided, the right-side form always follows that id, while the side panel simply reflects whatever records are present in the current list.

## Children Structure

Children are split into two groups:

| Group             | Components                              | Renders at          |
| ----------------- | --------------------------------------- | ------------------- |
| **Side panel**    | One of: `SideTree`, `SideCard`, `SideList` | Left panel (280px)  |
| **Form content**  | `FormHeader`, `FormToolbar`, `FormBody`, `Field`, etc. | Right panel (flex-1) |

The form content children are passed directly to `ModelForm` — use the same component composition as a standalone ModelForm page.

## Layout

`SideFormLayout` renders a two-column layout:

```
┌──────────────┬──────────────────────────────────┐
│  Side Panel  │           ModelForm               │
│   (280px)    │           (flex-1)                │
│              │                                    │
│  SideTree /  │  FormHeader                        │
│  SideCard /  │  FormToolbar                       │
│  SideList    │  FormBody                          │
│              │    FormSection                     │
│              │      Field ...                     │
│              │                                    │
└──────────────┴──────────────────────────────────┘
```

- Side panel: fixed 280px, `border-r` divider
- Form area: `flex-1`, scrolls independently
- Both panels fill the full available height

## Side Panel Options

Any side panel component can be used. The component determines the record selection UI:

| Component    | Best For                                     | Selection Mode |
| ------------ | -------------------------------------------- | -------------- |
| `<SideTree>` | Hierarchical data (departments, categories)  | Tree node      |
| `<SideCard>` | Rich card display with header/body/footer    | Card click     |
| `<SideList>` | Simple list with Field-based row templates   | List item      |

### SideTree Example

```tsx
<ModelSideForm modelName="SysField">
  <SideTree
    title="System Model"
    modelName="SysModel"
    filterField="modelId"
    labelField="labelName"
    parentField="parentId"
    sortField="modelName"
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <FormHeader />
  <FormBody>
    <FormSection labelName="Field Info">
      <Field fieldName="fieldName" />
      <Field fieldName="labelName" />
      <Field fieldName="fieldType" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

### SideList Example

```tsx
<ModelSideForm modelName="DesignWorkItem">
  <SideList
    modelName="DesignWorkItem"
    filterField="id"
    filters={[["status", "=", "IN_PROGRESS"], "OR", ["status", "=", "READY"]]}
    searchable
    remoteSearch
  >
    <WorkItemListItem />
  </SideList>

  <FormHeader />
  <FormToolbar />
  <FormBody>
    <FormSection labelName="General">
      <Field fieldName="name" />
      <Field fieldName="status" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

`SideList` children define the row template. Each row is wrapped in `RecordContextProvider`, so custom components can use `useRecordContext()`:

```tsx
import { useRecordContext } from "@/components/contexts/RecordContext";
import { Badge } from "@/components/ui/badge";

function WorkItemListItem() {
  const { record } = useRecordContext();
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="truncate text-xs">{record.name as string}</span>
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {record.status as string}
      </Badge>
    </div>
  );
}
```

### SideCard Example

```tsx
<ModelSideForm modelName="DesignWorkItem">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    sortField="appName"
    searchable
  >
    <SideCard.Header>
      <Field fieldName="appName" />
    </SideCard.Header>
    <Field fieldName="appCode" />
    <SideCard.Footer>
      <Field fieldName="updatedTime" />
    </SideCard.Footer>
  </SideCard>

  <FormHeader />
  <FormBody>
    <FormSection labelName="General">
      <Field fieldName="name" />
      <Field fieldName="description" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

## Form Content

The right side renders a full `ModelForm`. Use the same form component composition as standalone form pages:

| Component      | Purpose                                      |
| -------------- | -------------------------------------------- |
| `FormHeader`   | Title bar with model label and description   |
| `FormToolbar`  | Business actions (Save, Delete, custom)      |
| `FormBody`     | Form body with tabs and sections             |
| `FormSection`  | Grid layout section with label               |
| `Field`        | Individual form field                        |
| `Action`       | Custom toolbar or form actions               |

### With Toolbar Actions

```tsx
import { Action, dependsOn } from "@/components/actions/Action";
import { CheckCircle, XCircle } from "lucide-react";

<ModelSideForm modelName="DesignWorkItem">
  <SideList filterField="id" searchable>
    <WorkItemListItem />
  </SideList>

  <FormHeader />
  <FormToolbar>
    <Action
      type="default"
      labelName="Approve"
      icon={CheckCircle}
      operation="approve"
      placement="toolbar"
      confirmMessage="Approve this item?"
      successMessage="Approved."
      disabled={dependsOn(["id"], ({ mode }) => mode === "create")}
      hidden={["status", "!=", "PENDING"]}
    />
    <Action
      type="default"
      labelName="Reject"
      icon={XCircle}
      operation="reject"
      placement="more"
      confirmMessage="Reject this item?"
      successMessage="Rejected."
      disabled={dependsOn(["id"], ({ mode }) => mode === "create")}
      hidden={["status", "!=", "PENDING"]}
    />
  </FormToolbar>

  <FormBody>
    <FormSection labelName="General">
      <Field fieldName="name" />
      <Field fieldName="status" />
      <Field fieldName="description" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

### With Multiple FormSections

```tsx
<ModelSideForm modelName="Employee">
  <SideTree
    modelName="Department"
    filterField="departmentId"
    labelField="name"
    parentField="parentId"
  />

  <FormHeader />
  <FormToolbar />
  <FormBody>
    <FormSection labelName="Basic Info">
      <Field fieldName="firstName" />
      <Field fieldName="lastName" />
      <Field fieldName="email" />
    </FormSection>
    <FormSection labelName="Employment">
      <Field fieldName="departmentId" />
      <Field fieldName="positionId" />
      <Field fieldName="hireDate" />
    </FormSection>
    <FormSection labelName="Custom Content">
      <MyCustomComponent />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

## Controlled Detail Routes

Use controlled mode when the selected record belongs in the URL:

```tsx
"use client";

import { routes } from "@/app/studio/routes";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { SideList } from "@/components/views/shared/side-panel/SideList";
import { ModelSideForm } from "@/components/views/side-form/ModelSideForm";
import { fillRouteTemplate } from "@/navigation";
import { useParams, useRouter } from "next/navigation";

export default function WorkbenchDetailPage() {
  const router = useRouter();
  const params = useParams<{ appId: string; workItemId: string }>();

  return (
    <ModelSideForm
      modelName="DesignWorkItem"
      selectedRecordId={params.workItemId}
      onSelectedRecordChange={(nextId) => {
        if (!nextId) {
          router.push(fillRouteTemplate(routes.workbench, { appId: params.appId })!);
          return;
        }
        router.push(
          fillRouteTemplate(routes.workbenchDetail, {
            appId: params.appId,
            workItemId: nextId,
          })!,
        );
      }}
    >
      <SideList modelName="DesignWorkItem" filterField="id" searchable remoteSearch>
        <WorkItemListItem />
      </SideList>

      <FormHeader />
      <FormToolbar />
      <FormBody>
        <Field fieldName="name" />
      </FormBody>
    </ModelSideForm>
  );
}
```

Notes:

- The right-side form can open a record from the route even when the current side-panel query does not contain that id.
- In that case, the side panel shows no highlighted row, but the form still loads the detail record via `getById`.
- This is useful for browse/detail route pairs such as `/workbench` and `/workbench/[workItemId]`.

## Dirty State & Record Switching

`ModelSideForm` automatically tracks whether the form has unsaved changes. When you click a different record in the side panel while the form is dirty:

1. A confirmation dialog appears: _"You have unsaved changes. Discard them and switch to the selected record?"_
2. **Discard** → switches to the new record, old changes are lost
3. **Keep editing** → stays on the current record, side panel selection is not changed

This prevents accidental data loss. The form is fully re-mounted on each record switch (via React key), so each record gets a clean form state.

In controlled mode, choosing a different record calls `onSelectedRecordChange`; the parent page is responsible for updating the route or external state that feeds `selectedRecordId`.

## Comparison with Other Views

| Feature             | ModelSideForm          | ModelTable              | ModelCard              |
| ------------------- | ---------------------- | ----------------------- | ---------------------- |
| Data display        | Single record form     | Multi-row table grid    | Multi-card grid        |
| Side panel          | Required (selection)   | Optional (filtering)    | Optional (filtering)   |
| Record editing      | Full form edit         | Optional inline edit    | -                      |
| Click behavior      | Panel selects record   | Navigate or inline edit | Navigate               |
| Dirty state guard   | Yes                    | Inline edit only        | -                      |
| Search/Filter/Sort  | Side panel only        | Full toolbar            | Simplified toolbar     |
| Pagination          | Side panel (client)    | Server-side             | Server-side            |
| Remote search       | `remoteSearch` prop    | Built-in                | Built-in               |

# ModelTab

Page-level tab container for placing multiple view instances under a shared tab bar.

Use `ModelTab` when different tabs need different models or view types. For filtering within a single model, use the `tabs` prop on `ModelTable` or `ModelCard` instead.

## Related Docs

- [ModelTable](../table/README.md) — `tabs` prop for same-model tab filtering
- [ModelCard](../card/README.md) — `tabs` prop for same-model tab filtering
- [ModelSideForm](../sideForm/README.md)

## Quick Start

```tsx
import { Field } from "@/components/fields";
import { ModelTab } from "@/components/views/model-tab/ModelTab";
import { ModelTable } from "@/components/views/table/ModelTable";

export default function SecurityLogsPage() {
  return (
    <ModelTab>
      <ModelTable
        modelName="UserLoginHistory"
        labelName="Login History"
        orders={["createdTime", "DESC"]}
        enableCreate={false}
        enableBulkDelete={false}
      >
        <Field fieldName="userId" />
        <Field fieldName="loginMethod" />
        <Field fieldName="ipAddress" />
        <Field fieldName="status" />
        <Field fieldName="createdTime" />
      </ModelTable>

      <ModelTable
        modelName="UserAuthFailure"
        labelName="Auth Failures"
        orders={["createdTime", "DESC"]}
        enableCreate={false}
        enableBulkDelete={false}
      >
        <Field fieldName="userId" />
        <Field fieldName="ipAddress" />
        <Field fieldName="failureReason" />
        <Field fieldName="createdTime" />
      </ModelTable>
    </ModelTab>
  );
}
```

## How It Works

`ModelTab` scans its direct children for any element that has a `modelName` prop (duck-typing). Each such child becomes one tab:

- **Tab key** — `child.props.modelName`
- **Tab label** — `child.props.labelName ?? child.props.modelName`

`ModelTable`, `ModelCard`, and `ModelSideForm` all expose both `modelName` and `labelName`, so they work directly as `ModelTab` children without any wrapper.

## Supported Children

| Component       | `modelName` | `labelName` | Notes                          |
| --------------- | ----------- | ----------- | ------------------------------ |
| `ModelTable`    | Yes         | Yes         | Full table view per tab        |
| `ModelCard`     | Yes         | Yes         | Card grid per tab              |
| `ModelSideForm` | Yes         | Yes         | Split-pane form per tab        |

Tabs with different view types can be mixed:

```tsx
<ModelTab>
  <ModelCard modelName="DesignApp" labelName="Apps" />
  <ModelTable modelName="DesignDeployment" labelName="Deployments" />
</ModelTab>
```

## Props

| Prop           | Type        | Required | Default           | Notes                                                              |
| -------------- | ----------- | -------- | ----------------- | ------------------------------------------------------------------ |
| `defaultValue` | `string`    | No       | first `modelName` | Initially active tab. Defaults to the first child's `modelName`.  |
| `children`     | `ReactNode` | Yes      | -                 | View elements with a `modelName` prop.                             |

## When to Use `ModelTab` vs `tabs` Prop

| Scenario                                | Recommended                         |
| --------------------------------------- | ----------------------------------- |
| Same model, different filters per tab   | `tabs` prop on `ModelTable` / `ModelCard` |
| Different models per tab                | `ModelTab`                          |
| Mixed view types per tab                | `ModelTab`                          |

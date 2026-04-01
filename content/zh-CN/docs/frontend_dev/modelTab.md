# ModelTab

页面级标签容器，用于在共享标签栏下放置多个视图实例。

当不同标签需要**不同模型**或**不同视图类型**时使用 `ModelTab`。若只是对**同一模型**做分标签筛选，请改用 `ModelTable` 或 `ModelCard` 上的 `tabs` prop。

## 相关文档

- [ModelTable](../table) — 单模型下用 `tabs` prop 做分标签筛选
- [ModelCard](../card) — 单模型下用 `tabs` prop 做分标签筛选
- [ModelSideForm](../sideForm)

## 快速开始

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

## 工作原理

`ModelTab` 会扫描**直接子节点**中是否带有 `modelName` prop（鸭子类型）。每个这样的子节点对应一个标签：

- **Tab key** — `child.props.modelName`
- **Tab 文案** — `child.props.labelName ?? child.props.modelName`

`ModelTable`、`ModelCard`、`ModelSideForm` 都暴露 `modelName` 与 `labelName`，因此可直接作为 `ModelTab` 子节点，无需再包一层。

## 支持的子组件

| 组件            | `modelName` | `labelName` | 说明 |
| --------------- | ----------- | ----------- | ---- |
| `ModelTable`    | 有          | 有          | 每个标签一个完整表格视图 |
| `ModelCard`     | 有          | 有          | 每个标签一个卡片网格 |
| `ModelSideForm` | 有          | 有          | 每个标签一个分栏表单 |

可混合不同视图类型：

```tsx
<ModelTab>
  <ModelCard modelName="DesignApp" labelName="Apps" />
  <ModelTable modelName="DesignDeployment" labelName="Deployments" />
</ModelTab>
```

## Props

| Prop           | 类型        | 必填 | 默认值           | 说明 |
| -------------- | ----------- | ---- | ---------------- | ---- |
| `defaultValue` | `string`    | 否   | 第一个 `modelName` | 初始激活的标签。默认可用第一个子节点的 `modelName`。 |
| `children`     | `ReactNode` | 是   | -                | 带 `modelName` 的视图组件。 |

## 何时用 `ModelTab`，何时用 `tabs` prop

| 场景 | 推荐 |
| --------------------------------------- | ----------------------------------- |
| 同一模型，不同标签不同过滤条件 | `ModelTable` / `ModelCard` 的 `tabs` prop |
| 不同模型各占一签 | `ModelTab` |
| 不同视图类型各占一签 | `ModelTab` |

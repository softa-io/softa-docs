# 动作

供 `ModelForm` 和 `ModelTable` 使用的可复用动作 DSL。

本文用于说明：

- `Action`
- `BulkAction`
- 动作类型选择
- 通用动作 props
- 在表单与表格容器中的放置规则

相关文档：

- [ModelForm](./form)：布局与表单容器行为
- [ModelTable](./table)：布局、侧边树、查询行为
- [ActionDialog 与 ModelDialog](./dialog)

## 导入

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
```

## 选择合适的组件

| 组件         | 适用场景                                          | 典型作用域              |
| ------------ | ------------------------------------------------- | ----------------------- |
| `Action`     | 单记录动作、行级动作、表单动作或链接动作          | `ModelForm`, `ModelTable` |
| `BulkAction` | 基于表格多选行批量执行的动作                      | 仅 `ModelTable`         |

## `Action`

在业务代码中，建议使用一个带判别 `type` 的 `Action` 组件。

`Action` 同时支持静态值和基于上下文的动态值：

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

### 通用 Props

| Prop             | 类型                                           | 必填 | 默认值                | 说明 |
| ---------------- | ---------------------------------------------- | ---- | --------------------- | ---- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom"` | 否   | `"default"`           | 动作行为。省略时表示直接调用 API。 |
| `labelName`      | `ReactNode`                                    | 是   | -                     | 动作文案。 |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | 否   | 取决于容器            | 支持的位置依赖于父容器。 |
| `confirmMessage` | `ActionValue<string>`                          | 否   | -                     | 执行动作前的可选确认提示。 |
| `successMessage` | `ActionValue<string>`                          | 否   | -                     | `default` 和 `dialog` 动作成功后的提示文案。 |
| `errorMessage`   | `ActionValue<string>`                          | 否   | -                     | `default` 和 `dialog` 动作失败后的提示文案。 |
| `icon`           | `ComponentType<{ className?: string }>`        | 否   | -                     | 动作图标。 |
| `disabled`       | `boolean \| FilterCondition \| dependsOn(...)` | 否   | `false`               | 禁用状态。 |
| `hidden`         | `boolean \| FilterCondition \| dependsOn(...)` | 否   | `false`               | 当条件解析为 `true` 时隐藏动作。 |

### 行为专属 Props

| 组件行为                           | 必填行为 Props         | 默认值         | 说明 |
| ---------------------------------- | ---------------------- | -------------- | ---- |
| 省略 `type` 或 `type="default"`    | `operation`            | -              | 调用 `POST /{modelName}/{operation}`，并把当前记录 `id` 放到 query params。 |
| `type="dialog"`                    | `operation`, `component` | -            | 使用 `component={MyDialogComponent}`。对话框的打开 / 关闭、operation、成功 / 失败提示由 `Action` 注入。 |
| `type="link"`                      | `href`                 | 新标签页打开   | `href` 支持 `string` 或 `({ id, modelName }) => string`。 |
| `type="custom"`                    | `onClick`              | -              | 纯 UI / 本地行为。签名：`onClick({ id, modelName, scope, mode, isDirty, values, row }) => void`。 |

动作条件说明：

- `disabled` 和 `hidden` 与 `Field` 复用同一套运行时条件模型：`boolean`、`FilterCondition`、`dependsOn([...], evaluator)`
- `FilterCondition` 会基于当前作用域值求值，并自动追踪 `#{fieldName}` 引用
- 不支持裸函数条件；请使用 `dependsOn([...], evaluator)` 包裹函数逻辑
- 如果没有字段依赖，优先使用普通 `boolean`

### Action 类型示例

```tsx
// 1) default（省略 type）：直接调用 API
<Action
  labelName="Lock Account"
  operation="lockAccount"
  placement="more"
  confirmMessage="Lock this user account?"
  successMessage="User account locked."
  errorMessage="Failed to lock user account."
/>

// 2) dialog：打开自定义对话框组件，operation 会注入到对话框运行时
<Action
  type="dialog"
  labelName="Unlock Account"
  operation="unlockAccount"
  placement="more"
  component={UserAccountUnlockActionDialog}
  successMessage="User account unlocked."
  errorMessage="Failed to unlock user account."
/>

// 3) link：打开 URL
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
/>

// 4) custom：本地 UI 逻辑
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => console.log(`${modelName} health check started.`)}
/>
```

## `BulkAction`

`BulkAction` 是供 `ModelTable` 使用的、作用于当前选中集的变体。

执行上下文：

```ts
{
  ids: string[];
  rows: Record<string, unknown>[];
  modelName?: string;
}
```

支持的行为：

- 类型：`default | dialog`
- 放置位置：`toolbar | more`
- 通用视觉 props 与 `Action` 保持一致：`labelName`、`confirmMessage`、`successMessage`、`errorMessage`、`icon`、`disabled`

行为专属 Props：

| 组件行为                           | 必填行为 Props         | 说明 |
| ---------------------------------- | ---------------------- | ---- |
| 省略 `type` 或 `type="default"`    | `operation`            | 使用选中的 ids 执行批量操作。 |
| `type="dialog"`                    | `operation`, `component` | 打开一个对话框，其提交会绑定到批量操作运行时。 |

## `ModelForm` 中的动作

容器支持：

| 容器          | 支持的 Action 类型                     | 支持的位置          |
| ------------- | -------------------------------------- | ------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom`  | `toolbar`, `more`   |
| `FormSection` | `link`, `custom`                       | `header`, `inline`  |

规则：

- `FormToolbar` 是页面级业务动作区域
- `FormSection` 是局部 UI 动作区域，不直接执行模型 API 动作
- 对于 API 动作（`default` / `dialog`），请放在 `FormToolbar`
- 编辑模式且有未保存修改时，点击业务动作会先询问是否丢弃修改
- 创建模式下，内置的 `Duplicate` / `Delete` 会保持可见，但处于禁用状态

完整示例：

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

## `ModelTable` 中的动作

规则：

- `<Action placement="toolbar" />` 会渲染到表格工具栏的自定义动作区域
- `<Action placement="inline" />` 会渲染到最后一列的行内动作区域
- `<Action placement="more" />` 会渲染到最后一列的 More Actions 下拉菜单
- 活跃的内联编辑行会从当前草稿行值中解析动作上下文
- 当活跃行处于 dirty 状态时，点击行动作会先询问是否丢弃草稿
- `BulkAction` 作用于选中集，且只有在存在选中行时才显示
- `BulkAction placement="toolbar"` 会出现在 `Columns` 与 `More` 之间
- `BulkAction placement="more"` 会出现在工具栏 More 下拉菜单的批量动作分组

完整示例：

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

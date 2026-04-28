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

| 组件         | 适用场景                                          | 典型作用域                                                         |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------------ |
| `Action`     | 单记录动作、行级动作、表单动作或链接              | `ModelForm`、`ModelTable`、`ModelCard`、`RelationTable`            |
| `BulkAction` | 基于表格多选行批量执行的动作                      | 仅 `ModelTable`                                                    |

## `Action`

使用单一 `Action` 组件，通过判别联合的 `type` 区分行为。

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
| `type`           | `"default" \| "dialog" \| "link" \| "custom" \| "form"` | 否   | `"default"`           | 动作行为。省略时表示直接调用 API。 |
| `labelName`      | `ReactNode`                                    | 是   | -                     | 动作文案。 |
| `style`          | `"primary" \| "danger"`                        | 否   | -                     | 视觉样式。省略时为中性默认外观。见 [动作样式](#动作样式)。 |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | 否   | 取决于容器            | 支持的位置依赖于父容器。 |
| `confirmMessage` | `ActionValue<string>`                          | 否   | -                     | 执行动作前的可选确认提示。 |
| `successMessage` | `ActionValue<string>`                          | 否   | -                     | `default` 和 `dialog` 动作成功后的提示文案。 |
| `icon`           | `ComponentType<{ className?: string }>`        | 否   | -                     | 动作图标。 |
| `disabled`       | `boolean \| FilterCondition \| dependsOn(...)` | 否   | `false`               | 禁用状态。 |
| `hidden`         | `boolean \| FilterCondition \| dependsOn(...)` | 否   | `false`               | 当条件解析为 `true` 时隐藏动作。 |

### 行为专属 Props

| 组件行为                           | 必填行为 Props         | 默认值 | 说明 |
| ---------------------------------- | ---------------------- | ------ | ---- |
| 省略 `type` 或 `type="default"` | `operation` | - | 调用 `POST /{modelName}/{operation}`，当前记录 `id` 通过 query 参数传递。 |
| `type="dialog"` | `operation`, `component` | - | `component={MyDialogComponent}`。打开/关闭、operation 与成功提示由 `Action` 注入；失败时使用接口返回的 toast。 |
| `type="link"` | `href` | 当前标签页打开（`target="_self"`） | `href` 支持模板字符串（见下文）或 `({ id, modelName }) => string`。使用 `target="_blank"` 在新标签页打开。 |
| `type="custom"` | `onClick` | - | 纯 UI / 本地行为。签名：`onClick({ id, modelName, scope, mode, isDirty, values, row }) => void`。 |
| `type="form"` | `component`, `relatedField` | - | 在对话框中打开独立的 `ModelForm`。`component` 渲染子表单视图；`relatedField` 为子模型指向父记录的字段名。父级 `id` 会自动写入 `ModelForm.defaultValues` 的 `{ [relatedField]: parentId }`，并包含在创建/更新 API 的请求体中。 |

### 动作执行上下文

每个 `ActionValue<T>`、`disabled`、`hidden` 回调都会收到同一套上下文：

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | `string \| null` | 当前记录 id（创建模式下为 `null`）。 |
| `modelName` | `string \| undefined` | 宿主容器的模型名。 |
| `scope` | `"form" \| "model-table"` | 动作所在容器。 |
| `mode` | `"create" \| "edit" \| "read"` | 表单/行生命周期阶段（见下表）。 |
| `isDirty` | `boolean` | 表单/行是否存在未保存修改。 |
| `values` | `Record<string, unknown>` | 当前表单值（表单作用域）或行数据（表格作用域）。 |
| `row` | `Record<string, unknown>` | 行数据（仅表格作用域；表单作用域为 `undefined`）。 |

#### `mode` 取值

| 模式 | 含义 | 何时 |
| ---- | ---- | ---- |
| `"create"` | 新建记录，表单可编辑，`id` 为 `null` | 创建模式（无已有记录）。 |
| `"edit"` | 已有记录，字段可编辑 | 用户在只读详情上点击编辑，或直接以编辑模式打开。 |
| `"read"` | 已有记录，字段只读 | 详情表单且 `detailStartsInReadOnly`、用户尚未点编辑，或路由 `?mode=read`。 |

要点：**工具栏上的业务动作（`Action`）在 `read` 模式下不会自动禁用。** 只读只锁表单字段；状态流转类动作仍可点击。若某动作在只读下也应禁用，请显式设置 `disabled`。

### 动作样式

使用 `style` 表达按钮的视觉意图。省略 `style` 时，动作为中性外观（ghost 或描边，由容器决定）。

| 取值 | 外观 | 适用场景 |
| ---- | ---- | -------- |
| `"primary"` | 突出 / 实心 | 工具栏或区块中的主推荐操作。 |
| `"danger"` | 红色 / 危险 | 不可逆或高风险操作。 |
| _（省略）_ | 中性 ghost/描边 | 其他动作。 |

```tsx
// 主按钮：突出关键操作
<Action labelName="提交审批" operation="submit" style="primary" />

// 危险：明确提示风险
<Action labelName="停用账户" operation="deactivate" style="danger" confirmMessage="确定停用该账户？" />

// 无 style：中性外观
<Action labelName="导出" operation="export" />
```

> **自动识别**：若省略 `style`，当 `operation` 或 `labelName` 含有 `delete`、`remove`、`disable`、`deactivate`、`archive`、`reject` 等关键词时，会自动视为 `"danger"`。仍建议显式设置 `style="danger"` 以保持清晰。

### 条件类 props（`disabled` / `hidden`）

`disabled` 与 `hidden` 与 `Field` 使用同一套运行时条件模型：

- `boolean` — 静态值，无字段依赖
- `FilterCondition` — 按当前作用域值求值，自动追踪 `{{ fieldName }}` 引用
- `dependsOn([...], evaluator)` — 显式字段依赖，回调可访问完整 `ActionExecutionContext`

不支持裸函数条件；请用 `dependsOn([...], evaluator)` 包装。

> **隐式规则（表单作用域）**：表单内（`FormToolbar` / `FormSection`）的动作在 `create` 模式下会自动禁用，因为其 `operation` 依赖已有记录的 `id`。请**不要**在 `disabled` 中重复写 `mode === "create"`。创建模式下用户传入的条件会被短路，回调不会执行。若仍需要展示禁用原因，可通过 `disabledReason` 解析（其中写 `mode === "create"` 分支是可以的）。

#### 常见的 `disabled` / `hidden` 写法

```tsx
// 仅在只读模式下禁用（创建模式已由隐式规则覆盖）
disabled={dependsOn(["id"], ({ mode }) => mode === "read")}

// 除非状态为某值，否则隐藏（FilterCondition 简写）
hidden={["status", "!=", "InProgress"]}

// 依赖多个状态码
hidden={dependsOn(["status"], ({ values }) => {
  const code = getOptionCode(values?.status);
  return code !== "InProgress" && code !== "Done";
})}

// 始终禁用（静态）
disabled={true}

// 表单有未保存修改时禁用
disabled={dependsOn([], ({ isDirty }) => isDirty)}
```

### Action 类型示例

```tsx
// 1) default（省略 type）：直接调用 API
<Action
  labelName="Lock Account"
  operation="lockAccount"
  placement="more"
  confirmMessage="Lock this user account?"
  successMessage="User account locked."
/>

// 2) dialog：打开自定义对话框，operation 注入对话框运行时
<Action
  type="dialog"
  labelName="Unlock Account"
  operation="unlockAccount"
  placement="more"
  component={UserAccountUnlockActionDialog}
  successMessage="User account unlocked."
/>

// 3) link：默认在当前标签页打开 —— 字符串模板或函数
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href="/{modelName}/audit?id={id}"
/>
// 显式新标签页：
<Action
  type="link"
  labelName="Open Docs"
  placement="more"
  href="https://docs.example.com"
  target="_blank"
/>
// 函数形式（需要条件逻辑时）：
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

// 5) form：在对话框中打开独立的 ModelForm
<Action
  type="form"
  labelName="Add Config Group"
  placement="toolbar"
  component={ConfigGroupForm}
  relatedField="tenantConfigId"
/>
```

### `type="form"` 下的组件定义

`component` 是标准 React 组件，内部渲染带自有 `modelName` 的 `ModelForm`。通过 `Action type="form"` 打开时，`ModelForm` 会自动适配对话框模式：

- 忽略路由 `params.id`（仅使用传入的 `id` prop）
- 创建 / 更新成功：关闭对话框，而不是 `router.push`
- 取消：关闭对话框，而不是返回导航
- `relatedField` 的值会注入 `defaultValues` 并写入 API payload，即使该字段未在表单中展示

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
- 通用视觉 props 与 `Action` 保持一致：`labelName`、`style`、`confirmMessage`、`successMessage`、`icon`、`disabled`

行为专属 Props：

| 组件行为                           | 必填行为 Props         | 说明 |
| ---------------------------------- | ---------------------- | ---- |
| 省略 `type` 或 `type="default"`    | `operation`            | 使用选中的 ids 执行批量操作。 |
| `type="dialog"`                    | `operation`, `component` | 打开一个对话框，其提交会绑定到批量操作运行时。 |

## `ModelForm` 中的动作

容器支持：

| 容器          | 支持的 Action 类型                     | 支持的位置          |
| ------------- | -------------------------------------- | ------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom`, `form`  | `toolbar`, `more`   |
| `FormSection` | `link`, `custom`                       | `header`, `inline`  |

规则：

- `FormToolbar` 是页面级业务动作区域
- `FormSection` 是局部 UI 动作区域，不直接执行模型 API 动作
- API 类动作（`default` / `dialog`）请放在 `FormToolbar`
- 内置工作流 / 新建 / 复制 / 删除工具栏行为通过 `ModelForm` / `ModelSideForm` 的 props 配置
- 编辑模式下若有未保存修改，点击业务动作会先询问是否丢弃修改再继续
- 创建模式下，内置 `Duplicate` / `Delete` 仍可见但处于禁用状态

完整示例：

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

## `ModelCard` 中的动作

规则：

- **放置位置由 `Action` 在 JSX 树中的声明位置推断**，而不是 `placement` prop
- `Action` 写在 `<ModelCard.Header>` 内 → 卡片头部渲染为 `outline` 按钮
- `Action` 作为主体顶层子节点 → 在卡片正文右侧渲染为 `outline` 按钮
- `<Action placement="more" />` → 进入每张卡片 hover 时的 `...` 下拉（与内置 Delete 合并，当启用 `enableDelete` 时）
- `hidden` / `disabled` 按卡片用 `RecordContext` 的值求值（与 ModelTable 行级动作相同）
- 支持全部动作类型：`default`、`dialog`、`link`、`custom`

字符串 `href` 支持 `{placeholder}` 插值：

| 占位符 | 解析为 |
| ------ | ------ |
| `{id}` | 当前记录 ID |
| `{modelName}` | 卡片所属模型名 |
| `{任意字段名}` | 记录中该字段的值 |

```tsx
// 记录 ID
<Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />

// 任意记录字段
<Action type="link" labelName="Open" href="/studio/{appCode}/workbench" />

// 多个占位符
<Action type="link" labelName="Open" href="/studio/app/{id}/version/{currentVersion}" />

// 函数形式（条件逻辑）
<Action type="link" labelName="Edit" href={({ id }) => `/studio/app/${id}/workbench`} />
```

完整示例：

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

## `RelationTable` 中的动作

可在关联字段的 `tableView` 中，将 `<Action />` 声明为 `<RelationTable />` 的子节点，为 `OneToMany` / `ManyToMany` 关联表附加行级操作。

规则：

- `<Action placement="inline" />` 在该行的 `Actions` 列中渲染为图标/按钮
- `<Action placement="more" />` 在该行的溢出下拉中渲染
- 此处不支持 `placement="toolbar"` / `"header"`（关联表格无工具栏）
- 动作面向**关联模型**派发，而非父表单模型——`operation` 使用关联记录 id 调用，查询失效针对关联模型
- 仅当行存在 `id` 时渲染操作；新增未保存行对应单元格为空
- `disabled` / `hidden` 仅基于已保存行数据求值；不跟踪未保存的内联编辑值（与 `ModelTable` 不同）
- `ActionExecutionContext.scope` 报告为 `"model-table"`（关联行复用同一派发器）
- `RelationTable` 不支持 `BulkAction`

示例 —— 在内嵌关联表上声明行操作：

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
        labelName="打开"
        placement="inline"
        href="/sales/agreement-line/{id}"
      />
      <Action
        labelName="重算"
        operation="recalculate"
        placement="more"
        successMessage="行已重算。"
      />
    </RelationTable>
  );
}

<Field fieldName="lines" tableView={AgreementLineTableView} />;
```

另见 [关联字段 — 行内操作](./fields/relations.md#row-actions)。

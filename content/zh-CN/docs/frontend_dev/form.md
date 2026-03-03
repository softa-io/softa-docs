# ModelForm

基于 `react-hook-form` 和 Zod 的元数据驱动创建/编辑表单容器。

## 相关文档
- [对话框组件](./dialog)
- [表格组件](./table)

## 快速开始

在 `src/app/**/[id]/page.tsx` 中定义：

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";

export default function EditUserAccountPage() {
  return (
    <ModelForm modelName="UserAccount">
      <FormHeader />
      <FormToolbar>
        <Action
          labelName="Lock Account"
          operation="lockAccount"
          placement="more"
          confirmMessage="Lock this user account?"
          successMessage="User account locked."
          errorMessage="Failed to lock user account."
        />
        <Action
          type="dialog"
          labelName="Unlock Account"
          operation="unlockAccount"
          placement="more"
          successMessage="User account unlocked."
          errorMessage="Failed to unlock user account."
          component={UserAccountUnlockActionDialog}
        />
      </FormToolbar>

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="username" />
          <Field fieldName="nickname" />
          <Field fieldName="email" />
          <Field fieldName="mobile" />
          <Field fieldName="status" />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

`ModelForm` 现在提供运行时/provider 以及页面壳层间距，并自动解析路由 `id`：

- `params.id === "new"` => 创建模式（`id = null`）
- `params.id` 存在且不为 `"new"` => 编辑模式
- 路由没有 `id` 参数 => 默认创建模式

需要自定义编排时，可在子组件中使用 `useModelFormContext()`，直接重排 `FormHeader/FormToolbar/FormBody`。

默认推荐使用 `Field`（按 `fieldType` 自动分发渲染），仅在需要时做元数据覆盖。

`Field` 元数据覆盖示例：

```tsx
<Field
  fieldName="name"
  labelName="Custom Label"
  readonly
  required={false}
  widgetType="URL"
  filters='[["active","=",true]]'
  defaultValue="https://example.com"
/>
```

使用 `widgetType` 驱动渲染行为示例：

```tsx
<Field
  fieldName="startTime"
  widgetType="HH:mm"
/>

<Field
  fieldName="photo"
  widgetType="Image"
/>
```

`File` / `MultiFile` 在编辑模式下会自动使用当前 `ModelForm` 记录 id。

## 页面结构

推荐默认布局：

- Header：标题 + 描述
- Sticky 工具栏：
  - 左侧：内置 `FormEditStatus + FormPrimaryActions`（`enableWorkflow=true` 时追加 `FormWorkflowActions`）
  - 右侧：业务操作区（自定义操作 + 内置 Duplicate/Delete + More Actions）
- Body：`FormBody` 渲染分区导航（auto）+ 表单内容 + 审计面板
- Audit：由 `FormBody(enableAuditLog)` 控制；大屏显示在右侧，小屏显示在底部

## Props

### ModelForm Props

| Prop        | 类型                                           | 必填 | 默认值 | 说明                                         |
| ----------- | ---------------------------------------------- | -------- | ------- | --------------------------------------------- |
| `modelName` | `string`                                       | 是      | -       | 用于请求 API 元数据模型（`/metadata/getMetaModel`）的模型名。 |
| `id`        | `string \| null`                               | 否       | 路由 `params.id`（`"new"` => `null`） | 可选覆盖值。 |
| `zodSchema` | `ZodTypeAny`                                   | 否       | -       | 可选 schema 覆盖。                     |
| `schemaBuilder` | `(context) => ZodTypeAny`                  | 否       | -       | 运行时 schema 扩展器。接收由已解析元数据构建的 `{ metaModel, baseSchema }`。 |
| `readOnly`  | `boolean`                                      | 否       | `false` | 强制只读模式。                         |
| `children`  | `ReactNode`                                    | 是      | -       | 表单页面布局内容（`FormHeader/FormToolbar/FormBody`）。 |

Schema 优先级：`schemaBuilder` > `zodSchema` > 元数据推导的基础 schema。

### FormHeader Props

| Prop          | 类型        | 必填 | 默认值 | 说明 |
| ------------- | ----------- | -------- | ------- | ----- |
| `title`       | `string`    | 否       | `metaModel.labelName`（回退 `pageTitle`） | 可选覆盖。 |
| `description` | `string`    | 否       | `metaModel.description` | 可选覆盖。 |
| `extras`      | `ReactNode` | 否       | -       | 渲染在标题附近的额外内容。 |

### FormBody Props

| Prop             | 类型                            | 必填 | 默认值 | 说明                                                                 |
| ---------------- | ------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `sectionNavMode` | `"auto" \| "always" \| "never"` | 否       | `"auto"` | 当分区数量 > 3 时，`auto` 会显示分区导航。     |
| `enableAuditLog` | `boolean`                       | 否       | `true` | 是否启用审计面板（仅编辑模式渲染）。      |
| `children`       | `ReactNode`                     | 是      | -       | 表单分区 / 内容节点。                                        |

### FormToolbar Props

| Prop                | 类型                      | 必填 | 默认值 | 说明                                                                                         |
| ------------------- | ------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| `children`          | `ReactNode`               | 否       | -       | 自定义操作。推荐：`<Action type="..." />`。                                       |
| `enableWorkflow`    | `boolean`                 | 否       | `false` | 是否启用工具栏左侧工作流操作组。仅在编辑模式且非只读时显示。|
| `enableDuplicate`   | `boolean`                 | 否       | `true` | 内置复制操作；仅编辑模式且有记录 id 时显示。         |
| `enableDelete`      | `boolean`                 | 否       | `true` | 内置删除操作；仅编辑模式且有记录 id 时显示。            |
| `duplicatePlacement`| `"toolbar" \| "more"`     | 否       | `"more"` | 内置 Duplicate 的展示位置。                                     |
| `deletePlacement`   | `"toolbar" \| "more"`     | 否       | `"more"` | 内置 Delete 的展示位置。                                        |
| `moreActionsLabel`  | `string`                  | 否       | `"More Actions"` | More Actions 触发器文案。                                   |
| `confirmDeleteMessage` | `string`               | 否       | `Delete this {modelLabel}? This action cannot be undone.` | 内置删除确认文案。 |

### Action Props

使用单一 `Action` 组件，通过 `type` 区分行为。

`Action` 通过以下方式同时支持静态值与上下文动态值：

```ts
type ActionValue<T> = T | ((context: { id: string | number | null; modelName?: string; row?: Record<string, unknown> }) => T);
```

| Prop             | 类型                                    | 必填 | 默认值 | 说明                                                                 |
| ---------------- | --------------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom"` | 否 | `"default"` | 操作行为；省略时为直接 API 调用。          |
| `labelName`      | `ReactNode`                             | 是      | -       | 操作文案。                                                         |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | 否 | FormToolbar:`"toolbar"`，FormSection:`"inline"` | 受父容器约束。 |
| `confirmMessage` | `ActionValue<string>`                   | 否       | -       | 执行前可选确认提示。                 |
| `successMessage` | `ActionValue<string>`                   | 否       | -       | `default`/`dialog` 成功提示文案。             |
| `errorMessage`   | `ActionValue<string>`                   | 否       | -       | `default`/`dialog` 失败提示文案。               |
| `icon`           | `ComponentType<{ className?: string }>` | 否       | -       | 操作图标。                                                          |
| `destructive`    | `boolean`                               | 否       | `false` | 破坏性样式。                                                  |
| `disabled`       | `ActionValue<boolean>`                  | 否       | `false` | 禁用状态。                                                       |
| `visible`        | `ActionValue<boolean>`                  | 否       | `true` | 可见性控制。                                                   |

行为专属 props：

| 组件行为                  | 必填行为 props | 默认值 | 说明 |
| -------------------------- | ----------------------- | ------- | ----- |
| 省略 `type` 或 `type="default"` | `operation` | - | 调用 `POST /{modelName}/{operation}`，当前记录 `id` 放 query params，可选 `payload` 放 body。`payload` 支持 `ActionValue<Record<string, unknown>>`。 |
| `type="dialog"` | `operation`, `component` | - | `component={MyDialogComponent}`。弹窗开关、operation、成功/失败提示由 `Action` 注入。 |
| `type="link"`   | `href`                  | `target="_self"` | `href` 支持 `string` 或 `({ id, modelName }) => string`。 |
| `type="custom"` | `onClick`               | - | 纯 UI/本地行为。签名：`onClick({ id, modelName, row }) => void`。 |

Action 类型示例：

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

// 2) dialog：打开自定义对话框组件，operation 注入到对话框运行时
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
  target="_blank"
/>

// 4) custom：本地 UI 逻辑
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
/>
```

### 各容器对 Action 的支持

| 容器 | 支持的 Action 类型 | 支持的 placement |
| --- | --- | --- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom` | `toolbar`, `more` |
| `FormSection` | `link`, `custom` | `header`, `inline` |

`FormSection` 是局部 UI 操作区，不直接执行模型 API 操作。
对于 API 操作（`default` / `dialog`），请将 Action 放在 `FormToolbar`。

### FormToolbar Action 示例

最小示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";

<FormToolbar>
  <Action
    labelName="Lock Account"
    operation="lockAccount"
    placement="more"
  />
</FormToolbar>;
```

常见配置示例：

```tsx
import { Action } from "@/components/common/Action";
import { ActionDialog } from "@/components/views/dialogs";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ExternalLink, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function UnlockDialog() {
  return (
    <ActionDialog
      title="Unlock Account"
      abstractModelName="UnlockAccountAction"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
      defaultValues={{ reason: "" }}
    />
  );
}

<FormToolbar enableWorkflow>
  {/* default */}
  <Action
    labelName="Lock"
    operation="lockAccount"
    placement="toolbar"
    icon={Lock}
    confirmMessage="Lock this account?"
    successMessage="Account locked."
    errorMessage="Failed to lock account."
  />

  {/* dialog */}
  <Action
    type="dialog"
    labelName="Unlock"
    operation="unlockAccount"
    placement="more"
    icon={ShieldCheck}
    component={UnlockDialog}
  />

  {/* link */}
  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
    target="_blank"
  />

  {/* custom */}
  <Action
    type="custom"
    labelName="Run Health Check"
    placement="more"
    icon={PlayCircle}
    onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
  />
</FormToolbar>;
```

### FormSection Action 示例

最小示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";

<FormSection labelName="Advanced">
  <Action
    type="custom"
    labelName="Validate Inputs"
    placement="inline"
    onClick={() => console.log("validate")}
  />
  {/* section fields... */}
</FormSection>;
```

常见配置示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";
import { ExternalLink, RefreshCw } from "lucide-react";

<FormSection
  labelName="Credentials"
  description="Manage key pair and endpoint."
>
  {/* header action */}
  <Action
    type="link"
    labelName="Open Docs"
    placement="header"
    icon={ExternalLink}
    href="https://docs.example.com/credentials"
    target="_blank"
  />

  {/* inline action */}
  <Action
    type="custom"
    labelName="Regenerate Preview"
    placement="inline"
    icon={RefreshCw}
    onClick={() => console.log("regenerate")}
  />

  {/* section fields... */}
</FormSection>;
```

## Context API

在 `ModelForm` 子组件内部，可使用 `useModelFormContext()` 获取：

- `pageTitle`, `pageDescription`
- `isEditing`, `isSubmitting`, `effectiveReadOnly`
- `form`（`react-hook-form` 实例）
- `onCancel()`
- `metaModel`, `id`

## 内置行为

- 创建/编辑模式默认值与重置处理。
- 元数据解析策略：始终从 `/metadata/getMetaModel` 获取；首次响应由 React Query 缓存并复用。
- 通过 `FieldPropsProvider` 提供元数据驱动字段属性。
- 脏表单取消确认。
- 保存/创建 mutation 处理与 toast 提示。
- 内置审计查询：`useGetChangeLogQuery(modelName, id)`，参数为：
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- `FormWorkflowActions` + `WorkflowActionGroup` 支持工作流状态：
  - `draft`：submit
  - `pending`：withdraw/approve/reject
  - `approved`：withdraw approval
  - `rejected`：resubmit
- 表单处于脏状态或提交中时，工作流操作会被禁用。
- 审计事件渲染规则：
  - `update`：`<=5` 条字段变更默认展开，`>5` 显示前 5 条 + `Show all fields (N)`
  - `create`：默认折叠
  - `delete`：仅显示操作信息

## 对话框架构

详细的对话框 API、props 和完整示例维护在：
 - [对话框组件](./dialog)

快速参考：

- `ActionDialog`：调用模型操作 `/{modelName}/{operation}`（单条/批量）。
- `ModelDialog`：单条记录的元数据驱动创建/更新对话框。
- `WizardDialog`：带自定义提交逻辑的多步骤流程。

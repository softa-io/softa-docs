# ModelForm

基于 `react-hook-form` 和 Zod 的元数据驱动创建/编辑表单容器。

## 相关文档
- [对话框组件](./dialog)
- [表格组件](./table)

## 导入

```tsx
import { ModelForm } from "@/components/views/form/ModelForm";
```

## 快速开始

推荐在 `src/app/**/[id]/page.tsx` 中使用：

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
  hideLabel={true}
  fullWidth={false}
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

<Field
  fieldName="content"
  widgetType="RichText"
/>
```

`File` / `MultiFile` 在编辑模式下会自动使用当前 `ModelForm` 记录 id。

### Field 全宽

`Field` 在以下字段渲染器上支持 `fullWidth`：

- `TextField`（`fieldType="String"` + `widgetType="Text"`）
- `RichTextField`（`fieldType="String"` + `widgetType="RichText"`）
- `OneToManyField`
- `ManyToManyField`

以上字段默认均为 `fullWidth={true}`。
设置 `fullWidth={false}` 时，会按普通栅格宽度渲染。

```tsx
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="RichText" fullWidth={false} />
<Field fieldName="optionItems" fullWidth={false} />
<Field fieldName="userIds" fullWidth={false} />
```

### Field 标签可见性

`Field` 支持通过 `hideLabel` 控制是否渲染整个字段标签块（`FormLabelWithTooltip`）。

- 默认：`hideLabel={false}`（显示标签）
- 设置 `hideLabel={true}` 后，会隐藏整个标签块（标签文本 + tooltip 图标）

```tsx
<Field fieldName="description" hideLabel={true} />
```

### ReadOnly vs Disabled

请基于不同意图使用 `readOnly` 和 `disabled`：

- `readOnly`：用户仍可清晰查看字段值，字段也仍属于正常的详情阅读体验。更适合详情页、审计式查看，以及需要方便扫读 / 复制的字段。
- `disabled`：控件在当前状态下暂时不可用，或在结构上不可操作。更适合权限限制、前置条件未满足、异步提交 / 加载中、工作流 / 状态锁定或功能开关关闭等场景。

在 HR SaaS 表单中，详情页通常应优先使用 `readOnly`，而不是 `disabled`。

## XToMany 字段（默认增量提交）

`ReferenceField` 现在仅处理：

- `ManyToOne`
- `OneToOne`

`OneToMany` 和 `ManyToMany` 由专用字段组件在内部处理，使用方式仍然是：

```tsx
<Field fieldName="..." />
```

### OneToMany

- UI：表单主体中的本地关联表格
- 支持：新增、编辑、删除
- 无 `formView`：行编辑采用表格单元格内联编辑（点击行进入编辑）
- 有 `formView`：行编辑 / 新增通过运行时 `ModelDialog`
- 默认提交：patch map（增量）

内联编辑行为（`OneToMany` 且未配置 `formView`）：

- 仅在点击行后进入编辑态（页面进入时不会自动选中）
- 编辑后的值会直接写入主表单的关联数组，并随父级 `Save/Create` 一起保存
- 可编辑单元格限制为 `tableView.fields` 与关联模型可编辑字段的交集
- 若省略 `tableView.fields`，表格仅回退显示 `id` 列
- 仅在本地表格模式下支持内联编辑（`!isPaged` 或远程条件未满足）

启用方式：

```tsx
// 启用表格单元格内联编辑（推荐用于本地关联编辑）
<Field fieldName="optionItems" tableView={optionItemsInitialParams} />

// 关闭内联编辑，改用对话框编辑
<Field
  fieldName="optionItems"
  tableView={optionItemsInitialParams}
  formView={OptionItemsFormView}
/>

// 分页关联表格（启用分页；可能切换为远程 searchPage 模式）
<Field fieldName="optionItems" tableView={optionItemsInitialParams} isPaged />
```

提交 payload 结构：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

创建模式约束：

- 仅允许 `Create`

更新模式：

- 允许 `Create` / `Update` / `Delete`

OneToMany 视图绑定示例：

```tsx
import { defineRelationTableView, Field } from "@/components/fields";

export const optionItemsInitialParams = defineRelationTableView({
  fields: ["sequence", "itemCode", "itemName", "active"],
  orders: [["sequence", "ASC"]],
  pageSize: 10,
});

function OptionItemsFormView() {
  return (
    <ModelDialog title="Option Item">
      <FormBody
        className="rounded-lg border border-border bg-card p-6"
        enableAuditLog={false}
        sectionNavMode="never"
      >
        <FormSection labelName="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="itemName" />
          <Field fieldName="sequence" />
          <Field fieldName="active" />
          <Field fieldName="description" />
        </FormSection>
      </FormBody>
    </ModelDialog>
  );
}


export default function SysOptionSetFormPage() {

  return (
    <ModelForm modelName="SysOptionSet">
      <FormHeader />
      <FormToolbar />

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection>
          <Field fieldName="optionSetCode" />
          <Field fieldName="name" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>

        <FormSection>
          <Field fieldName="optionItems"
            tableView={optionItemsInitialParams}
            formView={OptionItemsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

### ManyToMany

- UI：表单主体中的本地关联表格
- 支持：新增、删除
- 新增会打开关联模型选择表格对话框（搜索 / 排序 / 列 / 分页）
- 可选 `formView` 可挂载自定义只读 `ModelDialog`，用于行详情查看
- 默认提交：patch map（增量）

提交 payload 结构：

```json
{
  "Add": ["1", "2", "3"],
  "Remove": ["4", "5"]
}
```

创建模式约束：

- 仅允许 `Add`

更新模式：

- 允许 `Add` / `Remove`

ManyToMany 视图绑定示例：

```tsx
import { defineRelationTableView, Field } from "@/components/fields";

export const userRoleUserIdsInitialParams = defineRelationTableView({
  fields: ["username", "nickname", "email", "mobile", "status"],
  orders: [["username", "ASC"]],
  pageSize: 10,
});

function UserRoleUserIdsFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection labelName="General" hideHeader>
        <Field fieldName="username" />
        <Field fieldName="nickname" />
        <Field fieldName="email" />
        <Field fieldName="mobile" />
        <Field fieldName="status" />
      </FormSection>
    </ModelDialog>
  );
}

export default function UserRoleFormPage() {

  return (
    <ModelForm modelName="UserRole">
      <FormHeader />
      <FormToolbar />

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="name" />
          <Field fieldName="code" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>
        <FormSection>
          <Field fieldName="userIds"
            tableView={userRoleUserIdsInitialParams}
            formView={UserRoleUserIdsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

说明：

- `tableView` 控制关联表格的查询 / 列行为（`fields/orders/pageSize/...`）。
- `isPaged`（仅 `OneToMany` / `ManyToMany` 字段）：
  - `false`（默认）：在 `getById` 中带上关联 `subQuery`；关联表格在 UI 中不分页，渲染所有本地行。
  - `true`：关联表格启用分页 UI；当 `recordId + relatedModel + scoped relation filter` 就绪时，通过 `relatedModel.searchPage` 加载数据（远程模式），否则本地分页。
- 若未提供 `tableView.renderers`，Boolean 值默认渲染为徽标（`True` / `False`）。
- `tableView.renderers[fieldName]`：自定义表格单元格渲染（状态徽标、标签、本地化文本）。
- `tableView.sortAccessors[fieldName]`：本地关联表格排序值映射的可选高级 hook。
- 关联表格默认 `pageSize` 为 `50`；仅在启用分页（`isPaged=true`）时显示 page-size 选择器。
- ManyToMany 选择器对话框（`Add`）由服务端驱动；搜索 / 排序 / 分页变化会触发 `searchPage` 请求。
- `formView` 为可选项。在 `ManyToMany` 中，点击行会以只读模式打开 `ModelDialog`；新增 / 移除仍使用选择器行为。

### 兼容性

后端仍支持 XToMany 字段的整表提交。
前端 `ModelForm` 默认采用增量提交（`PatchType` map），以避免分页关联编辑时整列表覆盖的风险。

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
type ActionValue<T> = T | ((context: { id: string | null; modelName?: string; row?: Record<string, unknown> }) => T);
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
        {
          fieldName: "reason",
          fieldType: "String",
          widgetType: "Text",
          labelName: "Reason",
        },
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
- 取消行为：
  - 编辑模式：点击 `Cancel` 时会在表单脏状态下确认，重置到最新加载数据后切回只读模式
  - 只读模式：点击 `Back` 返回列表页
- 保存/创建 mutation 处理与 toast 提示。
- 内置审计查询：`useGetChangeLogQuery(modelName, id)`，参数为：
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- 全局审计 API 开关：
  - `configs.env.enableChangeLog`（`NEXT_PUBLIC_ENABLE_CHANGE_LOG`，默认 `true`）
  - 关闭后，`FormAuditPanel` 不会发起 change-log API 请求，并显示禁用提示文本
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
- `ModelDialog`：关联字段运行时对话框，不需要显式传 `modelName`。
- `WizardDialog`：带自定义提交逻辑的多步骤流程。

为了避免文档漂移，本文件仅保留表单页用法说明；对话框细节统一维护在 dialogs README 中。

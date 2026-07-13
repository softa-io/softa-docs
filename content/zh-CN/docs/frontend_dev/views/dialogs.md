# 对话框视图

可复用的对话框视图层，用于动作驱动的表单与关联字段对话框。

当对话框内容使用 `Field` 时，支持与 `ModelForm` 相同的运行时条件 props：

- `required`
- `readonly`
- `hidden`

它们接受 `boolean | FilterCondition | dependsOn(...)`，并参与对话框侧校验。

对话框内容中的关联字段 `filters` 遵循与 `ModelForm` 相同的规则：

- `{{ fieldName }}` 在关联查询发出前，从当前对话框表单值解析（统一模板语法 `{{ expr }}`）
- `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID` 等后端环境 token 原样透传
- 字面量使用 `{{ 'value' }}` 或 `{{ NOW }}` 等后端 token；保留字段引用在支持处使用 `{{ @fieldName }}`

`Field.onChange` 远程联动有所不同：

- 当前已在 `ModelForm`、基于对话框的编辑器（`ActionDialog`、`ModelDialog`）、`ModelTable` 行内编辑和 `RelationTable` 行内编辑中实现
- 当前远程联动契约见 [Fields](../fields/fields)、[ModelForm](./form) 与 [ModelTable](./table)

## 导入

```tsx
import { ActionDialog, ModelDialog } from "@/components/views/dialogs";
```

## 组件选择

| 组件 | 适用场景 | 提交行为 |
| --- | --- | --- |
| `ActionDialog` | 执行 `/{modelName}/{operation}`，可选轻量表单输入 | 内置调用动作 API（`invokeAction` 或 `invokeBulkAction`） |
| `ModelDialog` | 在关联字段 `formView` 内定义带 `FormHeader/FormToolbar/FormBody` 的对话框布局 | 运行时注入关联上下文 + 内置本地草稿提交 |

## 公开 API

面向业务的推荐导出（来自 `@/components/views/dialogs`）：

- `ActionDialog`
- `ModelDialog`

`components/views/dialogs/components/*` 下的文件为内部构建块，业务代码不应直接导入。

## ModelDialog

`ModelDialog` 是定义关联 `formView` 内容的最轻量方式。

- 公开 surface：`title`、`children`
- 无需 `modelName` prop
- 打开状态、模式、行 id、默认值与提交行为由关联运行时注入
- 推荐用于可复用的类页面对话框布局（`FormHeader/FormBody`）

### ModelDialog 示例

```tsx
function OptionItemsDialogView() {
  return (
    <ModelDialog title="Option Item">
      <FormHeader />
      <FormBody enableAuditLog={false}>
        <FormSection label="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="label" />
          <Field fieldName="sequence" />
          <Field fieldName="active" />
        </FormSection>
      </FormBody>
    </ModelDialog>
  );
}
```

## ActionDialog

适用于 `lockAccount`、`unlockAccount`、`submitApproval` 等操作对话框。

特性：

- 单记录动作（params 中带 `id`）
- 批量动作（`ids` 合并进请求体）
- 由 `<Action type="dialog" />` / `<BulkAction type="dialog" />` 使用时自动注入运行时
- 用子 `<Field />` 声明 payload 字段
- `Field.fieldName` 必填；`fieldType` 默认为 `"String"`，`label` 默认为 `fieldName`
- 对话框字段视为动作输入参数 —— ActionDialog 从声明的 `<Field />` 子节点构建虚拟模型，**不会**拉取目标模型的 metaModel
- 当渲染在 `modelName` 与动作目标模型一致的 `ModelForm` 内时，缺失的字段元数据会从周围 `ModelForm` 的 metaModel 补全（无额外网络请求）；否则仅使用声明的 `<Field />` props
- `Field.defaultValue` 在打开时填充表单并包含在提交 payload 中 —— 对 `hidden` 字段同样适用，因此 `<Field hidden defaultValue="..." />` 是提交固定参数的惯用写法

### ActionDialog Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | 是 | - | 对话框标题。 |
| `description` | `ReactNode` | 否 | - | 对话框描述。 |
| `children` | `ReactNode \| (renderProps) => ReactNode` | 否 | - | 表单内容。子 `<Field />` 声明会自动转换为内部抽象字段。 |

### 示例：由 `Action type="dialog"` 使用

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
        label="Reason (Optional)"
        widgetType="Text"
      />
    </ActionDialog>
  );
}
```

## 相关

- 表单页用法：[ModelForm](./form)
- 表格动作用法：[ModelTable](./table)

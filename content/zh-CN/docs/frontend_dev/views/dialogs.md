# 对话框视图

用于动作驱动的表单与关联字段对话框的可复用对话框视图层。

对话框内容使用 `Field` 时，支持与 `ModelForm` 相同的运行时条件 Props：

- `required`
- `readonly`
- `hidden`

这些可接受 `boolean | FilterCondition | dependsOn(...)`，并参与对话框侧的校验。

对话框内容中，关联字段的 `filters` 规则与 `ModelForm` 一致：

- `{{ fieldName }}` 在发出关联查询前从当前对话框表单值解析（统一模板语法 `{{ expr }}`）
- `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID` 等后端环境 token 原样透传
- 字面量使用 `{{ 'value' }}` 或 `{{ NOW }}` 等后端 token；在支持的场合，保留字段引用可使用 `{{ @fieldName }}`

`Field.onChange` 远程联动与表单不同：

- 当前已在 `ModelForm`、基于对话框的编辑器（`ActionDialog`、`ModelDialog`）、`ModelTable` 行内编辑、`RelationTable` 行内编辑中实现
- 现行远程联动约定见 [Fields](../fields/fields)、[ModelForm](./form)、[ModelTable](./table)

## 导入

```tsx
import { ActionDialog, ModelDialog } from "@/components/views/dialogs";
```

## 组件选择

| 组件 | 适用场景 | 提交行为 |
| --- | --- | --- |
| `ActionDialog` | 调用 `/{modelName}/{operation}`，可带轻量表单输入 | 内建动作 API（`invokeAction` 或 `invokeBulkAction`） |
| `ModelDialog` | 用于关联字段 `formView`，以 `FormHeader/FormToolbar/FormBody` 定义对话框布局 | 运行时注入的关联上下文 + 内建本地草稿提交 |

## 公开 API

业务侧优先从 `@/components/views/dialogs` 导入：

- `ActionDialog`
- `ModelDialog`

`components/views/dialogs/components/*` 下的文件为内部构建块，业务代码不应引用。

## ModelDialog

定义关联 `formView` 内容的最轻量方式。

- 公开面：`title`、`children`
- 不需要 `modelName` prop
- 打开状态、模式、行 id、默认值与提交行为由关联运行时注入
- 适合复用类页面对话框布局（`FormHeader/FormBody`）

### ModelDialog 示例

```tsx
function OptionItemsDialogView() {
  return (
    <ModelDialog title="Option Item">
      <FormHeader />
      <FormBody enableAuditLog={false}>
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

最适合 `lockAccount`、`unlockAccount`、`submitApproval` 等操作类对话框。

特性：

- 单条记录动作（`id` 在参数中）
- 批量动作（`ids` 合并进请求体）
- 由 `<Action type="dialog" />` / `<BulkAction type="dialog" />` 使用时运行时注入
- 用子级 `<Field />` 声明载荷字段
- `Field.fieldName` 必填；`fieldType` 默认为 `"String"`，`labelName` 默认为 `fieldName`
- 显式 `Field` props 优先；缺失元数据时在可解析时回退到绑定的 `metaField`

### ActionDialog Props

| Prop | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | 是 | - | 对话框标题。 |
| `description` | `ReactNode` | 否 | - | 对话框描述。 |
| `children` | `ReactNode \| (renderProps) => ReactNode` | 否 | - | 表单内容。子级 `<Field />` 声明会自动转换为内部抽象字段。 |

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
        labelName="Reason (Optional)"
        widgetType="Text"
      />
    </ActionDialog>
  );
}
```

## 相关

- 表单页面用法：[ModelForm](./form)
- 表格动作用法：[ModelTable](./table)

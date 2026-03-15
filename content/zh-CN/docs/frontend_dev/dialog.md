# 对话框视图

用于动作驱动表单和关联字段对话框的可复用对话框视图层。

当对话框内容使用 `Field` 时，它支持与 `ModelForm` 相同的运行时条件 props：

- `required`
- `readonly`
- `hidden`

这些属性接受 `boolean | FilterCondition | dependsOn(...)`，并同样参与对话框侧校验。

对话框内容中的关联字段 `filters` 与 `ModelForm` 遵循相同规则：

- `#{fieldName}` 会在发送关联查询前，从当前对话框表单值中解析
- 后端环境 token，例如 `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID`，会原样透传
- `@{literal}` 也会原样透传，以便后端把它视为强制字面量

`Field.onChange` 的远程联动有所不同：

- 当前已实现于 `ModelForm`、基于对话框的编辑器（`ActionDialog`、`ModelDialog`）、`ModelTable` 内联行以及 `RelationTable` 内联行
- 当前远程联动契约请查看 [Fields](./fields/index)、[ModelForm](./form) 和 [ModelTable](./table)

## 导入

```tsx
import { ActionDialog, ModelDialog } from "@/components/views/dialogs";
```

## 组件选择

| 组件          | 适用场景 | 提交行为 |
| ------------- | -------- | -------- |
| `ActionDialog` | 执行 `/{modelName}/{operation}`，可带可选的轻量表单输入 | 内置调用动作 API（`invokeAction` 或 `invokeBulkAction`） |
| `ModelDialog` | 在关联字段 `formView` 中定义对话框布局，搭配 `FormHeader/FormToolbar/FormBody` 使用 | 运行时注入关联上下文 + 内置本地草稿提交 |

## 公开 API

推荐在业务代码中从 `@/components/views/dialogs` 使用这些导出：

- `ActionDialog`
- `ModelDialog`

`components/views/dialogs/components/*` 下的文件都是内部构件，不应在业务代码中直接导入。

## ModelDialog

`ModelDialog` 是定义关联 `formView` 内容的最轻量方式。

- 公开接口只有 `title` 和 `children`
- 不需要传 `modelName`
- 打开状态、模式、行 id、默认值与提交行为都由关联运行时注入
- 适合复用页面式对话框布局（`FormHeader/FormBody`）

### ModelDialog 示例

```tsx
function OptionItemsDialogView() {
  return (
    <ModelDialog title="Option Item">
      <FormHeader />
      <FormBody enableAuditLog={false} sectionNavMode="never">
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

最适合用于 `lockAccount`、`unlockAccount`、`submitApproval` 这类操作对话框。

特性：

- 支持单记录动作（参数中带 `id`）
- 支持批量动作（`ids` 会合并到 payload body）
- 当通过 `<Action type="dialog" />` / `<BulkAction type="dialog" />` 使用时，会自动注入运行时
- 通过子级 `<Field />` 声明 payload 字段
- `Field.fieldName` 是必填；`fieldType` 默认是 `"String"`，`labelName` 默认回退为 `fieldName`
- 显式传入的 `Field` props 优先；如果缺少元数据，则会在能解析到时回退到绑定的 `metaField`

### ActionDialog Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | 是 | - | 对话框标题。 |
| `description` | `ReactNode` | 否 | - | 对话框描述。 |
| `children` | `ReactNode \| (renderProps) => ReactNode` | 否 | - | 表单内容。子级 `<Field />` 声明会自动转换为内部抽象字段。 |

### 示例：用于 `Action type="dialog"`

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

- 表单页使用方式：[ModelForm](./form)
- 表格动作使用方式：[ModelTable](./table)

# Dialog 视图

可复用的对话框视图层，适用于动作驱动表单、关联字段对话框和多步骤向导。

当对话框内容里使用 `Field` 时，它支持与 `ModelForm` 相同的运行时条件 props：

- `required`
- `readonly`
- `hidden`

这些属性接受 `boolean | FilterCondition | ((ctx) => boolean)`，并且也会参与对话框侧的校验。

`Field.onChange` 的远程联动在对话框中有一个区别：

- 当前已实现于 `ModelForm`、`ModelTable` 内联行、`RelationTableView` 内联行
- 对独立的 `ActionDialog` / `WizardDialog` / 通用对话框表单，并不会自动提供这套运行时能力

## 相关文档
- [字段与 widgets](./field)
- [表单组件](./form)
- [表格组件](./table)

## 导入

```tsx
import { ActionDialog, ModelDialog, WizardDialog } from "@/components/views/dialogs";
```

## 组件选择

| 组件 | 适用场景 | 提交行为 |
| --- | --- | --- |
| `ActionDialog` | 执行 `/{modelName}/{operation}`，可带可选表单字段 | 内置动作 API 调用（`invokeAction` 或 `invokeBulkAction`） |
| `ModelDialog` | 在关联字段 `formView` 中定义对话框布局，搭配 `FormHeader/FormToolbar/FormBody` 使用 | 关联运行时注入上下文 + 内置本地草稿提交 |
| `WizardDialog` | 多步骤流程（模型相关或非模型） | 自定义 `onSubmit` |

## 仅使用公开 API

只使用 `@/components/views/dialogs` 的导出：

- `ActionDialog`
- `ModelDialog`
- `WizardDialog`

`components/views/dialogs/components/*` 下的文件属于内部构件。

## ModelDialog

`ModelDialog` 是 `OneToMany` / `ManyToMany` `formView` 的关联运行时对话框包装器。

- 不需要 `modelName` prop
- `open`、`mode`、`rowId`、`defaultValues`、`onSubmit` 由关联字段运行时注入
- 适合复用页面式对话框布局（`FormHeader/FormToolbar/FormBody`）
- 在 `ManyToMany` 行详情中，运行时会强制只读模式（禁用 `Confirm`，仅查看）
- 若要自定义关联行编辑器，请在字段级 `formView` 中配置 `ModelDialog`

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

适用于 `lockAccount`、`unlockAccount`、`submitApproval` 等操作对话框。

特性：

- 单记录操作（`params` 中带 `id`）
- 批量操作（`ids` 合并到 payload body）
- 通过 `abstractFields` 或完整 `metaModel` 生成元数据字段
- 用于 `<Action type="dialog" />` / `<BulkAction type="dialog" />` 时支持运行时注入

### ActionDialog Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | 是 | - | 对话框标题。 |
| `open` | `boolean` | 否 | 运行时上下文或 `false` | 可由 `Action` / `BulkAction` 运行时注入。 |
| `onOpenChange` | `(open: boolean) => void` | 否 | 运行时上下文 | 若不存在运行时 provider，则必填。 |
| `operation` | `string` | 否 | 运行时上下文 | 若不存在运行时 provider，则必填。 |
| `modelName` | `string` | 否 | 运行时 / form / table 上下文 | 省略时从周边上下文自动解析。 |
| `rowId` | `IdType \| null` | 否 | 运行时 / form 上下文 id | 单记录目标 id。 |
| `ids` | `IdType[] \| null` | 否 | 运行时批量 ids | 非空时为批量模式。 |
| `payload` | `Record<string, unknown>` | 否 | `{}` | 提交前与表单值合并。 |
| `defaultValues` | `Record<string, unknown>` | 否 | `{}` | 表单初始值。 |
| `metaModel` | `MetaModel` | 否 | - | 显式指定元数据模型。 |
| `abstractModelName` | `string` | 否 | `"DialogForm"` | 用于从字段构建抽象元数据。 |
| `abstractModelLabelName` | `string` | 否 | `title` 或 `abstractModelName` | 抽象元数据模型展示名。 |
| `abstractFields` | `AbstractMetaField[]` | 否 | - | 非实体对话框表单的字段元数据。 |
| `buildPayload` | `(context) => payload` | 否 | - | API 调用前转换合并后的 payload。 |
| `description` | `ReactNode` | 否 | - | 对话框描述。 |
| `confirmLabel` | `string` | 否 | `"Confirm"` | 确认按钮文案。 |
| `cancelLabel` | `string` | 否 | `"Cancel"` | 取消按钮文案。 |
| `pendingLabel` | `string` | 否 | `"Submitting..."` | 提交中按钮文案。 |
| `successMessage` | `string` | 否 | 运行时文案或 `"Action completed."` | 成功 toast 文案。 |
| `errorMessage` | `string` | 否 | 运行时文案或 `"Action failed."` | 失败 toast 文案。 |
| `confirmDisabled` | `boolean` | 否 | `false` | 禁用确认按钮。 |
| `closeOnSuccess` | `boolean` | 否 | `true` | 提交成功后自动关闭。 |
| `resetOnClose` | `boolean` | 否 | `true` | 对话框关闭时重置表单状态。 |
| `onSuccess` | `() => void` | 否 | - | 提交成功回调。 |
| `onError` | `(error) => void` | 否 | - | 提交失败回调。 |
| `children` | `ReactNode \| (renderProps) => ReactNode` | 否 | - | 表单内容。 |

### 示例：用于 `Action type="dialog"`

```tsx
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";

export function UserAccountUnlockActionDialog() {
  return (
    <ActionDialog
      title="Unlock User Account"
      description="Provide an optional reason for audit logging."
      abstractModelName="UserAccountUnlockAction"
      abstractFields={[
        {
          fieldName: "reason",
          fieldType: "Text",
          labelName: "Reason (Optional)",
        },
      ]}
      defaultValues={{ reason: "" }}
      buildPayload={({ payload }) => {
        const reason =
          typeof payload.reason === "string" ? payload.reason.trim() : "";
        return { reason: reason || undefined };
      }}
      confirmLabel="Confirm Unlock"
      pendingLabel="Unlocking..."
    >
      <Field fieldName="reason" />
    </ActionDialog>
  );
}
```

### 示例：独立受控使用

```tsx
<ActionDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  rowId={id}
  operation="lockAccount"
  title="Lock User Account"
  confirmLabel="Confirm Lock"
/>
```

## WizardDialog

跨步骤共享表单状态的向导式对话框。

### WizardDialog Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `open` | `boolean` | 是 | - | 受控对话框开关状态。 |
| `onOpenChange` | `(open: boolean) => void` | 是 | - | 受控开关状态处理器。 |
| `steps` | `WizardStep[]` | 是 | - | 步骤定义。 |
| `onSubmit` | `(values, context) => Promise \| unknown` | 是 | - | 最终提交处理器。 |
| `title` | `ReactNode` | 否 | - | 对话框标题（步骤无标题时回退）。 |
| `description` | `ReactNode` | 否 | - | 对话框描述（步骤无描述时回退）。 |
| `contentClassName` | `string` | 否 | - | 内容容器自定义 className。 |
| `initialStepIndex` | `number` | 否 | `0` | 初始步骤索引。 |
| `metaModel` | `MetaModel` | 否 | - | 显式元数据模型。 |
| `abstractModelName` | `string` | 否 | `"WizardForm"` | 用于从字段构建抽象元数据。 |
| `abstractModelLabelName` | `string` | 否 | `title` 或 `abstractModelName` | 抽象元数据模型展示名。 |
| `abstractFields` | `AbstractMetaField[]` | 否 | - | 非实体向导表单的字段元数据。 |
| `zodSchema` | `ZodTypeAny` | 否 | - | 可选 schema 覆盖。 |
| `defaultValues` | `DefaultValues` | 否 | `{}` | 初始表单值。 |
| `recordId` | `string \| null` | 否 | - | 透传给字段属性解析器。 |
| `readOnly` | `boolean` | 否 | `false` | 强制只读模式。 |
| `cancelLabel` | `string` | 否 | `"Cancel"` | 取消按钮文案。 |
| `backLabel` | `string` | 否 | `"Back"` | 上一步按钮文案。 |
| `nextLabel` | `string` | 否 | `"Next"` | 下一步按钮文案。 |
| `finishLabel` | `string` | 否 | `"Finish"` | 完成按钮文案。 |
| `pendingLabel` | `string` | 否 | `"Submitting..."` | 提交中按钮文案。 |
| `successMessage` | `string` | 否 | - | 成功 toast 文案。 |
| `errorMessage` | `string` | 否 | - | 失败 toast 文案。 |
| `closeOnSuccess` | `boolean` | 否 | `true` | 提交成功后自动关闭。 |
| `resetOnClose` | `boolean` | 否 | `true` | 关闭时重置表单与步骤状态。 |
| `onSuccess` | `(result) => void` | 否 | - | 提交成功回调。 |
| `onError` | `(error) => void` | 否 | - | 提交失败回调。 |

### WizardDialog：最小示例

```tsx
import { WizardDialog } from "@/components/views/dialogs";

<WizardDialog
  open={open}
  onOpenChange={setOpen}
  steps={[
    {
      key: "basic",
      content: <div>Basic Step</div>,
    },
  ]}
  onSubmit={async () => {}}
/>;
```

### WizardDialog：常见配置示例

```tsx
import { Field } from "@/components/fields";
import { WizardDialog } from "@/components/views/dialogs";

<WizardDialog
  open={open}
  onOpenChange={setOpen}
  title="Create Robot"
  abstractModelName="CreateRobotWizard"
  abstractFields={[
    { fieldName: "name", fieldType: "String", required: true },
    { fieldName: "provider", fieldType: "Option", optionSetCode: "AI_PROVIDER", required: true },
    { fieldName: "prompt", fieldType: "Text" },
  ]}
  steps={[
    {
      key: "basic",
      title: "Basic",
      fields: ["name", "provider"],
      content: (
        <>
          <Field fieldName="name" />
          <Field fieldName="provider" />
        </>
      ),
    },
    {
      key: "prompt",
      title: "Prompt",
      content: <Field fieldName="prompt" />,
    },
  ]}
  onSubmit={async (values) => {
    // custom submit
  }}
/>
```

## 相关

- [表单页面用法](./form)
- [表格操作用法](./table)

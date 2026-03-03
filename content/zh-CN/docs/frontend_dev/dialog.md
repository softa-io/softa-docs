# Dialog 视图

可复用的对话框视图层，覆盖动作驱动表单、模型 CRUD 表单以及多步骤向导。

## 导入

```tsx
import { ActionDialog, ModelDialog, WizardDialog } from "@/components/views/dialogs";
```

## 组件选择

| 组件 | 适用场景 | 提交行为 |
| --- | --- | --- |
| `ActionDialog` | 执行 `/{modelName}/{operation}`，可带可选表单字段 | 内置动作 API 调用（`invokeAction` 或 `invokeBulkAction`） |
| `ModelDialog` | 基于元数据字段创建/更新单条模型记录 | 内置 CRUD（`createOneAndFetch` / `updateByIdAndFetch`） |
| `WizardDialog` | 多步骤流程（模型相关或非模型） | 自定义 `onSubmit` |

## 仅使用公开 API

只使用 `@/components/views/dialogs` 的导出：

- `ActionDialog`
- `ModelDialog`
- `WizardDialog`

`components/views/dialogs/components/*` 下文件属于内部构件。

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
| `open` | `boolean` | 否 | 运行时上下文或 `false` | 可由 `Action`/`BulkAction` 运行时注入。 |
| `onOpenChange` | `(open: boolean) => void` | 否 | 运行时上下文 | 若不存在运行时 provider，则必填。 |
| `operation` | `string` | 否 | 运行时上下文 | 若不存在运行时 provider，则必填。 |
| `modelName` | `string` | 否 | 运行时/form/table 上下文 | 省略时从周边上下文自动解析。 |
| `rowId` | `IdType \| null` | 否 | 运行时/form 上下文 id | 单记录目标 id。 |
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

## ModelDialog

单条记录的元数据驱动创建/更新对话框。

- `mode="create"`：创建记录
- `mode="update"`：更新记录（要求 `rowId`）
- 省略 `mode`：根据 `rowId` 推断

### ModelDialog Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `open` | `boolean` | 是 | - | 受控对话框开关状态。 |
| `onOpenChange` | `(open: boolean) => void` | 是 | - | 受控开关状态处理器。 |
| `modelName` | `string` | 是 | - | 元数据与 CRUD 目标模型。 |
| `mode` | `"create" \| "update"` | 否 | 根据 `rowId` 推断 | 有 `rowId` => `update`，否则 `create`。 |
| `rowId` | `IdType \| null` | 否 | - | `mode="update"` 时必填。 |
| `schemaBuilder` | `(context) => ZodTypeAny` | 否 | - | 运行时 schema 扩展器。 |
| `zodSchema` | `ZodTypeAny` | 否 | 元数据推导 schema | 当未提供 `schemaBuilder` 时使用。 |
| `defaultValues` | `DefaultValues` | 否 | 元数据默认值或转换后的记录值 | 在解析出的默认值之上合并。 |
| `title` | `ReactNode` | 否 | - | 对话框标题。 |
| `description` | `ReactNode` | 否 | - | 对话框描述。 |
| `children` | `ReactNode \| (renderProps) => ReactNode` | 否 | - | 对话框表单内容。 |
| `readOnly` | `boolean` | 否 | `false` | 继承自 `DialogForm`。 |
| `confirmLabel` | `string` | 否 | `"Confirm"` | 继承自 `DialogForm`。 |
| `cancelLabel` | `string` | 否 | `"Cancel"` | 继承自 `DialogForm`。 |
| `pendingLabel` | `string` | 否 | `"Submitting..."` | 继承自 `DialogForm`。 |
| `successMessage` | `string` | 否 | - | 继承自 `DialogForm`。 |
| `errorMessage` | `string` | 否 | - | 继承自 `DialogForm`。 |
| `confirmDisabled` | `boolean` | 否 | `false` | 继承自 `DialogForm`。 |
| `closeOnSuccess` | `boolean` | 否 | `true` | 继承自 `DialogForm`。 |
| `resetOnClose` | `boolean` | 否 | `true` | 继承自 `DialogForm`。 |
| `onSubmit` | `(values, context) => Promise \| unknown` | 否 | 内置 CRUD | 默认提交：create => `createOneAndFetch`，update => `updateByIdAndFetch`。 |
| `onSuccess` | `(result) => void` | 否 | - | 继承自 `DialogForm`。 |
| `onError` | `(error) => void` | 否 | - | 继承自 `DialogForm`。 |

### ModelDialog：最小示例

```tsx
import { ModelDialog } from "@/components/views/dialogs";

<ModelDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  title="Create Account"
/>;
```

### ModelDialog：常见配置示例

```tsx
import { Field } from "@/components/fields";
import { ModelDialog } from "@/components/views/dialogs";

<ModelDialog
  open={open}
  onOpenChange={setOpen}
  modelName="UserAccount"
  rowId={id}
  title="Edit Account"
>
  <Field fieldName="username" />
  <Field fieldName="email" />
</ModelDialog>
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
| `recordId` | `string \| number \| null` | 否 | - | 透传给字段属性解析器。 |
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

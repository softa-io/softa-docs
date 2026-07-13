# 记录选择器

用于从模型中选择单条记录的小型单选式选择器。设计用于对话框表单内 —— 通常是 `ActionDialog` —— 用户在提交前需先选一条记录（例如「将此版本部署到哪个环境」）。

两层组件：

| 组件 | 适用场景 |
| --------- | -------- |
| `RecordPickerList` | 需要受控（value / onChange）列表时。 |
| `RecordPickerField` | 在 `react-hook-form` provider 内（如 `ActionDialog` 正文），希望选择器绑定表单字段并参与校验。 |

多数调用方使用 `RecordPickerField`。`RecordPickerList` 是更低层的逃生口。

## 快速开始（`ActionDialog` 内的 `RecordPickerField`）

```tsx
import { RecordPickerField } from "@/components/views/shared/picker";
import { Server } from "lucide-react";

function DeployToEnvDialog() {
  return (
    <ActionDialog title="Deploy to Environment">
      <RecordPickerField
        name="envId"
        required="Pick an environment to deploy."
        modelName="DesignAppEnv"
        filters={["active", "=", true]}
        orders={["sequence", "ASC"]}
        icon={Server}
        titleField="name"
        badgeField="envType"
        descriptionField="currentVersionId"
      />
    </ActionDialog>
  );
}
```

选择器将所选记录的 id 写入 `envId`。对话框提交 payload 变为 `{ envId: "<chosen-id>", ...other-form-fields }`。若用户未选择就点确认，选择器下方显示 `"Pick an environment to deploy."`（校验会阻止 Confirm）。

## 展示语义

`titleField` / `badgeField` / `descriptionField` 是被选模型上的字段名。选择器从模型元数据读取各字段的 `fieldType`，选择正确的展示提取器：

| 字段类型 | 提取器 |
| ---------- | --------- |
| `Option` / `MultiOption` | `label`（选项集本地化标签） |
| `ManyToOne` / `OneToOne` | 引用记录的 `displayName` |
| 其他 | `String(value)` |

因此，对选项集字段声明 `titleField="status"` 会渲染选项展示名，而非原始 `itemCode`。

`titleField` 默认为 `"name"`。模型使用其他展示字段时请覆盖。

## 组件

### `RecordPickerField`

表单绑定。用 `react-hook-form` 的 `<Controller>` 包装 `RecordPickerList`，像其他表单字段一样暴露 `name` / `required`。

```tsx
<RecordPickerField
  name="versionId"
  required           // boolean — gates submit, no message
  modelName="DesignAppEnv"
  ...
/>

<RecordPickerField
  name="versionId"
  required="Please pick a version."  // string — same gating, shows message
  modelName="DesignAppEnv"
  ...
/>
```

| Prop | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | -------- | ------- | ----- |
| `name` | `Path<TFormValues>` | 是 | - | react-hook-form 字段路径 |
| `required` | `boolean \| string` | 否 | - | `true`：必填，无行内消息。`string`：必填，提交时在 picker 下方显示消息 |
| `modelName` | `string` | 是 | - | 源模型 |
| `filters` | `FilterCondition` | 否 | - | 应用于源查询的过滤 |
| `orders` | `OrderCondition` | 否 | - | 应用于源查询的排序 |
| `limitSize` | `number` | 否 | `50` | 拉取记录上限（选择器面向短列表） |
| `enabled` | `boolean` | 否 | `true` | 禁用底层查询（例如父值加载中） |
| `icon` | `LucideIcon` | 否 | - | 每张卡片左侧图标 |
| `titleField` | `string` | 否 | `"name"` | 卡片标题字段 |
| `badgeField` | `string` | 否 | - | 标题右侧小徽章字段 |
| `descriptionField` | `string` | 否 | - | 次要描述行字段 |
| `emptyMessage` | `string` | 否 | `"No records found."` | 查询无结果时显示 |

用法需要外层 `react-hook-form` provider。`ActionDialog` 的 `DialogForm` 已提供 —— 可直接放在对话框正文中。

### `RecordPickerList`

受控列表。无法引入 form provider 时使用，例如由组件 state 驱动的临时内联选择器。

```tsx
const [pickedId, setPickedId] = React.useState<string>();

<RecordPickerList
  modelName="DesignAppEnv"
  filters={[["status", "=", "Sealed"]]}
  value={pickedId}
  onChange={(id) => setPickedId(id)}
  titleField="name"
  badgeField="envType"
/>
```

| Prop | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | -------- | ------- | ----- |
| `modelName` | `string` | 是 | - | 源模型 |
| `filters` | `FilterCondition` | 否 | - | 源查询过滤 |
| `orders` | `OrderCondition` | 否 | - | 源查询排序 |
| `limitSize` | `number` | 否 | `50` | 拉取上限 |
| `enabled` | `boolean` | 否 | `true` | 禁用底层查询 |
| `value` | `string \| undefined` | 是 | - | 已选记录 id |
| `onChange` | `(id: string, record: Record<string, unknown>) => void` | 是 | - | 选择时触发 |
| `icon` | `LucideIcon` | 否 | - | 每卡左侧图标 |
| `titleField` | `string` | 否 | `"name"` | 卡片标题字段 |
| `badgeField` | `string` | 否 | - | 可选徽章字段 |
| `descriptionField` | `string` | 否 | - | 可选描述字段 |
| `emptyMessage` | `string` | 否 | `"No records found."` | |

加载态显示居中 spinner；空态显示 `emptyMessage`。

## 卡片视觉结构

```
┌──────────────────────────────────────┐
│ [icon]  Title  [badge]      [check] │   ← header row
│         Description text            │   ← optional description
└──────────────────────────────────────┘
```

- `[icon]`：`icon` prop 设置时显示（LucideIcon 组件引用）
- `Title`：来自 `titleField`；元数据感知提取器
- `[badge]`：`badgeField` 小 chip；元数据感知提取器
- `[check]`：仅选中行显示（`CheckCircle2`）
- `Description`：来自 `descriptionField`；溢出截断

选中卡片为主色边框 + 轻微 ring +  tinted 背景。未选中卡片 hover 高亮。

## 为何需要专用选择器（对比 `ManyToOne` 字段）？

在**普通表单**中选记录时，`widgetType="ComboBox"` 的 `Field` 更合适。选择器面向**对话框流程**：

- 对话框是唯一表单（无外层 ModelForm）
- 列表是小型、有排序的短列表（默认 ≤ 50 条）
- 需要开箱即用的丰富展示（icon + badge + description）
- 校验应用 Confirm 按钮并显示行内错误

数百条记录或嵌在 ModelForm 内时，请用 relation 类型的 `Field`，而非 picker。

## 何时用哪个

| 场景 | 使用 |
| -------- | --- |
| `ActionDialog` 正文内的选择器 | `RecordPickerField`（表单绑定） |
| 任意其他 `react-hook-form` provider 内 | `RecordPickerField` |
| 本地 `useState` 驱动（无 form） | `RecordPickerList`（受控） |
| 普通 `ModelForm` 中的关联列 | 普通 relation `Field` —— 不是 picker |

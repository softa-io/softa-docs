# 记录选择器（Record Picker）

用于从某个模型中选**单条**记录的小型类单选列表。主要为对话框表单设计——常见于 `ActionDialog`，用户在提交前需先选定一条记录（例如「将此版本部署到哪个环境」）。

两层组件：

| 组件 | 适用场景 |
| --------- | -------- |
| `RecordPickerList` | 需要受控的 `value` / `onChange` 列表。 |
| `RecordPickerField` | 位于 `react-hook-form` 上下文中（如 `ActionDialog` 正文），想把选择器绑到表单字段并做校验。 |

多数场景用 `RecordPickerField`。`RecordPickerList` 是更底层的兜底用法。

## 快速开始（`ActionDialog` 内的 `RecordPickerField`）

```tsx
import { RecordPickerField } from "@/components/views/shared/picker";
import { Server } from "lucide-react";

function DeployToEnvDialog() {
  return (
    <ActionDialog title="部署到环境">
      <RecordPickerField
        name="envId"
        required="请选择要部署的环境。"
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

选择器会把所选记录的 id 写入 `envId`。对话框提交负载为 `{ envId: "<所选-id>", ...其它表单字段 }`。若用户未选择就点确认，选择器下方会显示行内文案 `"请选择要部署的环境。"`（校验会拦截确认按钮）。

## 展示语义

`titleField` / `badgeField` / `descriptionField` 是被选模型上的字段名。选择器会从模型元数据读取各字段的 `fieldType`，再选用对应的展示提取逻辑：

| 字段类型 | 提取方式 |
| ---------- | --------- |
| `Option` / `MultiOption` | `itemName`（选项集的本地化标签） |
| `ManyToOne` / `OneToOne` | 引用记录的 `displayName` |
| 其它 | `String(value)` |

因此，对选项集字段声明 `titleField="status"` 时，渲染的是选项展示名，而不是原始 `itemCode`。

`titleField` 默认为 `"name"`。若模型的主展示字段不是 `name`，请覆盖。

## 组件

### `RecordPickerField`

绑定表单。用 `react-hook-form` 的 `<Controller>` 包裹 `RecordPickerList`，暴露与其它表单项一致的 `name` / `required`。

```tsx
<RecordPickerField
  name="versionId"
  required           // boolean — 必填但无行内提示
  modelName="DesignAppVersion"
  ...
/>

<RecordPickerField
  name="versionId"
  required="请选择一个版本。"  // string — 同样拦截提交，并显示提示
  modelName="DesignAppVersion"
  ...
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `name` | `Path<TFormValues>` | 是 | - | react-hook-form 字段路径 |
| `required` | `boolean \| string` | 否 | - | `true`：必填且无行内文案。`string`：必填，提交时在选器下方显示该文案 |
| `modelName` | `string` | 是 | - | 数据源模型 |
| `filters` | `FilterCondition` | 否 | - | 作用于源查询的过滤 |
| `orders` | `OrderCondition` | 否 | - | 作用于源查询的排序 |
| `limitSize` | `number` | 否 | `50` | 拉取记录上限（选择器是短列表） |
| `enabled` | `boolean` | 否 | `true` | 是否禁用底层查询（例如父级值仍在加载时） |
| `icon` | `LucideIcon` | 否 | - | 每张卡片左侧图标 |
| `titleField` | `string` | 否 | `"name"` | 卡片标题字段 |
| `badgeField` | `string` | 否 | - | 标题右侧小徽标字段 |
| `descriptionField` | `string` | 否 | - | 次要说明行字段 |
| `emptyMessage` | `string` | 否 | `"No records found."` | 查询无结果时显示 |

使用处外层须有 `react-hook-form` Provider。`ActionDialog` 的 `DialogForm` 已提供——可直接把 `RecordPickerField` 放进对话框正文。

### `RecordPickerList`

受控列表。无法提供表单上下文时使用，例如由组件本地 state 驱动的临时行内选择器。

```tsx
const [pickedId, setPickedId] = React.useState<string>();

<RecordPickerList
  modelName="DesignAppVersion"
  filters={[["status", "=", "Sealed"]]}
  value={pickedId}
  onChange={(id) => setPickedId(id)}
  titleField="name"
  badgeField="versionType"
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `modelName` | `string` | 是 | - | 数据源模型 |
| `filters` | `FilterCondition` | 否 | - | 源查询过滤 |
| `orders` | `OrderCondition` | 否 | - | 源查询排序 |
| `limitSize` | `number` | 否 | `50` | 拉取记录上限 |
| `enabled` | `boolean` | 否 | `true` | 禁用底层查询 |
| `value` | `string \| undefined` | 是 | - | 所选记录 id |
| `onChange` | `(id: string, record: Record<string, unknown>) => void` | 是 | - | 选择变更时触发 |
| `icon` | `LucideIcon` | 否 | - | 每张卡片左侧图标 |
| `titleField` | `string` | 否 | `"name"` | 卡片标题字段 |
| `badgeField` | `string` | 否 | - | 可选徽标字段 |
| `descriptionField` | `string` | 否 | - | 可选说明字段 |
| `emptyMessage` | `string` | 否 | `"No records found."` | |

加载态显示居中转圈；空态显示 `emptyMessage`。

## 卡片视觉结构

```
┌──────────────────────────────────────┐
│ [icon]  Title  [badge]      [check] │   ← 标题行
│         Description text            │   ← 可选描述
└──────────────────────────────────────┘
```

- `[icon]`：设置了 `icon` prop 时显示（Lucide 图标组件引用）
- `Title`：来自 `titleField`；随元数据选择提取器
- `[badge]`：来自 `badgeField` 的小块；同样随元数据
- `[check]`：仅当前选中行显示（`CheckCircle2`）
- `Description`：来自 `descriptionField`；溢出截断

选中卡片有主色描边 + 轻微 ring + 浅底；未选中卡片悬停有高亮。

## 为何需要独立选择器（对比 `ManyToOne` 字段）？

`widgetType="ComboBox"` 的 `Field` 适合在**常规表单**里选一条记录。本选择器面向**对话框流程**：

- 对话框即唯一表单（无外层 ModelForm）
- 列表是小型、可排序的短列表（默认 ≤ 50 条）
- 需要开箱即用的丰富展示（图标 + 徽标 + 描述）
- 校验应用行内错误拦截「确认」按钮

记录量很大或嵌在 ModelForm 中时，更推荐使用关系型 `Field`。

## 如何选择

| 场景 | 用法 |
| -------- | --- |
| `ActionDialog` 正文里的选择器 | `RecordPickerField`（绑定表单） |
| 其它 `react-hook-form` 上下文 | `RecordPickerField` |
| 本地 `useState` 驱动（无表单） | `RecordPickerList`（受控） |
| 常规 `ModelForm` 中的关系列 | 普通 `Field` + 关系控件——不用本选择器 |

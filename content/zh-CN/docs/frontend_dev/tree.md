# Tree

基于 `react-arborist` + shadcn/ui 的可复用树形视图。

## 导入

```tsx
import { Tree, TreePanel, type FlatNode, type TreePanelProps, type TreeProps } from "@/components/views/tree";
```

面向业务使用的公开组件：

- `Tree`
- `TreePanel`
- `SelectTreePanel`

## 快速开始

```tsx
import { Tree } from "@/components/views/tree";

<Tree modelName="SysModel" selectionMode="single" searchMode="local" />;
```

### Tree：常见配置示例

```tsx
import { toast } from "sonner";
import { Tree } from "@/components/views/tree";

<Tree
  modelName="SysModel"
  title="System Model"
  selectionMode="multiple"
  selectStrategy="cascade"
  searchMode="local"
  dragEnabled
  defaultExpandedLevel={2}
  rowActions={(node) => (
    <button
      type="button"
      onClick={() => toast.info(`Clicked ${String(node.name ?? node.id)}`)}
    >
      Inspect
    </button>
  )}
  onSelectionChange={(ids) => {
    console.log("Selected ids:", ids);
  }}
/>;
```

## 数据源

`Tree` 支持两种数据源模式：

- `mockData`：本地静态/内存列表。
- `modelName`：通过 `useSearchListQuery` 获取数据。

当 `mockData` 为空且提供了 `modelName` 时，`Tree` 会在渲染时发起请求，并从 `idKey`、`labelKey`、`parentKey`、`disabledKey`、`sortKey` 推导查询字段（去重后）。

## 默认行为

- `idKey = "id"`
- `labelKey = "name"`
- `parentKey = "parentId"`
- `disabledKey` 无默认值。
- `selectionMode = "single"`
- `selectStrategy = "cascade"`
- `searchMode = "off"`
- `dragEnabled = false`
- `defaultExpandedLevel = 3`
- `locatePulseDurationMs = 800`

## Tree Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `modelName` | `string` | `modelName` 或 `mockData` 至少一个必填 | - | 查询模式数据源。 |
| `mockData` | `FlatNode[]` | `modelName` 或 `mockData` 至少一个必填 | - | 本地数据源。 |
| `title` | `ReactNode` | 否 | - | 可选树标题。 |
| `treeFilters` | `FilterCondition` | 否 | - | model 模式查询过滤条件。 |
| `treeLimit` | `number` | 否 | - | model 模式查询数量限制。 |
| `idKey` | `string` | 否 | `"id"` | 节点 id 字段名。 |
| `labelKey` | `string` | 否 | `"name"` | 节点标签字段名。 |
| `parentKey` | `string` | 否 | `"parentId"` | 父节点 id 字段名。 |
| `disabledKey` | `string` | 否 | - | 禁用状态字段名。 |
| `sortKey` | `string` | 否 | - | 用于树构建/更新载荷的排序字段名。 |
| `selectionMode` | `"none" \| "single" \| "multiple"` | 否 | `"single"` | 选择模式。 |
| `selectStrategy` | `"independent" \| "cascade"` | 否 | `"cascade"` | 多选模式下生效。 |
| `searchMode` | `"off" \| "local" \| "server"` | 否 | `"off"` | 搜索策略。 |
| `dragEnabled` | `boolean` | 否 | `false` | 启用拖拽 + 草稿 + 保存流程。 |
| `onSearch` | `(query) => Promise<FlatNode[]>` | 否 | - | 仅 `searchMode="server"` 时必需。 |
| `onSelectionChange` | `(selectedIds, selectedNodes) => void` | 否 | - | 选择变化回调。 |
| `updateList` | `(payload) => Promise<unknown>` | 否 | - | 拖拽变更保存处理器。 |
| `searchDebounceMs` | `number` | 否 | `300` | 搜索防抖时间（毫秒）。 |
| `texts` | `Partial<TreeText>` | 否 | 内置本地化文本 | 文案覆盖。 |
| `className` | `string` | 否 | - | 外层容器 className。 |
| `rowActions` | `(node) => ReactNode` | 否 | - | 每行扩展操作。 |
| `width` | `number \| string` | 否 | `"100%"` | 树宽度。 |
| `height` | `number` | 否 | `320` | 树高度。 |
| `rowHeight` | `number` | 否 | 密度 token 值 | 行高覆盖。 |
| `indent` | `number` | 否 | 密度 token 值 | 缩进覆盖。 |
| `overscanCount` | `number` | 否 | `1` | 虚拟列表 overscan。 |
| `defaultExpandedLevel` | `number` | 否 | `3` | 初始展开层级深度。 |
| `padding` | `number` | 否 | - | Arborist padding。 |
| `paddingTop` | `number` | 否 | - | Arborist 顶部 padding。 |
| `paddingBottom` | `number` | 否 | - | Arborist 底部 padding。 |
| `rowClassName` | `string` | 否 | - | 行 className。 |
| `selectionFollowsFocus` | `boolean` | 否 | Arborist 默认值 | 透传给 Arborist。 |
| `onToggle` | `(id) => void` | 否 | - | 节点展开/折叠回调。 |
| `onFocus` | `(node) => void` | 否 | - | 节点聚焦回调。 |
| `selectedIds` | `string[]` | 否 | - | 受控选中 id 列表。 |
| `selectionResetVersion` | `number` | 否 | - | 自增触发清空选择。 |
| `collapseAllVersion` | `number` | 否 | - | 自增触发 `closeAll()`。 |
| `openStateResetVersion` | `number` | 否 | - | 自增恢复初始展开状态。 |
| `showSelectedRowClearAction` | `boolean` | 否 | `false` | 为已选中行显示行级清除图标。 |
| `locateRequestVersion` | `number` | 否 | - | 自增定位当前选中项。 |
| `locatePulseDurationMs` | `number` | 否 | `800` | 定位高亮持续时长。 |

## TreePanel Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | `ReactNode` | 否 | - | 面板头标题。 |
| `treeProps` | `TreeProps` | 否 | - | 传给内部 `Tree` 的 props。 |
| `canRenderTree` | `boolean` | 否 | `true` | 在树和空状态之间切换。 |
| `emptyState` | `ReactNode` | 否 | 内置空状态文案 | 树不可用时渲染。 |
| `builtInActions` | `TreePanelBuiltInActions` | 否 | - | 内置头部/底部操作配置。 |
| `headerActions` | `TreePanelHeaderAction[]` | 否 | `[]` | 额外头部操作。 |
| `footerActions` | `TreePanelFooterAction[]` | 否 | `[]` | 额外底部操作。 |
| `className` | `string` | 否 | - | 面板 className。 |

### TreePanel：最小示例

```tsx
import { TreePanel } from "@/components/views/tree";

<TreePanel
  title="System Model"
  treeProps={{ modelName: "SysModel" }}
/>;
```

### TreePanel：常见配置示例

```tsx
import { Locate, RotateCcw } from "lucide-react";
import { TreePanel } from "@/components/views/tree";

<TreePanel
  title="System Model"
  treeProps={{
    modelName: "SysModel",
    selectionMode: "multiple",
    searchMode: "local",
    defaultExpandedLevel: 2,
  }}
  builtInActions={{
    locate: {
      onClick: () => console.log("Locate selected"),
      icon: <Locate className="ui-icon-sm" />,
      show: true,
    },
    resetOpenState: {
      onClick: () => console.log("Reset open state"),
      icon: <RotateCcw className="ui-icon-sm" />,
      label: "Reset",
    },
  }}
  headerActions={[
    {
      key: "custom-header",
      icon: <span className="text-xs">H</span>,
      ariaLabel: "Custom header action",
      onClick: () => console.log("Header action"),
    },
  ]}
/>;
```

## SelectTreePanel Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `onChange` | `(value) => void` | 是 | - | 受控值更新回调。 |
| `selectionMode` | `"single" \| "multiple"` | 是 | - | 触发面板的选择行为。 |
| `value` | `ModelReference \| ModelReference[] \| null` | 否 | - | 受控选中值。 |
| `modelName` | `string` | 否 | - | 查询模式数据源。 |
| `mockData` | `FlatNode[]` | 否 | - | 本地数据源。 |
| `treeFilters` | `FilterCondition` | 否 | - | model 模式查询过滤条件。 |
| `treeLimit` | `number` | 否 | - | model 模式查询数量限制。 |
| `idKey` | `string` | 否 | `"id"` | 节点 id 字段名。 |
| `labelKey` | `string` | 否 | `"name"` | 节点标签字段名。 |
| `parentKey` | `string` | 否 | `"parentId"` | 父节点 id 字段名。 |
| `disabledKey` | `string` | 否 | - | 禁用状态字段名。 |
| `sortKey` | `string` | 否 | - | 树构建排序字段。 |
| `defaultExpandedLevel` | `number` | 否 | - | 透传给内部树。 |
| `height` | `number` | 否 | `360` | Popover 树高度。 |
| `className` | `string` | 否 | - | 外层 className。 |
| `placeholder` | `string` | 否 | `"Select..."` | 触发器占位文案。 |
| `disabled` | `boolean` | 否 | `false` | 禁用触发器与操作。 |
| `autoLocateOnOpen` | `boolean` | 否 | `true` | 打开时自动定位当前选中项。 |
| `destroyOnClose` | `boolean` | 否 | `true` | Popover 关闭时卸载树面板。 |
| `searchMode` | `"off" \| "local" \| "server"` | 否 | `"local"` | Popover 树搜索模式。 |
| `clearable` | `boolean` | 否 | `true` | 有值时显示清空按钮。 |

### SelectTreePanel：最小示例

```tsx
import * as React from "react";
import { SelectTreePanel } from "@/components/views/tree";

export function UserPicker() {
  const [value, setValue] = React.useState(null);

  return (
    <SelectTreePanel
      selectionMode="single"
      modelName="SysUser"
      value={value}
      onChange={setValue}
    />
  );
}
```

### SelectTreePanel：常见配置示例

```tsx
import * as React from "react";
import { SelectTreePanel } from "@/components/views/tree";
import type { ModelReference } from "@/types/ModelReference";

export function DepartmentPicker() {
  const [value, setValue] = React.useState<ModelReference[] | null>([]);

  return (
    <SelectTreePanel
      selectionMode="multiple"
      modelName="SysDepartment"
      value={value}
      onChange={setValue}
      placeholder="Select departments"
      searchMode="local"
      clearable
      autoLocateOnOpen
      defaultExpandedLevel={2}
      treeFilters={["enabled", "=", true]}
      idKey="id"
      labelKey="labelName"
      parentKey="parentId"
      height={420}
    />
  );
}
```

## 外部控制钩子（Version Props）

`selectionResetVersion`、`collapseAllVersion`、`openStateResetVersion`、`locateRequestVersion` 是边沿触发计数器：

- 数值保持不变：不执行动作。
- 数值递增：动作执行一次。

这种方式避免了组件重挂载，并保持树交互状态可预期。

## 定位行为

触发定位（`locateRequestVersion` 递增）时：

1. 展开选中节点的祖先（`openParents`）。
2. 将选中节点滚动到可视区域（`scrollTo(..., "center")`）。
3. 应用临时高亮闪烁效果。

定位不会改变选择状态和过滤条件。

## 父引用归一化

在 model 查询模式下，`useTreeModelData` 会归一化 `parentKey` 值：

- 若 `row[parentKey]` 是包含 `id` 键的对象，取该 `id`。
- 否则保持原值不变。

这支持后端将父节点返回为 `ModelReference` 对象的场景。

## `TreePanel`

`TreePanel` 是面向面板式树使用场景的布局包装器：

- 标题 + 头部图标操作
- 内嵌 `Tree` 主体
- 底部按钮操作

`TreePanel` 为常见操作提供 `builtInActions` 默认能力：

- `locate`
- `clearSelection`
- `collapsePanel`
- `resetOpenState`
- `collapseAll`

每个内置动作都可通过传入 `onClick` 启用，并可覆盖 `show`、`disabled`、`icon` 以及文案字段。

`ModelTable` 中的 `SideTreePanel` 现在复用该组件以统一面板行为。

## `SelectTreePanel`

`SelectTreePanel` 是基于 `TreePanel` 的可复用树选择器控件：

- 支持单选/多选
- 打开时自动定位（`autoLocateOnOpen`，默认 `true`）
- 单选模式：点击即提交并关闭
- 多选模式：点击先暂存，点击 Apply 后提交

## 说明

- 请确保 `idKey` 对应字段在加载数据集中唯一。
- 搜索模式下，搜索激活期间会禁用拖拽。
- 当数据源变化时，本地选择状态和搜索关键字会被重置。

# 侧栏（Side Panel）

靠左的过滤区组件，作为父视图（`ModelTable`、`ModelCard`）的**直接子节点**放在内部。用户在侧栏中的选择会发布一条过滤条件，由父视图与主查询做 **AND** 合并。

**三个组件**共享同一套基础类型与协议：

| 组件 | UI 形态 | 适用场景 |
| --------- | ----------- | ----------- |
| `<SideTree>` | 层级树 | 父子数据（部门树、模型树等） |
| `<SideList>` | 扁平行列表 | 简单列表过滤，每行可带模板字段 |
| `<SideCard>` | 富卡片 + 插槽 | 每行需要头/体/脚 + 操作的列表过滤 |

## 适用父视图

| 父视图 | 是否支持侧栏？ |
| ----------- | -------------------- |
| `ModelTable` | ✅ |
| `ModelCard` | ✅ |
| `ModelForm` / `ModelSideForm` | 仅 `SideCard` / `SideList`——用作主从 UI 的「主」列表 |

每个父视图**仅支持一个**侧栏子元素。

## 快速开始 — `<SideTree>`

```tsx
import { SideTree } from "@/components/views/shared/side-panel/SideTree";

<ModelTable modelName="SysField" orders={["modelName", "ASC"]}>
  <SideTree
    title="System Model"
    modelName="SysModel"
    filterField="modelId"
    labelField="label"
    parentField="parentId"
    treeLimit={1000}
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="label" />
  <Field fieldName="fieldType" />
</ModelTable>
```

选中树节点后，表格按 `modelId = <node.id>` 过滤。

## 快速开始 — `<SideCard>`

```tsx
import { SideCard } from "@/components/views/shared/side-panel/SideCard";
import { Group } from "@/components/fields/composition";
import { Action } from "@/components/actions/Action";

<ModelTable modelName="DesignActivity">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    searchable
    title="Apps"
  >
    <SideCard.Header>
      <Field fieldName="appName" />
    </SideCard.Header>
    <SideCard.Header align="right">
      <Field fieldName="status" />
    </SideCard.Header>
    <Group separator="-">
      <Field fieldName="appCode" />
      <Field fieldName="appType" />
    </Group>
    <SideCard.Footer>
      <Field fieldName="updatedTime" />
    </SideCard.Footer>

    <Action type="link" label="Edit" placement="header" href="/design/app/{id}" />
    <Action type="custom" label="Archive" placement="more" onClick={(ctx) => { /* ... */ }} />
  </SideCard>

  <Field fieldName="name" />
  <Field fieldName="status" />
</ModelTable>
```

## 快速开始 — `<SideList>`

```tsx
import { SideList } from "@/components/views/shared/side-panel/SideList";

<ModelTable modelName="DesignField">
  <SideList
    modelName="DesignModel"
    filterField="modelId"
    searchable
  >
    <Field fieldName="modelName" />
    <Field fieldName="label" />
  </SideList>

  <Field fieldName="fieldName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

## 通用协议

所有侧栏通过 `SidePanelContainerContext`（由父视图提供）发布选择。协议如下：

1. 侧栏从 `modelName`（自身数据源，非父视图）查询记录。
2. 用户选择记录——扁平行列表侧栏用 `useSideRecordList` 管理内部状态，树形侧栏用 `TreePanel`。
3. 侧栏调用 `container.onFilterChange(filterField, selectedIds, selectedRecords, filterOperator?)`。
4. 父视图将选择转为 `FilterCondition`，并与工作区 / 搜索 / 列 / 工具栏过滤条件做 AND 合并进主查询。

由选中 id 构成的过滤形态：

- 0 个选中 → 无过滤（已清除）
- 1 个选中 → `[filterField, operator, value]`
- N 个选中 → `[v0, OR, v1, OR, …, OR, vN]`

`operator` 默认为 `"="`，可通过 `filterOperator` 覆盖（目前仅在 `SideTree` 上暴露）。

## 组件属性

### 通用基类 — `SidePanelBaseProps`

三个组件均继承此类型：

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | -------- | ------- | ----- |
| `modelName` | `string` | 否 | 父视图的 | 数据源。未指定时回退到父视图的 `modelName`。 |
| `filterField` | `string` | 是 | - | 父视图记录上用于过滤的字段。 |
| `filterValueField` | `string` | 否 | `idField`（树）/ `id`（列表/卡片） | 侧栏记录上用于提取过滤值的字段。 |
| `filterOperator` | `FilterOperator` | 否 | `"="` | 生成过滤条件时使用的运算符。 |
| `selectionMode` | `"single" \| "multi"` | 否 | `"single"` | 是否允许多选。 |
| `remoteSearch` | `boolean` | 否 | `false` | 为 `true` 时搜索走远程 API（`["searchName", "CONTAINS", keyword]`），而非客户端过滤。防抖 300ms。 |
| `title` | `string` | 否 | - | 侧栏顶部标题。 |
| `className` | `string` | 否 | - | 侧栏根节点 className。 |

### 扁平行列表基类 — `SideFlatListPanelBaseProps`

`SideList` 与 `SideCard` 额外提供：

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | -------- | ------- | ----- |
| `filters` | `FilterCondition` | 否 | - | 查询源记录时应用的基础过滤。与工作区过滤 AND 合并。 |
| `orders` | `OrderCondition` | 否 | - | 源记录的排序。 |
| `limit` | `number` | 否 | `200` | 最大加载记录数。 |
| `searchable` | `boolean` | 否 | `false` | 启用搜索输入框。 |
| `formView` | `ComponentType<SideFormCreateDialogProps>` | 否 | - | 当 `ModelSideForm.enableCreate` 已设置时，`+` 按钮打开此对话框。 |

### `SideTree` 专有属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | -------- | ------- | ----- |
| `labelField` | `string` | 是 | - | 树节点标签字段。 |
| `parentField` | `string` | 是 | - | 父 id 字段（扁平树传 `""`）。 |
| `idField` | `string` | 否 | `"id"` | 树节点 id 字段。 |
| `disabledField` | `string` | 否 | - | 为真时将该节点标为禁用的字段。 |
| `treeFields` | `string[]` | 否 | - | 额外拉取的字段。 |
| `treeFilters` | `FilterCondition` | 否 | - | 树数据源的额外过滤。 |
| `treeLimit` | `number` | 否 | - | 查询上限。 |
| `orders` | `OrderCondition` | 否 | - | 第一个排序字段作为树排序键。 |
| `defaultExpandedLevel` | `number` | 否 | - | 初始展开深度。 |
| `height` | `number` | 否 | `560` | 树视口高度。 |

### `SideCard` 插槽

`SideCard` 接受复合子节点：

| 插槽 | 渲染位置 | 说明 |
| ---- | ---------- | ----- |
| `<SideCard.Header>` | 卡片头部行 | 允许多个实例；`align="right"` 翻到右侧 |
| `<SideCard.Header align="right">` | 头部行右侧 | 在 `...` 菜单之前 |
| 顶层 `<Field />` / 任意节点 | 卡片主体 | 在 `RecordContext` 中渲染——`Field` 以展示模式显示 |
| `<SideCard.Footer>` | 卡片底部 | |
| `<Action />` | 每张卡片的操作；由 placement 决定位置 | 见下方 [Action 放置](#sidecard-action-placement) |

#### SideCard Action 放置

| `placement` | 位置 | 可见性 |
| ----------- | -------- | ---------- |
| `header` | 卡片头部行，紧邻头部字段 | 始终可见 |
| `inline` | 卡片主体下方 | 始终可见 |
| `more` | 右上角 `...` 下拉菜单 | 悬停 / 打开时 |

- 省略时默认 placement 为 `inline`。
- Action 接收 `ActionExecutionContext`，含 `id`、`row`（记录数据）、`modelName`。
- 点击 Action **不会**触发卡片选中。
- `hidden` / `disabled` 按每张卡片单独求值。

## 通用行为

- 侧栏宽度固定为 **280px**；无公开宽度 API。
- 多选时，构建过滤条件时对选中值做 `OR` 合并。
- `searchable=true` 启用搜索框；默认客户端过滤（跨所有字段值），或通过 `remoteSearch=true` 走服务端（防抖 300ms，调用 `["searchName","CONTAINS",keyword]`）。
- `SideCard` / `SideList` 用 `RecordContext` 提供每行数据——`Field` 子节点自动以展示模式渲染（无需配置 `FieldPropsContext`）。
- `SideTree` 封装现有 [`TreePanel`](../views/tree)；`searchMode` 默认为 `"local"`，`remoteSearch=true` 时为 `"server"`。
- `SideCard` 与 `SideList` 可在 `ModelSideForm` 内作主从 UI 的「主」列表（见 [ModelSideForm](../views/side-form)）。

## 自定义侧栏

本目录提供三处共享基础设施：

### `useSideRecordList` 钩子

用于展示扁平行记录列表的侧栏（任何 SideList/SideCard 形态）。负责：

- 读取容器上下文 + `modelName` 回退
- 元数据 + 工作区过滤
- 搜索状态 + 防抖 + 查询参数
- `useSearchListQuery` 数据拉取
- 客户端搜索过滤（`remoteSearch=false` 时）
- 选中状态（内部管理 vs ModelSideForm 托管）
- 通过 `onFilterChange` 向容器发布选择
- 托管模式下自动选中第一条记录

```ts
import { useSideRecordList } from "@/components/views/shared/side-panel/use-side-record-list";

const {
  container, effectiveModelName, metaModel,
  searchTerm, setSearchTerm, filteredRecords, isLoading,
  selectedId, handleSelect,
} = useSideRecordList({
  modelName, filterField, filters, orders, limit, remoteSearch,
});
```

只需渲染任意 JSX——状态机由钩子负责。

### `buildSidePanelFilterCondition`

供父视图（ModelTable / ModelCard）将侧栏选中 id 转为过滤条件。多数调用方无需直接使用；已接入父视图。若新建父视图类型可再导出使用：

```ts
import { buildSidePanelFilterCondition } from "@/components/views/shared/side-panel/build-filter";

const filter = buildSidePanelFilterCondition(filterField, selectedIds, {
  filterOperator: "=",
});
```

### `SidePanelBaseProps` / `SideFlatListPanelBaseProps`

为新侧栏扩展类型时继承这些接口，以满足同一契约：

```ts
import type { SideFlatListPanelBaseProps } from "@/components/views/shared/side-panel/types";

interface MyPanelProps extends SideFlatListPanelBaseProps {
  // your panel-specific props
}
```

## 本目录文件

| 文件 | 用途 |
| ---- | ------- |
| `SideTree.tsx` | 树形侧栏组件 |
| `SideList.tsx` | 扁平行列表侧栏组件 |
| `SideCard.tsx` | 富卡片侧栏组件 + `SidePanelContainerProvider` / `useOptionalSidePanelContainer` |
| `SidePanelSearch.tsx` | SideList / SideCard 内部搜索输入 |
| `use-side-record-list.ts` | 扁平行列表侧栏共享状态钩子 |
| `build-filter.ts` | 选中 id → `FilterCondition` |
| `types.ts` | 共享类型层次 |
| `index.ts` | 桶导出 |

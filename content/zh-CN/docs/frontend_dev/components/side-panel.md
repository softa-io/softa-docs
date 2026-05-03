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
    title="系统模型"
    modelName="SysModel"
    filterField="modelId"
    labelField="labelName"
    parentField="parentId"
    treeLimit={1000}
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="labelName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

选中树节点后，表格按 `modelId = <节点.id>` 过滤。

## 快速开始 — `<SideCard>`

```tsx
import { SideCard } from "@/components/views/shared/side-panel/SideCard";
import { Group } from "@/components/fields/composition";
import { Action } from "@/components/actions/Action";

<ModelTable modelName="DesignWorkItem">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    searchable
    title="应用"
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

    <Action type="link" labelName="编辑" placement="header" href="/design/app/{id}" />
    <Action type="custom" labelName="归档" placement="more" onClick={(ctx) => { /* ... */ }} />
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
    <Field fieldName="labelName" />
  </SideList>

  <Field fieldName="fieldName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

## 通用协议

所有侧栏通过 `SidePanelContainerContext`（由父视图提供）发布选择。流程如下：

1. 侧栏按自己的 `modelName` 查询记录（与父视图数据源独立）。
2. 用户选择记录——扁平列表类用 `useSideRecordList` 内部状态，树用 `TreePanel`。
3. 侧栏调用 `container.onFilterChange(filterField, selectedIds, selectedRecords, filterOperator?)`。
4. 父视图将选择转为 `FilterCondition`，与工作区 / 搜索 / 列 / 工具栏等过滤 **AND** 合并进主查询。

由所选 id 生成的过滤形状：

- 0 条选中 → 无过滤（清空）
- 1 条选中 → `[filterField, operator, value]`
- N 条选中 → `[v0, OR, v1, OR, …, OR, vN]`

`operator` 默认为 `"="`，可通过 `filterOperator` 覆盖（目前仅在 `SideTree` 上暴露）。

## 组件属性

### 公共基类 — `SidePanelBaseProps`

三者均继承：

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `modelName` | `string` | 否 | 继承父视图 | 数据源。缺省为父视图的 `modelName`。 |
| `filterField` | `string` | 是 | - | 父视图记录上用于过滤的字段。 |
| `filterValueField` | `string` | 否 | 树为 `idField`，列表/卡片为 `id` | 侧栏记录上取过滤值的字段。 |
| `filterOperator` | `FilterOperator` | 否 | `"="` | 生成条件时使用的运算符。 |
| `selectionMode` | `"single" \| "multi"` | 否 | `"single"` | 是否允许多选。 |
| `remoteSearch` | `boolean` | 否 | `false` | 为 true 时搜索走远端 API（`["searchName", "CONTAINS", keyword]`），而非客户端过滤。防抖 300ms。 |
| `title` | `string` | 否 | - | 面板顶部标题。 |
| `className` | `string` | 否 | - | 根节点 className。 |

### 扁平列表基类 — `SideFlatListPanelBaseProps`

`SideList` 与 `SideCard` 另增：

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `filters` | `FilterCondition` | 否 | - | 查询源记录时的基础过滤。与工作区过滤 AND 合并。 |
| `orders` | `OrderCondition` | 否 | - | 源记录排序。 |
| `limit` | `number` | 否 | `200` | 最大加载条数。 |
| `searchable` | `boolean` | 否 | `false` | 是否显示搜索框。 |
| `formView` | `ComponentType<SideFormCreateDialogProps>` | 否 | - | 当 `ModelSideForm.enableCreate` 开启时，`+` 按钮打开此对话框组件。 |

### `SideTree` 专有属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `labelField` | `string` | 是 | - | 树节点标签字段。 |
| `parentField` | `string` | 是 | - | 父 id 字段（扁平树可传 `""`）。 |
| `idField` | `string` | 否 | `"id"` | 节点 id 字段。 |
| `disabledField` | `string` | 否 | - | 为真时令节点不可用。 |
| `treeFields` | `string[]` | 否 | - | 额外拉取的字段。 |
| `treeFilters` | `FilterCondition` | 否 | - | 树数据源的额外过滤。 |
| `treeLimit` | `number` | 否 | - | 查询条数上限。 |
| `orders` | `OrderCondition` | 否 | - | 第一个排序字段用作树排序键。 |
| `defaultExpandedLevel` | `number` | 否 | - | 初始展开深度。 |
| `height` | `number` | 否 | `560` | 树视口高度。 |

### `SideCard` 插槽

`SideCard` 支持组合式子节点：

| 插槽 | 渲染位置 | 说明 |
| ---- | ---------- | ----- |
| `<SideCard.Header>` | 卡片标题行 | 可多个；`align="right"` 靠右 |
| `<SideCard.Header align="right">` | 标题行右侧 | 在 `...` 菜单之前 |
| 顶层 `<Field />` 等任意节点 | 卡片正文 | 处于 `RecordContext` 内——`Field` 为展示模式 |
| `<SideCard.Footer>` | 卡片底部 | |
| `<Action />` | 每张卡片的操作；由 `placement` 决定位置 | 见下文 [SideCard 操作 placement](#sidecard-action-placement) |

#### SideCard 操作 placement {#sidecard-action-placement}

| `placement` | 位置 | 可见性 |
| ----------- | -------- | ---------- |
| `header` | 标题行内，紧靠标题区字段 | 始终可见 |
| `inline` | 正文下方 | 始终可见 |
| `more` | 右上角 `...` 下拉 | 悬停 / 展开时 |

- 省略时默认 `inline`。
- 操作接收带 `id`、`row`（记录数据）、`modelName` 的 `ActionExecutionContext`。
- 点击操作**不会**触发卡片选中。
- `hidden` / `disabled` 按每张卡片单独计算。

## 通用行为

- 面板宽度固定 **280px**；无公开宽度 API。
- 多选时，生成过滤会把多个选中值用 `OR` 合并。
- `searchable=true` 显示搜索框；默认客户端（跨字段值过滤），或 `remoteSearch=true` 走服务端（防抖 300ms，调用 `["searchName","CONTAINS",keyword]`）。
- `SideCard` / `SideList` 用 `RecordContext` 提供每行数据——`Field` 子节点自动展示模式（无需再配 `FieldPropsContext`）。
- `SideTree` 封装现有 [`TreePanel`](../views/tree)；`searchMode` 默认为 `"local"`，`remoteSearch=true` 时为 `"server"`。
- `SideCard` 与 `SideList` 可放在 `ModelSideForm` 中作为主从的「主」列表（见 [ModelSideForm](../views/side-form)）。

## 自定义侧栏

目录内提供三类共用设施：

### `useSideRecordList` 钩子

用于展示扁平记录列表（形态类似 SideList/SideCard）。负责：

- 读取容器上下文 + `modelName` 回退
- 元数据 + 工作区过滤
- 搜索状态 + 防抖 + 查询参数
- `useSearchListQuery` 拉数
- `remoteSearch=false` 时的客户端搜索过滤
- 选择状态（内部 vs ModelSideForm 托管）
- 通过 `onFilterChange` 向容器发布选择
- 托管模式下自动选中第一条

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

自由渲染 JSX——状态机由钩子维护。

### `buildSidePanelFilterCondition`

父视图（ModelTable / ModelCard）用来把面板选中 id 转为过滤条件。多数场景无需直接使用；父视图已接好。若扩展新的父视图类型可再导出调用：

```ts
import { buildSidePanelFilterCondition } from "@/components/views/shared/side-panel/build-filter";

const filter = buildSidePanelFilterCondition(filterField, selectedIds, {
  filterOperator: "=",
});
```

### `SidePanelBaseProps` / `SideFlatListPanelBaseProps`

自定义面板类型时从这里扩展，以保持同一契约：

```ts
import type { SideFlatListPanelBaseProps } from "@/components/views/shared/side-panel/types";

interface MyPanelProps extends SideFlatListPanelBaseProps {
  // 面板专有 props
}
```

## 目录内文件

| 文件 | 用途 |
| ---- | ---- |
| `SideTree.tsx` | 树形侧栏组件 |
| `SideList.tsx` | 扁平列表侧栏组件 |
| `SideCard.tsx` | 富卡片侧栏 + `SidePanelContainerProvider` / `useOptionalSidePanelContainer` |
| `SidePanelSearch.tsx` | SideList / SideCard 内部搜索输入 |
| `use-side-record-list.ts` | 扁平列表侧栏共用状态钩子 |
| `build-filter.ts` | 选中 id → `FilterCondition` |
| `types.ts` | 共用类型层级 |
| `index.ts` | 桶导出 |

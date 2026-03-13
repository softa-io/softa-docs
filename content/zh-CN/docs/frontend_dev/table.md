# ModelTable

可组合的数据表格视图，具备：

- 元数据驱动列
- 服务端查询集成
- 工具栏筛选/排序/分组控制
- 可选左侧树筛选面板

## 相关文档

- [对话框组件](./dialog)
- [表单组件](./form)
- [字段与 widgets](./field)

## 快速开始

```tsx
import {
  UserAccountUnlockActionDialog,
} from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export default function UserAccountPage() {
  return (
    <ModelTable
      modelName="UserAccount"
      initialParams={{ orders: [["createdTime", "DESC"]] }}
    >
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
      <Field fieldName="createdTime" />
      <Action
        labelName="Lock Account"
        operation="lockAccount"
        placement="more"
        confirmMessage="Lock this user account?"
        successMessage="User account locked."
        errorMessage="Failed to lock user account."
      />
      <Action
        type="dialog"
        labelName="Unlock Account"
        operation="unlockAccount"
        placement="more"
        successMessage="User account unlocked."
        errorMessage="Failed to unlock user account."
        component={UserAccountUnlockActionDialog}
      />
    </ModelTable>
  );
}
```

大多数页面不需要显式泛型参数。`ModelTable` 默认行类型为：

```ts
type ModelTableRowData = { id: string };
```

## 列声明

`ModelTable` 采用 JSX-first：

- 列来自按顺序声明的 `<Field />` 子节点
- 顶层查询 `fields` 会根据这些声明自动生成
- `initialParams` 只承载 `filters`、`orders`、`pageSize`、`groupBy` 等非列查询参数
- `children` 可以混合 `<Field />`、`<Action />` 和 `<BulkAction />`
- 运行时至少需要一个可见的 `<Field />` 声明

示例：

```tsx
<ModelTable
  modelName="SysOptionSet"
  initialParams={{ orders: [["optionSetCode", "ASC"]], pageSize: 50 }}
>
  <Field fieldName="optionSetCode" readonly />
  <Field fieldName="name" />
  <Field fieldName="description" />
  <Field fieldName="active" widgetType="CheckBox" />
</ModelTable>
```

表格声明说明：

- `Field` 的顺序就是渲染列顺序
- `widgetType`、`labelName`、`filters`、`onChange`，以及静态 `required` / `readonly` 覆盖，会同时复用于只读单元格和内联编辑器
- `defaultValue` 只用于创建态；在表格场景中，它只作用于关联行创建和内联编辑器，不作用于只读单元格
- 内联编辑字段值与表单使用同一套 UI 值契约，例如 `File -> FileInfo | null`、`MultiFile -> FileInfo[]`，`JSON` / `DTO` / `Filters` / `Orders` 都保持结构化数据
- 表格只读单元格不会消费 `widgetProps`；v1 统一使用紧凑型表格渲染器，而不是表单式 widget 变体
- 对于内联编辑中的关联列（`ManyToOne` / `OneToOne`），`filters` 可以使用 `#{fieldName}`，并会在发送关联查询前基于当前编辑行解析
- 后端环境 token，例如 `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID`，会原样透传；若后端需要把一个看起来像 token 的字符串视为字面量，可使用 `@{literal}`
- 在表格声明里，`hidden` 只支持 `boolean`；`hidden={true}` 会移除整列
- 条件式 `required` / `readonly` 支持内联编辑，但条件式 `hidden` 不支持

更完整的字段值契约见 `src/components/fields/README.md`。

## 文件与图片列

表格侧的文件渲染基于 API 返回值，而不是表单 widget 状态：

- `File` 期望值为 `FileInfo`
- `MultiFile` 期望值为 `FileInfo[]`
- 图片预览使用 `FileInfo.url`
- 文件链接文案按 `fileName -> fileId -> "-"` 回退

只读行为：

- `File` + `widgetType="Image"` 会渲染紧凑缩略图，点击后打开图片预览对话框
- `MultiFile` + `widgetType="MultiImage"` 会渲染紧凑缩略图摘要和 `+N`，点击后打开图库预览对话框
- 普通 `File` 会渲染为指向 `FileInfo.url` 的可下载文件名链接
- 普通 `MultiFile` 会渲染第一项文件名链接并附带 `+N`
- 如果图片项没有 `url`，单元格会渲染紧凑占位框，而不是显示破图
- 只读单元格始终保持单行/不换行；表格行不会因为多文件内容而整体展开

这些紧凑型只读渲染器在关联表格（`RelationTableView`）的只读模式下也会复用

## Inline Edit

`ModelTable` 支持可选的行级内联编辑。

```tsx
<ModelTable
  modelName="TenantOptionItem"
  inlineEdit
  initialParams={{
    orders: [["sequence", "ASC"]],
  }}
>
  <Field fieldName="sequence" readonly />
  <Field fieldName="companyId" />
  <Field
    fieldName="departmentId"
    filters={[["companyId", "=", "#{companyId}"]]}
  />
  <Field
    fieldName="itemName"
    readonly={[["active", "=", false]]}
  />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` 示例：

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(["active"], ({ values, scope, rowId }) =>
    scope === "model-table" && Boolean(rowId) && values.active === true
  )}
/>
```

行为说明：

- 默认值为 `inlineEdit={false}`
- `false`：点击行后跳转到详情页的只读模式
- `true`：点击行后激活该行的内联编辑
- 可编辑单元格会直接在表格单元格内渲染 `Field`
- 激活行会显示行级 `Save` / `Cancel`
- 只有在激活行存在实际变更时，`Save` 才可用
- `Save` 仅通过更新 API 提交该行发生变化的可编辑字段
- `Cancel` 会用最近一次加载的服务端快照恢复该行
- 当当前行处于脏状态时，切换到另一行会提示确认是否丢弃更改
- `required` / `readonly` 支持 `boolean`、`FilterCondition` 和 `dependsOn([...], evaluator)`
- 内联编辑条件会基于当前行对象求值，`scope="model-table"`，并附带 `rowIndex` 与 `rowId`
- 使用 `#{fieldName}` 的关联字段过滤条件也会基于当前行对象求值
- 如果某个关联字段过滤条件依赖缺失，则该行的关联查询会保持禁用，而不是加载未过滤选项
- 只有元数据可编辑且当前不处于有效只读状态的列才会成为内联编辑器；不支持的列仍保持只读
- `File`、`MultiFile`、`Image`、`MultiImage` 支持内联编辑，并会在激活行中复用普通 `Field` 上传 widget
- 激活的编辑行可能因文件/图片 widget 而增高；未激活行保持固定高度

### 远程 `Field.onChange`

内联编辑也支持在声明列上启用远程字段联动：

```tsx
<ModelTable modelName="SysOptionSet" inlineEdit>
  <Field fieldName="optionSetCode" onChange={["name", "description"]} />
  <Field fieldName="name" />
  <Field fieldName="description" />
</ModelTable>
```

`ModelTable` 内联编辑中的行为：

- 作用域只针对当前正在编辑的行
- 请求路径为 `POST /<modelName>/onChange/<fieldName>`
- `with: "all"` 序列化的是当前行，而不是整个表格
- 响应中的 `values` 只 patch 当前行
- 响应中的 `readonly` / `required` 只作用于当前行，并覆盖本地有效状态
- 当该行保存、取消、重载，或切换到另一行编辑时，远程规则状态会被清除

## 开发者类型

`ModelTableTab` 是**类型**，不是组件。

```ts
interface ModelTableTab {
  id: string;
  label: string;
  icon?: ReactNode;
  filter?: FilterCondition;
}
```

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | - | 稳定的 Tab 键，用于 `activeTabId/defaultTabId`。 |
| `label` | `string` | 是 | - | 显示在表头 Tab 区域的文案。 |
| `icon` | `ReactNode` | 否 | - | 可选图标，显示在 Tab 标签前。 |
| `filter` | `FilterCondition` | 否 | - | Tab 激活时附加的基础过滤条件。 |

`tabs` 使用示例：

```tsx
import type { ModelTableTab } from "@/components/views/table/types/types";
import { Lock, ShieldCheck } from "lucide-react";

const tabs: ModelTableTab[] = [
  { id: "all", label: "All" },
  {
    id: "active",
    label: "Active",
    icon: <ShieldCheck className="ui-icon-sm" />,
    filter: ["status", "=", "active"],
  },
  {
    id: "locked",
    label: "Locked",
    icon: <Lock className="ui-icon-sm" />,
    filter: ["locked", "=", true],
  },
];

<ModelTable
  modelName="UserAccount"
  tabs={tabs}
  defaultTabId="active"
/>
```

当你希望更强的行类型约束时，可使用 `ModelTableRowWith<TExtra>`：

```ts
type UserAccountRow = ModelTableRowWith<{
  username: string;
  status: string;
  locked: boolean;
}>;
```

## Side Tree（可选）

`ModelTable` 可以通过 `sideTree` 渲染左侧树筛选面板。

```tsx
const sideTree: SideTreeConfig = {
  title: "System Model",
  modelName: "SysModel",
  filterField: "modelId",
  idKey: "id",
  labelKey: "labelName",
  parentKey: "parentId",
  selectionMode: "single",
  defaultExpandedLevel: 2,
};

<ModelTable
  modelName="SysField"
  initialParams={{
    orders: [["modelName", "ASC"]],
  }}
  sideTree={sideTree}
>
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
  <Field fieldName="labelName" />
  <Field fieldName="fieldType" />
</ModelTable>
```

`sideTree` 只改变过滤行为和布局。列声明仍然来自子级 `<Field />`。

`SideTreeConfig` 类型：

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `filterField` | `string` | 是 | - | 根据选中树节点 id 构建表格过滤条件时使用的目标字段。 |
| `title` | `string` | 否 | - | 侧边面板标题。 |
| `modelName` | `string` | 否 | - | 树 model 数据源（查询模式）。 |
| `mockData` | `FlatNode[]` | 否 | - | 树本地数据源。 |
| `treeFilters` | `FilterCondition` | 否 | - | 树查询模式下的附加过滤条件。 |
| `treeLimit` | `number` | 否 | - | 树查询模式下的数量限制。 |
| `idKey` | `string` | 否 | `"id"` | 树节点 id 字段名。 |
| `labelKey` | `string` | 否 | `"name"` | 树节点标签字段名。 |
| `parentKey` | `string` | 否 | `"parentId"` | 树父节点字段名。 |
| `disabledKey` | `string` | 否 | - | 树禁用状态字段名。 |
| `sortKey` | `string` | 否 | - | 树排序字段名。 |
| `selectionMode` | `"single" \| "multiple"` | 否 | `"single"` | 表格筛选集成使用的侧树选择模式。 |
| `defaultExpandedLevel` | `number` | 否 | `3` | 树初始展开层级深度。 |
| `height` | `number` | 否 | - | 树视口高度。 |
| `className` | `string` | 否 | - | 侧边面板 className。 |
| `getSelectionLabel` | `(selectedIds, selectedNodes) => string \| undefined` | 否 | - | 工具栏状态区中树筛选标签的自定义文案。 |

## `ModelTable` 中的 Side Tree 标准化

当启用 `sideTree` 时，`ModelTable` 会在内部强制以下 `Tree` 默认值：

- `searchMode = "local"`
- `dragEnabled = false`
- `selectionMode` 仅归一化为 `"single"` 或 `"multiple"`

这样可以保证跨页面行为一致，避免每页各自漂移。

## Side Tree 布局控制

`ModelTableProps` 支持：

- `sideTreeWidth`（默认 `280`）
- `sideTreeMinWidth`（默认 `220`）
- `sideTreeMaxWidth`（默认 `560`）

面板提供：

- 可拖拽垂直分隔条（仅影响布局宽度）
- 折叠/展开
- 折叠后窄条（`44px`）及展开按钮
- 表格区域自动占据剩余宽度

## Side Tree 操作

顶部区域：

- 定位图标（有选中节点时显示）
- 清空图标（有选中节点时显示）
- 折叠图标

底部区域：

- `Reset`（恢复默认展开状态）
- `Collapse all`

选中树行可显示 hover 清除操作（`x`），仅移除该行选择。

## 统一的工具栏激活状态

工具栏激活状态区支持展示和清除：

- 树筛选标签
- 列筛选标签
- 条件筛选预览
- 排序摘要
- 分组摘要

`Clear all` 会一次性清空所有激活状态。

## 核心 Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `modelName` | `string` | 是 | - | 用于获取 metadata API。 |
| `inlineEdit` | `boolean` | 否 | `false` | 启用按行点击的内联编辑模式。启用后，激活行的可编辑单元格会渲染 `Field` 组件，而不是跳转到详情页。 |
| `initialParams` | `QueryParamsWithoutFields` | 否 | - | 初始的非列查询设置，例如 `filters`、`orders`、`pageSize`、`groupBy`。 |
| `queryOptions` | `UseQueryOptions`（partial） | 否 | - | 表格分页查询的 React Query 可选配置。 |
| `children` | `ReactNode` | 否 | - | 有序的 `<Field />` 列声明，以及可选的 `<Action />` 和 `<BulkAction />`。运行时至少需要一个可见的 `<Field />`。 |
| `toolbarActionsComponent` | `ReactNode \| ComponentType<{ table }>` | 否 | - | 自定义工具栏操作。 |
| `tableProps` | `Omit<TableProps, "children">` | 否 | - | 透传给底层 table 组件的 props。 |
| `className` | `string` | 否 | - | 外层容器 className。 |
| `enableBulkDelete` | `boolean` | 否 | `true` | 启用内置批量删除。 |
| `enableCreate` | `boolean` | 否 | `true` | 启用内置创建按钮。 |
| `enableImport` | `boolean` | 否 | `true` | 启用 More 菜单中的内置导入对话框入口。 |
| `enableExport` | `boolean` | 否 | `true` | 启用 More 菜单中的内置导出对话框入口。 |
| `bulkEditFields` | `string[]` | 否 | - | 可选批量编辑白名单。未提供时内置批量编辑使用所有元数据字段。 |
| `excludeFields` | `string[]` | 否 | - | 可选批量编辑黑名单。除保留字段外，这些字段也会被内置批量编辑排除。 |
| `tabs` | `ModelTableTab[]` | 否 | - | 表头级可选 Tab 过滤。 |
| `defaultTabId` | `string` | 否 | 首个 Tab id，否则 `"all"` | 初始激活 Tab id。 |
| `freezeColumnIndex` | `number` | 否 | `1` | 从左侧开始初始冻结列数。 |
| `sideTree` | `SideTreeConfig` | 否 | - | 左侧树筛选面板配置。 |
| `sideTreeWidth` | `number` | 否 | `280` | 侧树初始宽度。 |
| `sideTreeMinWidth` | `number` | 否 | `220` | 侧树最小宽度。 |
| `sideTreeMaxWidth` | `number` | 否 | `560` | 侧树最大宽度。 |

## 内置导入 / 导出

`ModelTable` 在工具栏 `More` 菜单下内置了导入和导出对话框。
当前没有额外的页面级配置对象；这些对话框会根据当前 `modelName`、表格查询状态、选中行、当前页数据和元数据自动推导行为。

### 导入

- 由 `enableImport` 控制
- 对话框标签页：
  - `By Template`
  - `Dynamic Import`
  - `My Import History`
- 模板导入：
  - 按 `modelName` 加载模板
  - 支持下载模板
  - 按配置模板提交上传文件
- 动态导入：
  - 在浏览器中解析上传的 `.xlsx` 工作簿
  - 基于元数据自动将工作簿表头映射到模型字段
  - 允许用户在提交前调整映射关系
- 历史记录标签页：
  - 加载当前模型的 `ImportHistory`
  - 使用共享的关联表格字段渲染器渲染记录行
  - 原始文件、失败文件等文件列依赖 `FileInfo.url` 生成下载链接

### 导出

- 由 `enableExport` 控制
- 对话框标签页：
  - `By Template`
  - `Dynamic Export`
  - `My Export History`
- 模板导出：
  - 按 `modelName` 加载导出模板
  - 将当前导出范围作为 `ExportParams` 提交
- 动态导出：
  - 基于当前模型元数据生成候选字段
  - 默认选中当前表格里可见的列
  - 允许用户修改字段、文件名和 sheet 名
  - 生成前端发起的 `.xlsx` 工作簿
- 历史记录标签页：
  - 加载当前模型的 `ExportHistory`
  - 使用与普通表格文件列相同的 `FileInfo.url` 只读渲染行为展示导出文件链接

### 导出范围规则

内置导出支持三种范围：

- `Selected Rows`
- `Current Page`
- `All Filtered Data`

行为说明：

- `Selected Rows` 使用当前工具栏批量选择的 id
- `Current Page` 使用当前页 id 快照，而不是回放 `pageNumber/pageSize`
- `All Filtered Data` 会复用当前的 `filters/orders/groupBy/aggFunctions/effectiveDate`
- 前端单次导出请求最多支持 `100000` 条记录；超过限制的范围会直接禁用，而不是截断导出

### 只读渲染器复用

历史记录标签页会刻意复用现有的表格/关联表格字段渲染器。
这意味着文件/历史行遵循与普通表格只读单元格相同的运行时契约：

- `File` 期望值为 `FileInfo`
- `MultiFile` 期望值为 `FileInfo[]`
- 下载/预览链接直接取自 `FileInfo.url`

## `initialParams` 指南

`initialParams` 是 `ModelTable` 的服务端查询初始状态，定义如下：

```ts
type initialParams = QueryParamsWithoutFields;
```

`ModelTable` 不接受顶层 `initialParams.fields`。
表格查询字段列表始终来自按声明顺序排列的可见 `<Field />` 子节点。

`initialParams.filters` 仍然只是表格查询本身的普通服务端基础过滤条件，不会解析 `#{fieldName}`；这套声明式语法只支持关系字段 `filters` 和关系 `tableView.initialParams.filters`。

查询引导默认值：

- `pageNumber = 1`
- `pageSize = 20`
- 其他字段默认 `undefined`

### `initialParams` 字段

| Key | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `filters` | `FilterCondition` | `undefined` | 基础过滤条件。该条件会作为基底，与 UI 过滤通过 `AND` 合并。 |
| `orders` | `OrderCondition` | `undefined` | 初始排序规则。 |
| `pageNumber` | `number` | `1` | 初始页码。 |
| `pageSize` | `number` | `20` | 初始分页大小。 |
| `aggFunctions` | `Array<string \| string[]>` | `undefined` | 高级聚合函数（后端支持时生效）。 |
| `groupBy` | `string[]` | `undefined` | 初始分组字段。 |
| `splitBy` | `string[]` | `undefined` | 高级拆分/分组维度字段。 |
| `summary` | `boolean` | `undefined` | 是否启用查询汇总模式。 |
| `effectiveDate` | `string` | `undefined` | 生效日期快照（时点查询）。 |
| `subQueries` | `Record<string, SubQuery>` | `undefined` | 关联/子查询载荷。 |

### 最小示例

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    orders: [["updatedTime", "DESC"]],
  }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### 常见示例

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    filters: [["status", "!=", "Deleted"], "AND", ["locked", "=", false]],
    orders: [["updatedTime", "DESC"]],
    pageNumber: 1,
    pageSize: 50,
    effectiveDate: "2026-03-01",
  }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### 进阶示例（`groupBy` / `aggFunctions` / `subQueries`）

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    filters: ["status", "=", "Active"],
    groupBy: ["departmentId"],
    aggFunctions: [["COUNT", "*", "count"]],
    subQueries: {
      roles: {
        fields: ["id", "name"],
        orders: [["name", "ASC"]],
        topN: 5,
      },
    },
  }}
>
  <Field fieldName="departmentId" />
  <Field fieldName="status" />
</ModelTable>
```

### 过滤条件合并行为（重要）

`initialParams.filters` 只是基础过滤条件。运行时过滤会通过 `AND` 合并：

- 基础过滤（`initialParams.filters`）
- 当前激活 Tab 的过滤
- 侧树过滤
- 搜索过滤（`["searchName", "CONTAINS", keyword]`）
- 列过滤
- 工具栏条件过滤

合并后的条件示例：

```ts
[
  ["status", "=", "Active"],
  "AND",
  ["locked", "=", true],
  "AND",
  ["searchName", "CONTAINS", "alice"],
]
```

行操作支持与表单工具栏相同的 `Action` 能力：

- `type="default" | "dialog" | "link" | "custom"`
- `placement="inline" | "more"`
- 通过 `ActionValue<T>`（`T` 或 `(context) => T`）支持动态参数：`confirmMessage`、`successMessage`、`errorMessage`、`payload`
- `disabled` 和 `visible` 支持 `boolean`、`FilterCondition` 和 `dependsOn([...], evaluator)`
- 在表格场景中：
  - `inline`：直接显示在最后一列
  - `more`：显示在最后一列的 More Actions 下拉菜单
  - 激活中的内联编辑行会基于当前草稿行值解析 Action 上下文
  - 当激活行处于脏状态时，点击行操作会先询问是否丢弃草稿再继续

Action 条件说明：

- `FilterCondition` 会基于当前行值求值，并支持 `#{fieldName}` 引用
- 不支持裸函数条件；函数逻辑请包在 `dependsOn([...], evaluator)` 中
- 如果没有行字段依赖，优先使用普通 `boolean`

表格中的 Action 回调会收到行执行上下文：

```ts
onClick: ({ id, modelName, scope, mode, isDirty, values, row }) => void
```

### 行操作：最小示例

```tsx
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { toast } from "sonner";

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
  <Action
    type="custom"
    labelName="Copy User ID"
    placement="more"
    onClick={({ id }) => {
      navigator.clipboard.writeText(String(id));
      toast.success(`User ID "${id}" copied.`);
    }}
  />
</ModelTable>
```

### 行操作：完整类型示例

```tsx
import { Action } from "@/components/common/Action";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { ModelTable } from "@/components/views/table/ModelTable";
import { ExternalLink, Lock, Pencil, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog
      title="Unlock Account"
      abstractModelName="UnlockAccountAction"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
    />
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  {/* custom + inline */}
  <Action
    type="custom"
    labelName="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  {/* default + more */}
  <Action
    type="default"
    labelName="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
    successMessage="Account locked."
    errorMessage="Failed to lock account."
  />

  {/* dialog + more */}
  <Action
    type="dialog"
    labelName="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
    successMessage="Account unlocked."
    errorMessage="Failed to unlock account."
  />

  {/* link + more */}
  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
    target="_blank"
  />
</ModelTable>;
```

批量操作（工具栏选中集操作）：

- 支持位置：`toolbar | more`
- 支持类型：`default | dialog`
- 执行上下文：`{ ids, rows, modelName }`
- 渲染行为：
  - 仅在有选中行时显示
  - `placement="toolbar"`：显示在 `Columns` 与 `More` 之间
  - `placement="more"`：显示在 `More` 下拉的批量操作区（Import/Export 之上）
  - 内置 `Delete selected` 也在该批量操作区

### BulkAction：最小示例

```tsx
import { BulkAction } from "@/components/common/BulkAction";
import { Field } from "@/components/fields";

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
  <BulkAction
    labelName="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
  />
</ModelTable>;
```

### BulkAction：常见配置示例

```tsx
import { ActionDialog } from "@/components/views/dialogs";
import { BulkAction } from "@/components/common/BulkAction";
import { Field } from "@/components/fields";

function BulkLockReasonDialog() {
  return (
    <ActionDialog
      title="Lock Selected Accounts"
      abstractModelName="BulkLockAccounts"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
    />
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="status" />
  <BulkAction
    labelName="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
    confirmMessage={({ ids }) => `Lock ${ids.length} selected accounts?`}
  />
  <BulkAction
    type="dialog"
    labelName="Unlock Selected"
    operation="unlockByIds"
    placement="more"
    component={BulkLockReasonDialog}
  />
</ModelTable>
```

内置 Bulk Edit（批量编辑）操作：

- 位置：工具栏 `More` 下拉中的批量操作区
- 行为：支持一次提交编辑多个字段
- 值编辑器：按字段类型渲染（`Boolean`、数值、日期时间、文本/json、选项等）
- 提交 API：`updateByFilter`，其中 `filters = ["id","IN", selectedIds]`，`values = { ...editedFields }`

```tsx
<ModelTable
  modelName="UserAccount"
  bulkEditFields={["status", "email", "phoneNumber", "locked"]} // optional
  excludeFields={["email"]} // optional
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
</ModelTable>
```

若未提供 `bulkEditFields`，Bulk Edit 会使用所有可用元数据字段。
即使提供了 `bulkEditFields`，被排除字段仍会被移除。
内置保留字段始终被排除：
`id`, `createdTime`, `createdId`, `createdBy`, `updatedTime`, `updatedId`, `updatedBy`, `tenantId`。

## SideTreeConfig 说明

- `filterField` 必填，并映射为表格查询过滤字段。
- 若选中多个树节点，表格过滤将变为基于选中 id 的 `OR` 条件。
- 保持 `idKey` 对应值唯一且稳定。
- `disabledKey` 为可选项（无隐式默认字段）。

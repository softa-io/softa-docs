# ModelTable

可组合的数据表格视图，具备：

- 元数据驱动列
- 服务端查询集成
- 工具栏筛选/排序/分组控制
- 可选左侧树筛选面板

## 相关文档

- [对话框组件](./dialog)
- [表单组件](./form)

## 快速开始

```tsx
import {
  UserAccountUnlockActionDialog,
} from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
import { ModelTable } from "@/components/views/table/ModelTable";
import type { QueryParams } from "@/types/params/QueryParams";

export default function UserAccountPage() {
  const initialParams: Partial<QueryParams> = {
    fields: [
      "username",
      "nickname",
      "email",
      "mobile",
      "status",
      "createdTime",
    ],
    orders: [["createdTime", "DESC"]],
  };

  return (
    <ModelTable
      modelName="UserAccount"
      initialParams={initialParams}
    >
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

## Inline Edit

`ModelTable` 支持可选的行级内联编辑。

```tsx
<ModelTable
  modelName="TenantOptionItem"
  inlineEdit
  initialParams={{
    fields: ["sequence", "itemCode", "itemName", "active"],
    orders: [["sequence", "ASC"]],
  }}
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
- 只有元数据中可编辑的字段才会成为内联编辑器；不支持 / 只读列仍保持只读

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
    fields: ["modelName", "fieldName", "labelName", "fieldType"],
    orders: [["modelName", "ASC"]],
  }}
  sideTree={sideTree}
/>
```

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
| `initialParams` | `Partial<QueryParams>` | 否 | - | 初始字段/排序/过滤/分页设置。 |
| `queryOptions` | `UseQueryOptions`（partial） | 否 | - | 表格分页查询的 React Query 可选配置。 |
| `children` | `ReactNode` | 否 | - | 表格操作区内容，使用 `<Action />`（行级）和 `<BulkAction />`（选中集级）。 |
| `toolbarActionsComponent` | `ReactNode \| ComponentType<{ table }>` | 否 | - | 自定义工具栏操作。 |
| `tableProps` | `Omit<TableProps, "children">` | 否 | - | 透传给底层 table 组件的 props。 |
| `className` | `string` | 否 | - | 外层容器 className。 |
| `enableBulkDelete` | `boolean` | 否 | `true` | 启用内置批量删除。 |
| `enableCreate` | `boolean` | 否 | `true` | 启用内置创建按钮。 |
| `enableImport` | `boolean` | 否 | `true` | 启用 More 菜单中的导入项。 |
| `enableExport` | `boolean` | 否 | `true` | 启用 More 菜单中的导出项。 |
| `bulkEditFields` | `string[]` | 否 | - | 可选批量编辑白名单。未提供时内置批量编辑使用所有元数据字段。 |
| `excludeFields` | `string[]` | 否 | - | 可选批量编辑黑名单。除保留字段外，这些字段也会被内置批量编辑排除。 |
| `tabs` | `ModelTableTab[]` | 否 | - | 表头级可选 Tab 过滤。 |
| `defaultTabId` | `string` | 否 | 首个 Tab id，否则 `"all"` | 初始激活 Tab id。 |
| `freezeColumnIndex` | `number` | 否 | `1` | 从左侧开始初始冻结列数。 |
| `sideTree` | `SideTreeConfig` | 否 | - | 左侧树筛选面板配置。 |
| `sideTreeWidth` | `number` | 否 | `280` | 侧树初始宽度。 |
| `sideTreeMinWidth` | `number` | 否 | `220` | 侧树最小宽度。 |
| `sideTreeMaxWidth` | `number` | 否 | `560` | 侧树最大宽度。 |

## `initialParams` 指南

`initialParams` 是 `ModelTable` 的服务端查询初始状态，定义如下：

```ts
type initialParams = Partial<QueryParams>;
```

查询引导默认值：

- `pageNumber = 1`
- `pageSize = 20`
- 其他字段默认 `undefined`

### `initialParams` 字段

| Key | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fields` | `string[]` | `undefined` | 初始查询字段列表，同时作为表格初始字段顺序参考。 |
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
    fields: ["username", "email", "status", "updatedTime"],
    orders: [["updatedTime", "DESC"]],
  }}
/>
```

### 常见示例

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    fields: ["username", "email", "status", "locked", "updatedTime"],
    filters: [["status", "!=", "Deleted"], "AND", ["locked", "=", false]],
    orders: [["updatedTime", "DESC"]],
    pageNumber: 1,
    pageSize: 50,
    effectiveDate: "2026-03-01",
  }}
/>
```

### 进阶示例（`groupBy` / `aggFunctions` / `subQueries`）

```tsx
<ModelTable
  modelName="UserAccount"
  initialParams={{
    fields: ["departmentId", "status"],
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
/>
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
- 通过 `ActionValue<T>`（`T` 或 `(context) => T`）支持动态参数：`disabled`、`visible`、`confirmMessage`、`successMessage`、`errorMessage`、`payload`
- 在表格场景中：
  - `inline`：直接显示在最后一列
  - `more`：显示在最后一列的 More Actions 下拉菜单

表格中的 Action 回调会收到行执行上下文：

```ts
onClick: ({ id, modelName, row }) => void
```

### 行操作：最小示例

```tsx
import { Action } from "@/components/common/Action";
import { toast } from "sonner";

<ModelTable modelName="UserSecurityPolicy">
  <Action
    type="custom"
    labelName="Copy Policy ID"
    placement="more"
    onClick={({ id }) => {
      navigator.clipboard.writeText(String(id));
      toast.success(`Policy ID "${id}" copied.`);
    }}
  />
</ModelTable>
```

### 行操作：完整类型示例

```tsx
import { Action } from "@/components/common/Action";
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
      defaultValues={{ reason: "" }}
    />
  );
}

<ModelTable modelName="UserAccount">
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

<ModelTable modelName="UserAccount">
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

function BulkLockReasonDialog() {
  return (
    <ActionDialog
      title="Lock Selected Accounts"
      abstractModelName="BulkLockAccounts"
      abstractFields={[
        { fieldName: "reason", fieldType: "Text", labelName: "Reason" },
      ]}
      defaultValues={{ reason: "" }}
    />
  );
}

<ModelTable modelName="UserAccount">
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
/>
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

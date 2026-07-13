# ModelTable

可组合的数据表格视图，具备：

- 元数据驱动列
- 服务端查询集成
- 工具栏筛选 / 排序 / 分组控制
- 可选的左侧树筛选面板
- **按 `modelName` 自动权限门控**（见「权限集成」）

## 相关文档

- [ModelCard](./card) — 卡片网格视图（共用工具栏对话框、侧栏与数据钩子）
- [Dialogs](./dialogs)
- [ModelForm](./form)
- [Actions](../actions)
## 快速开始

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/actions/Action";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export default function UserAccountPage() {
  return (
    <ModelTable
      modelName="UserAccount"
      orders={["createdTime", "DESC"]}
    >
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
      <Field fieldName="createdTime" />
      <Action
        label="Lock Account"
        operation="lockAccount"
        placement="more"
        confirmMessage="Lock this user account?"
        successMessage="User account locked."
      />
      <Action
        type="dialog"
        label="Unlock Account"
        operation="unlockAccount"
        placement="more"
        successMessage="User account unlocked."
        component={UserAccountUnlockActionDialog}
      />
    </ModelTable>
  );
}
```

大多数页面无需显式泛型参数。`ModelTable` 默认行类型为：

```ts
type ModelTableRowData = { id: string };
```

## 列声明

`ModelTable` 以 JSX 为先：

- 列来自有序的 `<Field />` 子节点
- 顶层查询 `fields` 从这些声明自动生成
- 顶层 `orders` 是声明默认排序的推荐方式
- `initialParams` 是非列查询参数（如 `filters`、`pageSize`、`groupBy`、`effectiveDate`）的高级逃生舱
- `children` 可混合 `<Field />`、`<Action />` 与 `<BulkAction />`
- 至少需要一条可见 `<Field />` 声明

示例：

```tsx
<ModelTable
  modelName="SysOptionSet"
  orders={["optionSetCode", "ASC"]}
>
  <Field fieldName="optionSetCode" readonly />
  <Field fieldName="name" />
  <Field fieldName="description" />
  <Field fieldName="active" widgetType="CheckBox" />
</ModelTable>
```

推荐排序语法：

```tsx
<ModelTable modelName="UserAccount" orders={["createdTime", "DESC"]}>
  <Field fieldName="username" />
  <Field fieldName="email" />
</ModelTable>
```

多列排序语法：

```tsx
<ModelTable
  modelName="SysField"
  orders={[
    ["modelName", "ASC"],
    ["fieldName", "ASC"],
  ]}
>
  <Field fieldName="modelName" />
  <Field fieldName="fieldName" />
</ModelTable>
```

表格声明说明：

- `Field` 顺序即渲染列顺序
- `widgetType`、`label`、`filters`、`onChange` 与静态 `required` / `readonly` 覆盖在只读单元格与行内编辑器中复用
- `defaultValue` 仅创建时；在表格流程中用于关联行创建与行内编辑器，不用于只读单元格
- 行内编辑字段值与表单使用相同 UI 值契约；例如 `File -> FileInfo | null`、`MultiFile -> FileInfo[]`，`JSON` / `DTO` / `Filters` / `Orders` 保持结构化
- 表格只读单元格刻意不消费 `widgetProps`；v1 使用统一紧凑表格渲染器，而非表单式 widget 变体
- 行内编辑中的关联列（`ManyToOne` / `OneToOne`），`filters` 可使用 `{{ fieldName }}`，在关联查询发出前针对当前编辑行解析（统一模板语法 `{{ expr }}`）
- `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID` 等后端环境 token 原样透传；字面量使用 `{{ 'value' }}` 或 `{{ NOW }}` 等后端 token
- `hidden` 在表格声明中仅支持 `boolean`；`hidden={true}` 移除整列
- 行内编辑支持条件 `required` / `readonly`，不支持条件 `hidden`

详细字段值契约见 [Field & Widget](../fields/fields)。

### 级联列（关联字段）

列可通过 `fieldName` 中的点记法，从关联（`ManyToOne` / `OneToOne`）记录取值：

```tsx
<ModelTable modelName="AppEnv">
  <Field fieldName="name" />
  <Field fieldName="lastActivityId.status" widgetType="StatusIcon" />
  <Field fieldName="ownerId.email" />
</ModelTable>
```

列表查询控制器自动将匹配的 SubQuery 折叠进 `searchPage` —— 展示路径无需手写 `initialParams.subQueries`。级联列始终只读（不支持行内编辑），使用叶子字段元数据（`fieldType` / `widgetType` / `label`）渲染。高级场景下手写 `initialParams.subQueries` 仍与自动收集的合并。

完整参考与语义：[Fields README 中的级联字段路径](../fields/fields#cascaded-field-path-display)。

## 文件与图片列

表格侧文件渲染由 API 值驱动，而非表单 widget 状态：

- `File` 期望 `FileInfo`
- `MultiFile` 期望 `FileInfo[]`
- 图片预览使用 `FileInfo.url`
- 文件链接标签回退顺序：`fileName -> fileId -> "-"`

只读模式行为：

- `File` + `widgetType="Image"` 仅渲染紧凑缩略图；点击打开图片预览对话框
- `MultiFile` + `widgetType="MultiImage"` 渲染带 `+N` 的紧凑缩略图摘要；点击打开画廊式预览对话框
- 普通 `File` 渲染指向 `FileInfo.url` 的可下载文件名链接
- 普通 `MultiFile` 渲染第一个文件名链接加 `+N`
- 图片项无 `url` 时，单元格渲染紧凑占位框，而非破损图片
- 只读单元格保持单行 / 不换行；表格行不会为多文件内容全局展开

这些紧凑只读渲染器也用于关联表（`RelationTable`）只读模式。

## XToMany 只读单元格

`OneToMany` 与 `ManyToMany` 表格单元格在只读模式使用紧凑标签列表渲染器。

只读模式行为：

- 值视为类关联数组，通常为 `ModelReference[]`
- 每项渲染为紧凑标签，优先 `displayName`，回退 `id`
- 若无项可产生标签，单元格回退为计数摘要，如 `3 items`
- 适用于 `ModelTable` 与 `RelationTable` 只读单元格
- `widgetType="TagList"` 不改变只读单元格渲染器；它仅为表单与行内编辑中的 `ManyToMany` 启用可搜索多选编辑器

示例：

```tsx
<ModelTable modelName="UserRole">
  <Field fieldName="name" />
  <Field fieldName="userIds" widgetType="TagList" />
</ModelTable>
```

## 行内编辑

`ModelTable` 支持可选的行级行内编辑。

```tsx
<ModelTable
  modelName="TenantOptionItem"
  inlineEdit
  orders={["sequence", "ASC"]}
>
  <Field fieldName="sequence" readonly />
  <Field fieldName="companyId" />
  <Field
    fieldName="departmentId"
    filters={[["companyId", "=", "{{ companyId }}"]]}
  />
  <Field fieldName="label" readonly={[["active", "=", false]]} />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` 示例：

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="label"
  required={dependsOn(
    ["active"],
    ({ values, scope, rowId }) =>
      scope === "model-table" && Boolean(rowId) && values.active === true,
  )}
/>;
```

行为：

- 默认 `inlineEdit={false}`
- `false`：点击行以只读模式导航到详情页（除非 `enableClick={false}` 完全禁用行点击）
- `true`：点击行激活该行行内编辑（优先于 `enableClick`）
- 可编辑单元格在表格单元格内直接渲染 `Field`
- 活动行显示行级 `Save` / `Cancel`
- 活动行有实际变更前 `Save` 保持禁用
- `Save` 仅通过 update API 提交该行已变更的可编辑字段
- `Cancel` 从最新加载的服务端快照恢复该行
- 当前行 dirty 时切换到另一行会询问是否丢弃
- `required` / `readonly` 支持 `boolean`、`FilterCondition` 与 `dependsOn([...], evaluator)`
- 行内编辑条件针对当前行对象评估，`scope="model-table"`，另有 `rowIndex` 与 `rowId`
- 使用 `{{ fieldName }}` 的关联字段筛选也针对当前行对象评估
- 若关联字段筛选依赖缺失，该行关联查询保持禁用，而非加载未筛选选项
- 仅元数据可编辑且未 effectively readonly 的列成为行内编辑器；不支持的列保持只读
- `File`、`MultiFile`、`Image`、`MultiImage` 参与行内编辑，在活动行内复用普通 `Field` 上传 widget
- `OneToMany` 在表格行内编辑中保持只读
- `ManyToMany` 仅在 `widgetType="TagList"` 时参与表格行内编辑；否则保持只读
- 活动编辑行可能因 file/image widget 垂直增高；非活动行保持固定高度

### 远程 `Field.onChange`

行内编辑也支持声明列上的远程字段联动：

```tsx
<ModelTable modelName="SysOptionSet" inlineEdit>
  <Field fieldName="optionSetCode" onChange={["name", "description"]} />
  <Field fieldName="name" />
  <Field fieldName="description" />
</ModelTable>
```

`ModelTable` 行内编辑中的行为：

- 作用域仅为当前编辑行
- 请求路径为 `POST /<modelName>/onChange/<fieldName>`
- `with: "all"` 序列化当前行，而非整表
- 响应 `values` 仅 patch 当前行
- 响应 `readonly` / `required` 仅作用于当前行，覆盖本地生效状态
- 行保存、取消、reload 或切换到另一行编辑时清除远程规则状态

## Tab 筛选

`ModelTable` 本身没有 `tabs` prop。基于 tab 的筛选切换（或 Board + Table 等同 header 下的混合视图），请用 `<MultiView>` 包裹表格 —— 见 [MultiView](./multi-view)。

## 开发者类型

需要强行类型时可使用 `ModelTableRowWith<TExtra>`：

```ts
type UserAccountRow = ModelTableRowWith<{
  username: string;
  status: string;
  locked: boolean;
}>;
```

## 侧栏（可选）

`ModelTable` 通过 `<SideTree>` / `<SideCard>` / `<SideList>` 子节点支持左侧筛选面板。选择与表格查询 AND 合并。

```tsx
<ModelTable modelName="SysField">
  <SideTree
    modelName="SysModel"
    filterField="modelId"
    labelField="label"
    parentField="parentId"
  />
  <Field fieldName="modelName" />
  ...
</ModelTable>
```

完整参考（props、插槽、自定义面板）见
[Side Panel](../components/side-panel)。

## 列头筛选

每列表头暴露筛选 popover（漏斗图标），产生 `ColumnFilterValue`。列筛选与顶层 `filters`、workspace、侧栏与工具栏筛选进入同一合并管道 —— 见 [筛选优先级](#filter-precedence-and-merge-behavior)。

可用操作符由各列 `fieldType` 推导。单一真相源为 `src/components/views/table/utils/filter-operators.ts`。一元操作符（`IS SET` / `IS NOT SET`）无需值。

`Date` / `DateTime` 列 additionally 在同一 popover 内暴露**快速范围预设**（Today、Last N days、Next N days、This week / month / year 等）与一键 `Is set` / `Is not set`。预设注册表、交互规则、时区处理与持久化语义见 [日期与时间 Widget → 快速范围筛选](../fields/widgets#quick-range-filter-column-header)。

## 字段能力规则

字段是否出现在工具栏的 filter / sort / groupby 选择器，以及列头是否渲染筛选 / 排序图标，由 `src/components/views/table/utils/field-capability.ts` 中同一套 helper 决定。工具栏选择器与列头使用相同 helper，始终一致。

- `isFilterableField` —— 仅排除 `dynamic=true`。所有 `FieldType`（含 `File`、`MultiFile`、`OneToMany`、`ManyToMany`、`JSON`、`Filters`、`Orders`、`DTO`）保留筛选能力，因为 `filter-operators.ts` 为其定义操作符（至少 `IS SET` / `IS NOT SET`）。
- `isSortableField` —— 排除 `dynamic=true`**以及**八种不可排序 `FieldType`：`File`、`MultiFile`、`OneToMany`、`ManyToMany`、`JSON`、`Filters`、`Orders`、`DTO`。
- `isGroupableField` —— 与 `isSortableField` 相同规则。

`dynamic=true` 字段不会出现在 filter / sort / groupby 选择器，列头也不渲染筛选或排序图标。

## 统一活动工具栏状态

工具栏活动状态区可显示并清除：

- 树筛选标签
- 列筛选标签
- 条件筛选预览
- 排序摘要
- 分组摘要

`Clear all` 一并清除所有活动工具栏状态。

## 视图状态持久化

表格会记住**查询状态**，进入记录详情再点 Back —— 或刷新同一 tab —— 会回到原位置，而非重置为默认视图。

持久化查询状态：分页（页码 + 页大小）、排序、group-by、工具栏筛选树、列头筛选、搜索词，以及侧栏（`SideTree` / `SideList` / `SideCard`）选择。状态存于 `sessionStorage`，按 `view kind + modelName + route + 活动 MultiView tab` 作用域，通过共享模块 `src/components/views/shared/view-state/`。

行为：

- 恢复为「挂载时始终开启」：同一 tab 内重新进入同一视图（含从侧边栏）恢复上次查询状态。`Clear all` 重置后，下次访问从头开始。
- `sessionStorage` 在 reload 与同 tab Back/forward 下仍有效，并按浏览器 tab 隔离。关闭 tab 时清除，不共享到新 tab —— 查询状态为临时性，不在 URL 中（列表 URL 保持干净，不是可分享的筛选视图）。
- 行选择不会持久化。
- 列布局（顺序 / 可见性 / 钉住 / 冻结）是 durable 偏好，**尚未**由此机制持久化。
- 侧栏选择持久化*选择来源*（选中 id + filter field + operator + 最小标签），而非推导的筛选条件。恢复时面板重新高亮、查询被筛选、工具栏显示「Filter status」标签 —— 均从该单一来源推导。对 `SideTree`，高亮恢复匹配节点 id；自定义 `filterValueField`（筛选值 ≠ 节点 id）时查询仍正确恢复，树高亮以节点 id 为键。

`ModelBoard`（仅搜索词）与 `ModelCard`（分页 + 排序 + 筛选 + 搜索）共享同一机制。

## 数据新鲜度

恢复*所在位置*只是 Back 导航的一半 —— 在详情页期间数据可能已变（表单保存、动作按钮、服务端级联、其他用户）。两层保持视图新鲜：

- **Stale-while-revalidate 无处不在**：全局查询默认 `staleTime: 0`（`src/providers/query-provider.tsx`），每次挂载 instant 渲染缓存数据 —— 无 skeleton 闪烁 —— 同时后台 refetch 替换为新鲜数据。覆盖表格主查询、侧栏、sidecar 与详情 `getById`；是无法枚举的 invalidation 的安全网。真正静态数据的 hook（元数据、选项集、区号、默认值）自行 pin 更长 `staleTime`。
- **写入时前缀 invalidation**：每条 mutation 路径（表单保存、default / dialog / custom 动作、批量操作、删除）调用 `invalidateModelQueries`，使键以模型名开头的*所有*缓存查询失效 —— 表格页、侧栏、board 计数、sidecar join 与记录缓存同样适用。仍在挂载的视图在写入发生时由此刷新。

## 核心 Props

| Prop               | Type                       | Required | Default | Notes                                                                                                                                      |
| ------------------ | -------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `modelName`        | `string`                   | Yes      | -       | 用于获取元数据 API。                                                                                                                |
| `label`        | `string`                   | No       | -       | 覆盖表格 header 中的页面标题。省略时默认为 `metaModel.label`。                                        |
| `description`      | `string`                   | No       | -       | 覆盖表格 header 中的副标题。省略时默认为 `metaModel.description`。                                        |
| `inlineEdit`       | `boolean`                  | No       | `false` | 启用点击行行内编辑。启用时，活动行可编辑单元格渲染 `Field` 组件，而非导航到详情。      |
| `orders`           | `OrderCondition`           | No       | -       | 推荐默认排序。支持单个元组（`["createdTime", "DESC"]`）或多个元组。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（context）。 |
| `filters`          | `FilterCondition`          | No       | -       | 推荐基础筛选。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（context）。运行时与 workspace、搜索、列、侧栏与工具栏筛选 AND 合并。见 [优先级规则](./multi-view#filter--order-precedence)。 |
| `initialParams`    | `QueryParamsWithoutFields` | No       | -       | 高级初始查询设置（`pageSize`、`groupBy`、`effectiveDate`、`subQueries`、`splitBy`、`aggFunctions`、`summary`）。`filters` / `orders` 优先用顶层 props。 |
| `children`         | `ReactNode`                | No       | -       | 有序 `<Field />` 声明，以及可选 `<Action />`、`<BulkAction />` 与一个侧栏（`<SideTree>`、`<SideCard>` 或 `<SideList>`）。运行时至少需要一条可见 `<Field />`。 |
| `enableBulkDelete` | `boolean`                  | No       | `true`  | 启用内置批量删除入口。                                                                                                         |
| `enableCreate`     | `boolean`                  | No       | `true`  | 启用内置创建按钮。                                                                                                             |
| `enableImport`     | `boolean`                  | No       | `true`  | 在 More 菜单启用内置导入对话框入口。                                                                                          |
| `enableExport`     | `boolean`                  | No       | `true`  | 在 More 菜单启用内置导出对话框入口。                                                                                          |
| `bulkEditFields`   | `string[]`                 | No       | -       | 可选批量编辑白名单。省略时，内置 Bulk Edit 使用全部元数据字段。                                                     |
| `excludeFields`    | `string[]`                 | No       | -       | 可选批量编辑黑名单。始终从内置 Bulk Edit 排除（除保留字段外）。                                     |
| `linkTo`           | `string`                   | No       | -       | 行点击导航的子目录名（单段）。前往 `${pathname}/${linkTo}/${id}?mode=read`。省略则默认 `${pathname}/${id}?mode=read`。 |
| `enableClick`      | `boolean`                  | No       | `true`  | 点击行是否导航到详情页。无详情路由的只读 / 报表表设为 `false`，行不可点击（无 `cursor-pointer`、无导航）。`inlineEdit` 启用时忽略。 |
| `freezeColumnIndex`| `number`                   | No       | `1`     | 左侧冻结的数据列初始数量。启用时选择列仍钉在冻结范围之前。             |

## 内置导入 / 导出

`ModelTable` 在工具栏 `More` 菜单下内置导入与导出对话框。

详细行为见 [ModelTable](./table)，包括：

- 导入 / 导出 tab 与流程
- 导出范围规则
- history-tab 渲染器复用

工具栏级自定义动作仍通过在 `children` 内声明 `<Action placement="toolbar" />`。

## `initialParams` 指南

`initialParams` 是 `ModelTable` 的初始服务端查询状态，遵循：

```ts
type initialParams = QueryParamsWithoutFields;
```

`ModelTable` 不接受顶层 `initialParams.fields`。
表格查询字段列表始终来自声明顺序中的可见 `<Field />` 子节点。

推荐拆分：

- 普通默认排序用顶层 `orders`
- 高级查询关注点（如 `filters`、`pageSize`、`groupBy`、`effectiveDate` 或 `subQueries`）用 `initialParams`
- 同时提供 `orders` 与 `initialParams.orders` 时，顶层 `orders` 优先

`initialParams.filters` 仍是表格查询本身的正常服务端基础筛选。不解析 `{{ expr }}` 引用；该声明式语法仅支持关联字段 `filters`。

查询 bootstrap 默认：

- `pageNumber = 1`
- `pageSize = 20`
- 其余为 `undefined`

### `initialParams` 字段

| Key             | Type                        | Default     | Notes                                                                                      |
| --------------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `filters`       | `FilterCondition`           | `undefined` | 基础筛选条件。作为 base，与 UI 筛选用 `AND` 合并。 |
| `orders`        | `OrderCondition`            | `undefined` | 初始排序。                                                                        |
| `pageNumber`    | `number`                    | `1`         | 初始页码。                                                                       |
| `pageSize`      | `number`                    | `20`        | 初始页大小。                                                                         |
| `aggFunctions`  | `Array<string \| string[]>` | `undefined` | 高级聚合函数（后端支持时）。                               |
| `groupBy`       | `string[]`                  | `undefined` | 初始 group-by 字段。                                                                   |
| `splitBy`       | `string[]`                  | `undefined` | 高级 split/group 维度字段。                                                     |
| `summary`       | `boolean`                   | `undefined` | 是否为查询启用 summary 模式。                                             |
| `effectiveDate` | `string`                    | `undefined` | 生效日期快照（时间旅行式查询）。                                         |
| `subQueries`    | `Record<string, SubQuery>`  | `undefined` | 关联 / 子查询载荷。                                                                |

### 最小示例

```tsx
<ModelTable modelName="UserAccount" orders={["updatedTime", "DESC"]} >
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

### 推荐示例（顶层 `filters` + `orders`）

```tsx
<ModelTable
  modelName="UserAccount"
  filters={[["status", "!=", "Deleted"], "AND", ["locked", "=", false]]}
  orders={["updatedTime", "DESC"]}
  initialParams={{ pageSize: 50, effectiveDate: "2026-03-01" }}
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
  <Field fieldName="updatedTime" />
</ModelTable>
```

`filters` 与 `orders` 放在顶层。`initialParams` 承载其余高级字段。

### 高级示例（`groupBy` / `aggFunctions` / `subQueries`）

```tsx
<ModelTable
  modelName="UserAccount"
  filters={["status", "=", "Active"]}
  initialParams={{
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

### 筛选优先级与合并行为

基础筛选通过**选取**第一个非 undefined 来源解析（此层内不合并）：

```
top-level filters  >  initialParams.filters  >  MultiView.Tab.filters (context)
```

选中的 base 在运行时与所有其他筛选来源**AND 合并**：

- 上述选中的 base 筛选
- workspace 筛选（`useWorkspaceFilter()` —— 安全 / 作用域）
- 侧栏筛选（`SideTree` / `SideCard` / `SideList` 选择）
- 搜索筛选（`["searchName", "CONTAINS", keyword]`）
- 列筛选标签
- 工具栏条件筛选

header 搜索框由模型元数据驱动（`resolveTableSearchConfig`）：placeholder 为 `Search by <label>...`，使用后端实际匹配字段的 `label` —— 模型配置的 `searchName`，回退到 `name` 字段。模型既未声明 `searchName` 也无 `name` 字段时，无可自由文本搜索的内容，搜索框完全隐藏。

合并条件示例：

```ts
[
  ["status", "=", "Active"],
  "AND",
  ["locked", "=", true],
  "AND",
  ["searchName", "CONTAINS", "alice"],
];
```

完整分层模型（含 `MultiView.Tab.filters` 如何交互）见
[Filter & order precedence](./multi-view#filter--order-precedence)。

## 权限集成

`ModelTable` 根据生成的 `MODEL_PERMISSIONS` 查找表，按 `modelName` 自动门控 —— 业务页面无需为标准 CRUD 或声明 `permission` 字段的自定义动作调用 `usePermission`。

仅传递 `modelName` 即可免费门控：

| Built-in control       | Action segment checked  | Effect when denied                              |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| Toolbar "Create"       | `create`                | 隐藏（含 quickAdd）                     |
| Toolbar "Import"       | `import`                | 隐藏                                          |
| Toolbar "Export"       | `export`                | 隐藏                                          |
| Toolbar bulk "Delete"  | `delete`                | 隐藏；若无其他 bulk 动作则自动禁用行选择 |
| Inline edit            | `update`                | 即使 `inlineEdit` prop 为 true 也强制禁用 |

自定义 `<Action permission="…" />` / `<BulkAction permission="…" />` 子节点在渲染前过滤 —— 无闪烁、不安装 click handler。传递 manifest 动作段（`"transfer"`、`"initiate-signing"` 或任意标准 CRUD 名）—— `useActionPermission(modelName, permission)` 内部查找。

状态语义（有意设计的三态）：

- **Granted** → 控件 / 动作保持可见（业务 `enable*` 与 `hidden` 仍适用）。
- **Denied** → 控件 / 动作隐藏；若依赖缺失权限，行选择 / 行内编辑也会一并失效。
- **Unmanaged** → `(modelName, action)` 不在 `MODEL_PERMISSIONS`，因模型跨页面歧义（见 `pnpm gen:permissions` 警告）或未声明。自动门控无意见，由页面自身 `enableCreate=` / `hidden=` / `usePermission` 决定。共享模型如 `EmpDocument` / `LeaveRequest` 的页面可用此逃生舱。

业务 props 设为 `false` 时仍优先 —— 显式 `enableCreate={false}` 的页面对 SUPER_ADMIN 也隐藏 Create。SUPER_ADMIN 短路权限检查本身（每个动作返回 `Granted`），但不覆盖显式业务 `false`。

示例 —— 带一个自定义动作的自动门控列表：

```tsx
<ModelTable modelName="Employee">
  <Field fieldName="fullName" />
  <Action
    type="custom"
    label="Transfer"
    placement="more"
    permission="transfer"        {/* 由 Employee.transfer 门控 */}
    onClick={openTransferDialog}
  />
</ModelTable>
```

工具栏 Create / Import / Export / bulk Delete 完全根据 `modelName="Employee"` 自动显示 / 隐藏；"Transfer" 在用户缺少 `Employee.transfer` 时自动隐藏。

## Actions

通用 `Action` / `BulkAction` API 现位于 [Actions](../actions)。
本节仅保留 `ModelTable` 容器规则与完整表格级示例。

规则：

- `<Action placement="toolbar" />` 渲染在表格工具栏自定义动作区
- `<Action placement="inline" />` 渲染在最后一列行内动作区
- `<Action placement="more" />` 渲染在最后一列 More Actions 下拉
- 活动行内编辑行从当前草稿行值解析动作 context
- 活动行 dirty 时点击行动作会询问是否丢弃草稿
- `BulkAction` 与选择作用域绑定，仅选中行时显示
- `BulkAction placement="toolbar"` 出现在 `Columns` 与 `More` 之间
- `BulkAction placement="more"` 出现在工具栏 More 下拉 bulk 区
- 内置 `Delete selected` 共享该 bulk 区

表格中动作回调接收行执行 context：

```ts
onClick: ({ id, modelName, scope, mode, isDirty, values, row }) => void
```

完整示例：

```tsx
import { Action } from "@/components/actions/Action";
import { BulkAction } from "@/components/actions/BulkAction";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { ModelTable } from "@/components/views/table/ModelTable";
import { ExternalLink, Lock, Pencil, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" label="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />

  <Action
    type="custom"
    label="Refresh"
    placement="toolbar"
    onClick={() => console.log("refresh")}
  />

  <Action
    type="custom"
    label="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  <Action
    label="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
    successMessage="Account locked."
  />

  <Action
    type="dialog"
    label="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
    successMessage="Account unlocked."
  />

  <Action
    type="link"
    label="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
  />

  <BulkAction
    label="Lock Selected"
    operation="lockByIds"
    placement="toolbar"
    confirmMessage={({ ids }) => `Lock ${ids.length} selected accounts?`}
  />

  <BulkAction
    type="dialog"
    label="Unlock Selected"
    operation="unlockByIds"
    placement="more"
    component={UnlockDialog}
  />
</ModelTable>;
```

内置 Bulk Edit 动作：

- 位置：工具栏 `More` 下拉 bulk 区
- 行为：一次提交支持添加多个字段编辑
- 值编辑器：按字段类型渲染（`Boolean`、数值、日期 / 时间、text/json、option 等）
- 提交 API：`updateByFilter`，`filters = ["id","IN", selectedIds]`，`values = { ...editedFields }`

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

未提供 `bulkEditFields` 时，Bulk Edit 使用全部可用元数据字段。
即使提供 `bulkEditFields`，排除字段仍会被移除。
内置保留字段始终排除：
`id`、`createdTime`、`createdId`、`createdBy`、`updatedTime`、`updatedId`、`updatedBy`、`tenantId`。

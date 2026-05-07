# ModelTable

可组合的数据表格视图，具备：

- 元数据驱动列
- 服务端查询集成
- 工具栏筛选 / 排序 / 分组控制
- 可选的左侧树筛选面板

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
        labelName="Lock Account"
        operation="lockAccount"
        placement="more"
        confirmMessage="Lock this user account?"
        successMessage="User account locked."
      />
      <Action
        type="dialog"
        labelName="Unlock Account"
        operation="unlockAccount"
        placement="more"
        successMessage="User account unlocked."
        component={UserAccountUnlockActionDialog}
      />
    </ModelTable>
  );
}
```

大多数页面不需要显式泛型参数。`ModelTable` 默认的行类型是：

```ts
type ModelTableRowData = { id: string };
```

## 列声明

`ModelTable` 采用 JSX-first：

- 列来自按顺序声明的 `<Field />` 子节点
- 顶层查询 `fields` 会根据这些声明自动生成
- 顶层 `orders` 是声明默认排序的推荐方式
- `initialParams` 是用于列以外查询参数的高级入口，例如 `filters`、`pageSize`、`groupBy`、`effectiveDate`
- `children` 可以混合 `<Field />`、`<Action />` 和 `<BulkAction />`
- 运行时至少需要一个可见的 `<Field />` 声明

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

推荐的排序写法：

```tsx
<ModelTable modelName="UserAccount" orders={["createdTime", "DESC"]}>
  <Field fieldName="username" />
  <Field fieldName="email" />
</ModelTable>
```

多字段排序写法：

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

- `Field` 顺序就是列渲染顺序
- `widgetType`、`labelName`、`filters`、`onChange`、静态 `required` / `readonly` 覆盖会同时复用于只读单元格和内联编辑器
- `defaultValue` 仅作用于创建态；在表格流程中，它用于关联行创建和内联编辑器，不作用于只读单元格
- 内联编辑字段值与表单使用相同的 UI 值契约；例如 `File -> FileInfo | null`、`MultiFile -> FileInfo[]`，以及 `JSON` / `DTO` / `Filters` / `Orders` 仍保持结构化
- 表格只读单元格有意不消费 `widgetProps`；v1 使用统一紧凑表格渲染器，而不是复用表单风格 widget 变体
- 对于内联编辑中的关联列（`ManyToOne` / `OneToOne`），`filters` 可使用 `{{ fieldName }}`，并会在发起关联查询前基于当前编辑行解析（统一模板语法 `{{ expr }}`）
- 后端环境 token，例如 `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID`，会原样透传；字面量可使用 `{{ 'value' }}` 或后端 token 如 `{{ NOW }}`
- 在表格声明中，`hidden` 只支持 `boolean`；`hidden={true}` 会移除整列
- 条件 `required` / `readonly` 支持内联编辑；条件 `hidden` 不支持

更详细的字段值契约请见 [Field & Widget](../fields/fields)。

### 级联列（关联字段）

列可通过在 `fieldName` 中使用点号记法，从关联（`ManyToOne` / `OneToOne`）记录拉取值：

```tsx
<ModelTable modelName="AppEnv">
  <Field fieldName="name" />
  <Field fieldName="lastDeploymentId.deployStatus" widgetType="StatusIcon" />
  <Field fieldName="ownerId.email" />
</ModelTable>
```

列表查询控制器会自动将匹配的 SubQuery 折叠进 `searchPage` —— 展示的级联路径无需手搓 `initialParams.subQueries`。级联列始终只读（不支持内联编辑），渲染使用叶子字段的元数据（`fieldType` / `widgetType` / `labelName`）。手写的 `initialParams.subQueries` 仍会与自动收集的结果合并，供进阶场景使用。

完整语义见字段 README 中的 [级联字段路径](../fields/fields#cascaded-field-path-display)。

## 文件与图片列

表格侧文件渲染由 API 值驱动，而不是由表单 widget 状态驱动：

- `File` 期待值为 `FileInfo`
- `MultiFile` 期待值为 `FileInfo[]`
- 图片预览使用 `FileInfo.url`
- 文件链接文案按 `fileName -> fileId -> "-"` 依次回退

只读行为：

- `File` + `widgetType="Image"` 仅渲染紧凑缩略图；点击后打开图片预览对话框
- `MultiFile` + `widgetType="MultiImage"` 渲染紧凑的缩略图摘要并显示 `+N`；点击后打开画廊式预览对话框
- 普通 `File` 渲染为指向 `FileInfo.url` 的可下载文件名链接
- 普通 `MultiFile` 渲染第一个文件名链接，并附带 `+N`
- 如果图片项没有 `url`，单元格会显示紧凑占位框，而不是损坏图片
- 只读单元格始终保持单行 / 不换行；表格行不会因为多文件内容整体撑高

这些紧凑只读渲染器同样会用于关联表格（`RelationTable`）的只读模式。

## XToMany 只读单元格

`OneToMany` 和 `ManyToMany` 的表格单元格在只读模式下使用紧凑标签列表渲染器。

只读行为：

- 值会被视作关联数组，通常是 `ModelReference[]`
- 每一项优先使用 `displayName` 渲染紧凑标签，回退到 `id`
- 如果没有任何项能生成标签，单元格会回退为数量摘要，例如 `3 items`
- 该行为适用于 `ModelTable` 和 `RelationTable` 的只读单元格
- `widgetType="TagList"` 不会改变只读单元格渲染器；它只会在表单和内联编辑中为 `ManyToMany` 启用可搜索多选编辑器

示例：

```tsx
<ModelTable modelName="UserRole">
  <Field fieldName="name" />
  <Field fieldName="userIds" widgetType="TagList" />
</ModelTable>
```

## 内联编辑

`ModelTable` 支持可选的行级内联编辑。

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
  <Field fieldName="itemName" readonly={[["active", "=", false]]} />
  <Field fieldName="active" />
</ModelTable>
```

`dependsOn()` 示例：

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(
    ["active"],
    ({ values, scope, rowId }) =>
      scope === "model-table" && Boolean(rowId) && values.active === true,
  )}
/>;
```

行为：

- 默认值是 `inlineEdit={false}`
- `false`：点击行会导航到详情页只读模式
- `true`：点击行会激活该行内联编辑
- 可编辑单元格会在表格单元格内直接渲染 `Field`
- 活跃行会显示行级 `Save` / `Cancel`
- 只有当前行存在真实变更时，`Save` 才会可点
- `Save` 只会提交该行发生变化的可编辑字段，并通过 update API 保存
- `Cancel` 会用最新加载的服务端快照恢复当前行
- 若当前行是 dirty 状态，切换到另一行前会询问是否丢弃修改
- `required` / `readonly` 支持 `boolean`、`FilterCondition`、`dependsOn([...], evaluator)`
- 内联编辑条件基于当前行对象求值，`scope="model-table"`，并额外提供 `rowIndex` 与 `rowId`
- 使用 `{{ fieldName }}` 的关联字段过滤条件也基于当前行对象求值
- 如果关联过滤依赖缺失，则该行的关联查询会保持禁用，而不是加载未过滤选项
- 只有元数据中可编辑且在当前有效状态下不是只读的列，才会成为内联编辑器；不支持的列保持只读
- `File`、`MultiFile`、`Image` 和 `MultiImage` 支持内联编辑，并在活跃行中复用普通 `Field` 上传 widget
- `OneToMany` 在表格内联编辑中保持只读
- `ManyToMany` 只有在 `widgetType="TagList"` 时才参与表格内联编辑；否则保持只读
- 活跃编辑行可能因文件 / 图片 widget 而变高；非活跃行仍保持固定高度

### 远程 `Field.onChange`

内联编辑同样支持对声明列使用远程字段联动：

```tsx
<ModelTable modelName="SysOptionSet" inlineEdit>
  <Field fieldName="optionSetCode" onChange={["name", "description"]} />
  <Field fieldName="name" />
  <Field fieldName="description" />
</ModelTable>
```

`ModelTable` 内联编辑中的行为：

- 作用域仅限当前编辑行
- 请求路径为 `POST /<modelName>/onChange/<fieldName>`
- `with: "all"` 序列化的是当前行，而不是整张表
- 响应 `values` 只 patch 当前行
- 响应 `readonly` / `required` 只作用于当前行，并覆盖本地有效状态
- 当行被保存、取消、重新加载或切换到其他行编辑时，远程规则状态会被清空

## 标签页筛选

`ModelTable` 本身没有 `tabs` prop。若需基于标签切换筛选（或在同一标题下混合多种视图，如看板 + 表格），请用 `<MultiView>` 包裹表格 —— 参见 [MultiView](./multi-view)。

## 开发者类型

当你需要更强的行类型约束时，可以使用 `ModelTableRowWith<TExtra>`：

```ts
type UserAccountRow = ModelTableRowWith<{
  username: string;
  status: string;
  locked: boolean;
}>;
```

## 侧栏（可选）

`ModelTable` 支持通过子节点 `<SideTree>` / `<SideCard>` / `<SideList>` 在左侧展示筛选面板。侧栏选择会与表格查询按 `AND` 合并。

```tsx
<ModelTable modelName="SysField">
  <SideTree
    modelName="SysModel"
    filterField="modelId"
    labelField="labelName"
    parentField="parentId"
  />
  <Field fieldName="modelName" />
  ...
</ModelTable>
```

完整的 API（props、插槽、自定义面板）见 [侧栏](../components/side-panel)。

## 列头筛选

每列表头提供筛选浮层（漏斗图标），产生 `ColumnFilterValue`。列筛选与顶层 `filters`、工作区、侧栏及工具栏筛选进入同一合并管线——见 [筛选优先级与合并行为](#筛选优先级与合并行为)。

可用操作符由每列的 `fieldType` 推导。单一事实来源为 `src/components/views/table/utils/filter-operators.ts`。一元操作符（`IS SET` / `IS NOT SET`）无需填写取值。

`Date` / `DateTime` 列还会在相同浮层中额外提供 **快捷日期范围预设**（Today、Last N days、Next N days、本周 / 本月 / 本年等）以及一键 `Is set` / `Is not set` 入口。预设清单、交互规则、时区处理与持久化语义见 [日期与时间类 Widget → 快捷范围筛选（列头）](../fields/widgets#quick-range-filter-column-header)。

## 统一的工具栏激活状态

工具栏激活状态区域可以展示并清除：

- 树筛选标签
- 列过滤标签
- 条件过滤预览
- 排序摘要
- 分组摘要

`Clear all` 会一次性清除所有激活中的工具栏状态。

## 核心 Props

| Prop                | 类型                       | 必填 | 默认值  | 说明 |
| ------------------- | -------------------------- | ---- | ------- | ---- |
| `modelName`         | `string`                   | 是   | -       | 用于拉取元数据 API。 |
| `labelName`         | `string`                   | 否   | -       | 覆盖表格头部主标题。省略时默认 `metaModel.labelName`。 |
| `description`       | `string`                   | 否   | -       | 覆盖表格头部副标题。省略时默认 `metaModel.description`。 |
| `inlineEdit`        | `boolean`                  | 否   | `false` | 启用按行点击的内联编辑模式。启用后，活跃行的可编辑单元格会渲染 `Field`，而不是跳转详情页。 |
| `orders`            | `OrderCondition`           | 否   | -       | 推荐的默认排序。支持单个元组（`["createdTime", "DESC"]`）或多个元组。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。 |
| `filters`           | `FilterCondition`          | 否   | -       | 推荐的基础筛选。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。运行时会与工作区、搜索、列、侧栏及工具栏筛选按 `AND` 合并。参见 [筛选与排序优先级](./multi-view#filter--order-precedence)。 |
| `initialParams`     | `QueryParamsWithoutFields` | 否   | -       | 高级初始查询（`pageSize`、`groupBy`、`effectiveDate`、`subQueries`、`splitBy`、`aggFunctions`、`summary` 等）。`filters` / `orders` 建议使用顶层 props。 |
| `children`          | `ReactNode`                | 否   | -       | 按顺序的 `<Field />` 声明，以及可选 `<Action />`、`<BulkAction />`，和至多一个侧栏（`<SideTree>` / `<SideCard>` / `<SideList>`）。运行时至少需要一个可见 `<Field />`。 |
| `enableBulkDelete`  | `boolean`                  | 否   | `true`  | 是否启用内置批量删除入口。 |
| `enableCreate`      | `boolean`                  | 否   | `true`  | 是否启用内置新建按钮。 |
| `enableImport`      | `boolean`                  | 否   | `true`  | 是否在 More 菜单中启用内置导入对话框入口。 |
| `enableExport`      | `boolean`                  | 否   | `true`  | 是否在 More 菜单中启用内置导出对话框入口。 |
| `bulkEditFields`    | `string[]`                 | 否   | -       | 可选的批量编辑字段白名单。若省略，内置 Bulk Edit 使用全部元数据字段。 |
| `excludeFields`     | `string[]`                 | 否   | -       | 可选的批量编辑字段黑名单。内置 Bulk Edit 会始终排除这些字段（以及保留字段）。 |
| `linkTo`            | `string`                   | 否   | -       | 行点击导航用的单一路径段（子目录名）。跳转到 `${pathname}/${linkTo}/${id}?mode=read`。省略则为默认 `${pathname}/${id}?mode=read`。 |
| `freezeColumnIndex` | `number`                   | 否   | `1`     | 初始左侧冻结的数据列数量。启用选择列时，它会固定在冻结区之前。 |

## 内置导入 / 导出

`ModelTable` 在工具栏 `More` 菜单下内置导入和导出对话框。

更详细的行为说明见 [ModelTable](./table)，包括：

- 导入 / 导出标签页与流程
- 导出范围规则
- 历史标签页的渲染器复用

工具栏级自定义动作依然通过 `children` 中的 `<Action placement="toolbar" />` 声明。

## `initialParams` 指南

`initialParams` 是 `ModelTable` 的初始服务端查询状态，类型为：

```ts
type initialParams = QueryParamsWithoutFields;
```

`ModelTable` 不接受顶层 `initialParams.fields`。
表格查询字段列表始终来自可见 `<Field />` 子节点的声明顺序。

推荐分工：

- 常规默认排序使用顶层 `orders`
- `initialParams` 用于 `filters`、`pageSize`、`groupBy`、`effectiveDate`、`subQueries` 等高级查询关注点
- 如果同时传入 `orders` 和 `initialParams.orders`，则顶层 `orders` 胜出

`initialParams.filters` 仍然是表格查询本身的服务端基础过滤条件。它不会解析 `{{ expr }}` 引用；这种声明式语法仅支持关联字段 `filters`。

查询初始化默认值：

- `pageNumber = 1`
- `pageSize = 20`
- 其他字段为 `undefined`

### `initialParams` 字段

| Key             | 类型                        | 默认值      | 说明 |
| --------------- | --------------------------- | ----------- | ---- |
| `filters`       | `FilterCondition`           | `undefined` | 基础过滤条件。它会作为 base filter，并与 UI 过滤条件通过 `AND` 合并。 |
| `orders`        | `OrderCondition`            | `undefined` | 初始排序。 |
| `pageNumber`    | `number`                    | `1`         | 初始页码。 |
| `pageSize`      | `number`                    | `20`        | 初始页大小。 |
| `aggFunctions`  | `Array<string \| string[]>` | `undefined` | 高级聚合函数（后端支持时使用）。 |
| `groupBy`       | `string[]`                  | `undefined` | 初始分组字段。 |
| `splitBy`       | `string[]`                  | `undefined` | 高级拆分 / 分组维度字段。 |
| `summary`       | `boolean`                   | `undefined` | 是否启用 summary 模式。 |
| `effectiveDate` | `string`                    | `undefined` | 有效日期快照（类似 time-travel 查询）。 |
| `subQueries`    | `Record<string, SubQuery>`  | `undefined` | 关联 / 子查询 payload。 |

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

`filters` 与 `orders` 写在顶层；`initialParams` 承载其余高级字段。

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

基础筛选通过**按顺序选取**第一个非 `undefined` 的来源来确定（该层内部不做合并）：

```
顶层 filters  >  initialParams.filters  >  MultiView.Tab.filters（上下文）
```

确定后的基础筛选再在运行时被**与**以下所有来源 **AND 合并**：

- 上述选中的基础筛选
- 工作区筛选（`useWorkspaceFilter()` — 安全 / 作用域）
- 侧栏筛选（`SideTree` / `SideCard` / `SideList` 选择）
- 搜索筛选（`["searchName", "CONTAINS", keyword]`）
- 列过滤标签
- 工具栏条件筛选

合并后的条件示例：

```ts
[
  ["status", "=", "Active"],
  "AND",
  ["locked", "=", true],
  "AND",
  ["searchName", "CONTAINS", "alice"],
];
```

完整分层模型（含 `MultiView.Tab.filters` 如何参与）见 [筛选与排序优先级](./multi-view#filter--order-precedence)。

## 动作

通用 `Action` / `BulkAction` API 现在统一维护在 [Actions](../actions)。
本节只保留 `ModelTable` 容器规则和完整表格示例。

规则：

- `<Action placement="toolbar" />` 会渲染到表格工具栏自定义动作区域
- `<Action placement="inline" />` 会渲染到最后一列的行内动作区域
- `<Action placement="more" />` 会渲染到最后一列的 More Actions 下拉菜单
- 活跃的内联编辑行会从当前草稿行值中解析动作上下文
- 当活跃行处于 dirty 状态时，点击行动作会先询问是否丢弃草稿
- `BulkAction` 作用于选中集，并且只有在存在选中行时才显示
- `BulkAction placement="toolbar"` 会出现在 `Columns` 与 `More` 之间
- `BulkAction placement="more"` 会出现在工具栏 More 下拉菜单的批量动作分组
- 内置 `Delete selected` 与该批量分组共享位置

表格中的动作回调会收到行级执行上下文：

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
      <Field fieldName="reason" labelName="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelTable modelName="UserAccount">
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />

  <Action
    type="custom"
    labelName="Refresh"
    placement="toolbar"
    onClick={() => console.log("refresh")}
  />

  <Action
    type="custom"
    labelName="Quick Edit"
    placement="inline"
    icon={Pencil}
    onClick={({ id }) => {
      console.log("quick edit:", id);
    }}
  />

  <Action
    labelName="Lock Account"
    placement="more"
    icon={Lock}
    operation="lockAccount"
    confirmMessage="Lock this account?"
    successMessage="Account locked."
  />

  <Action
    type="dialog"
    labelName="Unlock Account"
    placement="more"
    icon={ShieldCheck}
    operation="unlockAccount"
    component={UnlockDialog}
    successMessage="Account unlocked."
  />

  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id }) => `/user/user-account/${id}/audit`}
  />

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
    component={UnlockDialog}
  />
</ModelTable>;
```

内置 Bulk Edit 动作：

- 位置：工具栏 More 下拉菜单的批量分组
- 行为：支持一次提交编辑多个字段
- 值编辑器：按字段类型渲染（`Boolean`、数值、日期 / 时间、文本 / JSON、选项等）
- 提交 API：`updateByFilter`，其中 `filters = ["id","IN", selectedIds]`，`values = { ...editedFields }`

```tsx
<ModelTable
  modelName="UserAccount"
  bulkEditFields={["status", "email", "phoneNumber", "locked"]} // 可选
  excludeFields={["email"]} // 可选
>
  <Field fieldName="username" />
  <Field fieldName="email" />
  <Field fieldName="status" />
  <Field fieldName="locked" />
</ModelTable>
```

如果没有提供 `bulkEditFields`，Bulk Edit 会使用所有可用元数据字段。
即使提供了 `bulkEditFields`，`excludeFields` 里的字段仍然会被移除。
这些内置保留字段始终会被排除：
`id`、`createdTime`、`createdId`、`createdBy`、`updatedTime`、`updatedId`、`updatedBy`、`tenantId`。

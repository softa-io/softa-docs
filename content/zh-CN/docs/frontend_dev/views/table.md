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
- [ListToolbar](../components/list-toolbar) — 工具栏这一行的布局与固定筛选的药丸，不是 ModelTable 的列表也用它
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
- `children` 可混合 `<Field />`、`<Action />`、`<BulkAction />` 与 `<PinnedFilter />`（见 [固定筛选](#固定筛选)）
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
- `false`：每行是指向其只读详情页的链接，或指向 `rowHref` 给出的地址（见 [行链接](#行链接)）；`enableClick={false}` 时行不响应点击，给出 `onRowClick` 时改为回调页面
- `true`：点击行激活该行行内编辑，行不是链接（优先于 `rowHref`、`onRowClick` 与 `enableClick`）
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

## 固定筛选

列表始终要按它读取的筛选 —— 我的待办上的申请类型与提交人、报表的天数窗口或期间 —— 声明为表格的 `<PinnedFilter>` 子节点，显示为工具栏里、搜索框之后的药丸：一个按钮里是筛选名和当前值，点开就是控件。它是侧栏在工具栏里的对应物：表格把它的值和列表其余查询状态放在一起，把它带来的条件 AND 合并进查询，按 tab 记住，并随 Clear all 复位。

```tsx
import { PinnedFilter } from "@/components/views/table/pinned-filter";

<ModelTable modelName="FlowApprovalTask" dataSource={source}>
  <PinnedFilter fieldName="flowId" label="Type" control={FlowTypeSelect} defaultValue={null} />
  <PinnedFilter fieldName="initiatorId" label="Submitter" control={SubmitterPicker} defaultValue={null} />
  <Field fieldName="instanceTitle" label="Request" />
</ModelTable>

// 不对应某个字段的筛选给自己起 id，并说明它的值给列表带来什么条件。
<ModelTable modelName="BirthdayCountdown" filters={["status", "=", "Active"]}>
  <PinnedFilter id="days" label="Days Until Birthday" control={DaysWithinFilter} defaultValue={30} toFilter={buildBirthMonthDayFilter} />
  <Field fieldName="fullName" />
</ModelTable>
```

- `control` 是取值控件，一个接收 `PinnedFilterControlProps<TValue>` 的组件：`value`、`onChange`、`label`、`options`，以及给药丸用的 `active` 和 `onReset`。值的类型从它读出，而不是从 `defaultValue`。控件用 `src/components/views/shared/list-toolbar/` 里的药丸画出自己（见 [ListToolbar](../components/list-toolbar)）—— `PinnedFilterPopover`（要勾选的项、要挑的日期 —— 弹层里放控件）、`PinnedFilterSelect`（几个值里选一个，子节点是 `SelectItem`）或 `PinnedFilterSearch`（搜索后选一条记录，列表只在弹层打开时挂载，所以只在那时搜索）—— 传入 `label`、`active`、`onReset` 和值在药丸上的读法（`summary`："All types"、"2026-01-01 – 2026-03-31"）。日期范围不必自己写控件：用同一目录的 `DateRangeFilter`，配 `toFilter={(range) => dateRangeCondition("field", range)}`。`options` 从声明原样传入，用于页面给下拉列表的选项（报表列出的证件类型）。
- `toFilter(value)` 是某个值给列表带来的条件，没有条件时返回 null / undefined。不给时，筛选把 `fieldName` 与值比较：单个值用 `=`，值的列表用 `IN`，引用（`{ id, displayName }`）比较其 id，空值（null、`""`、`[]`）不带条件。不对应字段的筛选给出 `id` 和 `toFilter`；既无 `fieldName` 也无 `id`、无字段又无 `toFilter`、两个筛选同 id，都会在表格渲染时被拒绝。
- `defaultValue` 是列表开始时的值。值不等于默认值的药丸会高亮，旁边有一个 × 把它恢复为默认值；Clear all 把所有药丸都恢复。选过的值以 JSON 存进该 tab 记住的视图（快照上的 `pinnedFilters`，见 [视图状态持久化](#视图状态持久化)），因此从记录返回、切换 tab 或刷新后，列表仍按离开时的筛选读取。从未动过或已恢复的筛选每次都读默认值，所以随日期变化的默认值（本月）会跟着变；记住的值与默认值不是同一种（默认是范围、记住的是文本）时，说明来自旧版页面，会被丢弃。
- 这些条件像其他筛选一样并入查询（见 [筛选优先级与合并行为](#筛选优先级与合并行为)）：改值后列表从第一页重新读取，数据源的 `fetch` 在 `filters` 里收到它们，导出也带上。它们不生成标签 —— 药丸自己显示着值 —— 数据源的 `queryFields` 也不限制它们：它们是页面的声明，不是用户在通用控件里挑的字段。
- 用 × 或 Clear all 恢复某个筛选时，会重新绘制它的控件，控件自己的草稿（自定义天数、尚未有效的日期范围）也一并重来。保存草稿的控件在挂载时从 `value` 取初值即可，无需别的处理。
- 依赖某个固定筛选的单元格用 `usePinnedFilterValue(id)` 读它的值：名册报表的离职日期，在工具栏上选的期间到达之前保持空白。
- 工具栏这一行是一个 `ListToolbar`，所以每个表格放不下时都换行而不是挤压，任何东西都不会重叠：搜索框和药丸保持自身宽度；按钮 —— 表格自己的和页面的（Create、`<Action placement="toolbar">`、选中行时的批量操作）—— 放不进同一行时整组换到下一行并靠右；一行连两组按钮都放不下时，两组再各占一行。有固定筛选的表格还会在工具栏宽度小于 64rem 时（工具栏上的 container query，`collapseLabels`）让表格自己的按钮（Filter、Sort、Group、Columns、More）只显示图标，无障碍名称和悬停提示仍在，More 保留选中数；页面的按钮始终保留文字。所以药丸和按钮都多时，会是一行筛选、下面一行按钮；在较窄的屏幕上选中行，按钮也可能换到第二行（My Tasks 在 1440px 下出现批量操作时）。没有固定筛选的表格按钮保留文字，放不下时更早换到第二行。

在用的控件：`FlowTypeSelect` 与 `SubmitterPicker`（`src/app/flow/approval-inbox/components/approval-list-filters.tsx`），`FlowDesignPicker`、`FlowStatusSelect`、`EmployeePicker` 与 `DepartmentFilter`（`src/app/flow/flow-instance/components/monitor-filters.tsx`），`DaysWithinFilter`、`DocumentTypeFilter` 与 `PeriodPicker`（`src/app/corehr/report/components/`），以及共用的 `DateRangeFilter`（PCP 报表、Flow Instances）。

## 列头筛选

每列表头暴露筛选 popover（漏斗图标），产生 `ColumnFilterValue`。列筛选与顶层 `filters`、workspace、侧栏与工具栏筛选进入同一合并管道 —— 见 [筛选优先级](#filter-precedence-and-merge-behavior)。

可用操作符由各列 `fieldType` 推导。单一真相源为 `src/components/views/table/utils/filter-operators.ts`。一元操作符（`IS SET` / `IS NOT SET`）无需值。

`Date` / `DateTime` 列 additionally 在同一 popover 内暴露**快速范围预设**（Today、Last N days、Next N days、This week / month / year 等）与一键 `Is set` / `Is not set`。预设注册表、交互规则、时区处理与持久化语义见 [日期与时间 Widget → 快速范围筛选](../fields/widgets#quick-range-filter-column-header)。

## 字段能力规则

字段是否出现在工具栏的 filter / sort / groupby 选择器，以及列头是否渲染筛选 / 排序图标，由 `src/components/views/table/utils/field-capability.ts` 中同一套 helper 决定。工具栏选择器与列头使用相同 helper，始终一致。

- `isFilterableField` —— 排除 `dynamic=true`，级联字段除外（`cascadedField = "deptId.companyId"`）：条件直接写级联字段名时，后端 `WhereBuilder` 把它改写成路径并连表。其余 `FieldType`（含 `File`、`MultiFile`、`JSON`、`Filters`、`Orders`、`DTO`）保留筛选能力，因为 `filter-operators.ts` 为其定义操作符（至少 `IS SET` / `IS NOT SET`）。
- `isFilterablePathLeaf` —— 经关联走到的字段（`employeeId.departmentId` 的 `departmentId`）必须是存储字段：后端连到关联记录、比较这个字段的列，只在条件直接写级联字段名时才改写成路径，路径末端的级联字段跑不了。一对多/多对多也是 dynamic，同样排除。所有能展开关联的条件选择器（列表的 Filter 对话框、角色数据范围、`Filters` 构建器）都用它判断路径末端。
- `isSortableField` —— 排除 `dynamic=true`（级联字段也排除）**以及**八种不可排序 `FieldType`：`File`、`MultiFile`、`OneToMany`、`ManyToMany`、`JSON`、`Filters`、`Orders`、`DTO`。
- `isGroupableField` —— 与 `isSortableField` 相同规则。

不能筛选的 `dynamic` 字段不会出现在 filter 选择器，`dynamic` 字段都不出现在 sort / groupby 选择器；列头按同样的规则渲染筛选或排序图标。

工具栏的 Filter 对话框还能展开列表模型的多对一、一对一关联，下一层的字段以点路径列出（`hooks/useRelationFilterFields.ts` 的 `useListFilterFields`）：请假单可以按员工的部门筛选（`employeeId.departmentId`），员工可以按档案的状态筛选（`employeeProfileId.status`）。关联在点开、开始搜索或已有规则用到它时才读取元数据。经关联走到的字段要能结束路径（`isFilterablePathLeaf`）、能作为列显示（`isColumnCandidateField`），并且是调用者能看到的字段——后端对调用者看不到的字段，条件一行都不匹配；一对一子表还去掉它指回列表模型的引用和审计字段，与 Columns 对话框一致。规则存为点路径，后端连表；经关联的条件受调用者在关联模型上的行范围和敏感字段授权约束，筛选不会回答调用者读不到的行或字段的问题。活动筛选摘要同样按标签显示这类规则，只读取规则用到的关联。由数据源（`queryFields`）应答的列表不展开关联。卡片视图的工具栏提供同样的字段和关联。

`FilterDialog` 自己编辑草稿（`utils/filter-tree.ts` 的 `updateFilterNode` / `removeFilterNode`，删到最后一条规则时留一条空规则，不会把筛选删空），调用方只提供怎样新建规则和分组。标题下面说明筛选的作用，有关联分组时还说明关联可以展开；能选的字段与列表不同的调用方传 `description`：薪资组的适用范围（只能用薪资分组依据的字段）、流程规则（经关联最多读两层、在流程启动时读值；数据变化触发器只读变化记录自身的字段）。

## 统一活动工具栏状态

工具栏下方这一行显示用户如何收窄、排序或分组了列表，每项都能撤销：

- 树筛选标签
- 列筛选标签
- 条件筛选预览
- 排序摘要
- 分组摘要

它只放与列表本身视图不同的东西，所以页面刚打开时的列表没有这一行：

- 页面自己的排序（`orders` / `initialParams.orders`）不生成标签 —— 列头箭头已经显示了它。别的排序会生成，它的 × 恢复页面的排序；页面有排序、但用户去掉了排序的列表显示 `Sort: None`。
- 页面的基础条件（`filters` / `initialParams.filters` / tab 的筛选）也不生成标签：Filter 对话框在规则上方以 "Always applied" 完整、换行地写出它 —— 用户想知道某人为何在或不在列表里时会去看的地方。
- [固定筛选](#固定筛选)不生成标签：药丸自己显示着值。

`Clear all` 一并清除所有活动工具栏状态，并把排序恢复为页面默认而不是清空 —— 否则刻意排序的列表会变成任意顺序，并且该 tab 会一直记住这个状态。它也把每个固定筛选恢复为默认值。

## 视图状态持久化

表格会记住**查询状态**，进入记录详情再点 Back —— 或刷新同一 tab —— 会回到原位置，而非重置为默认视图。

持久化查询状态：分页（页码 + 页大小）、排序、group-by、工具栏筛选树、列头筛选、搜索词、侧栏（`SideTree` / `SideList` / `SideCard`）选择，以及[固定筛选](#固定筛选)中选过的值。状态存于 `sessionStorage`，按 `view kind + modelName + route + 活动 MultiView tab` 作用域，通过共享模块 `src/components/views/shared/view-state/`。

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

窗口重新获得焦点时不重新读取（全局 `refetchOnWindowFocus: false`）：在另一个标签页做的写入，要到下次挂载或失效时才显示。行会在另一个标签页里被处理的列表，通过数据源要求在获得焦点时重新读取（见 [数据源](#数据源)）。

## 数据源

`dataSource` 让表格从页面自己的端点读取行，而不是 `/{model}/searchPage` —— 用于通用模型 API 无法提供给其读者的列表，例如审批中心的任务箱，由服务端限定为调用方本人：

```tsx
const source = useApprovalTasksSource("Pending", ["nodeLabel", "submittedTime", "startTime"]);
const hrefOf = useApprovalRequestHref(); // 每行的链接：其申请页，或在单独标签页打开的算薪批次

<ModelTable<FlowApprovalTaskView>
  modelName="FlowApprovalTask"
  dataSource={source}
  rowHref={hrefOf}
  renderRowActions={(task) => <TaskActions task={task} />}
>
  <Field fieldName="nodeLabel" label="Task" />
  <Field fieldName="initiatorId" label="Submitter" renderCell={(row) => actorLabel(row.initiator)} />
  <Field fieldName="startTime" label="Received" />
</ModelTable>
```

它是 `{ key, fetch, queryFields?, refetchOnWindowFocus? }`（`ModelTableDataSource`，基于 `src/hooks/useSearchPageQuery.ts` 的 `PageDataSource`）。`fetch({ filters, orders, pageNumber, pageSize })` 返回一页 `Page`。`key` 是数据源各页的缓存键，查询参数追加在其后：以模型名开头，模型写入时运行的失效（`invalidateModelQueries`、审批动作的 `["FlowApprovalTask"]`）就会像刷新 searchPage 列表一样刷新它。键不同即是另一个列表，从第一页开始。`refetchOnWindowFocus: true` 让窗口每次重新获得焦点时重新读取各页，覆盖应用默认的不读取（见 [数据新鲜度](#数据新鲜度)）：用于行会在读者离开期间、在另一个标签页里变化的列表 —— 我的待办和我的申请，其中薪资批次审批在单独的标签页打开并在那里处理。

其余一切仍来自模型元数据，与 searchPage 列表相同：列、列标签与字段类型、基于模型 `searchName` 的搜索框（`["searchName", "CONTAINS", term]`）、列头筛选、排序、分页、Columns 对话框、记住的查询状态与列排布。它们像对 searchPage 一样合并为 `filters` / `orders` —— 包括 `filters` prop 与 workspace 筛选 —— 只有这些与页码到达数据源：字段列表、子查询、分组与聚合属于 searchPage，从不发送。没有 `orders` prop 时，用户选择排序之前不发送排序，数据源自己的默认顺序生效；一旦发送排序就会替换它。

筛选与排序只针对模型的存储字段：`dynamic` 字段（包括级联字段）两者都不提供，指向其他记录的路径和一对一关联也不提供（否则 Filter 对话框会展开其子字段）。`queryFields` 进一步收窄为数据源支持的字段 —— 列头只在这些字段上筛选和排序，Filter 与 Sort 对话框也只列出这些 —— 页面借此把原始 id（单元格显示名称的 `initiatorId` 列）或读者读不到其选择器的关联排除在筛选之外。在模型命名字段（其 `searchName`、主键）上的筛选值改为手输而非选择，因为选择器通过模型的通用 `searchName` 列出行（`filters/FilterValueInput.tsx` 的 `FilterOwnModelRowsContext`）。

凡依赖模型通用端点的功能一律关闭，不论页面或调用方的授权如何：Create、Import、Export、Bulk edit、批量 Delete、行内编辑、Group 控件、pivot 列、侧栏（`SideTree` / `SideCard` / `SideList`）、sidecar，以及逐行访问检查（`getRecordAccess`）。页面自己的动作 —— `<Action>`、`renderRowActions`、`renderBulkActions` —— 照常运行，调用它们各自的端点。

页面在工具栏里显示的收窄条件（例如在那里选的申请类型）是一个[固定筛选](#固定筛选)：它的条件和其余查询一起放在 `filters` 里到达 `fetch`，它变化时列表回到第一页，tab 也会记住它。数据源本身在 `fetch` 和 `key` 里都不涉及这类选择。

## 行链接

打开某个页面的行就是指向它的链接：默认指向记录的详情页（`${pathname}/${id}?mode=read`，或 `linkTo` 下的页面），或指向 `rowHref(row)` 返回的地址。浏览器把它当作真正的链接：普通点击在当前标签页打开，Cmd/Ctrl 点击与鼠标中键在新标签页打开，Shift 点击在新窗口打开，右键菜单提供"在新标签页中打开"与"复制链接地址"，悬停时状态栏显示地址。Tab 每行停一次，Enter 打开。

```tsx
// Flow Designs：流程在设计器中打开，仅限能打开设计器的人；其他人点行不打开任何页面。
<ModelTable
  modelName="FlowDesign"
  enableClick={false}
  rowHref={mayOpenDesigner ? (row) => flowDesignEditRoute(row.id) : undefined}
>
  {/* … */}
</ModelTable>

// My Tasks：每个申请在当前标签页打开其申请页，算薪批次的审批在单独标签页打开批次页 ——
// (task) => "/home/approvals/record/LeaveRequest/9" | { href: "/payroll/tenant-run/pay-run/5", target: "_blank" }
const hrefOf = useApprovalRequestHref();
<ModelTable<FlowApprovalTaskView> modelName="FlowApprovalTask" dataSource={source} rowHref={hrefOf}>
  {/* … */}
</ModelTable>
```

`rowHref(row)` 返回字符串表示在当前标签页打开的地址；返回 `{ href, target: "_blank" }` 表示在单独标签页里处理的页面（链接带 `rel="noopener noreferrer"`）；返回 null 表示该行不是链接、点击无反应（例如调用方无权打开的行）。它优先于 `onRowClick`、`linkTo` 与 `enableClick`。开启行内编辑时点击仍用于编辑，行不是链接；`enableClick={false}` 且没有 `rowHref` 时行不响应点击。

实现方式（`components/row-link.tsx`，`PaginatedDataGrid` 与审批中心的 `TaskTable` 共用）：行中除其自身控件 —— 选择框、行动作列与行内编辑列、展开按钮 —— 之外的每个单元格都放一个覆盖整格的行链接。之所以逐格放置，是因为冻结列的单元格是 `position: sticky`，从别的单元格拉伸过来的链接会被它截在格内。第一个这样的单元格，其内容包在可被读屏读出、可聚焦的那个链接里，链接名称就是该格文字；其余单元格各在内容下方放一个链接，不进入 Tab 顺序，对辅助技术隐藏（`aria-hidden`、`tabindex="-1"`）。单元格内容让指针穿透到下方的链接（`src/styles/globals.css` 中的 `[data-row-link-cell]`），单元格自己的控件除外 —— 自己的链接、预览文件或显示掩码值的按钮、输入控件、悬停出提示的触发器（`[data-slot$="-trigger"]`、`aria-haspopup`）—— 它们保留自己的点击，不会打开该行。单元格文字的悬停提示（显示被截断值全文的 `title`）在指针进入时由链接接管。表格自己只处理普通点击：用 router 跳转，跳转到记录页时还记下列表的 id 供详情页的上一条 / 下一条使用；其余一律交给浏览器。

行链接的代价：链接行里的文字无法拖选（在链接上拖动会拖走链接），单元格内容中非控件元素的悬停效果不会触发。需要自己处理点击的 `renderCell` 用 `<button>` 或链接，不要用可点击的 `<span>`。

## 行点击、行动作与可选行

`onRowClick(row)` 以点击所在的行调用，取代打开记录页 —— 用于点击后做别的事、而不是去某个页面的列表。打开页面的行应当是链接（`rowHref`，见 [行链接](#行链接)）：只可点击的行无法在新标签页打开，也无法用键盘操作。给出它时行总是可点击，不论 `enableClick`；`rowHref` 优先于它；开启行内编辑时点击仍用于编辑。

`renderRowActions(row)` 在操作列、声明的 `<Action>` 之前绘制该行自己的动作：用于本身就是带对话框的组件、`<Action>` 无法表达的动作（审批人的 Approve / Reject 及其菜单、带间隔的 Urge）。该列宽度取其内容（列上的 `meta.fitContent`，由 `PaginatedDataGrid` 处理），声明的行内 `<Action>` 也一样：固定宽度装不下长标签，会压到前一列上。其中的点击 —— 包括它打开的对话框内的点击 —— 不会到达行。

`renderBulkActions(rows)` 是它在选中行上的对应物：页面自己对选中行的动作，在有行被选中时绘制在工具栏、声明的工具栏 `<BulkAction>` 之前 —— 用于本身就是带对话框的组件、`<BulkAction>`（模型的一个 operation）无法表达的动作：我的待办里批量 Approve / Return / Reject。给出它就让行可选。

`rowSelectionBlockedReason(row)` 在行可选择时回答这一行为何不能选：其复选框禁用，悬停显示原因，页内全选也会跳过它（TanStack 的逐行 `enableRowSelection`）。可选择的行返回 null。已勾选的行在列表重新读取后变成不可选 —— 某个操作改变了它的状态，例如 Flow Instances 的 Terminate 会取消终止的流程 —— 会随即移出选择：否则它的复选框是禁用的、无法取消勾选，批量操作也会再作用到它一次。仍可选的行保持勾选。

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
| `children`         | `ReactNode`                | No       | -       | 有序 `<Field />` 声明，以及可选 `<Action />`、`<BulkAction />`、`<PinnedFilter />`（见 [固定筛选](#固定筛选)）与一个侧栏（`<SideTree>`、`<SideCard>` 或 `<SideList>`）。运行时至少需要一条可见 `<Field />`。 |
| `enableBulkDelete` | `boolean`                  | No       | `true`  | 启用内置批量删除入口。                                                                                                         |
| `enableCreate`     | `boolean`                  | No       | `true`  | 启用内置创建按钮。                                                                                                             |
| `enableImport`     | `boolean`                  | No       | `true`  | 在 More 菜单启用内置导入对话框入口。                                                                                          |
| `enableExport`     | `boolean`                  | No       | `true`  | 在 More 菜单启用内置导出对话框入口。                                                                                          |
| `bulkEditFields`   | `string[]`                 | No       | -       | 可选批量编辑白名单。省略时，内置 Bulk Edit 使用全部元数据字段。                                                     |
| `excludeFields`    | `string[]`                 | No       | -       | 可选批量编辑黑名单。始终从内置 Bulk Edit 排除（除保留字段外）。                                     |
| `linkTo`           | `string`                   | No       | -       | 行链接指向的记录页子目录名（单段）：`${pathname}/${linkTo}/${id}?mode=read`。省略则默认 `${pathname}/${id}?mode=read`。 |
| `enableClick`      | `boolean`                  | No       | `true`  | 每行是否链接到详情页。无详情路由的只读 / 报表表设为 `false`，行不是链接（无 `cursor-pointer`、无导航）。`inlineEdit` 启用时、或给出 `rowHref` / `onRowClick` 时忽略。 |
| `freezeColumnIndex`| `number`                   | No       | `1`     | 左侧冻结的数据列初始数量。启用时选择列仍钉在冻结范围之前。             |
| `dataSource`       | `ModelTableDataSource<TData>` | No    | -       | `{ key, fetch, queryFields?, refetchOnWindowFocus? }`：通过 `fetch({ filters, orders, pageNumber, pageSize })` 读取行，取代 `/{model}/searchPage`，缓存在 `key` 下；`refetchOnWindowFocus` 为 true 时在窗口获得焦点时重新读取。列、搜索、列筛选、排序、分页与记住的状态仍由元数据驱动；筛选与排序只针对存储字段（`queryFields` 进一步收窄）；创建、导入、导出、批量编辑 / 删除、行内编辑、分组、pivot、侧栏与 sidecar 关闭。见 [数据源](#数据源)。 |
| `rowHref`          | `(row: TData) => string \| { href: string; target?: "_blank" } \| null` | No | - | 每行的地址，取代记录页：该行是指向它的链接（Cmd/Ctrl/中键点击、右键菜单、Tab + Enter）；`target: "_blank"` 在单独标签页打开；null 表示该行不响应点击。优先于 `onRowClick`、`linkTo` 与 `enableClick`；行内编辑仍接管点击。见 [行链接](#行链接)。 |
| `onRowClick`       | `(row: TData) => void`     | No       | -       | 以被点击的行调用，取代打开记录页，用于不打开页面的点击（打开页面的行用 `rowHref` 做成链接）；行总是可点击，不论 `enableClick`，但不是链接。开启行内编辑时点击仍用于编辑。 |
| `renderRowActions` | `(row: TData) => ReactNode` | No      | -       | 该行自己的动作，绘制在操作列、声明的 `<Action>` 之前，列宽取其内容；其中的点击不会到达行。用于带自身对话框的组件式动作。 |
| `renderBulkActions` | `(rows: TData[]) => ReactNode` | No   | -       | 页面自己对选中行的动作，有行被选中时绘制在工具栏、声明的工具栏 `<BulkAction>` 之前；给出它就让行可选。用于带自身对话框的组件式批量动作。 |
| `rowSelectionBlockedReason` | `(row: TData) => string \| null` | No | - | 行可选择时：这一行为何不能选（复选框禁用、悬停显示原因、全选跳过），可选则返回 null。 |

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
- 固定筛选（`<PinnedFilter>` 的值，见 [固定筛选](#固定筛选)）
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

**投影模型**（`MetaModel.projection === true`，来自 `@Model(projection = true)`——只读模型，映射到另一模型所有的表）：所有内置写操作在权限门之上再关闭一层——Create、Import、内联编辑、批量编辑、批量 Delete 无论用户权限如何一律隐藏（后端本就会拒绝这些写入）。Export 保留，它是读操作。这是模型的结构属性而非权限——SUPER_ADMIN 看到的同样是只读表格。

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
- `BulkAction placement="toolbar"` 出现在 `Columns` 与 `More` 之间，在页面自己的 `renderBulkActions` 之后（见 [行点击、行动作与可选行](#行点击行动作与可选行)）
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
      <Field fieldName="reason" label="Reason" widgetType="PlainText" />
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

# 关联字段

本文用于说明以关联为中心的字段 API：

- `RelationTable`
- `SelectTree`
- `ManyToOne` / `OneToOne`
- `OneToMany`
- `ManyToMany`
- 关联查询 / 分页 / patch 行为

相关文档：

- [Fields](./fields)：核心 `Field` props、条件、`filters`、`Field.onChange`、值契约
- [Widget 矩阵](./widgets)：widget 兼容性与 widget 专属示例
- [ModelForm](../views/form)：页面壳层与关联表单示例
- [ModelTable](../views/table)：只读单元格与内联编辑行为

## 导入

```tsx
import { Field, RelationTable } from "@/components/fields";
```

`RelationTable` 仅在关联字段声明中使用，例如 `Field.tableView`。

## `RelationTable`

`RelationTable` 是 `OneToMany` 与 `ManyToMany` 的关联表格视图定义。
请声明一个零 props 的 `tableView` 组件，并在其中返回 `<RelationTable />`。

示例：

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
      <Field fieldName="active" />
    </RelationTable>
  );
}
```

### Props

| Prop       | 类型             | 必填 | 说明                                                                                                     |
| ---------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`      | 是   | 按顺序声明的 `<Field />` 列，以及可选的 `<Action />` 行级操作（见 [行内操作](#row-actions)）。           |
| `orders`   | `OrderCondition` | 否   | 关联表格默认排序。支持单个元组或多个元组。                                                               |
| `pageSize` | `number`         | 否   | 关联表格页大小。仅对分页关联表格（`isPaged={true}`）生效。                                               |

排序示例：

```tsx
<RelationTable orders={["sequence", "ASC"]}>
  <Field fieldName="sequence" />
  <Field fieldName="itemCode" />
</RelationTable>
```

```tsx
<RelationTable
  orders={[
    ["sequence", "ASC"],
    ["itemCode", "DESC"],
  ]}
>
  <Field fieldName="sequence" />
  <Field fieldName="itemCode" />
</RelationTable>
```

行为说明：

- `RelationTable.pageSize` 仅影响分页关联表格（`isPaged`）
- `RelationTable.orders` 同时支持单个元组与多个元组
- 列声明仍由子级 `<Field />` 的顺序决定

### 行内操作

`RelationTable` 可与 `<Field />` 并列接受 `<Action />` 子节点。它们渲染在末尾的 `Actions` 列中，作为每行操作，并面向**关联模型**派发——动作的 `operation` / `href` / `onClick` 会以该行的 `id` 作为记录 id。

```tsx
import { Action } from "@/components/actions/Action";

function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]}>
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
      <Action
        type="link"
        label="Open"
        placement="inline"
        href="/config/option-item/{id}"
      />
      <Action
        label="Archive"
        operation="archive"
        placement="more"
      />
    </RelationTable>
  );
}
```

放置规则与 `ModelTable` 行级操作一致：

- `placement="inline"`（行上默认）→ 显示在 Actions 列中的图标/按钮
- `placement="more"` → 显示在 Actions 列的溢出下拉中
- `placement="toolbar"` / `"header"` 会被忽略（关联表格没有工具栏）

行为说明：

- 仅当行存在 `id` 时才渲染操作；草稿/未保存行对应单元格为空
- 动作派发使用**关联**模型名（而非父表单的模型），因此 `operation` 针对关联实体执行，查询失效会刷新该模型
- `disabled` / `hidden` 条件基于已保存的行数据求值——不会跟踪未保存的内联编辑值（与 `ModelTable` 不同）
- 此上下文中 `ActionExecutionContext.scope` 报告为 `"model-table"`（关联行复用同一套派发器）

## `ManyToOne` / `OneToOne`

默认行为为可搜索的关联选择：

```tsx
<Field fieldName="departmentId" />
```

依赖型关联过滤示例：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

说明：

- `filters` 作用于默认的可搜索关联查询
- 当依赖的 `{{ fieldName }}` 在当前作用域没有值时，选择器保持查询禁用，而不会加载全部选项

#### `filterBySource` —— 由后端驱动的上下文过滤

当业务规则无法仅通过 `filters` / `{{ fieldName }}` 声明表达时（例如「男性员工不能选产假类型」「剩余年假须大于 0」），可使用 `filterBySource`，让后端根据调用方记录上下文自行过滤：

```tsx
<Field fieldName="leaveTypeId" filterBySource />
```

当 `filterBySource` 为 true 时，`searchName` 请求会携带 `SourceRecord`：

```ts
interface SourceRecord {
  model: string;                     // metaField.modelName —— 拥有该字段的模型
  recordId?: string | null;          // 解析后的 recordId；创建模式下为 null
  values?: Record<string, unknown>;  // 该记录当前的内存表单值
}
```

语义：

- `model` 与 `recordId` 描述**直接拥有该字段**的记录——根表单上的 Field 为根记录；`OneToMany` / `ManyToMany` 行内的 Field 则为该行记录（使用行自身模型，而非父级）
- `values` 为查询时刻的表单快照；任意表单值变更都会触发重新查询，使下拉随表单联动过滤
- 默认为 `false`；按字段开启，因为「该查找是否应尊重宿主表单」由调用方决定，而非目标模型
- 可与声明式 `filters` 同时使用；二者一并提交，由后端合并应用

在 `filters` 与 `filterBySource` 之间选择：

- **`filters` + `{{ fieldName }}`** —— 简单跨字段引用，在前端解析（`gender`、`status`、`departmentId` 等）。声明式、代码可读，无需改后端。
- **`filterBySource`** —— 需要计算、策略查询或后端跨模型关联的规则。对前端不透明，但业务规则可与在 `save` 上强制执行的后端服务放在一起。

示例 —— 请假类型下拉通过服务端规则按员工性别过滤：

```tsx
<Field fieldName="employeeId" />
<Field fieldName="leaveTypeId" filterBySource />
```

安全提示：`filterBySource` 会发送当前完整表单值映射。若表单含有目标后端不应看到的字段，请勿启用。

### `SelectTree`

关联模型为层级结构时使用 `SelectTree`：

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

带依赖过滤的常见写法：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  widgetType="SelectTree"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

行为：

- `SelectTree` 是表单与内联编辑器中面向开发者的推荐树形入口
- 仍通过 `Field` 声明，而非直接渲染 `SelectTreePanel`
- 与可搜索关联字段使用相同的 `Field.filters` 规则
- 依赖的 `{{ fieldName }}` 缺失时，树选择器保持查询禁用，不会加载未过滤的整棵树
- 底层 `Tree` / `SelectTreePanel` 属于内部基础设施

#### 递归父级选择器：`preventCycle`

对于常见的「自引用模型，父级不能是自身或其后代」场景（Department、Category、JobFamily 等树形结构），只需设置一个标志：

```tsx
<Field
  fieldName="parentId"
  widgetType="SelectTree"
  widgetProps={{ preventCycle: true }}
/>
```

作用：

- 从外层 `ModelForm` 运行时上下文（`useOptionalModelFormRuntimeContext().id`）读取 `selfId`
- 从 `metaField.relatedModel` 读取目标模型，并校验其与表单模型一致（不一致时警告并跳过）
- 将 `selfId` 作为 `disableSubtreeRootId` 传给树；选择器的 `searchList` 返回后，树对 `selfId` 的 `childrenIds` 链做 DFS，将整棵子树（自身 + 后代）加入禁用集合
- 无额外请求——唯一请求是树在首次打开 popover 时已发起的请求；后续打开命中缓存
- 无需 `idPath` 列——子树遍历使用从已加载行构建的内存 parent→children 链
- 创建模式（无 `selfId`）下不会禁用任何节点，因此同一 `widgetProps` 可安全用于 `ModelTable` 创建对话框

更新端点上的后端环检测仍建议作为安全网保留。

注意：若 `treeFilters` 将 `selfId` 本身过滤出树外，子树遍历将无锚点，不会禁用任何节点——仅在编辑的记录被选择器自身过滤排除时才有实际影响。

## `OneToMany`

渲染为关联表格，支持行内编辑或对话框编辑。对外仍统一使用 `Field`。

示例：

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
      <Field fieldName="active" />
    </RelationTable>
  );
}

<Field fieldName="optionItems" tableView={OptionItemsTableView} />;
```

常用 props：

- `tableView`：渲染 `<RelationTable><Field /></RelationTable>` 的关联表格视图组件
- `formView`：行创建/编辑用的对话框表单
- `isPaged`：启用分页 / 远程关联模式

默认提交行为为增量 patch map：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

行为：

- `false`（默认）：在 `getById` 中包含关联 `subQuery`；关联表格 UI 不分页，渲染本地行
- `true`：关联表格启用分页 UI；当 `recordId + relatedModel + 作用域内关联过滤` 就绪时，由 `relatedModel.searchPage` 加载数据（远程模式），否则在本地做分页
- 静态 `Field.filters`（不含 `{{ fieldName }}` 引用）会并入 `getById` 的 subQuery，首屏加载即带上过滤；含 `{{ fieldName }}` 的动态过滤仅在远程模式查询、且引用字段值可用时生效
- 可编辑单元格限制为已声明的 `RelationTable` 列与关联模型可编辑字段的交集
- 未解析的 `{{ expr }}` 依赖会暂停远程关联查询，直到父表单依赖值存在

## `ManyToMany`

默认渲染为关联表格 + 选择器对话框。

示例：

```tsx
function UserTableView() {
  return (
    <RelationTable orders={["username", "ASC"]} pageSize={10}>
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="status" />
    </RelationTable>
  );
}

<Field fieldName="userIds" tableView={UserTableView} />;
```

默认提交行为为增量 patch map：

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

### `TagList`

`widgetType="TagList"` 将 `ManyToMany` 切换为可搜索的多选下拉，并在触发器下方以标签展示已选项。

```tsx
<Field fieldName="userIds" widgetType="TagList" tableView={UserTableView} />
```

行为：

- 可搜索下拉，支持多选交互
- 已选值在触发器下方渲染为标签
- 触发器文案保持紧凑，仅显示选中数量
- 字段布局默认遵循周围 `FormSection` 列宽；需要独占整行时请显式传入 `fullWidth`
- 顶层 `ModelForm` 的 `getById` 仅把字段名加入 `fields`，不会追加关联 `subQuery`
- 字段 UI 值为 `ModelReference[]`，顶层提交仍使用常规增量 patch map

### 查询说明

- `ManyToMany` 选择器对话框以 `AND` 合并有效字段过滤、内部关联作用域过滤、搜索过滤与列过滤
- 未解析的 `{{ expr }}` 依赖会暂停远程选择器与关联表格查询，直到源值存在
- `formView` 可选；在 `ManyToMany` 中，点击行以只读模式打开 `ModelDialog`，新增/移除仍走选择器

## 共享的只读 / 内联行为

关联字段的共通行为：

- `ModelTable` / `RelationTable` 只读单元格将 `OneToMany` 与 `ManyToMany` 都渲染为紧凑标签列表，优先 `displayName`，回退 `id`，而非 JSON 字符串
- `widgetProps` 不会传入 `RelationTable` 只读单元格渲染器
- 关联表格复用与 `ModelTable` 相同的紧凑文件/图片只读渲染
- `RelationTable.pageSize` 仅影响分页关联表格（`isPaged=true`）
- 远程关联表格与选择器查询使用有效字段过滤（`Field.filters ?? metaField.filters`）、关联作用域过滤以及运行时搜索/列过滤

## 表单视图示例

`formView` 通常与 `ModelDialog` 搭配：

```tsx
function UserRoleUserIdsFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection label="General" hideHeader>
        <Field fieldName="username" />
        <Field fieldName="nickname" />
        <Field fieldName="email" />
        <Field fieldName="mobile" />
        <Field fieldName="status" />
      </FormSection>
    </ModelDialog>
  );
}
```

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
- [ModelForm](../form)：页面壳层与关联表单示例
- [ModelTable](../table)：只读单元格与内联编辑行为

## 导入

```tsx
import { Field, RelationTable } from "@/components/fields";
```

`RelationTable` 仅在关联字段声明中使用，例如 `Field.tableView`。

## `RelationTable`

`RelationTable` 是 `OneToMany` 与 `ManyToMany` 的关联表格视图定义。
请声明一个**零 props** 的 `tableView` 组件，并在其中返回 `<RelationTable />`。

示例：

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTable>
  );
}
```

### Props

| Prop       | 类型             | 必填 | 说明                                                                                      |
| ---------- | ---------------- | ---- | ----------------------------------------------------------------------------------------- |
| `children` | `ReactNode`      | 是   | 按顺序声明关联表格列的 `<Field />`。                                                      |
| `orders`   | `OrderCondition` | 否   | 关联表格默认排序。支持单个元组或多个元组。                                                |
| `pageSize` | `number`         | 否   | 关联表格页大小。仅对分页关联表格（`isPaged={true}`）生效。                                |

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
- 当依赖的 `{{ fieldName }}` 在当前作用域没有值时，选择器保持**查询禁用**，而不会加载全部选项

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

## `OneToMany`

渲染为关联表格，支持行内编辑或对话框编辑。对外仍统一使用 `Field`。

示例：

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTable>
  );
}

<Field fieldName="optionItems" tableView={OptionItemsTableView} />;
```

常用 props：

- `tableView`：零 props 的关联表格视图组件，内部渲染 `<RelationTable><Field /></RelationTable>`
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
      <FormSection labelName="General" hideHeader>
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

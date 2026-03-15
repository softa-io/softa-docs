# 关联字段

本文用于说明以关联为中心的字段 API：

- `RelationTable`
- `SelectTree`
- `ManyToOne` / `OneToOne`
- `OneToMany`
- `ManyToMany`
- 关联查询 / 分页 / patch 行为

相关文档：

- [Fields](./index)：核心 `Field` props、条件、`filters`、`Field.onChange`、值契约
- [Widget 矩阵](./widgets)：widget 兼容性与 widget 专属示例
- [ModelForm](../form)：页面壳层与关联表单示例
- [ModelTable](../table)：只读单元格与内联编辑行为

## 导入

```tsx
import { Field, RelationTable } from "@/components/fields";
```

`RelationTable` 只在关联字段声明内部使用，例如 `Field.tableView`。

## `RelationTable`

`RelationTable` 是 `OneToMany` 和 `ManyToMany` 的关联表格视图定义。

示例：

```tsx
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);
```

### Props

| Prop       | 类型             | 必填 | 说明                                                                 |
| ---------- | ---------------- | ---- | -------------------------------------------------------------------- |
| `children` | `ReactNode`      | 是   | 关联表格中按顺序声明的 `<Field />` 列。                              |
| `orders`   | `OrderCondition` | 否   | 关联表格的默认排序。支持单个元组或多个元组。                         |
| `pageSize` | `number`         | 否   | 关联表格页大小。仅对分页关联表格（`isPaged={true}`）生效。           |

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
- `RelationTable.orders` 同时支持单个元组和多个元组
- 列声明仍然由子级 `<Field />` 的顺序决定

## `ManyToOne` / `OneToOne`

默认行为是可搜索的关联选择器：

```tsx
<Field fieldName="departmentId" />
```

依赖型关联过滤示例：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

说明：

- `filters` 会应用到默认的可搜索关联查询上
- 当依赖的 `#{fieldName}` 当前没有值时，选择器会保持查询禁用状态，而不是加载全部选项

### `SelectTree`

当关联模型是层级结构时，使用 `SelectTree`：

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

带依赖过滤的常见用法：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  widgetType="SelectTree"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
  ]}
/>
```

行为：

- `SelectTree` 是表单和内联编辑器中推荐的开发者侧树选择入口
- 它仍然通过 `Field` 声明，而不是直接渲染 `SelectTreePanel`
- 它遵循与可搜索关联字段相同的 `Field.filters` 规则
- 当依赖的 `#{fieldName}` 缺失时，树选择器会保持查询禁用状态，而不是加载未过滤的整棵树
- 底层 `Tree` / `SelectTreePanel` 属于内部基础设施

## `OneToMany`

默认渲染为支持内联编辑或对话框编辑的关联表格。公开用法仍然是 `Field`。

示例：

```tsx
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);

<Field fieldName="optionItems" tableView={optionItemsTableView} />;
```

常用 props：

- `tableView`：通过 `<RelationTable><Field /></RelationTable>` 定义关联表格列
- `formView`：用于行创建 / 编辑的对话框表单
- `isPaged`：启用分页 / 远程关联模式

默认提交行为是增量 patch map：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

行为：

- `false`（默认）：在 `getById` 中包含关联 `subQuery`；关联表格 UI 不分页，直接渲染本地行
- `true`：关联表格启用分页 UI；当 `recordId + relatedModel + 作用域内关联过滤条件` 准备就绪时，通过 `relatedModel.searchPage` 加载数据（远程模式），否则退回为本地分页
- 可编辑单元格限定为声明在 `RelationTable` 中的列，并与关联模型中可编辑字段求交集
- 未解析的 `#{fieldName}` 依赖会暂停远程关联查询，直到父表单中的依赖值存在

## `ManyToMany`

默认渲染为关联表格加选择器对话框。

示例：

```tsx
const userTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="status" />
  </RelationTable>
);

<Field fieldName="userIds" tableView={userTableView} />;
```

默认提交行为是增量 patch map：

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

### `TagList`

`widgetType="TagList"` 会将 `ManyToMany` 切换为可搜索的多选下拉框，并在触发器下方渲染标签。

```tsx
<Field fieldName="userIds" widgetType="TagList" tableView={userTableView} />
```

行为：

- 提供支持多选交互的可搜索下拉框
- 已选值会作为标签渲染在触发器下方
- 触发器文本保持紧凑，只显示已选数量
- 字段布局默认遵循周围 `FormSection` 的列布局；若希望独占整行，请显式传入 `fullWidth`
- 顶层 `ModelForm` 的 `getById` 只会把字段名加入 `fields`，不会追加关联 `subQuery`
- 字段 UI 值为 `ModelReference[]`，但顶层提交仍然使用普通的增量 patch map

### 查询说明

- `ManyToMany` 选择器对话框会使用 `AND` 合并有效字段过滤条件、内部关联作用域过滤条件、搜索过滤条件和列过滤条件
- 未解析的 `#{fieldName}` 依赖会暂停远程选择器和关联表格查询，直到来源值存在
- `formView` 是可选的；在 `ManyToMany` 中，点击行会以只读模式打开 `ModelDialog`，而新增 / 移除仍然使用选择器行为

## 共享的只读 / 内联行为

关联字段的共享行为：

- `ModelTable` / `RelationTable` 的只读单元格会把 `OneToMany` 和 `ManyToMany` 都渲染为紧凑标签列表，标签优先使用 `displayName`，回退到 `id`，而不是输出 JSON 字符串
- `widgetProps` 不会透传到 `RelationTable` 的只读单元格渲染器
- 关联表格会复用与 `ModelTable` 相同的紧凑文件 / 图片只读渲染器
- `RelationTable.pageSize` 仅影响分页关联表格（`isPaged=true`）
- 远程关联表格和选择器查询会组合有效字段过滤条件（`Field.filters ?? metaField.filters`）、关联作用域过滤条件，以及运行时搜索 / 列过滤条件

## 表单视图示例

`formView` 通常与 `ModelDialog` 搭配使用：

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

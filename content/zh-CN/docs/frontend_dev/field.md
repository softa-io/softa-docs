# Fields

基于元数据的字段系统，供 `ModelForm`、关联对话框和内联编辑器使用。

## 相关文档

- [表单组件](./form)：`ModelForm`、`FormBody`、`FormToolbar`、页面级壳层
- [表格组件](./table)：`ModelTable` 和表格侧渲染器
- [树组件](./tree)：底层 `Tree`、`TreePanel`、`SelectTreePanel`

## 导入

推荐在业务代码中这样导入：

```tsx
import { Field } from "@/components/fields";
```

其他公开导出：

```tsx
import {
  Field,
  RelationTableView,
  type FieldCondition,
  type FieldConditionContext,
  type FieldOnChangeProp,
  type RelationFormView,
  type RelationTableViewProps,
} from "@/components/fields";
```

## 推荐用法

在业务代码中统一使用 `Field` 作为入口：

```tsx
<Field fieldName="name" />
<Field fieldName="description" widgetType="Text" />
<Field fieldName="avatar" widgetType="Image" />
<Field fieldName="notes" widgetType="Markdown" />
```

运行时会自动解析：

- 从元数据中读取 `fieldType`
- 根据 `fieldType` 选择默认字段适配器
- 根据 `widgetType` 选择可选的小组件渲染器

除非是内部基础设施代码，否则不建议直接使用 `StringField`、`ReferenceField`、`JsonField`、`FieldDispatcher` 或各类 widget 组件。

## Field Props

`Field` 基于元数据驱动，并支持字段级覆盖和运行时条件。

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `fieldName` | `string` | 是 | 当前模型中的元数据字段名。 |
| `widgetType` | `WidgetType` | 否 | 可选的 widget 覆盖，必须与元数据 `fieldType` 兼容。 |
| `widgetProps` | `Record<string, unknown>` | 否 | 仅用于 widget 专属配置，由各 widget 内部解析。会作用于表单 widget 和内联编辑器，但不会作用于表格只读单元格。 |
| `placeholder` | `string` | 否 | 字段级输入占位文案。优先使用它，而不是 `widgetProps.placeholder`。 |
| `hideLabel` | `boolean` | 否 | 隐藏整个标签区块。 |
| `fullWidth` | `boolean` | 否 | 文本类字段和关联字段的布局提示。 |
| `readOnly` | `boolean` | 否 | 强制只读模式。 |
| `labelName` | `string` | 否 | 元数据标签覆盖。 |
| `required` | `FieldCondition` | 否 | 动态必填控制。支持 `boolean`、`FilterCondition` 或函数。 |
| `readonly` | `FieldCondition` | 否 | 动态只读控制。支持 `boolean`、`FilterCondition` 或函数。 |
| `hidden` | `FieldCondition` | 否 | 动态可见性控制。隐藏字段不会渲染，且会抑制其校验。 |
| `defaultValue` | `unknown` | 否 | 仅用于创建态的默认值覆盖。它会写入初始表单值，优先级高于 `metaField.defaultValue` 和对话框/页面级 `defaultValues`。 |
| `filters` | `string \| FilterCondition` | 否 | 关联过滤条件覆盖。`Field.filters` 会覆盖 `metaField.filters`。支持 JSON 字符串形式的元数据过滤条件，以及声明式 `#{fieldName}` 引用。 |
| `onChange` | `FieldOnChangeProp` | 否 | 远程字段联动。支持简写 `string[]` 或 `{ update?, with? }`。 |
| `tableView` | `ReactElement<RelationTableViewProps>` | 否 | `OneToMany` / `ManyToMany` 表格配置。必须是一个 `<RelationTableView />` 元素。 |
| `formView` | `RelationFormView` | 否 | 关联对话框 / 详情表单配置。 |
| `isPaged` | `boolean` | 否 | 启用关联表格分页模式。 |

`FieldCondition`：

```ts
type FieldCondition =
  | boolean
  | FilterCondition
  | ((ctx: FieldConditionContext) => boolean);
```

`FieldConditionContext`：

```ts
interface FieldConditionContext {
  fieldName: string;
  metaField: MetaField;
  values: Record<string, unknown>;
  value: unknown;
  scope: "form" | "model-table" | "relation-table";
  rowIndex?: number;
  rowId?: string;
  isEditing: boolean;
  recordId?: string;
}
```

行为说明：

- `boolean`：最简单也最直接。
- `FilterCondition`：推荐用于常见业务规则的声明式写法。
- `dependsOn([...], evaluator)`：带明确字段订阅的函数式条件写法。
- 非法的 `FilterCondition` 配置会发出开发态 warning，并解析为 `false`。
- 不支持裸函数条件；函数逻辑请包在 `dependsOn([...], evaluator)` 中。
- `Action.disabled` 和 `Action.visible` 在表单/表格工具栏中也使用同一套条件模型。
- `hidden` 会同时抑制渲染和校验。
- 在 `ModelTable` / `RelationTableView` 的内联编辑中，condition 的 `values` 是当前行对象，而不是整个表单对象。
- 在表格声明中，`hidden` 只支持 `boolean`，并会隐藏整列。
- `widgetProps` 不会透传给 `ModelTable` / `RelationTableView` 的只读单元格渲染器。
- `defaultValue` 适合静态字段级创建默认值。路由参数、父行值、非渲染字段等运行时预填请使用对话框/页面级 `defaultValues`。
- `required={false}` 可以在运行时放宽元数据中的 `required`；`readonly={false}` 可以覆盖元数据只读。

示例：

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field fieldName="status" readonly={true} />

<Field fieldName="itemColor" hidden={["active", "=", false]} />

<Field
  fieldName="description"
  readonly={[
    ["status", "IN", ["approved", "archived"]],
    "OR",
    [["type", "=", "SYSTEM"], "AND", ["editable", "!=", true]],
  ]}
/>

<Field
  fieldName="itemName"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

## 关系字段 `filters`

`filters` 主要用于关联字段：

- `ManyToOne` / `OneToOne` 的可搜索关联查询
- `SelectTree` 的关联选择器查询
- `OneToMany` / `ManyToMany` 的远程关联表格查询
- `ManyToMany` 选择器对话框查询

可接受的输入：

- 业务代码中的 `FilterCondition`
- 来自元数据 / 后端载荷的 JSON 字符串形式

推荐在过滤值中使用的声明式语法：

- `#{fieldName}`：在发请求前从当前前端作用域解析
- `TODAY`、`NOW`、`USER_ID`、`USER_EMP_ID`、`USER_POSITION_ID`、`USER_DEPT_ID`、`USER_COMP_ID`：原样透传，交给后端替换环境变量
- `@{literal}`：原样透传，并强制后端按字面量解释

示例：

```tsx
<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
    "AND",
    ["type", "=", "@{TODAY}"],
  ]}
/>
```

行为说明：

- `Field.filters` 会覆盖 `metaField.filters`
- 若省略 `Field.filters`，关联 widget 会回退使用 `metaField.filters`
- `#{fieldName}` 会基于当前作用域值解析：
  - `ModelForm`：当前表单值
  - `ModelTable` 内联编辑：当前编辑行
  - `RelationTableView` 内联编辑：当前关联行
- 字段值会在请求前做归一化：
  - `ManyToOne` / `OneToOne` -> `id`
  - `Option` -> `itemCode`
  - `MultiOption` -> `itemCode[]`
- 如果任意 `#{fieldName}` 依赖缺失，则关联查询会被视为未就绪，不会发出请求
- 前端不会解释 `TODAY` 这类后端环境 token；它们会原样透传

`RelationTableView.initialParams.filters` 支持同样的语法，并会与有效字段过滤条件通过 `AND` 合并。

## 远程 `Field.onChange`

`Field` 通过顶层 `onChange` prop 支持远程联动：

```ts
type FieldOnChangeProp =
  | string[]
  | {
      update?: string[];
      with?: string[] | "all";
    };
```

常见示例：

```tsx
<Field fieldName="itemCode" onChange={["itemName", "itemColor"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["itemName"], with: ["active"] }}
/>

<Field
  fieldName="itemCode"
  onChange={{ with: "all" }}
/>
```

行为说明：

- `onChange={["a", "b"]}` 是 `onChange={{ update: ["a", "b"] }}` 的简写。
- 存在 `update`：只从响应 `values` 中提取这些字段。
- 省略 `update`：会应用当前作用域内响应 `values` 里的所有键。
- 省略 `with`：请求在编辑模式下只发送 `id`，再加当前字段的 `value`。
- `with: ["a", "b"]`：请求会把这些字段以 submit/API 形态放进 `values`。
- `with: "all"`：请求会把当前作用域值整体以 submit/API 形态放进 `values`。

当前支持的作用域：

- `ModelForm`
- `ModelTable` 内联编辑的当前行
- `RelationTableView` 内联编辑的当前行

当前不覆盖的场景：

- 独立的顶层 `OneToMany` / `ManyToMany` 容器交互不是 source trigger
- 独立对话框表单目前不会自动提供这套运行时能力

自动触发规则：

- `blur`：`String`、`MultiString`、数值输入、`JSON`、`Filters`、`Orders`、`Code`、`Markdown`、`RichText` 等文本型 / 编辑器型字段
- `change`：`Boolean`、`Date`、`DateTime`、`Time`、`Option`、`MultiOption`、`ManyToOne`、`OneToOne`、`File`、`MultiFile` 等提交式字段

前端使用的后端契约：

```http
POST /<modelName>/onChange/<fieldName>
```

请求 payload：

```json
{
  "id": "123",
  "value": "ITEM-001",
  "values": {
    "active": true
  }
}
```

响应 payload：

```json
{
  "values": {
    "itemName": "Open",
    "itemColor": "#22c55e"
  },
  "readonly": {
    "itemName": true
  },
  "required": {
    "itemColor": true
  }
}
```

响应规则：

- `values` 只 patch 返回的键；缺失的键保持不变。
- 返回 `null` 表示显式清空。
- `readonly` / `required` 会独立于 `update` 生效。
- 远端返回的 `readonly` / `required` 会覆盖元数据和本地条件，直到后续响应或作用域重置。

作用域说明：

- 在 `ModelForm` 中，`with: "all"` 使用当前表单的 submit 形态；已注册的顶层关联字段会使用关系 patch payload，而不是原始 UI 行数据。
- 在 `ModelTable` / `RelationTableView` 的内联编辑中，`values` 和 `with: "all"` 只针对当前行，而不是整个表格或父表单。

## 级联字段

`MetaField.cascadedField` 支持在编辑作用域中做隐式自动回填，不需要源字段显式声明 `Field.onChange`。

示例：

```ts
deptId.cascadedField = "employeeId.departmentId";
companyId.cascadedField = "employeeId.department.companyId";
```

行为说明：

- 支持 `ModelForm`、`ModelTable` 内联编辑和 `RelationTableView` 内联编辑
- 源字段必须是 `ManyToOne` 或 `OneToOne`，并且定义了 `relatedModel`
- 当源字段变化时，前端会请求一次 `/<relatedModel>/getById`，并从响应中读取所有依赖的级联路径
- 多个目标字段依赖同一个源字段时，会在同一次查询里一起解析
- 如果源字段同时声明了 `Field.onChange`，两套效果会并行执行
- 如果两套效果写入同一个目标字段，`cascadedField` 的结果优先
- 清空源字段时，会直接清空所有依赖的级联目标，不会调用 `getById`
- 非法的级联元数据会被忽略，并在开发态给出 warning

语法说明：

- 格式为 `<sourceField>.<path>`
- `<sourceField>` 必须是当前作用域中的同级字段
- `<path>` 从源模型的 `getById` 响应中读取，支持嵌套路径

## FieldType And WidgetType Matrix

当前支持的组合如下：

| FieldType | 默认行为 | 支持的 WidgetType |
| --- | --- | --- |
| `String` | 单行输入框 | `URL`, `Email`, `Text`, `RichText`, `Markdown`, `Code`, `Color` |
| `MultiString` | 标签式逗号 / 回车输入 | - |
| `Integer` | 数值输入框 | `Monetary`, `Percentage`, `Slider` |
| `Long` | 数值输入框 | `Monetary`, `Percentage`, `Slider` |
| `Double` | 数值输入框 | `Monetary`, `Percentage`, `Slider` |
| `BigDecimal` | 十进制字符串输入框 | `Monetary`, `Percentage`, `Slider` |
| `Boolean` | 开关 | `CheckBox` |
| `Date` | 日期选择器 | `yyyy-MM`, `MM-dd` |
| `DateTime` | 日期时间输入 | - |
| `Time` | 时间输入 | `HH:mm:ss`, `HH:mm` |
| `Option` | 单选下拉框 | `Radio`, `StatusBar` |
| `MultiOption` | 复选框组 | `CheckBox` |
| `ManyToOne` | 关联选择器 | `SelectTree` |
| `OneToOne` | 关联选择器 | `SelectTree` |
| `ManyToMany` | 关联表格 + 选择器对话框 | - |
| `OneToMany` | 关联表格 | - |
| `File` | 文件上传 | `Image` |
| `MultiFile` | 多文件上传 | `MultiImage` |
| `JSON` | CodeMirror JSON 编辑器 | `JsonTree` |
| `Filters` | 过滤条件构建器 | - |
| `Orders` | 排序构建器 | - |
| `DTO` | CodeMirror JSON 编辑器 | `JsonTree` |

## 字段分组

### 字符串字段

#### 默认 `String`

未指定 `widgetType` 时，使用普通单行输入框。

```tsx
<Field fieldName="name" />
```

#### `URL`、`Email`、`Color`

这些仍然是轻量级字符串输入模式：

```tsx
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="contactEmail" widgetType="Email" />
<Field fieldName="themeColor" widgetType="Color" />
```

#### `Text`

多行文本域模式，`fullWidth` 默认是 `true`。

```tsx
<Field fieldName="description" widgetType="Text" />
```

#### `RichText`

基于 `jodit-react` 的富文本 HTML 编辑器。该 widget 采用懒加载。

```tsx
<Field fieldName="content" widgetType="RichText" />
```

#### `Markdown`

Markdown 编辑器 + 预览 widget。

```tsx
<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>
```

`Markdown` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `"split" \| "edit" \| "preview"` | `"split"` | `split` 同时显示编辑器和预览；`edit` 仅编辑器；`preview` 仅预览。 |
| `height` | `number \| string` | - | 编辑器 / 预览面板固定高度。 |
| `minHeight` | `number \| string` | `320px` | 面板最小高度。 |
| `maxHeight` | `number \| string` | - | 面板最大高度。 |
| `lineNumbers` | `boolean` | `true` | 编辑器侧边行号。 |
| `lineWrapping` | `boolean` | `true` | Markdown 长行自动换行。 |
| `tabSize` | `number` | `2` | 编辑器缩进宽度。 |
| `autoFocus` | `boolean` | `false` | 挂载后自动聚焦编辑器。 |

预览由 `react-markdown` 渲染，并默认启用 `remark-gfm`。

#### `Code`

基于 CodeMirror 的源码编辑器 widget。

```tsx
<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>
```

`Code` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `language` | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"` | `"plain"` | 语法高亮语言。 |
| `height` | `number \| string` | - | 编辑器固定高度。 |
| `minHeight` | `number \| string` | `240px` | 编辑器最小高度。 |
| `maxHeight` | `number \| string` | - | 编辑器最大高度。 |
| `lineNumbers` | `boolean` | `true` | 编辑器侧边行号。 |
| `lineWrapping` | `boolean` | `true` | 长行自动换行。 |
| `tabSize` | `number` | `2` | 编辑器缩进宽度。 |
| `autoFocus` | `boolean` | `false` | 挂载后自动聚焦编辑器。 |

### MultiString

`MultiStringField` 是标签式输入。值会在按下 `Enter`、输入 `,` 或失焦时提交，并以逗号分隔字符串形式存储在表单状态中。

```tsx
<Field fieldName="tags" />
```

### 数值字段

默认数值行为：

- `Integer`、`Long`、`Double` 使用类似 number 的输入框
- `BigDecimal` 保留十进制字符串语义

#### `Monetary`

增加货币风格装饰输入框。

```tsx
<Field fieldName="amount" widgetType="Monetary" />
```

#### `Percentage`

增加百分比风格装饰输入框。

```tsx
<Field fieldName="ratio" widgetType="Percentage" />
```

#### `Slider`

```tsx
<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>
```

`Slider` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `minValue` | `number` | `0` | 滑块最小值。 |
| `maxValue` | `number` | `100` | 滑块最大值。 |
| `step` | `number` | 根据字段类型 / scale 推导 | 步长。 |

### 布尔和选项字段

#### `Boolean`

默认行为是 `Switch`。

```tsx
<Field fieldName="active" />
```

如需复选框 UI，可使用 `CheckBox`：

```tsx
<Field fieldName="active" widgetType="CheckBox" />
```

#### `Option`

默认行为是下拉选择框。

```tsx
<Field fieldName="status" />
```

需要时可使用 `Radio` 或 `StatusBar`：

```tsx
<Field fieldName="status" widgetType="Radio" />
<Field fieldName="status" widgetType="StatusBar" />
```

`Radio` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `direction` | `"horizontal" \| "vertical"` | `"vertical"` | 单选项布局方向。 |

`StatusBar` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `wrap` | `boolean` | `true` | 是否允许状态项换行。 |

#### `MultiOption`

默认行为是复选框组。

```tsx
<Field fieldName="permissions" />
```

### 日期与时间字段

#### `Date`

默认行为是标准日期选择器。

```tsx
<Field fieldName="birthday" />
```

特殊日期 widget：

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="anniversary" widgetType="MM-dd" />
```

#### `DateTime`

默认行为是日期时间输入。

```tsx
<Field fieldName="startAt" />
```

#### `Time`

默认 widget 是 `HH:mm:ss`。

```tsx
<Field fieldName="startTime" />
<Field fieldName="startTime" widgetType="HH:mm" />
<Field fieldName="startTime" widgetType="HH:mm:ss" />
```

### 引用与关联字段

#### `ManyToOne` / `OneToOne`

默认行为是可搜索的关联选择器：

```tsx
<Field fieldName="departmentId" />
```

依赖式关联过滤示例：

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

- `filters` 会应用到默认的可搜索关联查询
- 当 `#{companyId}` 当前没有值时，选择器会保持查询禁用，而不是加载全部部门

层级选择场景可使用 `SelectTree`：

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

#### `OneToMany`

渲染为关联表格，可配合内联编辑或对话框编辑。对外公开用法仍然通过 `Field`。

```tsx
const optionItemsTableView = (
  <RelationTableView
    initialParams={{
      orders: [["sequence", "ASC"]],
      pageSize: 10,
      filters: [["companyId", "=", "#{companyId}"]],
    }}
  >
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTableView>
);

<Field fieldName="optionItems" tableView={optionItemsTableView} />
```

常用 props：

- `tableView`：通过子级 `<Field />` 声明关联表格列，并通过 `initialParams` 传入非字段查询参数
- `formView`：行创建 / 编辑的对话框表单
- `isPaged`：启用分页 / 远程关联模式
- `tableView.initialParams.filters` 使用与 `Field.filters` 相同的声明式语法，并会与有效字段过滤条件通过 `AND` 合并

默认提交行为是增量 patch map：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

#### `ManyToMany`

渲染为关联表格 + 选择器对话框。

```tsx
const userTableView = (
  <RelationTableView
    initialParams={{
      orders: [["username", "ASC"]],
      pageSize: 10,
      filters: [["companyId", "=", "#{companyId}"]],
    }}
  >
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="status" />
  </RelationTableView>
);

<Field fieldName="userIds" tableView={userTableView} />
```

默认提交行为是增量 patch map：

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

远程查询说明：

- `ManyToMany` 选择器对话框会将 `RelationTableView.initialParams.filters`、有效字段过滤条件、内部 relation-scope 过滤条件、搜索过滤条件和列过滤条件统一以 `AND` 合并
- 未解析出的 `#{fieldName}` 依赖会暂停远程 picker / 关联表格查询，直到源值出现

### 运行时值契约

`Field.defaultValue`、容器级 `defaultValues`、`form.getValues()` 和 `useWatch()` 使用的都是字段 UI 值，而不是原始 API payload。

- `File`：UI 值为 `FileInfo | null`；提交值为 `fileId | null`
- `MultiFile`：UI 值为 `FileInfo[]`；提交值为 `fileId[] | null`
- `JSON` / `DTO`：已提交值保持为结构化对象或数组（或 `null`）
- `Filters`：已提交值保持为 `FilterCondition | null`
- `Orders`：已提交值保持为结构化排序元组或数组（或 `null`）
- 后端 payload 和元数据默认值仍可能以字符串形式到达；字段运行时会在加载时将它们归一化为上述 UI 形态
- 传页面/对话框级 `defaultValues` 时，请直接使用这些 UI 形态，不要提前把值序列化成字符串

### 文件字段

#### `File`

默认行为是通用文件上传。

运行时值契约：

- 表单/UI 值为 `FileInfo | null`
- 提交时会自动提取 `fileId`

```tsx
<Field fieldName="attachment" />
```

图片预览 / 上传场景可使用 `Image`：

```tsx
<Field fieldName="avatar" widgetType="Image" />

<Field
  fieldName="photo"
  widgetType="Image"
  widgetProps={{
    display: "avatar",
    avatarSize: "xl",
    previewUrl: userInfo.photoUrl,
    crop: { enabled: true, aspect: 1, shape: "round" },
  }}
/>
```

表格只读行为：

- `ModelTable` 和 `RelationTableView` 会直接读取 `FileInfo.url` 做预览或链接渲染
- `widgetType="Image"` 会渲染紧凑缩略图单元格，点击后打开图片预览对话框
- 普通 `File` 会渲染为可下载的文件名链接
- 表格只读单元格不会消费 `display="avatar"` 之类的 `widgetProps`，始终使用紧凑表格样式

#### `MultiFile`

默认行为是通用多文件上传。

运行时值契约：

- 表单/UI 值为 `FileInfo[]`
- 提交时会自动提取 `fileId[]`

```tsx
<Field fieldName="attachments" />
```

图库上传场景可使用 `MultiImage`：

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

表格只读行为：

- `ModelTable` 和 `RelationTableView` 期望值为 `FileInfo[]`
- `widgetType="MultiImage"` 会渲染紧凑缩略图摘要和 `+N`，点击后打开图库预览对话框
- 普通 `MultiFile` 会渲染第一项文件名链接并附带 `+N`
- 只读表格行会保持单行/不换行；只有处于激活态的内联编辑行才会因为文件 widget 而增高

`Image` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `accept` | `string` | `"image/*"` | 原生文件输入框的 accept 字符串。 |
| `aspectRatio` | `number \| string` | - | 仅影响预览比例。 |
| `objectFit` | `"cover" \| "contain"` | `"cover"` | 预览图适配模式。 |
| `uploadText` | `string` | `"Upload image"` 或 `"Upload photo"` | 空状态上传文案。 |
| `helperText` | `string` | - | widget 内部辅助文案。 |
| `display` | `"card" \| "avatar"` | `"card"` | `avatar` 为紧凑型头像布局。 |
| `avatarSize` | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"` | 仅在 `display="avatar"` 时使用。 |
| `previewUrl` | `string` | - | 当字段值仍是已保存文件 id 字符串时，用于展示已有图片 URL。 |
| `crop.enabled` | `boolean` | `false` | 上传前启用裁剪流程。 |
| `crop.aspect` | `number` | `avatar` 模式下为 `1`；否则由 `aspectRatio` 推导，若无则为 `4 / 3` | 裁剪比例。`1` 表示正方形。 |
| `crop.shape` | `"rect" \| "round"` | `"rect"` | 裁剪形状。 |
| `crop.zoom` | `boolean` | `true` | 是否启用缩放控制。 |
| `crop.minZoom` | `number` | `1` | 最小缩放。 |
| `crop.maxZoom` | `number` | `3` | 最大缩放。 |

`MultiImage` 额外支持：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `maxCount` | `number` | - | 最大上传图片数量。 |
| `columns` | `2 \| 3 \| 4 \| 5 \| 6` | `4` | 图库网格列数。 |

### JSON、DTO、Filters、Orders

#### `JSON` / `DTO`

默认行为是基于 CodeMirror 的 JSON 编辑器。

运行时值契约：

- 已提交的表单值保持为结构化对象或数组（或 `null`）
- 编辑器聚焦时会维护一份临时文本草稿，但在失焦/提交时会把结构化数据写回表单
- 自定义 `defaultValues`、`getValues()` 和自定义 payload 构造都应把这类字段视为结构化数据，而不是 JSON 字符串

```tsx
<Field fieldName="config" />
<Field fieldName="payload" />
```

阅读型树视图场景可使用 `JsonTree`：

```tsx
<Field fieldName="config" widgetType="JsonTree" />
```

JSON 编辑器 widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `height` | `number \| string` | - | 编辑器固定高度。 |
| `minHeight` | `number \| string` | `240px` | 编辑器最小高度。 |
| `maxHeight` | `number \| string` | - | 编辑器最大高度。 |
| `lineNumbers` | `boolean` | `true` | 编辑器侧边行号。 |
| `lineWrapping` | `boolean` | `true` | 长行自动换行。 |
| `tabSize` | `number` | `2` | 缩进宽度。 |
| `formatOnBlur` | `boolean` | `true` | 失焦后自动格式化合法 JSON。 |
| `autoFocus` | `boolean` | `false` | 挂载后自动聚焦编辑器。 |

#### `Filters`

默认始终使用过滤条件构建器。

运行时值契约：

- 已提交值保持为 `FilterCondition | null`
- 在 `defaultValue` / `defaultValues` 中优先直接传 `FilterCondition`；字符串输入只会在加载时被归一化

```tsx
<Field fieldName="filters" />
```

`Filters` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `allowedFields` | `string[]` | - | 允许搜索的字段白名单。 |
| `excludeFields` | `string[]` | - | 从构建器中隐藏字段。 |

#### `Orders`

默认始终使用排序构建器。

运行时值契约：

- 已提交值保持为结构化排序元组或数组（或 `null`）
- 在 `defaultValue` / `defaultValues` 中优先直接传结构化排序值；字符串输入只会在加载时被归一化

```tsx
<Field fieldName="orders" />
```

`Orders` widget props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `allowedFields` | `string[]` | - | 允许排序的字段白名单。 |
| `excludeFields` | `string[]` | - | 从构建器中隐藏字段。 |

## 布局说明

`fullWidth` 对以下类型有实际意义：

- `Text`
- `RichText`
- `Markdown`
- `Code`
- `OneToMany`
- `ManyToMany`

以上布局默认值为 `true`。

## ReadOnly 说明

如果用户仍需要清晰阅读或复制字段值，优先使用 `readOnly`，而不是禁用控件。

一般建议：

- `readOnly`：详情页、审计页、仅查看状态
- `disabled`：受工作流、权限、前置条件或提交状态限制

## 示例

```tsx
<Field fieldName="email" widgetType="Email" />

<Field fieldName="bio" widgetType="Text" fullWidth />

<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "preview", minHeight: 360 }}
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "sql", lineWrapping: false, minHeight: 320 }}
/>

<Field
  fieldName="avatar"
  widgetType="Image"
  widgetProps={{
    aspectRatio: "1 / 1",
    display: "avatar",
    crop: { enabled: true, shape: "round" },
  }}
/>

<Field
  fieldName="optionItems"
  tableView={
    <RelationTableView initialParams={{ orders: [["sequence", "ASC"]], pageSize: 10 }}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="itemName" />
      <Field fieldName="active" />
    </RelationTableView>
  }
  formView={OptionItemsFormView}
  isPaged
/>
```

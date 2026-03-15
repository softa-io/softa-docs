# 字段

供 `ModelForm`、关联对话框和内联编辑器使用的基于元数据驱动的字段系统。

`Field` 是应用代码中面向业务的主要入口。

本文用于说明：

- `Field` props 与覆盖方式
- `required` / `readonly` / `hidden`
- `dependsOn(...)`
- 关联 `filters`
- 远程 `Field.onChange`
- 运行时值契约
- 按字段类型划分的前端行为

相关文档：

- `./relation-fields.md`：`RelationTable`、`SelectTree`、`OneToMany`、`ManyToMany`
- `./widget-matrix.md`：`FieldType -> WidgetType` 矩阵与 widget 专属示例
- [ModelForm](../form)：页面壳层
- [ModelTable](../table)：只读单元格与内联编辑
- [Tree](../tree)：被 `sideTree` 和 `SelectTree` 使用的内部 tree 原语

## 导入

推荐的业务侧导入方式：

```tsx
import { Field } from "@/components/fields";
```

额外的公开导出：

```tsx
import {
  Field,
  RelationTable,
  type FieldCondition,
  type FieldConditionContext,
  type FieldOnChangeProp,
  type RelationFormView,
  type RelationTableProps,
} from "@/components/fields";
```

内部说明：

- `ResolvedFields` 属于内部实现，应保留在基础设施代码之后，而不是成为面向业务的字段 API

## 推荐用法

在应用代码中，将 `Field` 作为唯一入口：

```tsx
<Field fieldName="name" />
<Field fieldName="description" widgetType="Text" />
<Field fieldName="avatar" widgetType="Image" />
<Field fieldName="notes" widgetType="Markdown" />
```

运行时会自动解析：

- 从元数据中获取 `fieldType`
- 根据 `fieldType` 选择默认字段适配器
- 根据 `widgetType` 选择可选 widget 渲染器

直接使用适配器组件和底层 widget，只建议出现在字段基础设施内部。

快速关联示例：

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

```tsx
const userTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="email" />
  </RelationTable>
);

<Field fieldName="userIds" tableView={userTableView} />;
```

## 核心 Props

`Field` 基于元数据驱动，并支持字段级覆盖和运行时条件。

| Prop           | 类型                               | 必填 | 说明 |
| -------------- | ---------------------------------- | ---- | ---- |
| `fieldName`    | `string`                           | 是   | 当前模型中的元数据字段 key。 |
| `fieldType`    | `FieldType`                        | 否   | 可选的字段类型覆盖。若省略，则运行时使用元数据中的 `fieldType`。 |
| `widgetType`   | `WidgetType`                       | 否   | 可选的 widget 覆盖。必须与解析后的 `fieldType` 兼容。 |
| `widgetProps`  | `Record<string, unknown>`          | 否   | 仅用于 widget 专属配置。表单 widget 和内联编辑器会使用；表格只读单元格不会使用。 |
| `placeholder`  | `string`                           | 否   | 字段级输入占位文案。优先于 `widgetProps.placeholder`。 |
| `hideLabel`    | `boolean`                          | 否   | 隐藏整个标签区域。 |
| `fullWidth`    | `boolean`                          | 否   | 文本类字段和关联字段的布局提示。 |
| `labelName`    | `string`                           | 否   | 元数据标签覆盖。 |
| `required`     | `FieldCondition`                   | 否   | 动态必填控制。支持 `boolean`、`FilterCondition` 或 `dependsOn(...)`。 |
| `readonly`     | `FieldCondition`                   | 否   | 动态只读控制。支持 `boolean`、`FilterCondition` 或 `dependsOn(...)`。 |
| `hidden`       | `FieldCondition`                   | 否   | 动态可见性控制。隐藏字段不会渲染，同时会抑制其校验。 |
| `defaultValue` | `unknown`                          | 否   | 仅创建态使用的默认值覆盖。优先级高于 `metaField.defaultValue` 和对话框 / 页面级 `defaultValues`。 |
| `filters`      | `string \| FilterCondition`        | 否   | 关联过滤条件覆盖。`Field.filters` 会覆盖 `metaField.filters`。支持 JSON 字符串形式的元数据过滤条件以及 `#{fieldName}` 引用。 |
| `onChange`     | `FieldOnChangeProp`                | 否   | 远程字段联动。支持简写 `string[]` 或 `{ update?, with? }`。 |
| `tableView`    | `ReactElement<RelationTableProps>` | 否   | `OneToMany` / `ManyToMany` 的关联表格配置。必须是 `<RelationTable />` 元素。详见 `./relation-fields.md`。 |
| `formView`     | `RelationFormView`                 | 否   | 关联对话框 / 详情视图配置。详见 `./relation-fields.md`。 |
| `isPaged`      | `boolean`                          | 否   | 为 `OneToMany` / `ManyToMany` 启用分页关联表格模式。详见 `./relation-fields.md`。 |

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

- `boolean`：最简单直接的形式
- `FilterCondition`：推荐用于常见业务规则的声明式写法
- `dependsOn([...], evaluator)`：当需要显式字段订阅的函数式条件时推荐使用
- 无效的 `FilterCondition` 配置会触发开发态警告，并解析为 `false`
- 不支持裸函数条件；请使用 `dependsOn([...], evaluator)` 包裹
- 相同的条件模型也用于表单和表格工具栏中的 `Action.disabled` 与 `Action.hidden`
- `hidden` 会同时抑制渲染和校验
- 在 `ModelTable` / `RelationTable` 的内联编辑中，条件里的 `values` 是当前行对象，而不是整个表单对象
- 在表格声明中，`hidden` 只支持 `boolean`，且会隐藏整列
- `widgetProps` 不会透传给 `ModelTable` / `RelationTable` 的只读单元格渲染器
- `defaultValue` 适用于静态的字段级创建默认值。对于路由参数、父行值或未渲染字段等运行时 / 上下文预填，请使用对话框 / 页面级 `defaultValues`
- `required={false}` 可以放宽元数据里的 `required`；`readonly={false}` 可以覆盖元数据里的只读设置

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

## `dependsOn(...)`

当某个字段规则依赖其他值，且你希望显式声明订阅字段时，请使用 `dependsOn([...], evaluator)`。

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field
  fieldName="itemName"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

为什么优先用 `dependsOn(...)`，而不是裸函数：

- 依赖列表是显式的
- 运行时订阅更精确
- `evaluator` 依然保留完整的编程能力

优先级建议：先用 `boolean`，再用 `FilterCondition` 表达声明式业务规则，只有真正需要计算逻辑时再使用 `dependsOn(...)`。

## 关联 `filters`

`filters` 主要用于关联字段：

- `ManyToOne` / `OneToOne` 的可搜索关联查询
- `SelectTree` 的关联选择查询
- `OneToMany` / `ManyToMany` 的远程关联表格查询
- `ManyToMany` 选择器对话框查询

可接受输入：

- 应用代码中的 `FilterCondition`
- 来自元数据 / 后端 payload 的 JSON 字符串形式

过滤值中推荐使用的声明式值语法：

- `#{fieldName}`：在发请求前从当前前端作用域解析
- `TODAY`、`NOW`、`USER_ID`、`USER_EMP_ID`、`USER_POSITION_ID`、`USER_DEPT_ID`、`USER_COMP_ID`：原样透传，由后端替换环境变量
- `@{literal}`：原样透传，强制后端按字面量解释

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

行为：

- `Field.filters` 会覆盖 `metaField.filters`
- 如果省略 `Field.filters`，关联 widget 会回退到 `metaField.filters`
- `#{fieldName}` 会基于当前作用域值解析：
  - `ModelForm`：当前表单值
  - `ModelTable` 内联编辑：当前编辑行
  - `RelationTable` 内联编辑：当前关联行
- 解析后的字段值会在请求前做归一化：
  - `ManyToOne` / `OneToOne` -> `id`
  - `Option` -> `itemCode`
  - `MultiOption` -> `itemCode[]`
- 如果任意 `#{fieldName}` 依赖缺失，则关联查询会视为未就绪，不会发送请求
- 前端不会求值后端环境 token，例如 `TODAY`；它们会原样透传

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

行为：

- `onChange={["a", "b"]}` 是 `onChange={{ update: ["a", "b"] }}` 的简写
- 存在 `update`：只从响应 `values` 中提取这些字段
- 省略 `update`：会应用当前作用域内响应 `values` 的全部 key
- 省略 `with`：请求只在编辑态发送 `id`，并附带当前字段 `value`
- `with: ["a", "b"]`：请求会附带这些字段对应的 `values`，并使用提交 / API 形态
- `with: "all"`：请求会附带当前作用域的所有值，并使用提交 / API 形态

当前支持的作用域：

- `ModelForm`
- `ModelTable` 的当前内联编辑行
- `RelationTable` 的当前内联编辑行

当前非目标：

- 顶层独立 `OneToMany` / `ManyToMany` 容器交互不能作为触发源
- 独立对话框表单目前不会自动提供这套运行时能力

自动触发规则：

- `blur`：文本类和编辑器类字段，如 `String`、`MultiString`、数值输入、`JSON`、`Filters`、`Orders`、`Code`、`Markdown`、`RichText`
- `change`：提交型字段，如 `Boolean`、`Date`、`DateTime`、`Time`、`Option`、`MultiOption`、`ManyToOne`、`OneToOne`、`File`、`MultiFile`

前端使用的后端契约：

```http
POST /<modelName>/onChange/<fieldName>
```

请求体：

```json
{
  "id": "123",
  "value": "ITEM-001",
  "values": {
    "active": true
  }
}
```

响应体：

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

- `values` 只 patch 返回的 key；缺失的 key 保持不变
- 返回 `null` 表示明确清空
- `readonly` / `required` 会独立于 `update` 应用
- 远程返回的 `readonly` / `required` 会覆盖元数据和本地条件，直到后续响应或作用域重置

作用域说明：

- 在 `ModelForm` 中，`with: "all"` 使用当前表单的提交形态；已注册的顶层关联字段会序列化为关联 patch payload，而不是原始 UI 行
- 在 `ModelTable` / `RelationTable` 内联编辑中，`values` 和 `with: "all"` 都只针对当前行，而不是整个表格或父表单

## 级联字段

`MetaField.cascadedField` 可以在编辑作用域中启用隐式自动回填，而无需源字段显式声明 `Field.onChange`。

示例：

```ts
deptId.cascadedField = "employeeId.departmentId";
companyId.cascadedField = "employeeId.department.companyId";
```

行为：

- 支持于 `ModelForm`、`ModelTable` 内联编辑和 `RelationTable` 内联编辑
- 源字段必须是 `ManyToOne` 或 `OneToOne`，并且定义了 `relatedModel`
- 当源字段变化时，前端会请求一次 `/<relatedModel>/getById`，并从响应中读取所有依赖的级联路径
- 多个目标依赖同一个源字段时，会在一次查询中统一解析
- 如果源字段同时声明了 `Field.onChange`，两种效果会并行执行
- 如果两者都写入同一个目标字段，则 `cascadedField` 优先
- 清空源字段时，会直接清空所有依赖的级联目标，不会调用 `getById`
- 无效的级联元数据会被忽略，并给出开发态警告

语法说明：

- 格式为 `<sourceField>.<path>`
- `<sourceField>` 必须是当前作用域中的同级字段
- `<path>` 从源模型的 `getById` 响应中读取，可以是嵌套路径

## 字段类型概览

本节说明不同 `fieldType` 的默认前端行为。widget 专属变体和 props 表请见 `./widget-matrix.md`。

### 字符串与文本

- `String`：默认单行文本输入
- `MultiString`：标签式输入；值会在 `Enter`、`,` 或 blur 时提交，并以逗号分隔字符串存入表单状态
- 常见的 `String` widget 变体：
  - `URL`
  - `Email`
  - `Color`
  - `Text`
  - `RichText`
  - `Markdown`
  - `Code`

示例：

```tsx
<Field fieldName="name" />
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="Markdown" />
```

### 数值类型

- `Integer`、`Long`、`Double`：数字类输入
- `BigDecimal`：保留小数字符串语义
- 常见的数值类 widget 变体：
  - `Monetary`
  - `Percentage`
  - `Slider`

```tsx
<Field fieldName="amount" widgetType="Monetary" />
<Field fieldName="ratio" widgetType="Percentage" />
<Field fieldName="score" widgetType="Slider" />
```

### 布尔与选项类型

- `Boolean`：默认是 `Switch`
- `Option`：默认单选下拉
- `MultiOption`：默认是复选组风格的多选

常见 widget 变体：

- `CheckBox`
- `Radio`
- `StatusBar`

```tsx
<Field fieldName="active" />
<Field fieldName="active" widgetType="CheckBox" />
<Field fieldName="status" widgetType="Radio" />
```

### 日期与时间类型

- `Date`：标准日期选择器
- `DateTime`：日期时间输入
- `Time`：时间输入

特殊的格式导向 widget：

- `Date`：`yyyy-MM`、`MM-dd`
- `Time`：`HH:mm`、`HH:mm:ss`

```tsx
<Field fieldName="birthday" />
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="startTime" widgetType="HH:mm" />
```

### 引用类型

- `ManyToOne` / `OneToOne`：默认是可搜索的关联选择器
- 使用 `filters` 为查询添加依赖约束
- 使用 `widgetType="SelectTree"` 处理层级选择

```tsx
<Field fieldName="departmentId" />
<Field fieldName="departmentId" widgetType="SelectTree" />
```

`SelectTree`、`RelationTable`、`OneToMany`、`ManyToMany` 请见 `./relation-fields.md`。

### 文件类型

- `File`：默认通用上传；`Image` 为图片模式
- `MultiFile`：默认多文件上传；`MultiImage` 为图片画廊模式

```tsx
<Field fieldName="attachment" />
<Field fieldName="avatar" widgetType="Image" />
<Field fieldName="photos" widgetType="MultiImage" />
```

表格 / 只读行为：

- `ModelTable` 和 `RelationTable` 会直接使用 `FileInfo.url` 做预览和下载渲染
- 表格只读单元格会有意忽略面向表单的 `widgetProps`

### 结构化值类型

- `JSON` / `DTO`：结构化对象或数组值，默认编辑器偏向 JSON
- `Filters`：过滤构建器值
- `Orders`：排序构建器值

```tsx
<Field fieldName="config" />
<Field fieldName="filters" />
<Field fieldName="orders" />
```

## 运行时值契约

`Field.defaultValue`、容器级 `defaultValues`、`form.getValues()` 和 `useWatch()` 使用的都是字段 UI 值，而不是原始 API payload 值。

| 字段类型                  | UI / 表单值                         | 提交 / API 形态                         |
| ------------------------- | ----------------------------------- | --------------------------------------- |
| `File`                    | `FileInfo \| null`                  | `fileId \| null`                        |
| `MultiFile`               | `FileInfo[]`                        | `fileId[] \| null`                      |
| `JSON` / `DTO`            | 结构化对象 / 数组或 `null`          | 结构化对象 / 数组或 `null`              |
| `Filters`                 | `FilterCondition \| null`           | `FilterCondition \| null`               |
| `Orders`                  | 结构化排序元组或 `null`             | 结构化排序元组或 `null`                 |
| `OneToMany`               | 关联行 / 行草稿                     | 增量 patch map                          |
| `ManyToMany`              | `ModelReference[]` 或关联行         | 增量 patch map                          |

说明：

- 后端 payload 和元数据默认值可能仍以字符串形式到达；字段运行时会在加载时把它们归一化为 UI 形态
- 传入页面 / 对话框 `defaultValues` 时，请直接使用上表中的 UI 形态，而不是预先字符串化
- `ManyToMany` 即使使用 `widgetType="TagList"`，提交时仍是普通增量 patch map
- 顶层关联字段的细节请见 `./relation-fields.md`

### `FileInfo`

`File` 和 `MultiFile` 字段在 UI 状态中使用 `FileInfo` 对象。

重要运行时行为：

- 预览和下载渲染使用 `FileInfo.url`
- `File` 只读单元格会回退为文件名链接
- `MultiFile` 只读单元格显示第一个文件名，并附带 `+N`

## 布局说明

`fullWidth` 对这些字段渲染器有意义：

- `Text`
- `RichText`
- `Markdown`
- `Code`
- `OneToMany`
- `ManyToMany`

这些布局的默认值都是 `true`。

## 只读说明

当用户仍然需要清晰读取或复制值时，优先使用 `readonly`，而不是禁用控件。

一般建议：

- `readonly`：详情页、审计页、仅查看状态
- `disabled`：受工作流、权限、前置条件或提交状态阻塞

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
```

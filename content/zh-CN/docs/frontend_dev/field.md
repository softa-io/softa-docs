# Fields

基于元数据的字段系统，供 `ModelForm`、关联对话框和内联编辑器使用。

## 相关文档

- `src/components/views/form/README.md`：`ModelForm`、`FormBody`、`FormToolbar`、页面级壳层
- `src/components/views/table/README.md`：`ModelTable` 和表格侧渲染器
- `src/components/views/tree/README.md`：底层 `Tree`、`TreePanel`、`SelectTreePanel`

## 导入

推荐在业务代码中这样导入：

```tsx
import { Field } from "@/components/fields";
```

其他公开导出：

```tsx
import {
  Field,
  defineRelationTableView,
  type RelationFormView,
  type RelationTableView,
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

`Field` 基于元数据驱动，并支持字段级覆盖。

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `fieldName` | `string` | 是 | 当前模型中的元数据字段名。 |
| `widgetType` | `WidgetType` | 否 | 可选的 widget 覆盖，必须与元数据 `fieldType` 兼容。 |
| `widgetProps` | `Record<string, unknown>` | 否 | 仅用于 widget 专属配置，由各 widget 内部解析。 |
| `placeholder` | `string` | 否 | 字段级输入占位文案。优先使用它，而不是 `widgetProps.placeholder`。 |
| `hideLabel` | `boolean` | 否 | 隐藏整个标签区块。 |
| `fullWidth` | `boolean` | 否 | 文本类字段和关联字段的布局提示。 |
| `readOnly` | `boolean` | 否 | 强制只读模式。 |
| `labelName` | `string` | 否 | 元数据标签覆盖。 |
| `description` | `string` | 否 | 元数据描述覆盖。 |
| `required` | `boolean` | 否 | 元数据必填覆盖。 |
| `readonly` | `boolean` | 否 | 元数据只读覆盖。 |
| `defaultValue` | `unknown` | 否 | 元数据默认值覆盖。 |
| `filters` | `string` | 否 | 元数据过滤条件覆盖，主要用于关联字段。 |
| `tableView` | `RelationTableView` | 否 | `OneToMany` / `ManyToMany` 表格配置。 |
| `formView` | `RelationFormView` | 否 | 关联对话框 / 详情表单配置。 |
| `isPaged` | `boolean` | 否 | 启用关联表格分页模式。 |

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

层级选择场景可使用 `SelectTree`：

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

#### `OneToMany`

渲染为关联表格，可配合内联编辑或对话框编辑。对外公开用法仍然通过 `Field`。

```tsx
<Field fieldName="optionItems" tableView={optionItemsTableView} />
```

常用 props：

- `tableView`：关联表格列 / 排序 / page size
- `formView`：行创建 / 编辑的对话框表单
- `isPaged`：启用分页 / 远程关联模式

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
<Field fieldName="userIds" tableView={userTableView} />
```

默认提交行为是增量 patch map：

```json
{
  "Add": ["1", "2"],
  "Remove": ["3"]
}
```

### 文件字段

#### `File`

默认行为是通用文件上传。

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

#### `MultiFile`

默认行为是通用多文件上传。

```tsx
<Field fieldName="attachments" />
```

图库上传场景可使用 `MultiImage`：

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

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
  tableView={optionItemsTableView}
  formView={OptionItemsFormView}
  isPaged
/>
```

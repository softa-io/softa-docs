# 组件矩阵

本文用于说明：

- `FieldType -> WidgetType` 兼容关系
- widget 示例
- widget 专属 `widgetProps`

相关文档：

- [Fields](./index)：核心 `Field` props、条件、`filters`、`Field.onChange`、值契约
- [关联字段](./relations)：`RelationTable`、`SelectTree`、`OneToMany`、`ManyToMany`

## FieldType -> WidgetType 矩阵

| FieldType     | 默认行为                 | 支持的 WidgetType                                             |
| ------------- | ------------------------ | ------------------------------------------------------------- |
| `String`      | 单行输入                 | `URL`, `Email`, `Text`, `RichText`, `Markdown`, `Code`, `Color` |
| `MultiString` | 逗号 / 回车提交的标签输入 | -                                                             |
| `Integer`     | 数字输入                 | `Monetary`, `Percentage`, `Slider`                            |
| `Long`        | 数字输入                 | `Monetary`, `Percentage`, `Slider`                            |
| `Double`      | 数字输入                 | `Monetary`, `Percentage`, `Slider`                            |
| `BigDecimal`  | 保留小数字符串语义的输入 | `Monetary`, `Percentage`, `Slider`                            |
| `Boolean`     | 开关                     | `CheckBox`                                                    |
| `Date`        | 日期选择器               | `yyyy-MM`, `MM-dd`                                            |
| `DateTime`    | 日期时间输入             | -                                                             |
| `Time`        | 时间输入                 | `HH:mm:ss`, `HH:mm`                                           |
| `Option`      | 单选下拉                 | `Radio`, `StatusBar`                                          |
| `MultiOption` | 复选框组                 | `CheckBox`                                                    |
| `ManyToOne`   | 关联选择                 | `SelectTree`                                                  |
| `OneToOne`    | 关联选择                 | `SelectTree`                                                  |
| `ManyToMany`  | 关联表格 + 选择器对话框  | `SelectTree`, `TagList`                                       |
| `OneToMany`   | 关联表格                 | -                                                             |
| `File`        | 文件上传                 | `Image`                                                       |
| `MultiFile`   | 多文件上传               | `MultiImage`                                                  |
| `JSON`        | CodeMirror JSON 编辑器   | `JsonTree`                                                    |
| `Filters`     | 过滤构建器               | -                                                             |
| `Orders`      | 排序构建器               | -                                                             |
| `DTO`         | CodeMirror JSON 编辑器   | `JsonTree`                                                    |

## 字符串类 Widgets

### 默认 `String`

```tsx
<Field fieldName="name" />
```

### `URL`, `Email`, `Color`

```tsx
<Field fieldName="homepage" widgetType="URL" />
<Field fieldName="contactEmail" widgetType="Email" />
<Field fieldName="themeColor" widgetType="Color" />
```

### `Text`

```tsx
<Field fieldName="description" widgetType="Text" />
```

### `RichText`

```tsx
<Field fieldName="content" widgetType="RichText" />
```

### `Markdown`

```tsx
<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>
```

`Markdown` widget props：

| Prop           | 类型                             | 默认值    | 说明                                                                     |
| -------------- | -------------------------------- | --------- | ------------------------------------------------------------------------ |
| `mode`         | `"split" \| "edit" \| "preview"` | `"split"` | `split` 同时显示编辑器和预览；`edit` 仅编辑器；`preview` 仅预览。       |
| `height`       | `number \| string`               | -         | 编辑器 / 预览面板的固定高度。                                            |
| `minHeight`    | `number \| string`               | `320px`   | 面板最小高度。                                                            |
| `maxHeight`    | `number \| string`               | -         | 面板最大高度。                                                            |
| `lineNumbers`  | `boolean`                        | `true`    | 编辑器行号。                                                              |
| `lineWrapping` | `boolean`                        | `true`    | 是否折行显示较长的 Markdown 行。                                         |
| `tabSize`      | `number`                         | `2`       | 编辑器缩进大小。                                                          |
| `autoFocus`    | `boolean`                        | `false`   | 挂载后自动聚焦编辑器。                                                    |

预览由 `react-markdown` 渲染，并默认启用 `remark-gfm`。

### `Code`

```tsx
<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>
```

`Code` widget props：

| Prop           | 类型                                                                                               | 默认值    | 说明                   |
| -------------- | -------------------------------------------------------------------------------------------------- | --------- | ---------------------- |
| `language`     | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"`   | `"plain"` | 语法高亮语言。         |
| `height`       | `number \| string`                                                                                 | -         | 编辑器固定高度。       |
| `minHeight`    | `number \| string`                                                                                 | `240px`   | 编辑器最小高度。       |
| `maxHeight`    | `number \| string`                                                                                 | -         | 编辑器最大高度。       |
| `lineNumbers`  | `boolean`                                                                                          | `true`    | 编辑器行号。           |
| `lineWrapping` | `boolean`                                                                                          | `true`    | 是否折行。             |
| `tabSize`      | `number`                                                                                           | `2`       | 编辑器缩进大小。       |
| `autoFocus`    | `boolean`                                                                                          | `false`   | 挂载后自动聚焦编辑器。 |

## `MultiString`

```tsx
<Field fieldName="tags" />
```

## 数值类 Widgets

### `Monetary`

```tsx
<Field fieldName="amount" widgetType="Monetary" />
```

### `Percentage`

```tsx
<Field fieldName="ratio" widgetType="Percentage" />
```

### `Slider`

```tsx
<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>
```

`Slider` widget props：

| Prop       | 类型     | 默认值                           | 说明           |
| ---------- | -------- | -------------------------------- | -------------- |
| `minValue` | `number` | `0`                              | 滑块最小值。   |
| `maxValue` | `number` | `100`                            | 滑块最大值。   |
| `step`     | `number` | 根据字段类型 / 精度自动推断      | 步长。         |

## 布尔与选项类 Widgets

### `CheckBox`

```tsx
<Field fieldName="active" widgetType="CheckBox" />
```

### `Radio`

```tsx
<Field fieldName="status" widgetType="Radio" />
```

`Radio` widget props：

| Prop        | 类型                         | 默认值       | 说明                 |
| ----------- | ---------------------------- | ------------ | -------------------- |
| `direction` | `"horizontal" \| "vertical"` | `"vertical"` | 单选项的布局方向。   |

### `StatusBar`

```tsx
<Field fieldName="status" widgetType="StatusBar" />
```

`StatusBar` widget props：

| Prop   | 类型      | 默认值 | 说明                     |
| ------ | --------- | ------ | ------------------------ |
| `wrap` | `boolean` | `true` | 是否允许状态项换行。     |

## 日期与时间类 Widgets

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />
<Field fieldName="anniversary" widgetType="MM-dd" />
<Field fieldName="startTime" widgetType="HH:mm" />
<Field fieldName="startTime" widgetType="HH:mm:ss" />
```

## 关联类 Widgets

### `SelectTree`

```tsx
<Field fieldName="departmentId" widgetType="SelectTree" />
```

### `TagList`

```tsx
<Field fieldName="userIds" widgetType="TagList" tableView={userTableView} />
```

关联专属行为、查询规则和 `RelationTable` 请见 [Relation Fields](./relations)。

## 文件与图片类 Widgets

### `Image`

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

`Image` widget props：

| Prop           | 类型                           | 默认值                                                                   | 说明                                                                     |
| -------------- | ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `accept`       | `string`                       | `"image/*"`                                                              | 原生文件输入的 `accept` 字符串。                                         |
| `aspectRatio`  | `number \| string`             | -                                                                        | 仅影响预览比例。                                                          |
| `objectFit`    | `"cover" \| "contain"`         | `"cover"`                                                                | 预览图的填充模式。                                                        |
| `uploadText`   | `string`                       | `"Upload image"` 或 `"Upload photo"`                                     | 空状态上传文案。                                                          |
| `helperText`   | `string`                       | -                                                                        | widget 局部帮助文案。                                                     |
| `display`      | `"card" \| "avatar"`           | `"card"`                                                                 | `avatar` 为紧凑的头像布局。                                               |
| `avatarSize`   | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"`                                                                   | 仅在 `display="avatar"` 时生效。                                          |
| `previewUrl`   | `string`                       | -                                                                        | 当字段值仍是已保存文件 id 字符串时，用于显示已有图片的 URL。            |
| `crop.enabled` | `boolean`                      | `false`                                                                  | 是否在上传前启用裁剪流程。                                                |
| `crop.aspect`  | `number`                       | `avatar` 模式下为 `1`；否则取 `aspectRatio`，若仍为空则为 `4 / 3`        | 裁剪比例，`1` 表示正方形。                                                |
| `crop.shape`   | `"rect" \| "round"`            | `"rect"`                                                                 | 裁剪形状。                                                                |
| `crop.zoom`    | `boolean`                      | `true`                                                                   | 是否启用缩放控制。                                                        |
| `crop.minZoom` | `number`                       | `1`                                                                      | 最小缩放值。                                                              |
| `crop.maxZoom` | `number`                       | `3`                                                                      | 最大缩放值。                                                              |

### `MultiImage`

```tsx
<Field fieldName="photos" widgetType="MultiImage" />
```

`MultiImage` 额外支持：

| Prop       | 类型                    | 默认值 | 说明                 |
| ---------- | ----------------------- | ------ | -------------------- |
| `maxCount` | `number`                | -      | 最多可上传的图片数。 |
| `columns`  | `2 \| 3 \| 4 \| 5 \| 6` | `4`    | 画廊网格列数。       |

## 结构化值类 Widgets

### `JsonTree`

```tsx
<Field fieldName="config" widgetType="JsonTree" />
```

JSON 编辑器 widget props：

| Prop           | 类型               | 默认值 | 说明                   |
| -------------- | ------------------ | ------ | ---------------------- |
| `height`       | `number \| string` | -      | 编辑器固定高度。       |
| `minHeight`    | `number \| string` | `240px` | 编辑器最小高度。      |
| `maxHeight`    | `number \| string` | -      | 编辑器最大高度。       |
| `lineNumbers`  | `boolean`          | `true` | 编辑器行号。           |
| `lineWrapping` | `boolean`          | `true` | 是否折行。             |
| `tabSize`      | `number`           | `2`    | 缩进大小。             |
| `formatOnBlur` | `boolean`          | `true` | 失焦时重新格式化合法 JSON。 |
| `autoFocus`    | `boolean`          | `false` | 挂载后自动聚焦编辑器。 |

### `Filters`

```tsx
<Field fieldName="filters" />
```

`Filters` widget props：

| Prop            | 类型       | 默认值 | 说明                   |
| --------------- | ---------- | ------ | ---------------------- |
| `allowedFields` | `string[]` | -      | 可搜索字段白名单。     |
| `excludeFields` | `string[]` | -      | 在构建器中隐藏的字段。 |

### `Orders`

```tsx
<Field fieldName="orders" />
```

`Orders` widget props：

| Prop            | 类型       | 默认值 | 说明                 |
| --------------- | ---------- | ------ | -------------------- |
| `allowedFields` | `string[]` | -      | 可排序字段白名单。   |
| `excludeFields` | `string[]` | -      | 在构建器中隐藏的字段。 |

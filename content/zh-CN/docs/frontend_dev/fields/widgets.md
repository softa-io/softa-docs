# Widget 矩阵

本文用于说明：

- `FieldType -> WidgetType` 兼容关系
- widget 示例
- widget 专属 `widgetProps`

相关文档：

- [Fields](./fields)：核心 `Field` props、条件、`filters`、`Field.onChange`、值契约
- [关联字段](./relations)：`RelationTable`、`SelectTree`、`OneToMany`、`ManyToMany`

## FieldType -> WidgetType 矩阵

| FieldType     | 默认行为                   | 支持的 WidgetType                                                                                   |
| ------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| `String`      | 单行输入                   | `URL`, `Email`, `Text`, `RichText`, `TemplateEditor`, `Markdown`, `Code`, `Color`, `yyyy-MM`, `MM-dd`, `CronEditor` |
| `MultiString` | 逗号 / 回车提交的标签式输入 | -                                                                                                   |
| `Integer`     | 数字输入                   | `Monetary`, `Percentage`, `Slider`                                                                  |
| `Long`        | 数字输入                   | `Monetary`, `Percentage`, `Slider`                                                                  |
| `Double`      | 数字输入                   | `Monetary`, `Percentage`, `Slider`                                                                  |
| `BigDecimal`  | 十进制字符串输入           | `Monetary`, `Percentage`, `Slider`                                                                  |
| `Boolean`     | 开关                       | `CheckBox`                                                                                          |
| `Date`        | 日期选择器                 | -                                                                                                   |
| `DateTime`    | 日期时间输入               | -                                                                                                   |
| `Time`        | 时间输入                   | `HH:mm:ss`, `HH:mm`                                                                                 |
| `Option`      | 单选                       | `Radio`, `StatusBar`, `Badge`                                                                       |
| `MultiOption` | 复选框组                   | `CheckBox`, `Badge`                                                                                 |
| `ManyToOne`   | 引用选择                   | `SelectTree`                                                                                        |
| `OneToOne`    | 引用选择                   | `SelectTree`                                                                                        |
| `ManyToMany`  | 关联表格 + 选择器对话框    | `SelectTree`, `TagList`                                                                             |
| `OneToMany`   | 关联表格                   | -                                                                                                   |
| `File`        | 文件上传                   | `Image`                                                                                             |
| `MultiFile`   | 多文件上传                 | `MultiImage`                                                                                        |
| `JSON`        | CodeMirror JSON 编辑器     | `JsonTree`                                                                                          |
| `Filters`     | 过滤构建器                 | -                                                                                                   |
| `Orders`      | 排序构建器                 | -                                                                                                   |
| `DTO`         | CodeMirror JSON 编辑器     | `JsonTree`                                                                                          |

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

基于 Tiptap 的所见即所得富文本编辑器，存储和读取 HTML 字符串。

工具栏：加粗、斜体、下划线、删除线、标题（H1–H4）、无序/有序列表、缩进/反缩进、文本对齐、链接、图片上传、表格、分割线、高亮、撤销/重做。

图片处理：

- **上传** — 工具栏图片按钮打开系统文件选择器；所选图片以 base64 data URL 读入并内联插入。不提供外部 URL 输入。
- **缩放** — 点击图片选中后，可拖动四角任一控制点调整大小。宽度保存在节点上；高度通过 `height: auto` 等比缩放。
- **序列化** — 图片在 HTML 中使用内联样式以便携带：`<img src="..." width="400" style="width: 400px; max-width: 100%; height: auto;">`。未显式指定宽度的图片使用 `style="max-width: 100%; height: auto;"`。

两级懒加载：只读模式直接渲染原始 HTML，不加载编辑器；编辑模式再懒加载完整 Tiptap 编辑器。

```tsx
<Field fieldName="content" widgetType="RichText" />
```

### `TemplateEditor`

基于 Tiptap 的模板编辑器，用于设计邮件模板、文档模板等需在后端渲染或生成 PDF 的内容。

存储格式：带 `data-tpl-*` 属性的 HTML，用于模板专属节点。编辑器通过自定义 `parseHTML` / `renderHTML` 规则在存储的 HTML 与 Tiptap JSON 之间自动往返转换。

功能：

- **字段占位符** — 以行内标签块插入模型字段。HTML 输出：`<span data-tpl-field="fieldPath" data-tpl-label="label">{{fieldPath}}</span>`。「插入字段」选择器（含关联一层路径与循环表列选项）会排除 `@/types/BaseModel` 中的 `reversedFields`（如 `id`、`tenantId`、`version`、审计时间戳与用户引用等），与其他将这些视为系统托管字段的流程一致。
- **自定义变量** — 以行内标签块插入一次性变量。HTML 输出：`<span data-tpl-variable="employee_name" data-tpl-label="Employee Name" data-tpl-value-type="String" data-tpl-required="true">{{employee_name}}</span>`
- **签名槽** — 插入固定尺寸、可内联于文字流中的签名占位。同一行可插入多个签名槽，并排显示，槽之间可留打字间距或文字。默认工具栏预设对应签署方槽位（如 `Sender` 与 `Receiver`）。HTML 输出：`<span data-tpl-signature="Sender" data-tpl-label="Sender Signature"></span>`
- **关联字段展开** — 将 `ManyToOne` / `OneToOne` 关联展开一层，插入嵌套路径（如 `department.name`）
- **循环表格** — 将 `OneToMany` / `ManyToMany` 关联以可选列的循环表格插入。HTML 输出：`<table data-tpl-loop="relationField" data-tpl-model="RelatedModel">` 及 `<th data-tpl-field="col">` 表头
- **工具栏动作** — 「插入字段」「插入变量」「插入签名」可按 widget props 分别配置
- **两级懒加载** — 与 `RichText` 相同：只读仅渲染 HTML；编辑时再懒加载完整编辑器
- **已保存记录预览** — `DocumentTemplate` 富文本记录可在新标签打开 `/admin/document-template/[id]/preview`，左侧大纲可在变量与签名槽之间跳转，`Preview As` 可在 `All`、`Sender`、`Receiver` 间切换，点击文档预览中的高亮占位可填写自定义变量并在本地采集签名

```tsx
<Field
  fieldName="offerLetterTemplate"
  widgetType="TemplateEditor"
  widgetProps={{ modelName: "Employee" }}
/>
```

```tsx
<Field
  fieldName="htmlTemplate"
  widgetType="TemplateEditor"
  widgetProps={{ modelName: "{{ modelName }}" }}
/>
```

`TemplateEditor` widget props：

| Prop                    | 类型               | 默认值  | 说明                                                                                                                                    |
| ----------------------- | ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `modelName`             | `string`           | -       | 可供插入字段的模型。支持 `"Employee"` 等静态值，或 `"{{ modelName }}"` 等字段引用。                                                     |
| `minHeight`             | `number \| string` | `320px` | 编辑器最小高度。                                                                                                                        |
| `enableInsertField`     | `boolean`          | `true`  | 工具栏是否显示 `Insert Field`。                                                                                                         |
| `enableInsertVariable`  | `boolean`          | `true`  | 工具栏是否显示 `Insert Variable`。                                                                                                     |
| `enableInsertSignature` | `boolean`          | `true`  | 工具栏是否显示 `Insert Signature`。                                                                                                    |

若未提供 `modelName`，会回退到字段自身的 `metaField.modelName`。

自定义变量 schema：

| 属性        | 类型                                            | 说明                                                                                                              |
| ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `code`      | `string`                                        | 必填。必须以字母开头，其余仅字母、数字或下划线；在模板内唯一。                                                     |
| `label`     | `string`                                        | 必填，编辑器与只读预览中的展示标签。                                                                             |
| `valueType` | `"String" \| "Date" \| "DateTime" \| "Boolean"` | 控制预览中的输入类型与格式化。                                                                                   |
| `required`  | `boolean`                                       | 必填变量在预览页填完前会显示校验反馈。                                                                           |

自定义变量行为：

- `Insert Variable` 会打开对话框填写 `code`、`label`、`valueType`、`required`
- `code` 必填且在模板内唯一
- 编辑器内可编辑已有变量的行内标签块以更新 `code`、`label`、`valueType`、`required`

签名槽行为：

- `Insert Signature` 打开下拉菜单，包含 `Sender Signature` 与 `Receiver Signature`
- 选择 `Sender Signature` 会插入 `code="Sender"` 的签名槽
- 选择 `Receiver Signature` 会插入 `code="Receiver"` 的签名槽
- `code` 必填且在模板内唯一
- 默认槽位尺寸为 `240 x 120`；点击槽位选中后，可拖动任意角控制点自由调整宽高（最小 `120 x 60`）
- 调整后的尺寸保存在节点的 `data-tpl-width` / `data-tpl-height` 属性及内联 `style` 中；槽内签名图通过 `width: 100%; height: 100%; object-fit: contain` 填满槽位
- 同一行可插入多个签名槽
- 相邻签名槽可同处一行，中间可插入普通文字或间距
- 编辑器内可编辑已有签名槽以更新其 `code` 与 `label`
- 预览页支持手绘签名与本地上传签名图

与角色相关的预览与签署行为：

- `/admin/document-template/[id]/preview` 提供 `Preview As` 选择器，可选 `All`、`Sender`、`Receiver`
- `Preview As = All` 时，所有签名槽均可编辑，适用于管理员 / 模板测试流程
- `Preview As = Sender` 时，仅允许 `Sender` 签名槽打开签名对话框；其余签名槽为锁定 / 只读
- `Preview As = Receiver` 时，仅允许 `Receiver` 签名槽打开签名对话框；其余签名槽为锁定 / 只读
- 预览左侧大纲同步该状态：当前参与方槽位标为可编辑，另一方为锁定
- `/admin/signing-document/[id]/sign` 为单一已分配槽位的专注签署工作区，签署方展示标签由 `SigningDocument.signSlotCode` 解析得到
- 签署工作区仅提交已分配的 `signSlotCode`；若未分配槽位，则阻止签署，页面显示空状态警告而非签名采集流程
- 当前预设角色标签为 `Sender` 与 `Receiver`；若后续引入其他参与方，需先更新共享的签名预设定义，再扩展模板或签署流程

### `yyyy-MM`

以 `"yyyy-MM"` 字符串存储的年月选择器（例如 `"2024-03"`）。弹出面板含年份导航（箭头）与月份网格。点击年份标签进入年份网格视图；点击某年回到该年的月份网格。

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />
```

值契约：`"yyyy-MM"` 格式的 `string`，清空时为 `undefined`。

### `MM-dd`

以 `"MM-dd"` 字符串存储的月日选择器（例如 `"03-15"`）。弹出面板为日期网格日历。点击表头月份标签进入月份网格；点击某月回到该月的日期网格。2 月 29 日始终可选（与年份无关的字段）。

```tsx
<Field fieldName="anniversary" widgetType="MM-dd" />
```

值契约：`"MM-dd"` 格式的 `string`，清空时为 `undefined`。

### `CronEditor`

可视化 Cron 表达式编辑器。存储标准 cron 字符串（5 段或 6 段）。打开弹出面板，各 cron 位置（秒、分、时、日、月、周）为分标签页编辑。每个标签支持四种模式：Every（通配符）、Specific values（多选网格）、Range（起止区间）、Interval（从 X 起每 N）。面板显示实时表达式预览与后续若干次计划执行时间。

```tsx
<Field fieldName="cronExpression" widgetType="CronEditor" />
```

```tsx
<Field
  fieldName="schedule"
  widgetType="CronEditor"
  widgetProps={{ format: "5-part" }}
/>
```

`CronEditor` widget props：

| Prop           | 类型                   | 默认值   | 说明                                           |
| -------------- | ---------------------- | -------- | ---------------------------------------------- |
| `format`       | `"6-part" \| "5-part"` | `"6-part"` | 6 段包含「秒」标签；5 段隐藏「秒」标签。     |
| `showPreview`  | `boolean`              | `true`   | 是否在面板中显示后续执行时间预览。             |
| `previewCount` | `number`               | `5`      | 展示的后续执行时间条数。                       |

值契约：标准 cron 格式的 `string`（例如 6 段 `"0 30 9 * * *"`，5 段 `"30 9 * * *"`），清空时为空字符串。

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
| `minHeight`    | `number \| string`               | `320px`   | 面板最小高度。                                                           |
| `maxHeight`    | `number \| string`               | -         | 面板最大高度。                                                           |
| `lineNumbers`  | `boolean`                        | `true`    | 编辑器行号。                                                             |
| `lineWrapping` | `boolean`                        | `true`    | 是否折行显示较长的 Markdown 行。                                         |
| `tabSize`      | `number`                         | `2`       | 编辑器缩进大小。                                                         |
| `autoFocus`    | `boolean`                        | `false`   | 挂载后自动聚焦编辑器。                                                   |

编辑器工具栏（在 `edit` 与 `split` 模式下显示）：

- **行数** — 显示总行数（当 `lineNumbers` 为 `true` 时可见）
- **搜索** — 打开 CodeMirror 搜索面板（也可用 `Ctrl/Cmd+F`）
- **复制** — 将编辑器全文复制到剪贴板

字段只读且值为空（或仅空白）时，编辑器主体显示 `CodeEditorEmptyState`（`shared/code-editor-empty-state.tsx`），使用 UI 说明样式而非空 CodeMirror；默认文案为 “No content to display.”。在 Studio 等自定义宿主中若直接组合该组件，可传入 `emptyMessage`。

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

| Prop               | 类型                                                                                          | 默认值    | 说明                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `language`         | `"plain" \| "java" \| "html" \| "json" \| "markdown" \| "python" \| "sql" \| "yaml" \| "yml"` | `"plain"` | 语法高亮语言。                                                                                                                           |
| `height`           | `number \| string`                                                                            | -         | 编辑器固定高度。                                                                                                                         |
| `minHeight`        | `number \| string`                                                                            | `240px`   | 编辑器最小高度。                                                                                                                         |
| `maxHeight`        | `number \| string`                                                                            | -         | 编辑器最大高度。                                                                                                                         |
| `lineNumbers`      | `boolean`                                                                                     | `true`    | 编辑器行号。                                                                                                                             |
| `lineWrapping`     | `boolean`                                                                                     | `true`    | 是否折行。                                                                                                                               |
| `tabSize`          | `number`                                                                                      | `2`       | 编辑器缩进大小。                                                                                                                         |
| `autoFocus`        | `boolean`                                                                                     | `false`   | 挂载后自动聚焦编辑器。                                                                                                                   |
| `showDownload`     | `boolean`                                                                                     | `true`    | 工具栏 **下载** 控件。设为 `false` 可隐藏。表单提交中（`isSubmitting`）时也会隐藏。                                                     |
| `downloadFileName` | `string`                                                                                      | -         | 建议的下载文件名。默认由净化后的 `fieldName` 加上根据 `language` 推断的扩展名（如 `script.sql`）。                                       |

编辑器工具栏：

- **行数** — 显示总行数（当 `lineNumbers` 为 `true` 时可见）
- **搜索** — 打开 CodeMirror 搜索面板（也可用 `Ctrl/Cmd+F`）
- **复制** — 将编辑器全文复制到剪贴板
- **下载** — 在浏览器中将当前值保存为文本文件（客户端 Blob，无服务端请求）。字段只读时仍可使用。

只读且值为空（或仅空白）时，编辑器主体显示 `CodeEditorEmptyState`，行为与上文 `Markdown` 小节一致。

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

| Prop        | 类型                         | 默认值       | 说明               |
| ----------- | ---------------------------- | ------------ | ------------------ |
| `direction` | `"horizontal" \| "vertical"` | `"vertical"` | 单选项的布局方向。 |

### `StatusBar`

```tsx
<Field fieldName="status" widgetType="StatusBar" />
```

`StatusBar` widget props：

| Prop   | 类型      | 默认值 | 说明                 |
| ------ | --------- | ------ | -------------------- |
| `wrap` | `boolean` | `true` | 是否允许状态项换行。 |

### `Badge`

用于 `Option`、`MultiOption` 的只读徽章展示。使用 `getOptionStatusBadgeVariant` 将当前值渲染为彩色 `StatusBadge`，与表格单元格自动渲染使用同一套颜色逻辑。

- **`Option`** — 为当前选中值渲染单个徽章。
- **`MultiOption`** — 为每个选中值各渲染一个徽章。

```tsx
<Field fieldName="status" widgetType="Badge" />
<Field fieldName="tags" widgetType="Badge" />
```

无 widget props。徽章变体由 `itemColor` / 文本规则推导（见下表）。

### 选项颜色 → 徽章自动渲染

当 `OptionReference.itemColor` 有值时，`Option` 与 `MultiOption` 表格单元格会自动渲染为 `StatusBadge`，无需 `widgetType="StatusBar"`。

支持的 `itemColor` 关键字与徽章变体：

| `itemColor` 关键字 | 徽章变体  | 视觉                               |
| ------------------ | --------- | ---------------------------------- |
| `green`            | `success` | 绿色描边 / 背景 / 文字             |
| `yellow`、`orange` | `warning` | 琥珀色描边 / 背景 / 文字           |
| `red`              | `error`   | 红色描边 / 背景 / 文字             |
| `blue`             | `info`    | 蓝色描边 / 背景 / 文字             |
| _（其他 / 空）_    | `neutral` | 石板色描边 / 背景 / 文字           |

颜色匹配不区分大小写，且使用 `includes`，故 `"Green"`、`"light-green"`、`"#green-500"` 等均能匹配。

当 `itemColor` 为空时，映射器会回退到对 `itemName` / `itemCode` 的文本模式匹配：

| `itemName` 或 `itemCode` 中的文本模式                 | 徽章变体  |
| ----------------------------------------------------- | --------- |
| `success`、`active`、`enabled`、`approved`            | `success` |
| `pending`、`warning`、`draft`                         | `warning` |
| `error`、`failed`、`inactive`、`disabled`、`rejected` | `error`   |
| `processing`、`running`、`published`                  | `info`    |

## 日期与时间类 Widgets

```tsx
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
<Field fieldName="userIds" widgetType="TagList" tableView={UserTableView} />
```

关联专属行为、查询规则与 `RelationTable` 请见 [关联字段](./relations)。

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
| `accept`       | `string`                       | `"image/*"`                                                              | 原生文件输入的 `accept` 字符串。                                       |
| `aspectRatio`  | `number \| string`             | -                                                                        | 仅影响预览比例。                                                        |
| `objectFit`    | `"cover" \| "contain"`         | `"cover"`                                                                | 预览图的填充模式。                                                      |
| `uploadText`   | `string`                       | `"Upload image"` 或 `"Upload photo"`                                     | 空状态上传文案。                                                        |
| `helperText`   | `string`                       | -                                                                        | widget 局部帮助文案。                                                   |
| `display`      | `"card" \| "avatar"`           | `"card"`                                                                 | `avatar` 为紧凑的头像布局。                                             |
| `avatarSize`   | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"`                                                                   | 仅在 `display="avatar"` 时生效。                                        |
| `previewUrl`   | `string`                       | -                                                                        | 当字段值仍是已保存文件 id 字符串时，用于显示已有图片的 URL。            |
| `crop.enabled` | `boolean`                      | `false`                                                                  | 是否在上传前启用裁剪流程。                                              |
| `crop.aspect`  | `number`                       | `avatar` 模式下为 `1`；否则取 `aspectRatio`，若仍为空则为 `4 / 3`      | 裁剪比例，`1` 表示正方形。                                              |
| `crop.shape`   | `"rect" \| "round"`            | `"rect"`                                                                 | 裁剪形状。                                                              |
| `crop.zoom`    | `boolean`                      | `true`                                                                   | 是否启用缩放控制。                                                      |
| `crop.minZoom` | `number`                       | `1`                                                                      | 最小缩放值。                                                            |
| `crop.maxZoom` | `number`                       | `3`                                                                      | 最大缩放值。                                                            |

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

| Prop           | 类型               | 默认值  | 说明                     |
| -------------- | ------------------ | ------- | ------------------------ |
| `height`       | `number \| string` | -       | 编辑器固定高度。         |
| `minHeight`    | `number \| string` | `240px` | 编辑器最小高度。         |
| `maxHeight`    | `number \| string` | -       | 编辑器最大高度。         |
| `lineNumbers`  | `boolean`          | `true`  | 编辑器行号。             |
| `lineWrapping` | `boolean`          | `true`  | 是否折行。               |
| `tabSize`      | `number`           | `2`     | 缩进大小。               |
| `formatOnBlur` | `boolean`          | `true`  | 失焦时重新格式化合法 JSON。 |
| `autoFocus`    | `boolean`          | `false` | 挂载后自动聚焦编辑器。   |

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

| Prop            | 类型       | 默认值 | 说明                   |
| --------------- | ---------- | ------ | ---------------------- |
| `allowedFields` | `string[]` | -      | 可排序字段白名单。     |
| `excludeFields` | `string[]` | -      | 在构建器中隐藏的字段。 |

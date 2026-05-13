# Widget 矩阵

本文用于说明：

- `FieldType -> WidgetType` 兼容关系
- widget 示例
- widget 专属 `widgetProps`

相关文档：

- [Fields](./fields)：核心 `Field` props、条件、`filters`、`Field.onChange`、值契约
- [关联字段](./relations)：`RelationTable`、`SelectTree`、`OneToMany`、`ManyToMany`

## FieldType -> WidgetType 矩阵

| FieldType     | 默认行为                       | 支持的 WidgetType                                                              |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `String`      | 单行文本输入                   | `URL`, `Email`, `Phone`, `Text`, `RichText`, `TemplateEditor`, `Markdown`, `Code`, `Color`, `yyyy-MM`, `MM-dd`, `CronEditor` |
| `MultiString` | 标签式逗号/回车输入            | -                                                                                 |
| `Integer`     | 数字输入                       | `Monetary`, `Percentage`, `Slider`                                                |
| `Long`        | 数字输入                       | `Monetary`, `Percentage`, `Slider`                                                |
| `Double`      | 数字输入                       | `Monetary`, `Percentage`, `Slider`                                                |
| `BigDecimal`  | 十进制字符串输入               | `Monetary`, `Percentage`, `Slider`                                                |
| `Boolean`     | 开关                           | `CheckBox`                                                                        |
| `Date`        | 日期选择器                     | `Relative`                                                                        |
| `DateTime`    | 日期时间输入                   | `Relative`                                                                        |
| `Time`        | 时间输入                       | `HH:mm:ss`, `HH:mm`                                                               |
| `Option`      | 单选下拉                       | `Radio`, `StatusBar`, `StatusIcon`                                                |
| `MultiOption` | 复选组风格多选                 | `CheckBox`                                                                        |
| `ManyToOne`   | 引用选择                       | `SelectTree`                                                                      |
| `OneToOne`    | 引用选择                       | `SelectTree`                                                                      |
| `ManyToMany`  | 关联表格 + 选择器对话框        | `SelectTree`, `TagList`                                                           |
| `OneToMany`   | 关联表格                       | -                                                                                 |
| `File`        | 文件上传                       | `Image`                                                                           |
| `MultiFile`   | 多文件上传                     | `MultiImage`                                                                      |
| `JSON`        | CodeMirror JSON 编辑器         | `JsonTree`                                                                        |
| `Filters`     | 过滤构建器                     | -                                                                                 |
| `Orders`      | 排序构建器                     | -                                                                                 |
| `DTO`         | CodeMirror JSON 编辑器         | `JsonTree`                                                                        |

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

### `Phone`

国际电话输入控件。值为单一 E.164 字符串（如 `"+6591234567"`）。组件将国家选择器（国旗 + 国际区号）与国内号码输入组合，在用户输入过程中通过 `libphonenumber-js` 的 `AsYouType` 进行格式化。国家列表、名称与拨号区号由后端 `GET /CountryRegion/listDialCodes` 经 `useDialCodes()` 拉取，使支持的国家与 i18n 文案保持服务端驱动；校验、解析与格式化在本地仍由 `libphonenumber-js` 完成。

粘贴友好：若粘贴内容以 `+` 开头，会重新解析以切换国家选择器并重排国内数字。只读模式下以国际可读格式渲染（例如 `"+65 9123 4567"`）。

```tsx
<Field fieldName="workPhone" widgetType="Phone" />
```

值契约：E.164 格式的 `string`（`"+<区号><国内数字>"`），未输入则为空字符串。Schema 层校验建议使用 `@/utils/schema-validators` 中的 `phoneE164` / `phoneE164Optional`。

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

- **字段占位符** — 将模型字段以行内芯片形式插入。HTML 输出：`<span data-tpl-field="fieldPath" data-tpl-label="label">{{fieldPath}}</span>`。「插入字段」选择器（含关联一层路径与循环表列选项）会排除 `@/types/BaseModel` 中的 `reversedFields`（如 `id`、`tenantId`、`version`、审计时间戳与用户引用等），与其他将这些视为系统托管字段的流程一致。
- **自定义变量** — 将一次性变量以行内芯片形式插入。HTML 输出：`<span data-tpl-variable="employee_name" data-tpl-label="Employee Name" data-tpl-value-type="String" data-tpl-required="true">{{employee_name}}</span>`
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

以 `"yyyy-MM"` 字符串存储的年月选择器（例如 `"2024-03"`）。弹出面板含年份导航（箭头）与月份网格。点击年份标签进入年份网格分页；点击某年回到该年的月份网格。

```tsx
<Field fieldName="period" widgetType="yyyy-MM" />

<Field
  fieldName="reportPeriod"
  widgetType="yyyy-MM"
  widgetProps={{ min: "2020-01", max: "2030-12", defaultPanelYear: 2026 }}
/>
```

`yyyy-MM` widget props：

| Prop               | 类型      | 默认值       | 说明                                                                                  |
| ------------------ | --------- | ------------ | ------------------------------------------------------------------------------------- |
| `min`              | `string`  | `"1900-01"`  | 下界（含）。格式：`"yyyy-MM"`。无效则回退为默认值。                                   |
| `max`              | `string`  | `"2100-12"`  | 上界（含）。                                                                          |
| `clearable`        | `boolean` | `true`       | 面板底部是否显示 **Clear**。                                                          |
| `showQuickPick`    | `boolean` | `true`       | 是否显示 **This month** 快捷按钮（当前月份不在 `[min, max]` 内时禁用）。              |
| `yearStep`         | `number`  | `1`          | 年份网格步进。设为 `5` 时年份视图为 1900、1905、1910……                                |
| `defaultPanelYear` | `number`  | 当前年       | 字段无值时首次打开面板定位的年份。会钳制在 `[min 的年份, max 的年份]` 之间。           |
| `yearsPerPage`     | `number`  | `12`         | 年份网格每页条数。常见替代值：16、20。                                                |

超出 `[min, max]` 的月份在月份网格中仍会渲染但为禁用状态；年份网格中超范围的同年份同理。

值契约：`"yyyy-MM"` 格式的 `string`，清空时为 `undefined`。

### `MM-dd`

以 `"MM-dd"` 字符串存储的月日选择器（例如 `"03-15"`）。弹出面板为日期网格日历。点击表头月份标签进入月份网格视图；点击某月回到该月的日期网格。2 月 29 日始终可选（与年份无关的字段）。

```tsx
<Field fieldName="anniversary" widgetType="MM-dd" />

<Field
  fieldName="fiscalYearStart"
  widgetType="MM-dd"
  widgetProps={{ min: "01-01", max: "06-30", firstDayOfWeek: 1 }}
/>
```

`MM-dd` widget props：

| Prop                | 类型                              | 默认值       | 说明                                                                                                                |
| ------------------- | --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `min`               | `string`                          | `"01-01"`    | 下界（含）。格式：`"MM-dd"`。                                                                                       |
| `max`               | `string`                          | `"12-31"`    | 上界（含）。跨年区间（`min > max`，例如 `"10-01"` → `"03-31"`）不支持，会回退为默认行为。                           |
| `clearable`         | `boolean`                         | `true`       | 是否显示 **Clear**。                                                                                               |
| `showQuickPick`     | `boolean`                         | `true`       | 是否显示 **Today** 快捷按钮（「今天」不在 `[min, max]` 内时禁用）。                                                   |
| `firstDayOfWeek`    | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | `0`（周日）  | 周起始日。默认 `0` 与产品国际化取向一致；需 ISO / 周一起始可设为 `1` 等。                                           |
| `defaultPanelMonth` | `1..12`                           | 当前月份     | 字段无值时首次打开面板定位的月份。会钳制在 `[min 的月份, max 的月份]` 范围内。                                     |

超出 `[min, max]` 的日期与月份仍会渲染但为禁用。

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

字段只读且值为空（或仅空白）时，编辑器主体显示 `CodeEditorEmptyState`（`shared/code-editor-empty-state.tsx`），采用 UI 说明样式而非空白 CodeMirror；默认文案为 “No content to display.”。若在自定义宿主中直接组合该组件（例如 Studio 预览对话框），可向 `CodeEditorEmptyState` 传入 `emptyMessage`。

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

`Option` 与 `MultiOption` 的交互类 widget（`OptionSelect`、`Radio`、`StatusBar`、`CheckBox`）支持通过 `Field.filters` 在客户端按选项的 `itemCode` 过滤。`Badge` 为纯展示，不受影响。详见 [Fields → `filters`](./fields#filters)。

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

### 只读展示（默认）

`Option` / `MultiOption` 在周围上下文为只读时 **会自动** 按只读展示渲染——无需声明 `widgetType`。

- 任一选中项带 `itemTone` → 彩色 `StatusBadge`。
- 选中项均无 `itemTone` → 纯文本（`itemName`；`MultiOption` 为逗号分隔）。
- 空值 → `-`。

```tsx
// 卡片正文、看板卡片、表格单元格或只读表单中：
<Field fieldName="status" />
<Field fieldName="tags" />
```

### `StatusIcon`

用于 `Option` 的紧凑纯图标指示器。适合密集表格单元格、看板卡片和状态条等场景，彩色图标比带标签徽章更直接。

```tsx
<Field fieldName="deployStatus" widgetType="StatusIcon" />
```

**零页面级配置**——颜色与图标完全来自选项集的 `itemTone`、`itemIcon` 元数据。调整状态外观请改选项集，而非页面。

`StatusIcon` widget props：

| Prop            | 类型     | 默认值 | 说明                                       |
| --------------- | -------- | ------- | ------------------------------------------- |
| `iconClassName` | `string` | -       | 附加到渲染图标的额外 className。 |

在 `Field` 之外、按值驱动的场景（例如值来自旁路数据且没有外层 `RecordContext`），可直接使用底层原语：

```tsx
import { StatusIcon } from "@/components/fields/widgets/option/StatusIconWidget";

<StatusIcon value={lastDeployment.deployStatus} />
```

#### 选项元数据 → 展示

驱动所有展示的 `OptionReference` 形态：

```ts
{
  itemCode: string;
  itemName: string;
  itemTone?: "Success" | "Warning" | "Error" | "Info" | "Neutral";
  itemIcon?: string;  // STATUS_ICON_REGISTRY 中的 key
}
```

色调代码与后端 `OptionItemTone` 枚举一致（首字母大写）。`itemTone` 会解析为颜色预设：

| `itemTone` | 文字颜色                | 默认图标                    |
| ---------- | ----------------------- | --------------------------- |
| `Success`  | `text-emerald-600`      | `Check`（`CheckCircle2`）   |
| `Warning`  | `text-amber-600`        | `Alert`（`AlertCircle`）    |
| `Error`    | `text-destructive`      | `X`（`XCircle`）            |
| `Info`     | `text-sky-600`          | `Info`（`Info`）            |
| `Neutral`  | `text-muted-foreground` | `Pending`（`CircleDashed`） |

`itemIcon` 的 key 与后端 `OptionItemIcon` 枚举对应，并经由前端的 `STATUS_ICON_REGISTRY` 解析。当前注册表 key：

| Key       | 组件           | 说明                              |
| --------- | -------------- | --------------------------------- |
| `Check`   | `CheckCircle2` |                                   |
| `X`       | `XCircle`      |                                   |
| `Ban`     | `Ban`          |                                   |
| `Alert`   | `AlertCircle`  |                                   |
| `Pause`   | `PauseCircle`  |                                   |
| `Info`    | `Info`         |                                   |
| `Eye`     | `Eye`          |                                   |
| `Loader`  | `Loader2`      | 默认带动画（`spin: true`）         |
| `Clock`   | `Clock`        |                                   |
| `Pending` | `CircleDashed` |                                   |
| `Undo`    | `Undo2`        |                                   |
| `Lock`    | `Lock`         |                                   |

新增图标 key 需要：(a) 在后端 `OptionItemIcon` 枚举与系统选项集中添加代码；(b) 在 `icon-registry.ts` 中添加入口。保持集合精简——多数场景五种色调默认图标已够用。

## 日期与时间类 Widgets

### `HH:mm` / `HH:mm:ss`

存储为 `"HH:mm"`（如 `"09:30"`）或 `"HH:mm:ss"`（如 `"09:30:15"`）的时间选择器。弹出 **列式列表** 面板：按时 / 分 /（可选）秒分列，按步长生成候选；点选某一格即提交该单位的新取值，跨列边界的禁用逻辑会严格将最终结果约束在 `[min, max]` 内。为跨浏览器一致性，用以替代原生 `<input type="time">`。

```tsx
<Field fieldName="startTime" widgetType="HH:mm" />

<Field
  fieldName="meetingTime"
  widgetType="HH:mm"
  widgetProps={{
    min: "09:00",
    max: "18:00",
    minuteStep: 15,
    quickOptions: ["09:00", "10:30", "14:00", "16:30"],
  }}
/>

<Field
  fieldName="processStartTime"
  widgetType="HH:mm:ss"
  widgetProps={{ secondStep: 15, defaultTime: "00:00:00" }}
/>
```

`HH:mm` / `HH:mm:ss` widget props：

| Prop            | 类型       | 默认值                   | 说明                                                                                                                                                            |
| --------------- | ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min`           | `string`   | `"00:00"` / `"00:00:00"` | 下界（含）。格式与控件自身格式一致。                                                                                                                           |
| `max`           | `string`   | `"23:59"` / `"23:59:59"` | 上界（含）。                                                                                                                                                    |
| `clearable`     | `boolean`  | `true`                   | 是否显示 **Clear**。                                                                                                                                           |
| `showQuickPick` | `boolean`  | `true`                   | 是否显示 **Now** 快捷按钮（当前时刻不在 `[min, max]` 内时禁用）。                                                                                               |
| `minuteStep`    | `number`   | `1`                      | 分钟候选粒度。合法取值：`1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60`。`60` 表示仅允许 `00`。集合外取值回退为 `1` 并在开发模式告警。                                                               |
| `secondStep`    | `number`   | `1`                      | 秒候选粒度。仅 `HH:mm:ss` 生效；`HH:mm` 忽略。合法集合与 `minuteStep` 相同；`60` 表示仅允许 `00`。                                                                                           |
| `defaultTime`   | `string`   | -                        | 字段无值时首次打开的预填值。会按步长网格对齐；若无法落入 `[min, max]` 则回退到 `min`。                                                                             |
| `quickOptions`  | `string[]` | -                        | 列上方的自定义预设片（例如 `["09:00", "12:00", "18:00"]`）。每项须在 `[min, max]` 内且对齐步长网格，否则禁用。                                                       |
| `use12Hours`    | `boolean`  | `false`                  | 类型占位——本版本未实现。                                                                                                                                        |

底部行为：

- **Apply**（✓，始终可见）：确认当前面板状态并关闭浮层。若字段为空，会先填入 `min` 再提交。
- **Now**（`showQuickPick=true` 时）：写入当前时钟时间，受 `[min, max]` 约束。不关闭浮层，便于继续微调后再 Apply。
- **Clear**（`clearable=true` 时）：清空字段。不关闭浮层。

已有存盘值若在网格外（例如保存了 `"09:23"` 而 `minuteStep=15`），触发按钮上会原样保留展示；列表列不会对「落在网格外」的成分显示选中高亮；从网格点选则会吸附到网格。

值契约：与控件格式一致的 `string`，清空时为 `undefined`。

### `Relative`

将 `Date` / `DateTime` 值渲染为相对当前时间的可读距离（例如 `"2 days ago"`、`"in 3 hours"`）。绝对时间戳通过 `title` 属性在悬停提示中展示，便于查看精确时间。

```tsx
<Field fieldName="updatedTime" widgetType="Relative" />
<Field fieldName="dueDate" widgetType="Relative" widgetProps={{ strict: false }} />
```

**仅展示用 widget。** 从不提供编辑器——即使在可编辑字段上也是如此。请仅用于只读字段或只读界面（卡片、表格、只读表单）。若在可编辑字段上使用，值会以纯文本显示，用户无法修改。

`Relative` widget props：

| Prop        | 类型      | 默认值 | 说明                                                                                          |
| ----------- | --------- | ------ | --------------------------------------------------------------------------------------------- |
| `addSuffix` | `boolean` | `true` | 是否包含 `"ago"` / `"in"` 这类后缀。设为 `false` 可得到如 `"5 minutes"` 这类原始距离表述。      |
| `strict`    | `boolean` | `true` | 严格单位（如 `"2 days"`）与自然表述（如 `"about 2 days"`）。严格模式避免 `"about"`，且只使用单一单位。 |

相对时间文案在挂载时计算一次，不会随系统时钟自动刷新。悬停提示中的绝对时间戳用于满足精度需求，对常见卡片 / 表格场景通常足够。若需要定时刷新，请由父组件驱动重渲染（例如用定时器）——每次渲染时 widget 会采用新的「当前时间」。

在 `Field` 之外、按值驱动的场景（例如值来自旁路数据且没有外层表单上下文），可直接使用底层原语：

```tsx
import { RelativeTimeDisplay } from "@/components/fields/widgets/relative";

<RelativeTimeDisplay value={drift.lastCheckedTime} className="text-muted-foreground" />
```

<a id="quick-range-filter-column-header"></a>

### 快捷范围筛选（列头）

`Date` / `DateTime` 列在列表头筛选浮层中除了标准「操作符 + 取值」表单外，还提供日期范围预设区。用户可一键选中语义区间；需要精细控制时仍可使用具体操作符路径。

**预设清单**

预设条目带有 `direction`（`past` / `future` / `neutral`），以便面板按字段的时间属性自适应展示。`neutral` 类预设始终显示；`past` / `future` 类则按面板的 `mode` 决定是否展示。

| 分区   | 方向    | 项 |
| ------ | ------- | --- |
| Quick  | mixed   | `Today`（neutral）、`Yesterday`（past）、`Tomorrow`（future） |
| Past   | past    | `Last 7 / 15 / 30 / 60 / 90 days`（滚动窗口，**含今天**） |
| Period | neutral | `This week`、`This month`、`This year` |
| Future | future  | `Next 7 / 15 / 30 / 60 / 90 days`（滚动窗口，**含今天**，与 Past 对称） |
| Unary  | —       | `Is set`、`Is not set`（一键触发，无需填写取值） |

**`filterDateRange` —— 过去 / 将来 / 双向**

在 `ModelTable` / `RelationTable` 内的 `<Field />` 上设置 `filterDateRange`，可控制该列浮层展示哪些时间方向的预设：

```tsx
// 默认（不传）— past + neutral。适合创建/更新时间、入职日期等。
<Field fieldName="createdTime" />

// future + neutral — 适合截止日期、计划事件、合同到期等。
<Field fieldName="contractEndDate" filterDateRange="future" />

// both — 适合「双向」日期字段（生日、纪念日等）。
<Field fieldName="birthdayDate" filterDateRange="both" />
```

典型场景：筛出未来 30 天内过生日的员工——使用 `<Field fieldName="birthdayDate" filterDateRange="both" />`，再点选 `Next 30 days` 即可。

`filterDateRange` 仅为 **UI 声明**（该列应如何呈现列头筛选），不属于后端元数据。其思路与 `filterBySource` 类似——由调用方决定，不应写进模型定义。在非表格场景下无效果。

**交互**

- 点击预设会自动切到 `BETWEEN`（或对应一元操作符）、应用并关闭浮层，无需手动打开操作符下拉。
- 若手动修改操作符或起止日期，会清除预设高亮，需再点明确的 `Apply` 才提交。
- 高亮由当前 `(operator, value)` 对照注册表反推。「昨天保存的 Today 筛选」隔天再打开会因语义变化显示为 `Yesterday`——反映的是**当下语义**，而不是当初点选时的标签。

**时区与周起始**

- 区间按 `configs.timeZone`（未配置则用浏览器时区）解析，`@date-fns/tz` 处理 DST 边界。
- `weekStartsOn` 默认为周一（`1`），可按调用覆盖。

**滚动窗口语义**

- `Last N days` 与 `Next N days` 均 **包含今天**。因此 `Last 7 days` = `[today − 6, today]`，`Next 7 days` = `[today, today + 6]`，各覆盖 7 个自然日。
- 若需要「严格意义上不含今天的未来 N 天」，可组合使用 `Tomorrow` 与 `Next N days` 等。

**持久化语义**

- 预设点击瞬间会快照为绝对 `yyyy-MM-dd` 起止；保存视图与分享 URL 不会随时间漂移。
- 后端契约不变：仍以标准 `BETWEEN` / `IS SET` / `IS NOT SET` 形式的 `FilterCondition` 下发，不引入新操作符。

**单一来源辅助函数** 位于 `src/components/views/table/utils/date-range-presets.ts`：

- `resolvePresetRange(id, options?)` —— 预设 id → `{ start, end }` Date 对
- `matchPreset(bounds, options?)` —— 边界 → 预设 id 或 `null`（用于 UI 高亮）
- `filterPresetsByMode(presets, mode)` —— 按 `"past" | "future" | "both"` 过滤注册表
- `DATE_RANGE_PRESETS` —— UI 遍历用的有序注册表；每条记录带有 `direction`

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

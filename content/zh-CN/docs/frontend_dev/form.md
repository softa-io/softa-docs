# ModelForm

基于 `react-hook-form` 和 Zod 的元数据驱动创建/编辑表单容器。

## 相关文档
- [字段与 widgets](./field)
- [对话框组件](./dialog)
- [表格组件](./table)

## 导入

```tsx
import { ModelForm } from "@/components/views/form/ModelForm";
```

## 快速开始

推荐在 `src/app/**/[id]/page.tsx` 中使用：

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";

export default function EditUserAccountPage() {
  return (
    <ModelForm modelName="UserAccount">
      <FormHeader />
      <FormToolbar>
        <Action
          labelName="Lock Account"
          operation="lockAccount"
          placement="more"
          confirmMessage="Lock this user account?"
          successMessage="User account locked."
          errorMessage="Failed to lock user account."
        />
        <Action
          type="dialog"
          labelName="Unlock Account"
          operation="unlockAccount"
          placement="more"
          successMessage="User account unlocked."
          errorMessage="Failed to unlock user account."
          component={UserAccountUnlockActionDialog}
        />
      </FormToolbar>

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="username" />
          <Field fieldName="nickname" />
          <Field fieldName="email" />
          <Field fieldName="mobile" />
          <Field fieldName="status" />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

`ModelForm` 现在提供运行时/provider 以及页面壳层间距，并自动解析路由 `id`：

- `params.id === "new"` => 创建模式（`id = null`）
- `params.id` 存在且不为 `"new"` => 编辑模式
- 路由没有 `id` 参数 => 默认创建模式

校验行为：

- `validationMode` 可配置
- 默认值是 `onBlur`
- `reValidateMode` 会保守跟随 `validationMode`：
  - `onBlur` -> `onBlur`
  - `onSubmit` / `onTouched` / `all` / `onChange` -> `onChange`

需要自定义变体时，可在子组件中使用 `useModelFormContext()`，直接重排 `FormHeader/FormToolbar/FormBody`。

字段与 widget 的规范用法现统一维护在 [字段与 widgets](./field) 中。
以下内容请以该文档为准：

- `Field` props 与元数据覆盖
- `FieldType -> WidgetType` 兼容关系
- widget 专属 `widgetProps`
- 关联字段行为（`Reference`、`OneToMany`、`ManyToMany`）

下面的快捷示例仅作为本地速查，该文档才是事实来源。

默认推荐使用 `Field`（按 `fieldType` 自动分发渲染），并结合元数据覆盖与条件控制。

`Field` 元数据覆盖示例：

```tsx
<Field
  fieldName="name"
  labelName="Custom Label"
  readonly
  required={false}
  hideLabel={true}
  fullWidth={false}
  widgetType="URL"
  filters={[["active", "=", true]]}
  defaultValue="https://example.com"
/>
```

`Field.defaultValue` 是创建态的字段级覆盖。静态页面默认值优先用它；对话框或页面级 `defaultValues` 更适合路由参数、父级上下文值这类动态预填。

当你传容器级 `defaultValues` 时，请直接使用字段的 UI 值形态：

- `File`：`FileInfo | null`
- `MultiFile`：`FileInfo[]`
- `JSON` / `DTO`：结构化对象或数组
- `Filters`：`FilterCondition`
- `Orders`：结构化的排序元组或数组

更完整的字段值契约见 `src/components/fields/README.md`。

`Field` 条件控制示例：

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

`Field` 远程联动示例：

```tsx
<Field fieldName="itemCode" onChange={["itemName", "itemColor"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["itemName"], with: ["active"] }}
/>
```

关系字段过滤联动示例：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "#{companyId}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
  ]}
/>
```

`ModelForm` 中的关系过滤说明：

- `#{companyId}` 会在发送关联查询之前，先从当前表单值中解析
- 后端环境 token，例如 `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID`，会原样透传
- 当后端需要把一个看起来像 token 的字符串当作字面量处理时，可使用 `@{literal}`
- `Field.filters` 会覆盖 `metaField.filters`；如果省略，元数据过滤条件仍然生效
- 未解析出的 `#{...}` 依赖会暂停关联查询，而不是加载未过滤的数据

使用 `widgetType` 驱动渲染行为示例：

```tsx
<Field
  fieldName="startTime"
  widgetType="HH:mm"
/>

<Field
  fieldName="photo"
  widgetType="Image"
/>

<Field
  fieldName="gallery"
  widgetType="MultiImage"
  widgetProps={{ maxCount: 6, columns: 3, aspectRatio: "4 / 3", helperText: "Recommended 1200x900" }}
/>

<Field
  fieldName="score"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 100, step: 5 }}
/>

<Field
  fieldName="content"
  widgetType="RichText"
/>

<Field
  fieldName="notes"
  widgetType="Markdown"
  widgetProps={{ mode: "split", minHeight: 360 }}
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{ language: "python", minHeight: 320, lineNumbers: true }}
/>

<Field
  fieldName="startTime"
  placeholder="Select start time"
/>
```

`File` / `MultiFile` 在编辑模式下会自动使用当前 `ModelForm` 记录 id。

### Widget Props

字段级输入占位文案请使用 `placeholder`。
`widgetProps` 只用于 widget 专属配置。

作用域说明：

- `widgetProps` 会作用于 `ModelForm` widget 和表格内联编辑器，因为这两条路径都是直接渲染 `Field`
- `ModelTable` / `RelationTableView` 的只读单元格不会消费 `widgetProps`；表格中的图片/文件列会使用 `src/components/views/table/README.md` 中说明的共享紧凑渲染器

当前支持的示例：

```tsx
<Field
  fieldName="progress"
  widgetType="Slider"
  widgetProps={{ minValue: 0, maxValue: 10, step: 0.5 }}
/>

<Field
  fieldName="avatar"
  widgetType="Image"
  widgetProps={{
    aspectRatio: "1 / 1",
    objectFit: "cover",
    helperText: "Square image recommended",
    crop: { enabled: true, aspect: 1, shape: "round" },
  }}
/>

<Field
  fieldName="photos"
  widgetType="MultiImage"
  widgetProps={{
    maxCount: 8,
    columns: 4,
    aspectRatio: "16 / 9",
    uploadText: "Upload gallery",
    crop: { enabled: true, aspect: 16 / 9 },
  }}
/>

<Field
  fieldName="status"
  widgetType="Radio"
  required
/>

<Field
  fieldName="script"
  widgetType="Code"
  widgetProps={{
    language: "sql",
    minHeight: 320,
    maxHeight: 560,
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
  }}
/>

<Field
  fieldName="config"
  widgetProps={{
    minHeight: 320,
    maxHeight: 560,
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    formatOnBlur: true,
  }}
/>
```

`JsonField` 现在默认使用 `react-codemirror`。常用 JSON 编辑器 `widgetProps`：

- `height`：固定编辑器高度
- `minHeight`：编辑器最小高度
- `maxHeight`：编辑器最大高度
- `lineNumbers`：是否显示 gutter 行号
- `lineWrapping`：是否自动换行
- `tabSize`：缩进宽度
- `formatOnBlur`：失焦后格式化合法 JSON
- `autoFocus`：挂载后自动聚焦编辑器

`CodeWidget` 支持这些常用 `widgetProps`：

- `language`：`plain`、`java`、`html`、`json`、`markdown`、`python`、`sql`、`yaml`、`yml`
- `height`：固定编辑器高度
- `minHeight`：编辑器最小高度
- `maxHeight`：编辑器最大高度
- `lineNumbers`：是否显示 gutter 行号
- `lineWrapping`：是否自动换行
- `tabSize`：缩进宽度
- `autoFocus`：挂载后自动聚焦编辑器

`MarkdownWidget` 支持这些常用 `widgetProps`：

- `mode`：`split`、`edit`、`preview`（默认：`split`）
- `height`：固定编辑器 / 预览高度
- `minHeight`：编辑器 / 预览最小高度
- `maxHeight`：编辑器 / 预览最大高度
- `lineNumbers`：是否显示编辑器行号
- `lineWrapping`：编辑模式下是否自动换行
- `tabSize`：缩进宽度
- `autoFocus`：挂载后自动聚焦编辑器

`MarkdownWidget` 使用 `react-markdown` 渲染预览，并默认启用 `remark-gfm`。

`mode` 行为：

- `split`：桌面端左右并排显示编辑器和预览；小屏设备上上下堆叠
- `edit`：只显示编辑器
- `preview`：只显示预览

### Field 全宽

`Field` 在以下字段渲染器上支持 `fullWidth`：

- `StringField + TextWidget`（`fieldType="String"` + `widgetType="Text"`）
- `StringField + RichTextWidget`（`fieldType="String"` + `widgetType="RichText"`）
- `StringField + MarkdownWidget`（`fieldType="String"` + `widgetType="Markdown"`）
- `StringField + CodeWidget`（`fieldType="String"` + `widgetType="Code"`）
- `OneToManyField`
- `ManyToManyField`

以上字段默认均为 `fullWidth={true}`。
设置 `fullWidth={false}` 时，会按普通栅格宽度渲染。

```tsx
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="RichText" fullWidth={false} />
<Field fieldName="optionItems" fullWidth={false} />
<Field fieldName="userIds" fullWidth={false} />
```

### Field 标签可见性

`Field` 支持通过 `hideLabel` 控制是否渲染整个字段标签块（`FormLabelWithTooltip`）。

- 默认：`hideLabel={false}`（显示标签）
- 设置 `hideLabel={true}` 后，会隐藏整个标签块（标签文本 + tooltip 图标）

```tsx
<Field fieldName="description" hideLabel={true} />
```

### ReadOnly vs Disabled

请基于不同意图使用 `readOnly` 和 `disabled`：

- `readOnly`：用户仍可清晰查看字段值，字段也仍属于正常的详情阅读体验。更适合详情页、审计式查看，以及需要方便扫读 / 复制的字段。
- `disabled`：控件在当前状态下暂时不可用，或在结构上不可操作。更适合权限限制、前置条件未满足、异步提交 / 加载中、工作流 / 状态锁定或功能开关关闭等场景。

在 HR SaaS 表单中，详情页通常应优先使用 `readOnly`，而不是 `disabled`。

## XToMany 字段（默认增量提交）

`ReferenceField` 现在仅处理：

- `ManyToOne`
- `OneToOne`

`OneToMany` 和 `ManyToMany` 由专用字段组件在内部处理，使用方式仍然是：

```tsx
<Field fieldName="..." />
```

### OneToMany

- UI：表单主体中的本地关联表格
- 支持：新增、编辑、删除
- 无 `formView`：行编辑采用表格单元格内联编辑（点击行进入编辑）
- 有 `formView`：行编辑 / 新增通过运行时 `ModelDialog`
- 默认提交：patch map（增量）

内联编辑行为（`OneToMany` 且未配置 `formView`）：

- 仅在点击行后进入编辑态（页面进入时不会自动选中）
- 编辑后的值会直接写入主表单的关联数组，并随父级 `Save/Create` 一起保存
- 可编辑单元格限制为声明在 `<RelationTableView><Field /></RelationTableView>` 中、且与关联模型可编辑字段相交的列
- 仅在本地表格模式下支持内联编辑（`!isPaged` 或远程条件未满足）
- 行级 `required` / `readonly` 条件会针对当前关联行，并以 `scope="relation-table"` 求值
- 行级 `Field.onChange` 远程联动也运行在 `scope="relation-table"` 中，并且只会 patch 当前关联行
- `tableView.initialParams.filters` 支持 `#{fieldName}`，并会在远程关联查询前基于当前父表单值解析

启用方式：

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

// 启用表格单元格内联编辑（推荐用于本地关联编辑）
<Field fieldName="optionItems" tableView={optionItemsTableView} />

// 关闭内联编辑，改用对话框编辑
<Field
  fieldName="optionItems"
  tableView={optionItemsTableView}
  formView={OptionItemsFormView}
/>

// 分页关联表格（启用分页；可能切换为远程 searchPage 模式）
<Field fieldName="optionItems" tableView={optionItemsTableView} isPaged />
```

提交 payload 结构：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

创建模式约束：

- 仅允许 `Create`

更新模式：

- 允许 `Create` / `Update` / `Delete`

OneToMany 视图绑定示例：

```tsx
import { Field, RelationTableView } from "@/components/fields";

const optionItemsTableView = (
  <RelationTableView initialParams={{ orders: [["sequence", "ASC"]], pageSize: 10 }}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" readonly={[["active", "=", false]]} />
    <Field fieldName="active" />
  </RelationTableView>
);

function OptionItemsFormView() {
  return (
    <ModelDialog title="Option Item">
      <FormBody
        className="rounded-lg border border-border bg-card p-6"
        enableAuditLog={false}
        sectionNavMode="never"
      >
        <FormSection labelName="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="itemName" />
          <Field fieldName="sequence" />
          <Field fieldName="active" />
          <Field fieldName="description" />
        </FormSection>
      </FormBody>
    </ModelDialog>
  );
}


export default function SysOptionSetFormPage() {

  return (
    <ModelForm modelName="SysOptionSet">
      <FormHeader />
      <FormToolbar />

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection>
          <Field fieldName="optionSetCode" />
          <Field fieldName="name" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>

        <FormSection>
          <Field fieldName="optionItems"
            tableView={optionItemsTableView}
            formView={OptionItemsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

### ManyToMany

- UI：表单主体中的本地关联表格
- 支持：新增、删除
- 新增会打开关联模型选择表格对话框（搜索 / 排序 / 列 / 分页）
- 可选 `formView` 可挂载自定义只读 `ModelDialog`，用于行详情查看
- 默认提交：patch map（增量）

提交 payload 结构：

```json
{
  "Add": ["1", "2", "3"],
  "Remove": ["4", "5"]
}
```

创建模式约束：

- 仅允许 `Add`

更新模式：

- 允许 `Add` / `Remove`

ManyToMany 视图绑定示例：

```tsx
import { Field, RelationTableView } from "@/components/fields";

const userRoleUserIdsTableView = (
  <RelationTableView initialParams={{ orders: [["username", "ASC"]], pageSize: 10 }}>
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="mobile" />
    <Field fieldName="status" />
  </RelationTableView>
);

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

export default function UserRoleFormPage() {

  return (
    <ModelForm modelName="UserRole">
      <FormHeader />
      <FormToolbar />

      <FormBody className="rounded-lg border border-border bg-card p-6">
        <FormSection labelName="General" hideHeader>
          <Field fieldName="name" />
          <Field fieldName="code" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>
        <FormSection>
          <Field fieldName="userIds"
            tableView={userRoleUserIdsTableView}
            formView={UserRoleUserIdsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

说明：

- `tableView` 通过子级 `<Field />` 声明关联表格列，并通过 `initialParams` 配置非字段查询设置。
- `RelationTableView.initialParams.filters` 会与有效字段过滤条件（`Field.filters ?? metaField.filters`）通过 `AND` 合并。
- `isPaged`（仅 `OneToMany` / `ManyToMany` 字段）：
  - `false`（默认）：在 `getById` 中带上关联 `subQuery`；关联表格在 UI 中不分页，渲染所有本地行。
  - `true`：关联表格启用分页 UI；当 `recordId + relatedModel + scoped relation filter` 就绪时，通过 `relatedModel.searchPage` 加载数据（远程模式），否则本地分页。
- 若未提供 `tableView.renderers`，Boolean 值默认渲染为徽标（`True` / `False`）。
- `tableView.renderers[fieldName]`：自定义表格单元格渲染（状态徽标、标签、本地化文本）。
- `tableView.sortAccessors[fieldName]`：本地关联表格排序值映射的可选高级 hook。
- 关联表格默认 `pageSize` 为 `50`；仅在启用分页（`isPaged=true`）时显示 page-size 选择器。
- ManyToMany 选择器对话框（`Add`）由服务端驱动；搜索 / 排序 / 分页变化会触发 `searchPage` 请求。
- `formView` 为可选项。在 `ManyToMany` 中，点击行会以只读模式打开 `ModelDialog`；新增 / 移除仍使用选择器行为。
- 未解析出的 `#{fieldName}` 依赖会暂停远程关联查询和 picker 查询，直到依赖的父表单值出现。

### 兼容性

后端仍支持 XToMany 字段的整表提交。
前端 `ModelForm` 默认采用增量提交（`PatchType` map），以避免分页关联编辑时整列表覆盖的风险。

## 页面结构

推荐默认布局：

- Header：标题 + 描述
- Sticky 工具栏：
  - 左侧：内置 `FormEditStatus + FormPrimaryActions`（`enableWorkflow=true` 时追加 `FormWorkflowActions`）
  - 右侧：业务操作区（自定义操作 + 内置 Duplicate/Delete + More Actions）
- Body：`FormBody` 渲染分区导航（auto）+ 表单内容 + 审计面板
- Audit：由 `FormBody(enableAuditLog)` 控制；大屏显示在右侧，小屏显示在底部

## Props

### ModelForm Props

| Prop        | 类型                                           | 必填 | 默认值 | 说明                                         |
| ----------- | ---------------------------------------------- | -------- | ------- | --------------------------------------------- |
| `modelName` | `string`                                       | 是      | -       | 用于请求 API 元数据模型（`/metadata/getMetaModel`）的模型名。 |
| `id`        | `string \| null`                               | 否       | 路由 `params.id`（`"new"` => `null`） | 可选覆盖值。 |
| `zodSchema` | `ZodTypeAny`                                   | 否       | -       | 可选 schema 覆盖。                     |
| `schemaBuilder` | `(context) => ZodTypeAny`                  | 否       | -       | 运行时 schema 扩展器。接收由已解析元数据构建的 `{ metaModel, baseSchema }`。 |
| `readOnly`  | `boolean`                                      | 否       | `false` | 强制只读模式。                         |
| `validationMode` | `"onBlur" \| "onChange" \| "onSubmit" \| "onTouched" \| "all"` | 否 | `"onBlur"` | `ModelForm` 的 React Hook Form 校验模式。 |
| `children`  | `ReactNode`                                    | 是      | -       | 表单页面布局内容（`FormHeader/FormToolbar/FormBody`）。 |

Schema 优先级：`schemaBuilder` > `zodSchema` > 元数据推导的基础 schema。

运行时字段条件：

- `Field.required`、`Field.readonly`、`Field.hidden` 支持 `boolean | FilterCondition | dependsOn(...)`。
- 条件会基于当前表单值求值。
- `FilterCondition` 会自动追踪左右操作数字段和本地 `#{fieldName}` 引用。
- 函数条件必须包在 `dependsOn([...], evaluator)` 里；不支持裸函数。
- `hidden` 字段不会渲染，并会抑制其校验错误。
- `required={false}` 可以在运行时放宽元数据 `required`；`readonly={false}` 可以覆盖元数据只读。
- `ModelForm`、`DialogForm` 和 `WizardDialog` 使用同一套运行时行为。

`ModelForm` 中的远程 `Field.onChange`：

- 请求路径为 `POST /<modelName>/onChange/<fieldName>`
- 请求总会发送当前字段的 `value`；编辑模式还会发送 `id`
- 省略 `with`：只发送 `id + value`
- `with: ["a", "b"]`：只发送声明的依赖字段，并使用 submit/API 形态
- `with: "all"`：发送当前表单的 submit 形态
- 已注册的顶层 XToMany 字段会被序列化为关系 patch payload，而不是原始 UI 行数据
- 响应中的 `values` 只 patch 返回的键；`null` 表示清空字段
- 响应中的 `readonly` / `required` 会覆盖当前本地有效状态，直到重置、取消、重载或后续响应
- 这套远程联动运行时已实现于 `ModelForm`；独立的 `DialogForm` / `WizardDialog` 默认不会自动提供

### FormHeader Props

| Prop          | 类型        | 必填 | 默认值 | 说明 |
| ------------- | ----------- | -------- | ------- | ----- |
| `title`       | `string`    | 否       | `metaModel.labelName`（回退 `pageTitle`） | 可选覆盖。 |
| `description` | `string`    | 否       | `metaModel.description` | 可选覆盖。 |
| `extras`      | `ReactNode` | 否       | -       | 渲染在标题附近的额外内容。 |

### FormBody Props

| Prop             | 类型                            | 必填 | 默认值 | 说明                                                                 |
| ---------------- | ------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `sectionNavMode` | `"auto" \| "always" \| "never"` | 否       | `"auto"` | 当分区数量 > 3 时，`auto` 会显示分区导航。     |
| `enableAuditLog` | `boolean`                       | 否       | `true` | 是否启用审计面板（仅编辑模式渲染）。      |
| `children`       | `ReactNode`                     | 是      | -       | 表单分区 / 内容节点。                                        |

### FormToolbar Props

| Prop                | 类型                      | 必填 | 默认值 | 说明                                                                                         |
| ------------------- | ------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| `children`          | `ReactNode`               | 否       | -       | 自定义操作。推荐：`<Action type="..." />`。                                       |
| `enableWorkflow`    | `boolean`                 | 否       | `false` | 是否启用工具栏左侧工作流操作组。仅在编辑模式且非只读时显示。|
| `enableDuplicate`   | `boolean`                 | 否       | `true` | 内置复制操作。创建态下仍会显示，但默认禁用；路由只读模式也可使用。 |
| `enableDelete`      | `boolean`                 | 否       | `true` | 内置删除操作。创建态下仍会显示，但默认禁用；路由只读模式也可使用。 |
| `duplicatePlacement`| `"toolbar" \| "more"`     | 否       | `"more"` | 内置 Duplicate 的展示位置。                                     |
| `deletePlacement`   | `"toolbar" \| "more"`     | 否       | `"more"` | 内置 Delete 的展示位置。                                        |
| `moreActionsLabel`  | `string`                  | 否       | `"More Actions"` | More Actions 触发器文案。                                   |
| `confirmDeleteMessage` | `string`               | 否       | `Delete this {modelLabel}? This action cannot be undone.` | 内置删除确认文案。 |

### Action Props

使用单一 `Action` 组件，通过 `type` 区分行为。

`Action` 通过以下方式同时支持静态值与上下文动态值：

```ts
type ActionValue<T> = T | ((context: {
  id: string | null;
  modelName?: string;
  scope: "form" | "model-table";
  mode: "create" | "edit" | "read";
  isDirty: boolean;
  values?: Record<string, unknown>;
  row?: Record<string, unknown>;
}) => T);
```

| Prop             | 类型                                    | 必填 | 默认值 | 说明                                                                 |
| ---------------- | --------------------------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `type`           | `"default" \| "dialog" \| "link" \| "custom"` | 否 | `"default"` | 操作行为；省略时为直接 API 调用。          |
| `labelName`      | `ReactNode`                             | 是      | -       | 操作文案。                                                         |
| `placement`      | `"toolbar" \| "more" \| "header" \| "inline"` | 否 | FormToolbar:`"toolbar"`，FormSection:`"inline"` | 受父容器约束。 |
| `confirmMessage` | `ActionValue<string>`                   | 否       | -       | 执行前可选确认提示。                 |
| `successMessage` | `ActionValue<string>`                   | 否       | -       | `default`/`dialog` 成功提示文案。             |
| `errorMessage`   | `ActionValue<string>`                   | 否       | -       | `default`/`dialog` 失败提示文案。               |
| `icon`           | `ComponentType<{ className?: string }>` | 否       | -       | 操作图标。                                                          |
| `destructive`    | `boolean`                               | 否       | `false` | 破坏性样式。                                                  |
| `disabled`       | `boolean \| FilterCondition \| dependsOn(...)` | 否 | `false` | 禁用状态。静态状态用 `boolean`，声明式值判断用 `FilterCondition`，显式函数逻辑用 `dependsOn([...], evaluator)`。 |
| `visible`        | `boolean \| FilterCondition \| dependsOn(...)` | 否 | `true` | 可见性控制。与 `disabled` 使用相同条件模型。 |

行为专属 props：

| 组件行为                  | 必填行为 props | 默认值 | 说明 |
| -------------------------- | ----------------------- | ------- | ----- |
| 省略 `type` 或 `type="default"` | `operation` | - | 调用 `POST /{modelName}/{operation}`，当前记录 `id` 放 query params，可选 `payload` 放 body。`payload` 支持 `ActionValue<Record<string, unknown>>`。 |
| `type="dialog"` | `operation`, `component` | - | `component={MyDialogComponent}`。弹窗开关、operation、成功/失败提示由 `Action` 注入。 |
| `type="link"`   | `href`                  | `target="_self"` | `href` 支持 `string` 或 `({ id, modelName }) => string`。 |
| `type="custom"` | `onClick`               | - | 纯 UI/本地行为。签名：`onClick({ id, modelName, scope, mode, isDirty, values, row }) => void`。 |

Action 条件说明：

- `disabled` 和 `visible` 与 `Field` 共用同一套运行时条件模型：`boolean`、`FilterCondition`、`dependsOn([...], evaluator)`
- `FilterCondition` 会基于当前表单值求值，并自动追踪 `#{fieldName}` 引用
- 不支持裸函数条件；函数逻辑请包在 `dependsOn([...], evaluator)` 里
- 如果没有字段依赖，优先使用普通 `boolean`

Action 类型示例：

```tsx
// 1) default（省略 type）：直接调用 API
<Action
  labelName="Lock Account"
  operation="lockAccount"
  placement="more"
  confirmMessage="Lock this user account?"
  successMessage="User account locked."
  errorMessage="Failed to lock user account."
/>

// 2) dialog：打开自定义对话框组件，operation 注入到对话框运行时
<Action
  type="dialog"
  labelName="Unlock Account"
  operation="unlockAccount"
  placement="more"
  component={UserAccountUnlockActionDialog}
  successMessage="User account unlocked."
  errorMessage="Failed to unlock user account."
/>

// 3) link：打开 URL
<Action
  type="link"
  labelName="Open Audit"
  placement="more"
  href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
  target="_blank"
/>

// 4) custom：本地 UI 逻辑
<Action
  type="custom"
  labelName="Run Health Check"
  placement="more"
  onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
/>
```

### 各容器对 Action 的支持

| 容器 | 支持的 Action 类型 | 支持的 placement |
| --- | --- | --- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom` | `toolbar`, `more` |
| `FormSection` | `link`, `custom` | `header`, `inline` |

`FormSection` 是局部 UI 操作区，不直接执行模型 API 操作。
对于 API 操作（`default` / `dialog`），请将 Action 放在 `FormToolbar`。

表单工具栏里的业务操作还遵循这些规则：

- 编辑态且存在未保存修改时，点击业务操作会先询问是否丢弃修改再继续
- 创建态下，内置 `Duplicate` / `Delete` 会保留显示但默认禁用
- 内置 `Duplicate` 仍然调用后端 `copyById`；`BaseModel.reversedFields` 的排除由后端复制语义处理

### FormToolbar Action 示例

最小示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";

<FormToolbar>
  <Action
    labelName="Lock Account"
    operation="lockAccount"
    placement="more"
  />
</FormToolbar>;
```

常见配置示例：

```tsx
import { Action } from "@/components/common/Action";
import { ActionDialog } from "@/components/views/dialogs";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ExternalLink, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function UnlockDialog() {
  return (
    <ActionDialog
      title="Unlock Account"
      abstractModelName="UnlockAccountAction"
      abstractFields={[
        {
          fieldName: "reason",
          fieldType: "String",
          widgetType: "Text",
          labelName: "Reason",
        },
      ]}
    />
  );
}

<FormToolbar enableWorkflow>
  {/* default */}
  <Action
    labelName="Lock"
    operation="lockAccount"
    placement="toolbar"
    icon={Lock}
    confirmMessage="Lock this account?"
    successMessage="Account locked."
    errorMessage="Failed to lock account."
  />

  {/* dialog */}
  <Action
    type="dialog"
    labelName="Unlock"
    operation="unlockAccount"
    placement="more"
    icon={ShieldCheck}
    component={UnlockDialog}
  />

  {/* link */}
  <Action
    type="link"
    labelName="Open Audit"
    placement="more"
    icon={ExternalLink}
    href={({ id, modelName }) => `/${modelName}/audit?id=${id}`}
    target="_blank"
  />

  {/* custom */}
  <Action
    type="custom"
    labelName="Run Health Check"
    placement="more"
    icon={PlayCircle}
    onClick={({ modelName }) => toast.info(`${modelName} health check started.`)}
  />
</FormToolbar>;
```

### FormSection Action 示例

最小示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";

<FormSection labelName="Advanced">
  <Action
    type="custom"
    labelName="Validate Inputs"
    placement="inline"
    onClick={() => console.log("validate")}
  />
  {/* section fields... */}
</FormSection>;
```

常见配置示例：

```tsx
import { Action } from "@/components/common/Action";
import { FormSection } from "@/components/common/form-section";
import { ExternalLink, RefreshCw } from "lucide-react";

<FormSection
  labelName="Credentials"
  description="Manage key pair and endpoint."
>
  {/* header action */}
  <Action
    type="link"
    labelName="Open Docs"
    placement="header"
    icon={ExternalLink}
    href="https://docs.example.com/credentials"
    target="_blank"
  />

  {/* inline action */}
  <Action
    type="custom"
    labelName="Regenerate Preview"
    placement="inline"
    icon={RefreshCw}
    onClick={() => console.log("regenerate")}
  />

  {/* section fields... */}
</FormSection>;
```

## Context API

在 `ModelForm` 子组件内部，可使用 `useModelFormContext()` 获取：

- `pageTitle`, `pageDescription`
- `isEditing`, `isSubmitting`, `effectiveReadOnly`
- `form`（`react-hook-form` 实例）
- `onCancel()`
- `metaModel`, `id`

## 内置行为

- 创建/编辑模式默认值与重置处理。
- 重置行为带有快照保护：
  - 记录 / 模型标识变化 => 重置
  - 表单未修改且远端快照变化 => 重置
  - 表单已修改且后台重新拉取 => 不覆盖当前编辑内容
- 元数据解析策略：始终从 `/metadata/getMetaModel` 获取；首次响应由 React Query 缓存并复用。
- 通过 `FieldPropsProvider` 提供元数据驱动字段属性。
- 取消行为：
  - 编辑模式：点击 `Cancel` 时会在表单脏状态下确认，重置到最新加载数据后切回只读模式
  - 只读模式：点击 `Back` 返回列表页
- 保存/创建 mutation 处理与 toast 提示。
- 内置审计查询：`useGetChangeLogQuery(modelName, id)`，参数为：
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- 全局审计 API 开关：
  - `configs.env.enableChangeLog`（`NEXT_PUBLIC_ENABLE_CHANGE_LOG`，默认 `true`）
  - 关闭后，`FormAuditPanel` 不会发起 change-log API 请求，并显示禁用提示文本
- `FormWorkflowActions` + `WorkflowActionGroup` 支持工作流状态：
  - `draft`：submit
  - `pending`：withdraw/approve/reject
  - `approved`：withdraw approval
  - `rejected`：resubmit
- 表单处于脏状态或提交中时，工作流操作会被禁用。
- 审计事件渲染规则：
  - `update`：`<=5` 条字段变更默认展开，`>5` 显示前 5 条 + `Show all fields (N)`
  - `create`：默认折叠
  - `delete`：仅显示操作信息

## 对话框架构

详细的对话框 API、props 和完整示例维护在：
 - [对话框组件](./dialog)

快速参考：

- `ActionDialog`：调用模型操作 `/{modelName}/{operation}`（单条/批量）。
- `ModelDialog`：关联字段运行时对话框，不需要显式传 `modelName`。
- `WizardDialog`：带自定义提交逻辑的多步骤流程。

为了避免文档漂移，本文件仅保留表单页用法说明；对话框细节统一维护在 dialogs README 中。

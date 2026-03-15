# ModelForm

基于 `react-hook-form` 和 Zod 的元数据驱动创建 / 编辑表单容器。

## 相关文档

- [Fields](./fields/index)
- [关联字段](./fields/relations)
- [Widget 矩阵](./fields/widgets)
- [Action](./action)
- [Dialog](./dialog)
- [ModelTable](./table)

## 导入

```tsx
import { ModelForm } from "@/components/views/form/ModelForm";
```

## 快速开始

推荐在 `src/app/**/[id]/page.tsx` 中这样使用：

```tsx
import { UserAccountUnlockActionDialog } from "@/app/user/user-account/components/user-account-unlock-action-dialog";
import { Action } from "@/components/actions/Action";
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

`ModelForm` 现在会提供运行时 / provider 与页面壳层间距，并自动解析路由 `id`：

- `params.id === "new"` => 创建模式（`id = null`）
- `params.id` 存在且不为 `"new"` => 编辑模式
- 如果路由没有 `id` 参数 => 默认创建模式

校验行为：

- 默认是 `onBlur`
- `reValidateMode` 是 `onChange`

如果需要自定义变体，可以在子组件中使用 `useModelFormContext()`，并直接重新组织 `FormHeader` / `FormToolbar` / `FormBody`。

字段的规范化用法现在统一维护在 [Fields](./fields/index)。
widget 兼容性和 widget 专属示例维护在 [Widget 矩阵](./fields/widgets)。
关联字段行为维护在 [关联字段](./fields/relations)。
这些文档用于说明：

- `Field` props 与元数据覆盖
- `FieldType -> WidgetType` 兼容关系
- widget 专属 `widgetProps`
- 关联字段行为（`Reference`、`OneToMany`、`ManyToMany`）

下面的快速示例保留为本页捷径，但字段 README 才是事实来源。

默认建议是使用 `Field`（通过 `fieldType` 自动分发元数据），并配合元数据覆盖与条件控制。

`Field` 上的元数据覆盖示例：

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

`Field.defaultValue` 是创建态的字段级覆盖。静态页面默认值优先使用它；路由参数、父上下文值等动态预填则放在对话框 / 页面级 `defaultValues`。

当你传入容器级 `defaultValues` 时，请直接使用字段 UI 值：

- `File`：`FileInfo | null`
- `MultiFile`：`FileInfo[]`
- `JSON` / `DTO`：结构化对象 / 数组
- `Filters`：`FilterCondition`
- `Orders`：结构化排序元组 / 数组

更详细的字段值契约见 [Fields](./fields/index)。

条件字段控制示例：

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

远程字段联动示例：

```tsx
<Field fieldName="itemCode" onChange={["itemName", "itemColor"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["itemName"], with: ["active"] }}
/>
```

关联过滤联动示例：

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

`ModelForm` 中的关联过滤说明：

- `#{companyId}` 会在发送关联查询前，从当前表单值中解析
- 后端环境 token，例如 `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID`，会原样透传
- 当后端应把类似 token 的字符串视为字面量时，可使用 `@{literal}`
- `Field.filters` 会覆盖 `metaField.filters`；若省略，仍会使用元数据中的过滤条件
- 未解析的 `#{...}` 依赖会暂停关联查询，而不是加载未过滤数据

通过 `widgetType` 驱动渲染行为的示例：

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

`File` / `MultiFile` 在编辑模式下会自动使用当前 `ModelForm` 的记录 id。

### Widget Props

字段级输入占位文案请使用 `placeholder`。
`widgetProps` 只用于 widget 专属配置。

作用域说明：

- `widgetProps` 会应用到 `ModelForm` widget 和表格内联编辑器，因为这些路径直接渲染 `Field`
- `ModelTable` / `RelationTable` 的只读单元格有意不消费 `widgetProps`；表格图片 / 文件单元格使用 [ModelTable](./table) 中描述的统一紧凑渲染器

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

`JsonField` 现在默认使用 `react-codemirror`。常见 JSON 编辑器 `widgetProps`：

- `height`：编辑器固定高度
- `minHeight`：编辑器最小高度
- `maxHeight`：编辑器最大高度
- `lineNumbers`：显示或隐藏行号
- `lineWrapping`：长行折行
- `tabSize`：缩进大小
- `formatOnBlur`：失焦后格式化合法 JSON
- `autoFocus`：挂载后自动聚焦编辑器

`CodeWidget` 支持这些常见 `widgetProps`：

- `language`：`plain`、`java`、`html`、`json`、`markdown`、`python`、`sql`、`yaml`、`yml`
- `height`：编辑器固定高度
- `minHeight`：编辑器最小高度
- `maxHeight`：编辑器最大高度
- `lineNumbers`：显示或隐藏行号
- `lineWrapping`：长行折行
- `tabSize`：缩进大小
- `autoFocus`：挂载后自动聚焦编辑器

`MarkdownWidget` 支持这些常见 `widgetProps`：

- `mode`：`split`、`edit`、`preview`（默认：`split`）
- `height`：编辑 / 预览区域固定高度
- `minHeight`：编辑 / 预览区域最小高度
- `maxHeight`：编辑 / 预览区域最大高度
- `lineNumbers`：是否显示编辑器行号
- `lineWrapping`：编辑模式下是否折行
- `tabSize`：缩进大小
- `autoFocus`：挂载后自动聚焦编辑器

`MarkdownWidget` 使用 `react-markdown` 做预览，并默认启用 `remark-gfm`。

`mode` 行为：

- `split`：桌面端并排显示编辑器和预览，小屏幕下纵向堆叠
- `edit`：仅显示编辑器
- `preview`：仅显示预览

### Field 全宽

`Field` 在这些字段渲染器上支持 `fullWidth`：

- `StringField + TextWidget`（`fieldType="String"` + `widgetType="Text"`）
- `StringField + RichTextWidget`（`fieldType="String"` + `widgetType="RichText"`）
- `StringField + MarkdownWidget`（`fieldType="String"` + `widgetType="Markdown"`）
- `StringField + CodeWidget`（`fieldType="String"` + `widgetType="Code"`）
- `OneToManyField`
- `ManyToManyField`

以上字段默认都是 `fullWidth={true}`。
传入 `fullWidth={false}` 可回退为普通网格宽度。

```tsx
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="RichText" fullWidth={false} />
<Field fieldName="optionItems" fullWidth={false} />
<Field fieldName="userIds" fullWidth={false} />
```

### Field 标签可见性

`Field` 支持通过 `hideLabel` 控制是否渲染整个字段标签区块（`FormLabelWithTooltip`）。

- 默认：`hideLabel={false}`（显示标签）
- 设置 `hideLabel={true}` 后，会隐藏整个标签区块（标签文本 + tooltip 图标）

```tsx
<Field fieldName="description" hideLabel={true} />
```

### ReadOnly vs Disabled

`readOnly` 和 `disabled` 的语义不同：

- `readOnly`：用户依然可以清晰阅读值，字段仍是正常详情阅读体验的一部分。更适合详情页、审计型查看页面，以及需要便于浏览 / 复制的字段。
- `disabled`：控件暂时或结构性不可用。更适合权限限制、前置条件未满足、异步提交 / 加载中、工作流 / 状态锁定或功能门控。

在人力资源 SaaS 表单中，详情页通常应优先使用 `readOnly`，而不是 `disabled`。

## XToMany 字段（默认增量提交）

`ReferenceField` 现在只负责：

- `ManyToOne`
- `OneToOne`

`OneToMany` 和 `ManyToMany` 由内部专用字段组件处理，但业务侧依然通过：

```tsx
<Field fieldName="..." />
```

### OneToMany

- UI：表单体内的本地关联表格
- 支持：新增、编辑、删除
- 没有 `formView`：行编辑使用表格单元格内联编辑（点击行进入编辑）
- 有 `formView`：行创建 / 编辑使用运行时 `ModelDialog`
- 默认提交：patch map（增量）

内联编辑行为（`OneToMany`，且没有 `formView`）：

- 行只有在点击后才进入编辑模式（页面进入时不会自动选中）
- 修改的值会直接写入主表单的关联数组，并在父级 `Save/Create` 时一起保存
- 可编辑单元格仅限声明在 `<RelationTable><Field /></RelationTable>` 中的列，并与关联模型可编辑字段取交集
- 内联编辑只在本地表格模式（`!isPaged` 或远程条件未满足）下可用
- 行级 `required` / `readonly` 条件基于当前关联行求值，`scope="relation-table"`
- 行级 `Field.onChange` 远程联动也运行在 `scope="relation-table"`，且只 patch 当前关联行
- `RelationTable.pageSize` 仅对分页关联表格（`isPaged`）生效

启用模式：

```tsx
const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
    <Field fieldName="active" />
  </RelationTable>
);

const multiSortTableView = (
  <RelationTable
    orders={[
      ["sequence", "ASC"],
      ["itemCode", "DESC"],
    ]}
    pageSize={20}
  >
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" />
  </RelationTable>
);

// 启用表格单元格内联编辑（推荐用于本地关联编辑）
<Field fieldName="optionItems" tableView={optionItemsTableView} />

// 关闭内联编辑，改为对话框编辑
<Field
  fieldName="optionItems"
  tableView={optionItemsTableView}
  formView={OptionItemsFormView}
/>

// 分页关联表格（启用分页；可能切换到远程 searchPage 模式）
<Field fieldName="optionItems" tableView={optionItemsTableView} isPaged />
```

提交 payload 形态：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": "101", "name": "changed" }],
  "Delete": ["102", "103"]
}
```

创建模式约束：

- 只允许 `Create`

更新模式：

- 允许 `Create` / `Update` / `Delete`

OneToMany 视图绑定示例：

```tsx
import { Field, RelationTable } from "@/components/fields";

const optionItemsTableView = (
  <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
    <Field fieldName="sequence" />
    <Field fieldName="itemCode" />
    <Field fieldName="itemName" readonly={[["active", "=", false]]} />
    <Field fieldName="active" />
  </RelationTable>
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
          <Field
            fieldName="optionItems"
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

- UI：表单体中的本地关联表格
- 支持：新增、删除
- 新增会打开关联模型选择器表格对话框（搜索 / 排序 / 列 / 分页）
- 可选的 `formView` 可以挂载自定义只读 `ModelDialog` 作为行详情
- 默认提交：patch map（增量）

提交 payload 形态：

```json
{
  "Add": ["1", "2", "3"],
  "Remove": ["4", "5"]
}
```

创建模式约束：

- 只允许 `Add`

更新模式：

- 允许 `Add` / `Remove`

ManyToMany 视图绑定示例：

```tsx
import { Field, RelationTable } from "@/components/fields";

const userRoleUserIdsTableView = (
  <RelationTable orders={["username", "ASC"]} pageSize={10}>
    <Field fieldName="username" />
    <Field fieldName="nickname" />
    <Field fieldName="email" />
    <Field fieldName="mobile" />
    <Field fieldName="status" />
  </RelationTable>
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
          <Field
            fieldName="userIds"
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

- `tableView` 通过子级 `<Field />` 声明以及可选的 `RelationTable.orders` / `RelationTable.pageSize` 控制关联表格列
- `RelationTable.orders` 同时支持单个元组（`["username", "ASC"]`）或多个元组（`[["username", "ASC"], ["email", "DESC"]]`）
- 远程关联表格和选择器查询会组合有效字段过滤条件（`Field.filters ?? metaField.filters`）、关联作用域过滤条件，以及运行时搜索 / 列过滤条件
- `isPaged`（仅 `OneToMany` / `ManyToMany`）：
  - `false`（默认）：在 `getById` 中包含关联 `subQuery`；关联表格 UI 不分页，渲染全部本地行
  - `true`：关联表格启用分页 UI；当 `recordId + relatedModel + scoped relation filter` 就绪时，通过 `relatedModel.searchPage` 加载数据（远程模式），否则退回为本地分页
- 关联表格 `pageSize` 默认是 `50`；只有在启用分页（`isPaged=true`）时才会显示页大小选择器
- ManyToMany 的选择器对话框（`Add`）由服务端驱动；搜索 / 排序 / 翻页变化都会触发 `searchPage` 请求
- `formView` 是可选的。在 `ManyToMany` 中，点击行会以只读模式打开 `ModelDialog`；新增 / 移除仍然走选择器行为
- 未解析的 `#{fieldName}` 依赖会暂停远程关联查询和选择器查询，直到父表单中的依赖值存在

### 兼容性

后端仍然支持 XToMany 字段的整量提交。
前端 `ModelForm` 默认采用增量提交（`PatchType` map），以避免分页关联编辑时整表覆盖的风险。

## 页面结构

推荐的默认布局：

- Header：标题 + 描述
- 吸顶工具栏：
  - 左侧：内置 `FormEditStatus + FormPrimaryActions`（启用 `enableWorkflow=true` 时再加 `FormWorkflowActions`）
  - 右侧：业务动作区域（自定义动作 + 内置 Duplicate/Delete + More Actions）
- Body：`FormBody` 负责渲染分组导航（自动）+ 表单内容 + 审计面板
- Audit：`FormBody(enableAuditLog)` 控制审计面板；大屏在右侧，小屏在底部

## Props

### ModelForm Props

| Prop            | 类型                      | 必填 | 默认值                                | 说明 |
| --------------- | ------------------------- | ---- | ------------------------------------- | ---- |
| `modelName`     | `string`                  | 是   | -                                     | 用于向 API 请求元数据的模型名（`/metadata/getMetaModel`）。 |
| `id`            | `string \| null`          | 否   | 路由 `params.id`（`"new"` => `null`） | 可选覆盖。 |
| `schemaBuilder` | `(context) => ZodTypeAny` | 否   | -                                     | 运行时 schema 扩展器。接收 `{ metaModel, baseSchema }`，其中 `baseSchema` 基于已解析元数据构建。 |
| `readOnly`      | `boolean`                 | 否   | `false`                               | 强制只读模式。 |
| `children`      | `ReactNode`               | 是   | -                                     | 表单页面布局内容（`FormHeader/FormToolbar/FormBody`）。 |

运行时字段条件：

- `Field.required`、`Field.readonly`、`Field.hidden` 支持 `boolean | FilterCondition | dependsOn(...)`
- 条件基于当前表单值求值
- `FilterCondition` 会自动追踪操作数字段和本地 `#{fieldName}` 引用
- 函数条件必须通过 `dependsOn([...], evaluator)` 包裹；不支持裸函数
- `hidden` 字段不会渲染，其校验错误也会被抑制
- `required={false}` 可以在运行时放宽元数据 `required`；`readonly={false}` 可以覆盖元数据只读
- `ModelForm` 和构建在 `DialogForm` 之上的对话框表单使用相同的运行时行为

`ModelForm` 中的远程 `Field.onChange`：

- 请求路径是 `POST /<modelName>/onChange/<fieldName>`
- 请求总会发送当前字段 `value`；编辑模式还会附带 `id`
- 省略 `with`：只发送 `id + value`
- `with: ["a", "b"]`：只发送声明的依赖字段，且使用提交 / API 形态
- `with: "all"`：发送当前表单的提交形态
- 顶层已注册的 XToMany 字段会序列化为关联 patch payload，而不是原始 UI 行
- 响应 `values` 只 patch 返回的 key；`null` 表示清空字段
- 响应中的 `readonly` / `required` 会覆盖本地有效状态，直到 reset、cancel、reload 或更晚的响应到来
- 这套远程联动运行时已在 `ModelForm` 中实现；它不会自动出现在独立 `DialogForm` 中

### FormHeader Props

| Prop          | 类型        | 必填 | 默认值                                       | 说明 |
| ------------- | ----------- | ---- | -------------------------------------------- | ---- |
| `title`       | `string`    | 否   | `metaModel.labelName`（回退到 `pageTitle`） | 可选覆盖。 |
| `description` | `string`    | 否   | `metaModel.description`                      | 可选覆盖。 |
| `extras`      | `ReactNode` | 否   | -                                            | 在标题附近渲染的额外头部内容。 |

### FormBody Props

| Prop             | 类型                            | 必填 | 默认值   | 说明 |
| ---------------- | ------------------------------- | ---- | -------- | ---- |
| `sectionNavMode` | `"auto" \| "always" \| "never"` | 否   | `"auto"` | 当 section 数量大于 3 时，`auto` 会显示分组导航。 |
| `enableAuditLog` | `boolean`                       | 否   | `true`   | 是否启用审计面板（仅编辑模式渲染）。 |
| `children`       | `ReactNode`                     | 是   | -        | 表单 section / 内容节点。 |

### FormToolbar Props

| Prop                   | 类型        | 必填 | 默认值                                                    | 说明 |
| ---------------------- | ----------- | ---- | --------------------------------------------------------- | ---- |
| `children`             | `ReactNode` | 否   | -                                                         | 自定义动作。推荐写法：`<Action type="..." />`。 |
| `enableWorkflow`       | `boolean`   | 否   | `false`                                                   | 是否在工具栏左侧启用工作流动作组。仅在编辑模式且非只读时显示。 |
| `enableCreate`         | `boolean`   | 否   | `true`                                                    | 是否启用右侧工具栏中的内置 `Create New` 动作。显式传值优先；未传时，硬只读表单默认隐藏。 |
| `enableDuplicate`      | `boolean`   | 否   | `true`                                                    | 是否启用内置 duplicate 动作。显式传值优先；未传时，硬只读表单默认隐藏。创建态保持可见但禁用。 |
| `enableDelete`         | `boolean`   | 否   | `true`                                                    | 是否启用内置 delete 动作。显式传值优先；未传时，硬只读表单默认隐藏。创建态保持可见但禁用。 |
| `confirmDeleteMessage` | `string`    | 否   | `Delete this {modelLabel}? This action cannot be undone.` | 内置删除动作的确认文案。 |

### `ModelForm` 中的动作

通用 `Action` / `BulkAction` API 现在统一维护在 [Action](./action)。
本节只保留 `ModelForm` 容器规则和完整页面示例。

容器支持：

| 容器          | 支持的 Action 类型                     | 支持的位置          |
| ------------- | -------------------------------------- | ------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom`  | `toolbar`, `more`   |
| `FormSection` | `link`, `custom`                       | `header`, `inline`  |

规则：

- `FormToolbar` 是页面级业务动作区域
- `FormSection` 是局部 UI 动作区域，不直接执行模型 API 动作
- 对于 API 动作（`default` / `dialog`），请放在 `FormToolbar`
- 编辑模式且有未保存修改时，点击业务动作会先询问是否丢弃修改
- 创建模式下，内置 `Duplicate` / `Delete` 会保持可见，但处于禁用状态
- 内置 `Duplicate` 仍调用后端 `copyById`；`BaseModel.reversedFields` 的排除由后端 duplicate 语义负责处理

完整示例：

```tsx
import { Action } from "@/components/actions/Action";
import { FormSection } from "@/components/common/form-section";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";
import { ExternalLink, Lock, RefreshCw, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" labelName="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelForm modelName="UserAccount">
  <FormToolbar>
    <Action
      labelName="Lock"
      operation="lockAccount"
      placement="toolbar"
      icon={Lock}
      confirmMessage="Lock this account?"
    />
    <Action
      type="dialog"
      labelName="Unlock"
      operation="unlockAccount"
      placement="more"
      icon={ShieldCheck}
      component={UnlockDialog}
    />
  </FormToolbar>

  <FormBody>
    <FormSection labelName="Credentials">
      <Action
        type="link"
        labelName="Open Docs"
        placement="header"
        icon={ExternalLink}
        href="https://docs.example.com/credentials"
      />
      <Action
        type="custom"
        labelName="Regenerate Preview"
        placement="inline"
        icon={RefreshCw}
        onClick={() => console.log("regenerate")}
      />

      <Field fieldName="username" />
      <Field fieldName="status" />
    </FormSection>
  </FormBody>
</ModelForm>;
```

## Context API

在 `ModelForm` 子组件内部，可以使用 `useModelFormContext()` 获取：

- `pageTitle`、`pageDescription`
- `isEditing`、`isSubmitting`、`effectiveReadOnly`
- `form`（`react-hook-form` 实例）
- `onCancel()`
- `metaModel`、`id`

## 内置行为

- 创建 / 编辑模式默认值与 reset 处理
- Reset 采用快照保护：
  - 记录 / 模型身份变化 => reset
  - 表单 pristine 且远程快照变化 => reset
  - 表单 dirty 且后台 refetch => 不覆盖当前编辑
- 元数据解析策略：始终从 `/metadata/getMetaModel` 拉取；首个响应会被 React Query 缓存并复用
- 元数据驱动的字段 props 由内部字段运行时解析；业务代码应保持在 `Field` 层
- Cancel 行为：
  - 编辑模式：`Cancel` 在 dirty 时会确认，随后把表单重置到最新加载数据，并切回只读模式
  - 只读模式：`Back` 会导航回列表页
- Save / Create mutation 处理和 toast 提示
- 审计查询内置使用 `useGetChangeLogQuery(modelName, id)`，参数为：
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- 全局审计 API 开关：
  - `configs.env.enableChangeLog`（`NEXT_PUBLIC_ENABLE_CHANGE_LOG`，默认 `true`）
  - 当关闭时，`FormAuditPanel` 不会发起 change-log API 请求，而是显示禁用提示文案
- `FormWorkflowActions` + `WorkflowActionGroup` 支持这些工作流状态：
  - `draft`：submit
  - `pending`：withdraw / approve / reject
  - `approved`：withdraw approval
  - `rejected`：resubmit
- 工作流动作在表单 dirty 或提交中时会禁用
- 审计事件渲染规则：
  - `update`：`<=5` 项默认展开，`>5` 项显示前 5 个并提供 `Show all fields (N)`
  - `create`：默认折叠
  - `delete`：仅显示操作信息

## 对话框架构

更完整的对话框 API、props 和示例维护在：
[Dialog](./dialog)。

快速选择：

- `ActionDialog`：调用模型操作 `/{modelName}/{operation}`（单条 / 批量）
- `ModelDialog`：关联字段运行时对话框，不需要显式 `modelName`

为了避免文档漂移，本文件只保留表单页面指导；对话框细节统一收敛在 dialogs README 中。

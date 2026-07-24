# ModelForm

基于 `react-hook-form` 和 Zod 的元数据驱动创建 / 编辑表单容器。

## 相关文档

- [Fields](../fields/fields)
- [关联字段](../fields/relations)
- [Widget 矩阵](../fields/widgets)
- [Group（行内字段布局）](../fields#group)
- [Actions](../actions)
- [Dialogs](./dialogs)
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
import { FormSection } from "@/components/views/form/components/FormSection";
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
          label="Lock Account"
          operation="lockAccount"
          placement="more"
          confirmMessage="Lock this user account?"
          successMessage="User account locked."
        />
        <Action
          type="dialog"
          label="Unlock Account"
          operation="unlockAccount"
          placement="more"
          successMessage="User account unlocked."
          component={UserAccountUnlockActionDialog}
        />
      </FormToolbar>

      <FormBody>
        <FormSection label="General" hideHeader>
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

`ModelForm` 现在提供 runtime/provider 与页面壳层间距，并自动解析路由 `id`：

- `params.id === "new"` => 创建模式（`id = null`）
- `params.id` 存在且不为 `"new"` => 编辑模式
- 若路由没有 `id` 参数 => 默认创建模式

校验行为：

- 默认为 `onBlur`
- `reValidateMode` 为 `onChange`

### 对话框模式（Action type="form"）

通过 `<Action type="form" />` 打开时，`ModelForm` 可在对话框内运行。此模式下会自动适配：

- **ID 解析**：忽略路由 `params.id`（仅使用 `id` prop；默认创建模式）
- **创建 / 更新成功**：关闭对话框，而非 `router.push`
- **取消**：关闭对话框，而非返回上一页
- **relatedField 注入**：父记录 `id` 会合并进 `defaultValues` 为 `{ [relatedField]: parentId }`，并包含在 API 载荷中 —— 即使该字段未在表单中展示

`ModelForm` 本身无需特殊 props —— 对话框模式通过 `ActionFormRuntimeContext` 自动检测。

示例：

```tsx
// 父表单页面
<FormToolbar>
  <Action
    type="form"
    label="Add Config Group"
    placement="toolbar"
    component={ConfigGroupForm}
    relatedField="tenantConfigId"
  />
</FormToolbar>

// 子表单组件（作为 Action.component）
function ConfigGroupForm() {
  return (
    <ModelForm modelName="TenantConfigGroup">
      <FormToolbar />
      <FormBody enableAuditLog={false}>
        <FormSection label="General" hideHeader>
          <Field fieldName="groupName" />
          <Field fieldName="description" />
          {/* tenantConfigId 未展示，但会自动注入 API 载荷 */}
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

需要自定义变体？在子组件中使用 `useModelFormContext()`，并直接重排 `FormHeader/FormToolbar/FormBody`。

字段的标准用法现位于 [Fields](../fields/fields)。
Widget 兼容性与 widget 专属示例见 [Widget 矩阵](../fields/widgets)。
关联字段行为见 [关联字段](../fields/relations)。
这些文档涵盖：

- `Field` props 与元数据覆盖
- `FieldType -> WidgetType` 兼容性
- widget 专属 `widgetProps`
- 关联字段行为（`Reference`、`OneToMany`、`ManyToMany`）

下方快速示例仅作本地捷径；fields README 为准。

默认推荐使用 `Field`（按 `fieldType` 元数据自动分发），配合元数据覆盖与基于条件的控制。

`Field` 上的元数据覆盖示例：

```tsx
<Field
  fieldName="name"
  label="Custom Label"
  readonly
  required={false}
  hideLabel={true}
  fullWidth={false}
  widgetType="URL"
  filters={[["active", "=", true]]}
  defaultValue="https://example.com"
/>
```

`Field.defaultValue` 是创建时的字段覆盖。静态、页面级默认值优先用它；动态预填（如路由参数或父上下文值）仍放在对话框 / 页面级 `defaultValues`。

若传递容器级 `defaultValues`，请直接使用字段 UI 值：

- `File`：`FileInfo | null`
- `MultiFile`：`FileInfo[]`
- `JSON` / `DTO`：结构化 object/array 值
- `Filters`：`FilterCondition`
- `Orders`：结构化 order 元组 / 数组

详细字段值契约见 [Field](../fields/fields)。

条件字段控制示例：

```tsx
import { dependsOn, Field } from "@/components/fields";

<Field fieldName="status" readonly={true} />

<Field fieldName="itemTone" hidden={["active", "=", false]} />

<Field
  fieldName="description"
  readonly={[
    ["status", "IN", ["approved", "archived"]],
    "OR",
    [["type", "=", "SYSTEM"], "AND", ["editable", "!=", true]],
  ]}
/>

<Field
  fieldName="label"
  required={dependsOn(["active", "itemCode"], ({ values, isEditing }) =>
    !isEditing && values.active === true && values.itemCode !== "Temp"
  )}
/>
```

远程字段联动示例：

```tsx
<Field fieldName="itemCode" onChange={["label", "itemTone"]} />

<Field
  fieldName="itemCode"
  onChange={{ update: ["label"], with: ["active"] }}
/>
```

关联筛选联动示例：

```tsx
<Field fieldName="companyId" />

<Field
  fieldName="departmentId"
  filters={[
    ["companyId", "=", "{{ companyId }}"],
    "AND",
    ["active", "=", true],
    "AND",
    ["effectiveDate", "<=", "TODAY"],
  ]}
/>
```

`ModelForm` 中的关联筛选说明：

- `{{ companyId }}` 在关联查询发出前，从当前表单值解析（统一模板语法 `{{ expr }}`）
- `TODAY`、`NOW`、`USER_ID`、`USER_COMP_ID` 等后端环境 token 原样透传；字面量按需使用 `{{ 'value' }}` 或 `{{ NOW }}` 等后端 token
- `Field.filters` 覆盖 `metaField.filters`；若省略，元数据筛选仍生效
- 未解析的 `{{ expr }}` 依赖会暂停关联查询，而非加载未筛选数据

使用 `widgetType` 驱动渲染行为的示例：

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

字段级输入占位符使用 `placeholder`。
仅 widget 专属配置使用 `widgetProps`。

作用域说明：

- `widgetProps` 适用于 `ModelForm` widget 与表格行内编辑器，因为这些路径直接渲染 `Field`
- `ModelTable` / `RelationTable` 只读单元格刻意不消费 `widgetProps`；表格 image/file 单元格使用 [ModelTable](./table) 中描述的共享紧凑渲染器

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

- `height`：固定编辑器高度
- `minHeight`：最小编辑器高度
- `maxHeight`：最大编辑器高度
- `lineNumbers`：显示或隐藏行号槽
- `lineWrapping`：长行换行
- `tabSize`：缩进大小
- `formatOnBlur`：失焦后格式化合法 JSON
- `autoFocus`：挂载时聚焦编辑器

`CodeWidget` 支持以下常见 `widgetProps`：

- `language`：`plain`、`java`、`html`、`json`、`markdown`、`python`、`sql`、`yaml`、`yml`
- `height`：固定编辑器高度
- `minHeight`：最小编辑器高度
- `maxHeight`：最大编辑器高度
- `lineNumbers`：显示或隐藏行号槽
- `lineWrapping`：长行换行
- `tabSize`：缩进大小
- `autoFocus`：挂载时聚焦编辑器

`MarkdownWidget` 支持以下常见 `widgetProps`：

- `mode`：`split`、`edit`、`preview`（默认：`split`）
- `height`：固定编辑器 / 预览高度
- `minHeight`：最小编辑器 / 预览高度
- `maxHeight`：最大编辑器 / 预览高度
- `lineNumbers`：显示或隐藏编辑器行号
- `lineWrapping`：编辑器模式下长行换行
- `tabSize`：缩进大小
- `autoFocus`：挂载时聚焦编辑器

`MarkdownWidget` 使用 `react-markdown` 预览，并默认启用 `remark-gfm`。

`mode` 行为：

- `split`：桌面端并排显示编辑器与预览；较小屏幕垂直堆叠
- `edit`：仅显示编辑器
- `preview`：仅显示预览

### 字段全宽

以下字段渲染器支持 `Field` 的 `fullWidth`：

- `StringField + TextWidget`（`fieldType="String"` + `widgetType="Text"`）
- `StringField + RichTextWidget`（`fieldType="String"` + `widgetType="RichText"`）
- `StringField + MarkdownWidget`（`fieldType="String"` + `widgetType="Markdown"`）
- `StringField + CodeWidget`（`fieldType="String"` + `widgetType="Code"`）
- `OneToManyField`
- `ManyToManyField`

以上字段默认 `fullWidth={true}`。
设置 `fullWidth={false}` 以普通网格宽度渲染。

```tsx
<Field fieldName="description" widgetType="Text" />
<Field fieldName="notes" widgetType="RichText" fullWidth={false} />
<Field fieldName="optionItems" fullWidth={false} />
<Field fieldName="userIds" fullWidth={false} />
```

### 字段标签可见性

`Field` 支持 `hideLabel`，控制是否渲染整个字段标签块（`FormLabelWithTooltip`）。

- 默认：`hideLabel={false}`（显示标签）
- 设置 `hideLabel={true}` 隐藏整个标签块（标签文字 + tooltip 图标）

```tsx
<Field fieldName="description" hideLabel={true} />
```

### ReadOnly 与 Disabled

`readOnly` 与 `disabled` 语义不同：

- `readOnly`：用户可清晰查看值，字段仍是正常详情阅读体验的一部分。详情页、审计式查看、需便于扫描 / 复制的字段优先用它。
- `disabled`：控件暂时或结构上不可用。权限限制、前置条件未满足、异步提交 / 加载、工作流 / 状态锁定或功能门控时优先用它。

HR SaaS 表单中，详情页通常应优先 `readOnly` 而非 `disabled`。

对 `widgetType="Code"` 与 `widgetType="Markdown"`，只读且值为空的字段会显示共享 `CodeEditorEmptyState` 提示，而非空 CodeMirror（见 `src/components/fields/widgets/README.md`）。

## XToMany 字段（默认增量提交）

`ReferenceField` 现在仅处理：

- `ManyToOne`
- `OneToOne`

`OneToMany` 与 `ManyToMany` 由专用字段组件内部处理，仍通过以下方式使用：

```tsx
<Field fieldName="..." />
```

### OneToMany

- UI：表单体内的本地关联表
- 支持：新增、编辑、删除
- 无 `formView`：行编辑使用表格单元格行内编辑（点击行进入编辑）
- 有 `formView`：行编辑 / 创建使用运行时 `ModelDialog`
- 提交默认：patch map（增量）

行内编辑行为（`OneToMany`，无 `formView`）：

- 仅点击行后进入编辑模式（进入页面时不自动选中）
- 编辑值直接写入主表单关联数组，随父级 `Save/Create` 保存
- 可编辑单元格限于 `<RelationTable><Field /></RelationTable>` 声明的列与可编辑关联模型字段的交集
- 行内编辑仅在本地表模式可用（`!isPaged` 或远程条件未满足）
- 行级 `required` / `readonly` 条件针对当前关联行评估，`scope="relation-table"`
- 行级 `Field.onChange` 远程联动也在 `scope="relation-table"` 运行，且仅 patch 当前关联行
- `RelationTable.pageSize` 仅影响分页关联表（`isPaged`）

启用模式：

```tsx
function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
      <Field fieldName="active" />
    </RelationTable>
  );
}

function MultiSortTableView() {
  return (
    <RelationTable
      orders={[
        ["sequence", "ASC"],
        ["itemCode", "DESC"],
      ]}
      pageSize={20}
    >
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" />
    </RelationTable>
  );
}

// 启用表格单元格行内编辑（本地关联编辑推荐）
<Field fieldName="optionItems" tableView={OptionItemsTableView} />

// 禁用行内编辑，使用对话框编辑
<Field
  fieldName="optionItems"
  tableView={OptionItemsTableView}
  formView={OptionItemsFormView}
/>

// 分页关联表（启用分页；可能切换到远程 searchPage 模式）
<Field fieldName="optionItems" tableView={OptionItemsTableView} isPaged />
```

提交载荷形状：

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
import { Field, RelationTable } from "@/components/fields";

function OptionItemsTableView() {
  return (
    <RelationTable orders={["sequence", "ASC"]} pageSize={10}>
      <Field fieldName="sequence" />
      <Field fieldName="itemCode" />
      <Field fieldName="label" readonly={[["active", "=", false]]} />
      <Field fieldName="active" />
    </RelationTable>
  );
}

function OptionItemsFormView() {
  return (
    <ModelDialog title="Option Item">
      <FormBody enableAuditLog={false}>
        <FormSection label="General" hideHeader>
          <Field fieldName="itemCode" />
          <Field fieldName="label" />
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

      <FormBody>
        <FormSection>
          <Field fieldName="optionSetCode" />
          <Field fieldName="name" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>

        <FormSection>
          <Field
            fieldName="optionItems"
            tableView={OptionItemsTableView}
            formView={OptionItemsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

### ManyToMany

- UI：表单体内的本地关联表
- 支持：新增、删除
- 新增打开关联模型选择表对话框（搜索 / 排序 / 列 / 分页）
- 可选 `formView` 可挂载自定义只读 `ModelDialog` 查看行详情
- 提交默认：patch map（增量）

提交载荷形状：

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
import { Field, RelationTable } from "@/components/fields";

function UserRoleUserIdsTableView() {
  return (
    <RelationTable orders={["username", "ASC"]} pageSize={10}>
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
    </RelationTable>
  );
}

function UserRoleUserIdsFormView() {
  return (
    <ModelDialog title="User Detail">
      <FormSection label="General" hideHeader>
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

      <FormBody>
        <FormSection label="General" hideHeader>
          <Field fieldName="name" />
          <Field fieldName="code" />
          <Field fieldName="description" />
          <Field fieldName="active" />
        </FormSection>
        <FormSection>
          <Field
            fieldName="userIds"
            tableView={UserRoleUserIdsTableView}
            formView={UserRoleUserIdsFormView}
          />
        </FormSection>
      </FormBody>
    </ModelForm>
  );
}
```

说明：

- `tableView` 通过零 prop 视图组件控制关联表列，该组件返回带子 `<Field />` 声明的 `<RelationTable />`，以及可选的 `RelationTable.orders` / `RelationTable.pageSize`。
- `RelationTable.orders` 支持单个元组（`["username", "ASC"]`）或多个元组（`[["username", "ASC"], ["email", "DESC"]]`）。
- 远程关联表与选择器查询使用生效字段筛选（`Field.filters ?? metaField.filters`）、关联作用域筛选，以及运行时搜索 / 列筛选。
- `isPaged`（仅 OneToMany/ManyToMany 字段）：
  - `false`（默认）：在 `getById` 中包含关联 `subQuery`；关联表 UI 不分页，渲染全部本地行。
  - `true`：关联表启用分页 UI；当 `recordId + relatedModel + 作用域关联筛选` 就绪时，由 `relatedModel.searchPage` 加载（远程模式），否则本地分页。
- 关联表 pageSize 默认 `50`；仅启用分页时（`isPaged=true`）显示 page-size 选择器。
- ManyToMany 选择器对话框（`Add`）由服务端驱动；搜索 / 排序 / 翻页变更会触发 `searchPage` 请求。
- `formView` 可选。在 `ManyToMany` 中，点击行以只读模式打开 `ModelDialog`；新增 / 移除仍走选择器行为。
- 未解析的 `{{ expr }}` 依赖会暂停远程关联查询与选择器查询，直到依赖的父表单值存在

### OneToOne（拥有的内联）

对于**拥有的** OneToOne 关系（如 `UserProfile → UserAccount`），向 `OneToOne` 字段传递 `formView` 会在父表单内联渲染其关联模型字段，而非显示引用选择器。

- UI：父表单体内的内联 `FormSection`（可多个）
- 支持：编辑所有声明的子字段
- 子字段在**父 RHF 实例**中注册为 `{fieldName}.{subField}`（如 `userId.username`）
- `getById` 自动从 `formView` JSX 静态推导并添加 `subQueries: { userId: { fields: [...] } }` —— 无需额外配置
- 提交默认：增量（更新发送 `{ id, ...onlyChangedSubFields }`；创建发送无 `id` 的完整子对象）
- `formView` 内的字段条件（`dependsOn`、`showWhen`）针对子对象作用域解析，监听父表单值时会正确加前缀
- `ManyToOne` 字段**不支持** `formView`；误用会在 dev 模式显示 `console.error`

用法：

```tsx
function UserAccountOneToOneView() {
  return (
    <FormSection label="Account">
      <Field fieldName="username" />
      <Field fieldName="nickname" />
      <Field fieldName="email" />
      <Field fieldName="mobile" />
      <Field fieldName="status" />
      <Field fieldName="policyId" />
    </FormSection>
  );
}

export default function UserProfileFormPage() {
  return (
    <ModelForm modelName="UserProfile">
      <FormHeader />
      <FormToolbar />

      <FormBody>
        <FormSection label="General" hideHeader>
          <Field fieldName="fullName" />
          <Field fieldName="birthDate" />
          <Field fieldName="gender" />
        </FormSection>

        {/* OneToOne 内联：在此表单内渲染 UserAccount 字段 */}
        <Field fieldName="userId" formView={UserAccountOneToOneView} />
      </FormBody>
    </ModelForm>
  );
}
```

提交载荷形状（更新，仅 `nickname` 变更）：

```json
{
  "id": "...",
  "userId": {
    "id": "...",
    "nickname": "Alice"
  }
}
```

提交载荷形状（创建）：

```json
{
  "userId": {
    "username": "alice",
    "nickname": "Alice",
    "email": "alice@example.com",
    "mobile": null,
    "status": "ACTIVE",
    "policyId": "1"
  }
}
```

未提供 `formView` 时，`OneToOne` 与 `ManyToOne` 行为相同，渲染引用选择器 widget。

### 兼容性

后端仍支持 XToMany 字段的全量提交。
前端 `ModelForm` 默认增量提交（`PatchType` map），以避免分页关联编辑中的全列表覆盖风险。

## 页面结构

推荐默认布局：

- Header：标题 + 描述
- 粘性工具栏：
  - 左侧：内置 `FormEditStatus + FormPrimaryActions`（`ModelForm/ModelSideForm enableWorkflow=true` 时还有 `FormWorkflowActions`）
  - 右侧：业务动作区（自定义动作 + 内置 Duplicate/Delete + More Actions）
- Body：`FormBody` 渲染堆叠 section 或真正的 tabs，以及内置审计面板布局
- Audit：`FormBody(enableAuditLog)` 控制审计面板；大屏右侧、小屏底部

## Props

### ModelForm Props

| Prop            | Type                      | Required | Default                               | Notes                                                                                       |
| --------------- | ------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `modelName`     | `string`                  | Yes      | -                                     | 用于从 API 请求元数据的模型名（`/metadata/getMetaModel`）。                    |
| `id`            | `string \| null`          | No       | Route `params.id` (`"new"` => `null`) | 可选覆盖。                                                                          |
| `schemaBuilder` | `(context) => ZodTypeAny` | No       | -                                     | 运行时 schema 扩展器。接收从已解析元数据构建的 `{ metaModel, baseSchema }`。 |
| `readOnly`      | `boolean`                 | No       | `false`                               | 强制只读模式。                                                                       |
| `defaultValues` | `Record<string, unknown>` | No       | -                                     | 合并进元数据默认值的额外默认值。适用于注入父上下文，如 `relatedField` 值。 |
| `copyFromId`    | `string \| null`          | No       | -                                     | 仅新建模式：用此源记录的可复制字段值（`getCopyableFields`）预填表单（复制流程）。全页表单通常用 `?copyFrom=<id>` 查询参数；嵌入式表单传此 prop。显式上下文（`defaultValues`、查询参数、关联字段）优先于复制值。 |
| `enableWorkflow`       | `boolean`                 | No       | `false`                               | 在工具栏左侧显示工作流动作组（仅编辑模式）。 |
| `enableCreate`         | `boolean`                 | No       | auto                                  | 内置 `Create New` 动作开关。`false` 禁用。省略则遵循默认（只读表单隐藏，除非显式 `true`）。 |
| `enableDuplicate`      | `boolean`                 | No       | auto                                  | 内置复制动作开关。`false` 禁用。省略则遵循默认（只读表单隐藏，除非显式 `true`）。 |
| `enableDelete`         | `boolean`                 | No       | auto                                  | 内置删除动作开关。`false` 禁用。省略则遵循默认（只读表单隐藏，除非显式 `true`）。 |
| `confirmDeleteMessage` | `string`                  | No       | `Delete this {modelLabel}? This action cannot be undone.` | 内置删除动作的确认文案。 |
| `timeline`      | `ModelFormTimelineConfig` | No       | -                                     | 时间轴模型行为开关（`enableAddVersion` / `enableVersionPanel` / `versionSummaryFields`，均可选）。仅当 `metaModel.timeline` 为 true 时生效；见下文「时间轴模型」。 |
| `sliceId`       | `string \| null`          | No       | `?sliceId=` 搜索参数                  | 仅时间轴模型的编辑模式：加载指定版本（切片）而非 as-of 行（按 `sliceId` 跨时间轴 `searchList`）。整页表单通常用 `?sliceId=<x>` 搜索参数（对话框模式忽略）；嵌入式表单直接传该 prop。 |
| `children`      | `ReactNode`               | Yes      | -                                     | 表单页面布局内容（`FormHeader/FormToolbar/FormBody`）。                               |

运行时字段条件：

- `Field.required`、`Field.readonly`、`Field.hidden` 支持 `boolean | FilterCondition | dependsOn(...)`。
- 条件针对当前表单值评估。
- `FilterCondition` 自动跟踪操作数字段与本地 `{{ fieldName }}` 引用。
- 函数条件须用 `dependsOn([...], evaluator)` 包装；不支持裸函数条件。
- `hidden` 字段不渲染，其校验错误被抑制。
- `required={false}` 可在运行时放宽元数据 `required`；`readonly={false}` 可覆盖元数据 readonly。
- `ModelForm` 与基于 `DialogForm` 的对话框表单使用相同运行时行为。

`ModelForm` 中的远程 `Field.onChange`：

- 请求路径为 `POST /<modelName>/onChange/<fieldName>`
- 请求始终发送当前字段 `value`；编辑模式还发送 `id`
- 省略 `with`：仅 `id + value`
- `with: ["a", "b"]`：仅发送 submit/API 形状中声明的依赖字段
- `with: "all"`：发送当前表单 submit 形状
- 顶层注册的 XToMany 字段序列化为关联 patch 载荷，而非原始 UI 行
- 响应 `values` 仅 patch 返回的键；`null` 清空字段
- 响应 `readonly` / `required` 覆盖本地生效状态，直至 reset、cancel、reload 或后续响应
- 此远程联动运行时针对 `ModelForm` 实现；独立 `DialogForm` 不自动可用

### FormHeader Props

| Prop          | Type        | Required | Default                                      | Notes                                     |
| ------------- | ----------- | -------- | -------------------------------------------- | ----------------------------------------- |
| `title`       | `string`    | No       | `metaModel.label` (fallback `pageTitle`) | 可选覆盖。                        |
| `description` | `string`    | No       | `metaModel.description`                      | 可选覆盖。                        |
| `extras`      | `ReactNode` | No       | -                                            | 标题附近渲染的额外 header 内容。时间轴模型在编辑模式下，header 会在 `extras` 之前自动渲染 `FormSliceBadge`：当前加载版本的生效区间（`Current · 2026-01-01 → ongoing`，`9999-12-31` 显示为 `ongoing`），带 Current / Past / Future 色调，回答"我正在看哪个版本"；非时间轴模型或新建模式不渲染。 |
| `children`    | `ReactNode` | No       | -                                            | 描述下方的展示模式内容。`Field` 子节点通过 `FieldDisplayScope` 以只读值渲染。行内布局使用 `Group`。 |

**带展示模式子节点的 FormHeader：**

```tsx
<FormHeader>
  <Group separator="·">
    <Field name="employeeCode" />
    <Field name="departmentName" />
  </Group>
</FormHeader>
```

### FormBody Props

| Prop             | Type                                        | Required | Default      | Notes                                                                    |
| ---------------- | ------------------------------------------- | -------- | ------------ | ------------------------------------------------------------------------ |
| `sectionNav`     | `boolean`                                   | No       | `false`      | 启用侧边 section 导航。为 `true` 时，section/tab 至少有 2 个 section 才渲染导航。 |
| `enableAuditLog` | `boolean`                                   | No       | `true`       | 切换审计面板（仅编辑模式渲染）。                          |
| `children`       | `ReactNode`                                 | Yes      | -            | 内容节点。根级 `FormSection`/`Field` 作为 tabs 上方共享内容渲染；根级 `FormTab` 激活 tabs 模式。`FormTab` 不能嵌套在另一个 `FormTab` 内。 |

`FormBody` 从根子节点推断布局模式。任意根级 `FormTab` 激活 tabs 模式；放在 `FormTab` 外的 `FormSection` 与 `Field` 渲染在 tab 条上方，作为所有 tab 可见的共享内容。
`FormBody` 默认还包含内置内容 surface 样式：`rounded-(--ui-card-radius) border border-border bg-card p-(--ui-card-padding)`。需要时可用 `className` 追加或覆盖默认样式。

### FormTab Props

`FormTab` 是 tab 式 `FormBody` 布局的根内容块。可包含多个 `FormSection` 块或直接内容节点。

| Prop        | Type        | Required | Default | Notes                                                |
| ----------- | ----------- | -------- | ------- | ---------------------------------------------------- |
| `label`  | `string`    | Yes      | -       | 可见 tab 标签。                                                                    |
| `value`      | `string`    | No       | auto    | 可选稳定 tab id；从 label 自动推导。                                      |
| `sectionNav` | `boolean`   | No       | -       | 仅覆盖此 tab 的 `FormBody` `sectionNav`。定义时优先。   |
| `children`   | `ReactNode` | No       | -       | Tab 面板内容。仍推荐使用 `FormSection`。                                  |

### FormSection Props

`FormSection` 是 `FormBody` 内的默认内容块。提供 section 标题 / 描述渲染、响应式字段网格、局部 section 动作与 section-nav 注册。

| Prop          | Type                  | Required | Default  | Notes                                                                                 |
| ------------- | --------------------- | -------- | -------- | ------------------------------------------------------------------------------------- |
| `label`   | `string`              | No       | -        | 可见 section 标签；也用作 section-nav 锚点文本。                      |
| `description` | `string`              | No       | -        | 可选，渲染在 section header 下方的说明文字。                               |
| `className`   | `string`              | No       | -        | section 容器的额外 wrapper class。                                        |
| `columns`     | `1 \| 2 \| 3 \| 4`    | No       | `2`      | `md+` 布局下 section 内容的响应式网格列数。                    |
| `hideHeader`  | `boolean`             | No       | `false`  | 隐藏视觉 section header，section 仍可参与导航。        |
| `divided`     | `boolean`             | No       | `false`  | section 之间添加上边框。第一个 section 上 suppressed（`:first-child`）。 |
| `children`    | `ReactNode`           | No       | -        | 通常为 `Field` 节点，以及可选的 section 作用域 `Action` 节点。                    |

说明：

- `FormSection` 自动向最近的 `FormBody` section 注册表注册自身。
- 省略 `label` 时，导航标签回退为 `"Section"`。
- 通用标签（`"Section"`）在导航中自动重命名为 `Section 1`、`Section 2` 等。
- `hideHeader` 仅影响渲染的 header；不禁用 section-nav 注册。
- `divided` 在 section 无 `label`（即 header 本身被隐藏）但仍需视觉分隔时最有用。有 `label` 时标题已提供分隔，通常无需 `divided`。
- `FormSection` 仅支持局部 UI 动作：`type="link"` 与 `type="custom"`，`placement="header"` 或 `placement="inline"`。

### Section Nav

`FormSectionNav` 内置于 `FormBody`；页面通常不直接渲染。

行为：

- `FormBody` 收集后代 `FormSection` 锚点，按注册顺序渲染导航。
- `sectionNav` 默认 `false`；设为 `true` 启用侧边导航。
- 仅当前视图至少有 2 个已注册 section 时渲染导航。
- tabs 模式下，`FormTab` 自身的 `sectionNav` 优先于该 tab 的 `FormBody` 设置。`FormTab` 上省略则继承 `FormBody` 的值。
- 点击导航项平滑滚动表单自身滚动容器，而非浏览器窗口。
- 堆叠模式下，侧边导航面向桌面：无右侧审计列时从 `xl` 布局显示；审计日志在右侧时从 `2xl` 显示。

堆叠示例：

```tsx
<FormBody sectionNav>
  <FormSection label="General" hideHeader>
    <Field fieldName="name" />
    <Field fieldName="code" />
  </FormSection>

  <FormSection label="Security">
    <Field fieldName="passwordMinLength" />
    <Field fieldName="passwordComplexityEnabled" />
  </FormSection>

  <FormSection label="Audit">
    <Field fieldName="createdBy" readOnly />
    <Field fieldName="createdDate" readOnly />
  </FormSection>

  <FormSection label="Advanced">
    <Field fieldName="description" />
  </FormSection>
</FormBody>
```

Tab 示例：

```tsx
import { FormBody, FormTab } from "@/components/views/form/components/FormBody";

<FormBody>
  <FormTab label="Profile" sectionNav>
    <FormSection label="General">
      <Field fieldName="name" />
      <Field fieldName="code" />
    </FormSection>

    <FormSection label="Advanced">
      <Field fieldName="description" />
    </FormSection>
  </FormTab>

  <FormTab label="Members">
    <Field fieldName="userIds" />
  </FormTab>
</FormBody>
```

### FormToolbar Props

| Prop        | Type        | Required | Default | Notes                                                |
| ----------- | ----------- | -------- | ------- | ---------------------------------------------------- |
| `children`  | `ReactNode` | No       | -       | 自定义动作。推荐：`<Action type="..." />`。 |
| `className` | `string`    | No       | -       | 工具栏容器的额外 wrapper class。           |

### ModelForm 中的 Actions

通用 `Action` / `BulkAction` API 现位于 [Actions](../actions)。
本节仅保留 `ModelForm` 容器规则与完整页面级示例。

容器支持：

| Container     | Supported Action Types                | Supported Placements |
| ------------- | ------------------------------------- | -------------------- |
| `FormToolbar` | `default`, `dialog`, `link`, `custom` | `toolbar`, `more`    |
| `FormSection` | `link`, `custom`                      | `header`, `inline`   |

规则：

- `FormToolbar` 是页面级业务动作区
- `FormSection` 是局部 UI 动作区，不直接执行模型 API 动作
- API 动作（`default` / `dialog`）放在 `FormToolbar`
- 内置工作流 / 创建 / 复制 / 删除工具栏行为在 `ModelForm`/`ModelSideForm` props 上配置
- 编辑模式有未保存变更：点击业务动作前会询问是否丢弃变更
- 创建模式：内置 `Duplicate` / `Delete` 仍可见但禁用
- 内置 `Duplicate` 仅在模型元数据 `copyable`（`MetaModel.copyable === true`）时出现；不可复制模型无论 `enableDuplicate` 如何都不暴露该动作
- 内置 `Duplicate` 从不直接插入：通过 `getCopyableFields` 加载源记录可复制值并打开预填的新建模式表单（全页表单导航到 `new?copyFrom=<id>`；ModelSideForm 进入带预填的内联创建模式），用户可在正常创建流程保存前调整唯一 / 业务字段；哪些字段可复制（由各字段 `MetaField.copyable` 决定）由后端解析

完整示例：

```tsx
import { Action } from "@/components/actions/Action";
import { FormSection } from "@/components/views/form/components/FormSection";
import { Field } from "@/components/fields";
import { ActionDialog } from "@/components/views/dialogs";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { ModelForm } from "@/components/views/form/ModelForm";
import { ExternalLink, Lock, RefreshCw, ShieldCheck } from "lucide-react";

function UnlockDialog() {
  return (
    <ActionDialog title="Unlock Account">
      <Field fieldName="reason" label="Reason" widgetType="Text" />
    </ActionDialog>
  );
}

<ModelForm modelName="UserAccount">
  <FormToolbar>
    <Action
      label="Lock"
      operation="lockAccount"
      placement="toolbar"
      icon={Lock}
      confirmMessage="Lock this account?"
    />
    <Action
      type="dialog"
      label="Unlock"
      operation="unlockAccount"
      placement="more"
      icon={ShieldCheck}
      component={UnlockDialog}
    />
  </FormToolbar>

  <FormBody>
    <FormSection label="Credentials">
      <Action
        type="link"
        label="Open Docs"
        placement="header"
        icon={ExternalLink}
        href="https://docs.example.com/credentials"
      />
      <Action
        type="custom"
        label="Regenerate Preview"
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

在 `ModelForm` 子组件内，使用 `useModelFormContext()` 访问：

- `pageTitle`、`pageDescription`
- `isEditing`、`isSubmitting`、`effectiveReadOnly`
- `form`（`react-hook-form` 实例）
- `onCancel()`
- `metaModel`、`id`

## 级联字段路径

`<Field fieldName="lastActivityId.status" />`（点记法）读取关联记录的字段并以只读渲染。表单计划 walker 收集 body 中声明的每个级联路径，一次性调用 `POST /metadata/resolveCascadedPaths` 解析所有叶子 metaField，将匹配的 SubQueries 折叠进 `getById`，并通过 `CascadedResolutionsProvider` 向 `<Field>` 暴露解析结果。

```tsx
<ModelForm modelName="AppEnv" recordId={envId}>
  <Field fieldName="name" />
  <Field fieldName="lastActivityId" />                {/* 普通 ManyToOne */}
  <Field fieldName="lastActivityId.status" />   {/* 级联 — 只读 */}
  <Field fieldName="lastActivityId.finishedTime" />   {/* 共享 base，自动合并 */}
  <Field fieldName="ownerId.departmentId.name" />       {/* 深度 3 */}
</ModelForm>
```

说明：

- 始终只读 —— 不向 RHF 注册，不出现在 `formState.dirtyFields`
- 生效元数据（fieldType / widgetType / label / optionSetCode）来自**叶子**字段；`props.label` / `props.widgetType` 仍可覆盖
- 在 `ModelSideForm` 内自动可用（其组合了 `ModelForm`）
- `formView` 回调内嵌套级联路径（深度 > 0）尚未解析 —— dev `console.warn` 与 "-" 占位

完整参考与语义：[Fields README 中的级联字段路径](../fields/fields#cascaded-field-path-display)。

## 权限集成

`ModelForm` 根据生成的 `MODEL_PERMISSIONS` 查找表，按 `modelName` 自动门控 —— 业务页面无需为标准工具栏控件或任何自定义 `<Action permission="…">` 子节点调用 `usePermission`。

仅传递 `modelName` 即可免费门控：

| Built-in control       | Action segment checked  | Effect when denied                                                |
| ---------------------- | ----------------------- | ----------------------------------------------------------------- |
| Toolbar "Save" / write | `update`                | 表单强制只读（无 Save 按钮，字段冻结） |
| Toolbar "Edit" button  | `update`                | 隐藏 —— `enableUpdate` 解析为 false                          |
| Toolbar "Create New"   | `create`                | 隐藏 —— `enableCreate` 解析为 false                          |
| Toolbar "Duplicate"    | `create`                | 隐藏 —— `enableDuplicate` 解析为 false                       |
| Toolbar "Delete"       | `delete`                | 隐藏 —— `enableDelete` 解析为 false                          |

`<FormToolbar>` 与 `<FormSection>` 内的自定义 `<Action permission="…" />` 子节点在渲染前过滤 —— 与 `ModelTable` 相同语义。传递 manifest 动作段（如 `permission="transfer"`）。

状态语义与 `ModelTable` 一致：

- **Granted** → 控件 / 动作保持可见。
- **Denied** → 控件 / 动作隐藏；拒绝 `update` 时表单强制只读（即使 URL 为 `?mode=edit`，用户也会进入只读 —— 服务端独立强制，此为 UX）。
- **Unmanaged** → `(modelName, action)` 不在 `MODEL_PERMISSIONS`（跨页面歧义）。自动门控无意见；页面可传显式 `readOnly` / `enable*` props。

业务 props 设为 `false` 时仍优先（页面显式隐藏 Edit，即使 SUPER_ADMIN）。SUPER_ADMIN 在内部短路权限查找。

示例：

```tsx
<ModelForm modelName="Employee">
  <FormToolbar>
    <Action
      type="custom"
      label="Transfer"
      permission="transfer"          {/* 由 Employee.transfer 门控 */}
      onClick={openTransferDialog}
    />
  </FormToolbar>
  <FormSection label="Profile">
    <Field fieldName="fullName" />
    ...
  </FormSection>
</ModelForm>
```

`Save` / `Cancel` / `Edit` / `Delete` 完全根据 `modelName="Employee"` 自动显示 / 隐藏；"Transfer" 在用户缺少 `Employee.transfer` 时自动隐藏。

## 内置行为

- 创建 / 编辑模式默认与 reset 处理。
- Reset 行为有快照保护：
  - 记录 / 模型身份变更 => reset
  - pristine 表单 + 远程快照变更 => reset
  - dirty 表单 + 后台 refetch => 不覆盖当前编辑
- 元数据解析策略：始终从 `/metadata/getMetaModel` 获取；首次响应由 React Query 缓存并复用。
- 元数据驱动字段 props 由内部字段 runtime 解析；业务代码应停留在 `Field`。
- Cancel / Back 行为（按模式与位置拆分）：
  - 编辑 / 创建模式：`Cancel` 按钮在工具栏 `Save` 旁（`FormPrimaryActions`）；dirty 时确认，reset 到最新加载快照，返回只读模式
  - 只读模式：`Back` 按钮在页面 header 右侧（`FormBackButton`，`ModelSideForm` 内隐藏）；导航到 breadcrumb 推导的路由（`resolveBackRoute` = navigation manifest + pathname）。MultiView `linkTo` 详情路由（`/list/<tab>/<id>`）解析为 tab crumb `/list?tab=<tab>` 而非无路由的 `/list/<tab>`，Back 不会 404 且回到来源 tab —— 无携带查询状态，刷新 / 深链解析一致
- Save/create mutation 处理与 toast。
- 审计查询内建 `useGetChangeLogQuery(modelName, id)`：
  - `pageNumber=1`
  - `pageSize=50`
  - `order=DESC`
  - `includeCreation=true`
  - `dataMask=true`
- 全局审计 API 开关：
  - `configs.env.enableChangeLog`（`NEXT_PUBLIC_ENABLE_CHANGE_LOG`，默认 `true`）
  - 禁用时 `FormAuditPanel` 不发起 change-log API 请求，显示禁用提示
- `FormWorkflowActions` + `WorkflowActionGroup` 支持工作流状态：
  - `draft`：submit
  - `pending`：withdraw/approve/reject
  - `approved`：withdraw approval
  - `rejected`：resubmit
- 表单 dirty 或 submitting 时工作流动作禁用。
- 审计事件渲染规则：
  - `update`：`<=5` 展开，`>5` 显示前 5 个 + `Show all fields (N)`
  - `create`：默认折叠
  - `delete`：仅操作信息

## 时间轴模型

仅当 `metaModel.timeline` 为 true 时生效；非时间轴模型忽略本节全部内容。

- **切片徽章**：编辑模式下，`FormHeader` 自动渲染当前加载版本的生效区间，带 Current / Past / Future 色调（`Current · 2026-01-01 → ongoing`；`9999-12-31` 渲染为 `ongoing`）。新建模式不渲染。
- **版本列表数据**：`useVersionListQuery(modelName, id)` 拉取一个实体的全部切片（`acrossTimeline: true`，生效区间新者在前）。表单侧全部调用方都经 `buildVersionListFields` 把查询窄化为结构键 + 摘要字段，因此面板、撞日检查与删除确认计数共享**同一个**缓存条目。其 query key 遵循 `[modelName, ...]` 约定，因此 addVersion / update / deleteBySliceId 变更后 `invalidateModelQueries` 会自动刷新它。
- **`timeline` prop**（`ModelFormTimelineConfig`）：`enableAddVersion` / `enableVersionPanel` / `versionSummaryFields` ——内置 Add Version 动作与 Versions 面板的开关。
- **Add Version 动作**：已持久化时间轴记录上的内置工具栏动作；新建模式下渲染为禁用并附提示（与 Duplicate / Delete 同款约定）。门控：`metaModel.timeline` 且具备 create 权限（服务端 `addVersion` 走 create 管线，因此没有 update 权限的用户也可以新增版本）且 `timeline.enableAddVersion !== false`。进入模式前先丢弃未保存修改（有脏值时弹确认框），让表单从干净基线开始。
- **新增版本模式**：工具栏显示必填的 "Effective from" 日期（默认今天）与实时提示——常态为 "The new version is created exactly from the values shown on this form"，与既有版本同一生效日时切换为 "A version already starts on this date — submitting corrects that version instead"（日期数据来自 `useVersionListQuery`，仅模式激活时加载）。即使从路由只读模式进入，字段也会解锁。模式激活期间隐藏记录级动作（Create New / Duplicate / Delete）；提交按钮显示 `Add Version`，未设置生效日期前保持禁用。
- **新增版本提交**：提交**整行**——`id` + `effectiveStartDate` + 全部展示字段——走 `addVersionAndFetch`。所见即所得：新版本就是用户眼前看到的内容，以当前加载版本为底稿（零修改提交 = 复制该版本）。API 本身也接受部分行（缺失字段由服务端从相邻切片复制前滚）——这保留为集成调用方的能力；表单刻意不用它，确保"屏幕所见"与"实际落库"永不分叉。该模式下排除 XToMany 关系补丁——它们键在源切片的行上。成功后表单回到 as-of 今天的只读视图；直接打开新版本由 Versions 面板承接。
- 新增版本模式中的 **Cancel** 丢弃草稿并退出模式，不发生导航。
- **Versions 面板**：时间轴模型的已持久化记录上，`FormBody` 在审计日志上方渲染 `Versions` 侧板（同一右栏 / 底部堆叠）。每行显示生效区间、Current / Past / Future 徽标与摘要（`timeline.versionSummaryFields`，缺省用模型 `displayName`）；当前加载版本高亮。行动作：`Open` / `Correct` 经 `?sliceId=` 搜索参数导航（只读 / 编辑模式；侧滑表单壳内隐藏——无切片路由），`Delete` 在破坏性确认后删除该版本。`Correct` 与 `Delete` 遵循工具栏权限约定（update / delete 状态；无权限时隐藏，未纳管模型显示）。删除**唯一**版本即删除实体本身（时间轴实体就是它的全部切片），确认文案升级为记录级措辞并改走实体删除——`onDelete` 外键删除策略随之生效（侧滑表单壳内唯一版本的删除保持禁用：无列表导航目标）。展开行加载该版本的切片级变更日志（`getSliceChangeLog`）。用 `timeline.enableVersionPanel: false` 关闭面板。
- **加载指定版本**：携带 `sliceId`（prop 或搜索参数）时，表单跨时间轴加载该切片而非 as-of 行——徽章显示其真实区间，编辑模式恰好修正该版本（`update` 以 `sliceId` 为键），Add Version 也从它分叉。
- **实体删除**：时间轴模型的内置 Delete 确认会明示影响范围——"All N versions will be removed"（N 来自 Versions 面板已缓存的查询）。

## 页面导航（Header 中的 Back + Prev/Next）

页面 header 右侧托管两个页面 / 记录级导航原语（非表单数据级），使 `FormToolbar` 聚焦表单生命周期动作：

- `FormBackButton`（仅只读模式）—— 返回 breadcrumb 推导路由（`resolveBackRoute`）：普通详情的注册列表页，或 MultiView `linkTo` 详情的 tab crumb `/list?tab=<tab>`。纯 path/manifest 推导（无携带查询状态）。在 `ModelSideForm` 与编辑 / 创建模式隐藏（工具栏 `Cancel` 处理等价意图）。
- `FormSiblingNav` —— `‹ index/total ›` 按钮，跳转到上一条 / 下一条兄弟记录。

兄弟导航要求用户通过同模型兄弟列表视图（`ModelTable` / `ModelBoard` / `ModelCard`）的行 / 卡片点击进入：

- 真相源为 `src/components/views/form/hooks/siblingNavStore.ts` 的模块级快照。列表视图在点击时将当前可见（已排序、服务端分页）id 写入快照；`FormSiblingNav` 渲染时读取。
- 各视图作用域：
  - `ModelTable`：当前页 id（已应用服务端筛选 + 排序）。
  - `ModelBoard`：点击卡片所属列内的 id。
  - `ModelCard`：当前页 id。
- 无快照时隐藏按钮（如直接 URL、页面 reload 或不同模型）。在首 / 末条记录、submitting 中、表单 dirty 时禁用（避免未保存编辑在点击时丢失）。
- 快照为临时性：仅内存，不持久化到 URL、sessionStorage 或 React state。客户端路由变更（`router.push`）仍可保留，全量 reload 重置。

## 对话框架构

详细对话框 API、props 与完整示例维护于：
[Dialogs](./dialogs)。

快速选择：

- `ActionDialog`：调用模型操作 `/{modelName}/{operation}`（单条 / 批量）。
- `ModelDialog`：关联字段运行时对话框，无需显式 `modelName`。

为避免文档漂移，本文件仅保留表单页指导；对话框细节集中在 dialogs README。

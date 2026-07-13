# ModelSideForm

分栏视图：左侧侧栏选择记录，右侧 `ModelForm` 展示/编辑。

## 相关文档

- [ModelForm](./form) — 右侧渲染的表单
- [ModelTable](./table) — 表格视图（共用侧栏组件）
- [ModelCard](./card) — 卡片网格视图
- [侧栏组件](./table#side-panel-optional) — SideTree、SideCard、SideList
- [Fields](../fields/fields) — 侧栏与表单共用的字段组件
- [Actions](../actions) — 工具栏与表单操作

## 快速开始

```tsx
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormSection } from "@/components/views/form/components/FormSection";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { SideTree } from "@/components/views/shared/side-panel/SideTree";
import { ModelSideForm } from "@/components/views/side-form/ModelSideForm";

export default function SettingPage() {
  return (
    <ModelSideForm modelName="Setting">
      {/* Left: side panel for record selection */}
      <SideTree
        modelName="SettingGroup"
        filterField="groupId"
        labelField="name"
        parentField="parentId"
      />

      {/* Right: standard ModelForm content */}
      <FormHeader />
      <FormToolbar />
      <FormBody>
        <FormSection label="General">
          <Field fieldName="key" />
          <Field fieldName="value" />
        </FormSection>
      </FormBody>
    </ModelSideForm>
  );
}
```

## 工作原理

1. **子节点拆分**为一个侧栏元素（`SideTree`、`SideCard` 或 `SideList`）与表单内容（其余一切）。
2. 侧栏包在 `SidePanelContainerProvider` 中，选择事件回流到 `ModelSideForm`。
3. 选中记录后挂载带该记录 `id` 的 `ModelForm`。表单支持完整读/写生命周期——与独立 `[id]/page.tsx` 路由中的 `ModelForm` 相同。
4. 选择可内部管理或由外部控制。在路由驱动的详情页传入 `selectedRecordId` 并处理 `onSelectedRecordChange` 以保持 URL 同步。
5. 切换记录会**重新挂载**表单（通过 key 变化），每条记录获得全新表单状态。
6. 若表单有**未保存更改**，切换前会弹出确认是否丢弃。
7. 未选中记录时显示占位提示。

`ModelSideForm` 内级联 `<Field fieldName="a.b">` 声明自动生效，因内嵌 `ModelForm` 处理遍历器 / 解析 / Provider 管线——见 [ModelForm 中的级联字段路径](./form#cascaded-field-path)。

## 属性

| 属性                   | 类型        | 必填 | 默认值                                                   | 说明                                                                                                   |
| ---------------------- | ----------- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `modelName`            | `string`    | 是      | -                                                         | 载入 `ModelForm` 的模型。                                                                     |
| `label`            | `string`    | 否       | -                                                         | 覆盖「未选择 X」/「创建 X」文案与 `FormHeader` 使用的模型标签。默认为 `metaModel.label`。 |
| `enableWorkflow`       | `boolean`   | 否       | `false`                                                   | 右侧表单工具栏显示工作流操作组（仅编辑模式）。                                |
| `enableCreate`         | `boolean`   | 否       | `true`                                                    | 创建入口总开关（侧栏 + 空状态 + 工具栏「新建」）。                 |
| `enableDuplicate`      | `boolean`   | 否       | auto                                                      | 右侧工具栏内置复制开关。`false` 禁用。复制进入内联创建模式，预填源记录可复制字段（非直接插入）。                               |
| `enableDelete`         | `boolean`   | 否       | auto                                                      | 右侧工具栏内置删除开关。`false` 禁用。                                  |
| `confirmDeleteMessage` | `string`    | 否       | `Delete this {modelLabel}? This action cannot be undone.` | 右侧工具栏内置删除的确认文案。                                          |
| `selectedRecordId`     | `string \| null` | 否   | 非受控                                              | 同一 side-form 页面详情路由变体的受控记录 id。                              |
| `onSelectedRecordChange` | `(id: string \| null, record?: Record<string, unknown>) => void` | 否 | - | 受控模式下侧栏选择不同记录时触发。                                |
| `children`             | `ReactNode` | 是      | -                                                         | 一个侧栏元素 + 标准表单组件。                                                       |

`ModelSideForm` 将工具栏相关属性转发给内部 `ModelForm`。`FormToolbar` 本身只需渲染自定义操作。

省略 `selectedRecordId` 时由 `ModelSideForm` 内部管理选择。提供时右侧表单始终跟随该 id，侧栏仅反映当前列表中的记录。

## 子节点结构

子节点分为两组：

| 分组             | 组件                              | 渲染位置          |
| ----------------- | --------------------------------------- | ------------------- |
| **侧栏**    | 其一：`SideTree`、`SideCard`、`SideList` | 左侧面板（280px）  |
| **表单内容**  | `FormHeader`、`FormToolbar`、`FormBody`、`Field` 等 | 右侧面板（flex-1） |

表单内容子节点直接传给 `ModelForm`——组合方式与独立 ModelForm 页面相同。

## 布局

`SideFormLayout` 渲染两列布局：

```
┌──────────────┬──────────────────────────────────┐
│  Side Panel  │           ModelForm               │
│   (280px)    │           (flex-1)                │
│              │                                    │
│  SideTree /  │  FormHeader                        │
│  SideCard /  │  FormToolbar                       │
│  SideList    │  FormBody                          │
│              │    FormSection                     │
│              │      Field ...                     │
│              │                                    │
└──────────────┴──────────────────────────────────┘
```

- 侧栏：固定 280px，`border-r` 分隔
- 表单区：`flex-1`，独立滚动
- 两栏占满可用高度

## 侧栏选项

可使用任意侧栏组件。组件决定记录选择 UI：

| 组件    | 最适合                                     | 选择模式 |
| ------------ | -------------------------------------------- | -------------- |
| `<SideTree>` | 层级数据（部门、分类）  | 树节点      |
| `<SideCard>` | 带头/体/脚的富卡片展示    | 卡片点击     |
| `<SideList>` | 带 Field 行模板的简单列表   | 列表项      |

### SideTree 示例

```tsx
<ModelSideForm modelName="SysField">
  <SideTree
    title="System Model"
    modelName="SysModel"
    filterField="modelId"
    labelField="label"
    parentField="parentId"
    sortField="modelName"
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <FormHeader />
  <FormBody>
    <FormSection label="Field Info">
      <Field fieldName="fieldName" />
      <Field fieldName="label" />
      <Field fieldName="fieldType" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

### SideList 示例

```tsx
<ModelSideForm modelName="DesignActivity">
  <SideList
    modelName="DesignActivity"
    filterField="id"
    filters={[["status", "=", "IN_PROGRESS"], "OR", ["status", "=", "READY"]]}
    searchable
    remoteSearch
  >
    <ActivityListItem />
  </SideList>

  <FormHeader />
  <FormToolbar />
  <FormBody>
    <FormSection label="General">
      <Field fieldName="name" />
      <Field fieldName="status" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

`SideList` 子节点定义行模板。每行包在 `RecordContextProvider` 中，自定义组件可用 `useRecordContext()`：

```tsx
import { useRecordContext } from "@/components/contexts/RecordContext";
import { Badge } from "@/components/ui/badge";

function ActivityListItem() {
  const { record } = useRecordContext();
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="truncate text-xs">{record.name as string}</span>
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {record.status as string}
      </Badge>
    </div>
  );
}
```

### SideCard 示例

```tsx
<ModelSideForm modelName="DesignActivity">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    sortField="appName"
    searchable
  >
    <SideCard.Header>
      <Field fieldName="appName" />
    </SideCard.Header>
    <SideCard.Header align="right">
      <Field fieldName="status" />
    </SideCard.Header>
    <Field fieldName="appCode" />
    <SideCard.Footer>
      <Field fieldName="updatedTime" />
    </SideCard.Footer>
  </SideCard>

  <FormHeader />
  <FormBody>
    <FormSection label="General">
      <Field fieldName="name" />
      <Field fieldName="description" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

`SideCard.Header` 接受 `align`（`"left" | "right"`，默认 `"left"`）。再声明 `<SideCard.Header align="right">` 可将元素推到卡片头部行右侧。左右组内可各放多个元素；组内顺序按 JSX 顺序。`placement="header"` 的 Action 始终在左组；`more`（`...`）菜单始终在右组最末端。

## 表单内容

右侧渲染完整 `ModelForm`。组合方式与独立表单页相同：

| 组件      | 用途                                      |
| -------------- | -------------------------------------------- |
| `FormHeader`   | 带模型标签与描述的标题栏   |
| `FormToolbar`  | 业务操作（保存、删除、自定义）      |
| `FormBody`     | 带标签页与分区的表单主体             |
| `FormSection`  | 带标签的网格分区               |
| `Field`        | 单个表单字段                        |
| `Action`       | 自定义工具栏或表单操作               |

### 带工具栏 Actions

```tsx
import { Action } from "@/components/actions/Action";
import { CheckCircle, XCircle } from "lucide-react";

// Form-scope actions are implicitly disabled in `create` mode — no need to
// repeat `mode === "create"` in `disabled`. See [Actions](../actions).
<ModelSideForm modelName="DesignActivity">
  <SideList filterField="id" searchable>
    <ActivityListItem />
  </SideList>

  <FormHeader />
  <FormToolbar>
    <Action
      label="Approve"
      icon={CheckCircle}
      operation="approve"
      placement="toolbar"
      confirmMessage="Approve this item?"
      successMessage="Approved."
      hidden={["status", "!=", "PENDING"]}
    />
    <Action
      label="Reject"
      icon={XCircle}
      operation="reject"
      placement="more"
      confirmMessage="Reject this item?"
      successMessage="Rejected."
      hidden={["status", "!=", "PENDING"]}
    />
  </FormToolbar>

  <FormBody>
    <FormSection label="General">
      <Field fieldName="name" />
      <Field fieldName="status" />
      <Field fieldName="description" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

### 多个 FormSection

```tsx
<ModelSideForm modelName="Employee">
  <SideTree
    modelName="Department"
    filterField="departmentId"
    labelField="name"
    parentField="parentId"
  />

  <FormHeader />
  <FormToolbar />
  <FormBody>
    <FormSection label="Basic Info">
      <Field fieldName="firstName" />
      <Field fieldName="lastName" />
      <Field fieldName="email" />
    </FormSection>
    <FormSection label="Employment">
      <Field fieldName="departmentId" />
      <Field fieldName="positionId" />
      <Field fieldName="hireDate" />
    </FormSection>
    <FormSection label="Custom Content">
      <MyCustomComponent />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

## 受控详情路由

选中记录需要出现在 URL 时使用受控模式：

```tsx
"use client";

import { routes } from "@/app/studio/routes";
import { Field } from "@/components/fields";
import { FormBody } from "@/components/views/form/components/FormBody";
import { FormHeader } from "@/components/views/form/components/FormHeader";
import { FormToolbar } from "@/components/views/form/components/FormToolbar";
import { SideList } from "@/components/views/shared/side-panel/SideList";
import { ModelSideForm } from "@/components/views/side-form/ModelSideForm";
import { fillRouteTemplate } from "@/navigation";
import { useParams, useRouter } from "next/navigation";

export default function DesignActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ appId: string; activityId: string }>();

  return (
    <ModelSideForm
      modelName="DesignActivity"
      selectedRecordId={params.activityId}
      onSelectedRecordChange={(nextId) => {
        if (!nextId) {
          router.push(fillRouteTemplate(routes.designActivity, { appId: params.appId })!);
          return;
        }
        router.push(
          fillRouteTemplate(routes.designActivityDetail, {
            appId: params.appId,
            activityId: nextId,
          })!,
        );
      }}
    >
      <SideList modelName="DesignActivity" filterField="id" searchable remoteSearch>
        <ActivityListItem />
      </SideList>

      <FormHeader />
      <FormToolbar />
      <FormBody>
        <Field fieldName="name" />
      </FormBody>
    </ModelSideForm>
  );
}
```

说明：

- 即使当前侧栏查询不包含该 id，右侧表单仍可从路由打开记录。
- 此时侧栏无高亮行，表单仍通过 `getById` 加载详情记录。
- 适用于 `/design-model` 与 `/design-activity/[id]` 等浏览/详情路由对。

## 脏状态与记录切换

`ModelSideForm` 自动跟踪表单是否有未保存更改。表单为脏时点击侧栏另一条记录：

1. 确认对话框：_「You have unsaved changes. Discard them and switch to the selected record?」_
2. **丢弃** → 切换到新记录，旧更改丢失
3. **继续编辑** → 保持当前记录，侧栏选择不变

防止意外丢数据。每次切换记录会完全重新挂载表单（React key），每条记录获得干净表单状态。

受控模式下选择不同记录会调用 `onSelectedRecordChange`；父页面负责更新路由或外部状态以喂给 `selectedRecordId`。

## 与其他视图对比

| 功能             | ModelSideForm          | ModelTable              | ModelCard              |
| ------------------- | ---------------------- | ----------------------- | ---------------------- |
| 数据展示        | 单条记录表单     | 多行表格网格    | 多卡片网格        |
| 侧栏          | 必需（选择）   | 可选（过滤）    | 可选（过滤）   |
| 记录编辑      | 完整表单编辑         | 可选内联编辑    | -                      |
| 点击行为      | 侧栏选择记录   | 导航或内联编辑 | 导航               |
| 脏状态保护   | 是                    | 仅内联编辑        | -                      |
| 搜索/过滤/排序  | 仅侧栏        | 完整工具栏            | 简化工具栏     |
| 分页          | 侧栏（客户端）    | 服务端             | 服务端            |
| 远程搜索       | `remoteSearch` 属性    | 内置                | 内置               |

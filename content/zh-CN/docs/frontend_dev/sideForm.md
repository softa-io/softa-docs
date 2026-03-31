# ModelSideForm

分栏布局：左侧侧栏选择一条记录，右侧 `ModelForm` 展示/编辑该记录。

## 相关文档

- [ModelForm](../form) — 右侧渲染的表单
- [ModelTable](../table) — 表格视图（共用侧栏组件）
- [ModelCard](../card) — 卡片网格视图
- [侧栏组件](../shared/side-panel/) — SideTree、SideCard、SideList
- [Field](../fields) — 侧栏与表单共用的字段控件
- [Action](../action) — 工具栏与表单动作

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
      {/* 左侧：用于选择记录的侧栏 */}
      <SideTree
        modelName="SettingGroup"
        filterField="groupId"
        labelField="name"
        parentField="parentId"
      />

      {/* 右侧：标准 ModelForm 内容 */}
      <FormHeader />
      <FormToolbar />
      <FormBody>
        <FormSection labelName="General">
          <Field fieldName="key" />
          <Field fieldName="value" />
        </FormSection>
      </FormBody>
    </ModelSideForm>
  );
}
```

## 工作原理

1. **子节点被拆成两类**：一个侧栏组件（`SideTree`、`SideCard` 或 `SideList`），以及其余表单内容。
2. 侧栏包裹在 `SidePanelContainerProvider` 中，以便选择事件能回传到 `ModelSideForm`。
3. 选中记录后，会以该记录的 `id` 挂载 `ModelForm`。表单具备完整读/写生命周期 —— 与独立 `[id]/page.tsx` 路由里使用的 `ModelForm` 相同。
4. 选择可由内建状态管理，也可由外部控制。在路由驱动的详情页中，传入 `selectedRecordId` 并处理 `onSelectedRecordChange`，可与 URL 同步。
5. 切换记录会**重新挂载**表单（通过 key 变化），每条记录获得独立的表单状态。
6. 若表单存在**未保存变更**，切换前会弹出确认对话框。
7. 未选中任何记录时显示占位提示。

## Props

| Prop                   | 类型        | 必填 | 默认值 | 说明 |
| ---------------------- | ----------- | ---- | ------ | ---- |
| `modelName`            | `string`    | 是   | -      | 加载到 `ModelForm` 的模型名。 |
| `enableWorkflow`       | `boolean`   | 否   | `false` | 右侧表单工具栏在编辑模式下显示工作流动作组。 |
| `enableCreate`         | `boolean`   | 否   | `true` | 创建入口总开关（侧栏 + 空状态 + 工具栏「新建」）。 |
| `enableDuplicate`      | `boolean`   | 否   | auto   | 右侧工具栏内置复制动作。`false` 关闭。 |
| `enableDelete`         | `boolean`   | 否   | auto   | 右侧工具栏内置删除动作。`false` 关闭。 |
| `confirmDeleteMessage` | `string`    | 否   | `Delete this {modelLabel}? This action cannot be undone.` | 右侧工具栏删除确认文案。 |
| `selectedRecordId`     | `string \| null` | 否 | 非受控 | 受控的记录 id，用于同页侧栏 + 详情路由等变体。 |
| `onSelectedRecordChange` | `(id: string \| null, record?: Record<string, unknown>) => void` | 否 | - | 受控模式下，侧栏选择变化时回调。 |
| `children`             | `ReactNode` | 是   | -      | 一个侧栏组件 + 标准表单内容。 |

`ModelSideForm` 会将与工具栏相关的 props 转发给内部 `ModelForm`。`FormToolbar` 一般只需渲染自定义动作。

若省略 `selectedRecordId`，由 `ModelSideForm` 内部管理选中项；若传入，右侧表单始终跟随该 id，侧栏仅反映当前列表中的记录。

## 子节点结构

子节点分为两组：

| 分组           | 组件                                                         | 渲染位置            |
| -------------- | ------------------------------------------------------------ | ------------------- |
| **侧栏**       | 任选其一：`SideTree`、`SideCard`、`SideList`                 | 左侧（280px）       |
| **表单内容**   | `FormHeader`、`FormToolbar`、`FormBody`、`Field` 等          | 右侧（flex-1）      |

表单内容子节点会直接传入 `ModelForm` —— 组合方式与独立 ModelForm 页面相同。

## 布局

`SideFormLayout` 渲染为两列：

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

- 侧栏：固定 280px，`border-r` 分隔线
- 表单区域：`flex-1`，独立滚动
- 两栏均填满可用高度

## 侧栏选项

可使用任意侧栏组件，由组件决定记录选择的 UI：

| Component    | 适用场景                                     | 选择方式 |
| ------------ | -------------------------------------------- | -------------- |
| `<SideTree>` | 层级数据（部门、分类等）  | 树节点      |
| `<SideCard>` | 带头/体/尾的富卡片展示    | 点击卡片     |
| `<SideList>` | 基于 Field 行模板的简单列表   | 列表项      |

### SideTree 示例

```tsx
<ModelSideForm modelName="SysField">
  <SideTree
    title="System Model"
    modelName="SysModel"
    filterField="modelId"
    labelField="labelName"
    parentField="parentId"
    sortField="modelName"
    selectionMode="single"
    defaultExpandedLevel={2}
  />
  <FormHeader />
  <FormBody>
    <FormSection labelName="Field Info">
      <Field fieldName="fieldName" />
      <Field fieldName="labelName" />
      <Field fieldName="fieldType" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

### SideList 示例

```tsx
<ModelSideForm modelName="DesignWorkItem">
  <SideList
    modelName="DesignWorkItem"
    filterField="id"
    filters={[["status", "=", "IN_PROGRESS"], "OR", ["status", "=", "READY"]]}
    searchable
    remoteSearch
  >
    <WorkItemListItem />
  </SideList>

  <FormHeader />
  <FormToolbar />
  <FormBody>
    <FormSection labelName="General">
      <Field fieldName="name" />
      <Field fieldName="status" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

`SideList` 的子节点定义行模板。每行包裹在 `RecordContextProvider` 中，自定义组件可使用 `useRecordContext()`：

```tsx
import { useRecordContext } from "@/components/contexts/RecordContext";
import { Badge } from "@/components/ui/badge";

function WorkItemListItem() {
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
<ModelSideForm modelName="DesignWorkItem">
  <SideCard
    modelName="DesignApp"
    filterField="appId"
    sortField="appName"
    searchable
  >
    <SideCard.Header>
      <Field fieldName="appName" />
    </SideCard.Header>
    <Field fieldName="appCode" />
    <SideCard.Footer>
      <Field fieldName="updatedTime" />
    </SideCard.Footer>
  </SideCard>

  <FormHeader />
  <FormBody>
    <FormSection labelName="General">
      <Field fieldName="name" />
      <Field fieldName="description" />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

## 表单内容

右侧渲染完整 `ModelForm`。组合方式与独立表单页相同：

| Component      | 用途                                      |
| -------------- | -------------------------------------------- |
| `FormHeader`   | 标题栏，含模型标签与描述   |
| `FormToolbar`  | 业务动作（保存、删除、自定义等）      |
| `FormBody`     | 表单主体，含页签与区块             |
| `FormSection`  | 带标签的栅格区块               |
| `Field`        | 单个表单字段                        |
| `Action`       | 自定义工具栏或表单动作               |

### 配合工具栏动作

```tsx
import { Action, dependsOn } from "@/components/actions/Action";
import { CheckCircle, XCircle } from "lucide-react";

<ModelSideForm modelName="DesignWorkItem">
  <SideList filterField="id" searchable>
    <WorkItemListItem />
  </SideList>

  <FormHeader />
  <FormToolbar>
    <Action
      type="default"
      labelName="Approve"
      icon={CheckCircle}
      operation="approve"
      placement="toolbar"
      confirmMessage="Approve this item?"
      successMessage="Approved."
      disabled={dependsOn(["id"], ({ mode }) => mode === "create")}
      hidden={["status", "!=", "PENDING"]}
    />
    <Action
      type="default"
      labelName="Reject"
      icon={XCircle}
      operation="reject"
      placement="more"
      confirmMessage="Reject this item?"
      successMessage="Rejected."
      disabled={dependsOn(["id"], ({ mode }) => mode === "create")}
      hidden={["status", "!=", "PENDING"]}
    />
  </FormToolbar>

  <FormBody>
    <FormSection labelName="General">
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
    <FormSection labelName="Basic Info">
      <Field fieldName="firstName" />
      <Field fieldName="lastName" />
      <Field fieldName="email" />
    </FormSection>
    <FormSection labelName="Employment">
      <Field fieldName="departmentId" />
      <Field fieldName="positionId" />
      <Field fieldName="hireDate" />
    </FormSection>
    <FormSection labelName="Custom Content">
      <MyCustomComponent />
    </FormSection>
  </FormBody>
</ModelSideForm>
```

## 受控详情路由

若选中记录需要体现在 URL 中，请使用受控模式：

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

export default function WorkbenchDetailPage() {
  const router = useRouter();
  const params = useParams<{ appId: string; workItemId: string }>();

  return (
    <ModelSideForm
      modelName="DesignWorkItem"
      selectedRecordId={params.workItemId}
      onSelectedRecordChange={(nextId) => {
        if (!nextId) {
          router.push(fillRouteTemplate(routes.workbench, { appId: params.appId })!);
          return;
        }
        router.push(
          fillRouteTemplate(routes.workbenchDetail, {
            appId: params.appId,
            workItemId: nextId,
          })!,
        );
      }}
    >
      <SideList modelName="DesignWorkItem" filterField="id" searchable remoteSearch>
        <WorkItemListItem />
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

- 即使当前侧栏查询结果里不包含路由中的 id，右侧表单仍可通过 `getById` 打开该记录。
- 此时侧栏可能没有高亮行，但表单会正常加载详情。
- 适用于 `/workbench` 与 `/workbench/[workItemId]` 等浏览/详情成对路由。

## 脏状态与切换记录

`ModelSideForm` 会自动追踪表单是否有未保存变更。在表单为 dirty 时点击侧栏中的另一条记录：

1. 弹出确认对话框：*「存在未保存的修改，是否放弃并切换到所选记录？」*
2. **放弃** → 切换到新记录，原有编辑丢失
3. **继续编辑** → 停留在当前记录，侧栏选中状态不变

可避免误丢数据。每次切换记录都会完整重挂载表单（React key），每条记录获得干净的表单状态。

受控模式下，选择其他记录会触发 `onSelectedRecordChange`；父级负责更新路由或外部状态，以驱动 `selectedRecordId`。

## 与其他视图对比

| 功能              | ModelSideForm    | ModelTable       | ModelCard        |
| ----------------- | ---------------- | ---------------- | ---------------- |
| 数据展示          | 单记录表单       | 多行表格         | 多卡片网格       |
| 侧栏              | 必选（选记录）   | 可选（筛选）     | 可选（筛选）     |
| 记录编辑          | 完整表单编辑     | 可选行内编辑     | -                |
| 点击行为          | 侧栏选记录       | 跳转或行内编辑   | 跳转             |
| 脏数据保护        | 有               | 仅行内编辑       | -                |
| 搜索/筛选/排序    | 主要在侧栏       | 完整工具栏       | 简化工具栏       |
| 分页              | 侧栏（客户端）   | 服务端           | 服务端           |
| 远程搜索          | `remoteSearch`   | 内置             | 内置             |

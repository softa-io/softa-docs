# ModelSideForm

分栏布局：左侧侧栏选择一条记录，右侧 `ModelForm` 展示/编辑该记录。

## 相关文档

- [ModelForm](../form/README.md) — 右侧渲染的表单
- [ModelTable](../table/README.md) — 表格视图（共用侧栏组件）
- [ModelCard](../card/README.md) — 卡片网格视图
- [侧栏组件](../shared/side-panel/) — SideTree、SideCard、SideList
- [Field](../../fields/README.md) — 侧栏与表单共用的字段控件
- [Action](../../actions/README.md) — 工具栏与表单动作

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
4. 切换记录会**重新挂载**表单（通过 key 变化），每条记录获得全新的表单状态。
5. 若表单存在**未保存变更**，切换前会弹出确认对话框。
6. 未选中任何记录时显示占位提示。

## Props

| Prop        | Type        | Required | Default | 说明                                              |
| ----------- | ----------- | -------- | ------- | -------------------------------------------------- |
| `modelName` | `string`    | 是       | -       | 加载到 `ModelForm` 的模型名。                |
| `children`  | `ReactNode` | 是       | -       | 一个侧栏组件 + 标准表单子组件。 |

## 子节点结构

子节点分为两组：

| 分组             | 组件                              | 渲染位置          |
| ----------------- | --------------------------------------- | ------------------- |
| **侧栏**    | 任选其一：`SideTree`、`SideCard`、`SideList` | 左侧面板（280px）  |
| **表单内容**  | `FormHeader`、`FormToolbar`、`FormBody`、`Field` 等 | 右侧面板（flex-1） |

表单内容会直接传给 `ModelForm` —— 组合方式与独立 ModelForm 页面相同。

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

## 脏状态与切换记录

`ModelSideForm` 会自动追踪表单是否有未保存变更。在表单为 dirty 时点击侧栏中的另一条记录：

1. 弹出确认对话框：*「存在未保存的更改。是否放弃并切换到所选记录？」*
2. **放弃** → 切换到新记录，原有编辑丢失
3. **继续编辑** → 停留在当前记录，侧栏选中状态不变

可避免误丢数据。每次切换记录都会完整重挂载表单（React key），每条记录获得干净的表单状态。

## 与其他视图对比

| 功能             | ModelSideForm          | ModelTable              | ModelCard              |
| ------------------- | ---------------------- | ----------------------- | ---------------------- |
| 数据展示        | 单条记录表单     | 多行表格    | 多卡片网格        |
| 侧栏          | 必选（选择记录）   | 可选（筛选）    | 可选（筛选）   |
| 记录编辑      | 完整表单编辑         | 可选行内编辑    | -                      |
| 点击行为      | 侧栏选记录   | 跳转或行内编辑 | 跳转               |
| 脏数据保护   | 有                    | 仅行内编辑        | -                      |
| 搜索/筛选/排序  | 仅在侧栏        | 完整工具栏            | 简化工具栏     |
| 分页          | 侧栏（前端）    | 服务端             | 服务端            |

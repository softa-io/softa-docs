# ModelCard

可组合的卡片网格视图，具备：

- 通过 `RecordContext` 元数据驱动卡片渲染
- 服务端分页查询
- 工具栏搜索 / 过滤 / 排序控制
- 可选侧栏过滤（SideTree、SideCard、SideList）
- 每张卡片删除操作
- 点击导航至记录详情（通过 `linkTo` 限定在当前路由子树）

## 相关文档

- [ModelTable](./table) — 表格网格视图（共用工具栏对话框、侧栏与数据钩子）
- [ModelForm](./form) — 卡片点击打开的详情表单
- [Action](../actions) — 操作系统（用于侧栏）
- [Field](../fields/fields) — 通过 `RecordContext` 在卡片内渲染的字段组件

## 快速开始

```tsx
import { Field } from "@/components/fields";
import { ModelCard } from "@/components/views/card";

export default function DesignAppPage() {
  return (
    <ModelCard modelName="DesignApp" enableDelete>
      <ModelCard.Header>
        <Field fieldName="appName" />
      </ModelCard.Header>
      <Field fieldName="appCode" />
      <Field fieldName="appType" />
      <Field fieldName="status" />
      <ModelCard.Footer>
        <Field fieldName="updatedTime" />
      </ModelCard.Footer>
    </ModelCard>
  );
}
```

## 卡片插槽声明

`ModelCard` 采用复合组件模式提取插槽。直接子节点分类如下：

| 插槽               | 组件           | 渲染位置              |
| ------------------ | ------------------- | ----------------------- |
| Header             | `ModelCard.Header`  | 卡片头部区域        |
| Body（默认）     | `Field` / 任意子节点 | 卡片内容区域       |
| Footer             | `ModelCard.Footer`  | 卡片底部区域        |
| Actions            | `Action`            | 由位置推断（见下） |
| Side Panel         | `SideTree` / `SideCard` / `SideList` | 左侧侧栏——见 [侧栏](../components/side-panel) |

未包在 `ModelCard.Header` 或 `ModelCard.Footer` 中的子节点作为主体内容渲染。任意插槽内的 `Field` 通过 `RecordContext` 以展示模式渲染——与 `SideCard` 相同机制。

含全部插槽的示例：

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
  <Field fieldName="appType" />
  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

### 级联字段

插槽接受点号记法 `<Field>` 声明，读取关联记录上的字段：

```tsx
<ModelCard modelName="AppEnv">
  <Field fieldName="name" />
  <Field fieldName="lastActivityId.status" widgetType="StatusIcon" />
  <Field fieldName="ownerId.email" />
</ModelCard>
```

卡片遍历器遍历三个插槽（header / body / footer），将自动收集的 SubQuery 折叠进列表查询，并通过 `POST /metadata/resolveCascadedPaths` 解析叶子 metaField。嵌套在自定义函数组件（而非直接插槽子节点）中的级联路径对遍历器不可见——请内联声明。完整参考：[级联字段路径](../fields/fields#cascaded-field-path-display)。

## Actions

`ModelCard` 支持 `Action` 组件做每张卡片操作。placement 由 **`Action` 在 JSX 树中的定义位置**推断——而非 `placement` 属性。

| 定义位置              | 渲染位置                                  | 有效 placement |
| -------------------------- | -------------------------------------------- | ------------------- |
| `ModelCard.Header` 内  | CardHeader 右侧，始终可见        | `"header"`          |
| 顶层主体子节点       | CardContent 右侧                       | `"inline"`          |
| 任一处，且 `placement="more"` | `...` 下拉（与删除合并）   | `"more"`            |

显式 `placement` 属性仅用于识别 `"more"`。`"header"` 与 `"inline"` 以树中位置为准。

### 头部 Actions

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      type="link"
      label="Edit"
      href="/studio/app/{id}/design-model"
    />
  </ModelCard.Header>
</ModelCard>
```

`ModelCard.Header` 内的 `Action` 在卡片头部右侧、插槽内容旁渲染为 `outline` 按钮。

### 内联（主体）Actions

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="status" />
  <Action
    label="Publish"
    operation="publish"
    confirmMessage="Publish this app?"
  />
</ModelCard>
```

顶层 `Action` 子节点（不在插槽包装内）渲染在主体内容区域右侧。

### 下拉（more）Actions

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      label="Archive"
      operation="archive"
      placement="more"
    />
  </ModelCard.Header>
</ModelCard>
```

`placement="more"` 将操作放入 `...` 悬停下拉。同时设置 `enableDelete` 时，删除选项追加在同一下拉底部（带分隔线）。

### 带字符串模板插值的链接 Action

字符串 `href` 支持 `{placeholder}` 模板变量。支持的占位符：

| 占位符       | 解析为                              |
| ----------------- | ---------------------------------------- |
| `{id}`            | 当前记录 ID                        |
| `{modelName}`     | 卡片模型名                   |
| `{anyFieldName}`  | 记录中该字段的值      |

```tsx
// Record ID
<Action type="link" label="Edit" href="/studio/app/{id}/design-model" />

// Any record field
<Action type="link" label="Open" href="/studio/app/{appCode}/design-model" />

// Multiple placeholders
<Action type="link" label="Open" href="/studio/app/{id}/version/{currentVersion}" />
```

需要条件逻辑时使用函数形式：

```tsx
<Action
  type="link"
  label="Open"
  href={({ id }) => `/studio/app/${id}/design-model`}
/>
```

### 组合示例

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    {/* → outline button in CardHeader */}
    <Action type="link" label="Edit" href="/studio/app/{id}/design-model" />
    {/* → ... dropdown */}
    <Action type="default" label="Archive" operation="archive" placement="more" />
  </ModelCard.Header>

  <Field fieldName="status" />
  {/* → inline button in CardContent */}
  <Action type="default" label="Publish" operation="publish" />

  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## 点击导航

卡片点击行为限定在当前路由子树：

1. `linkTo="x"`（或从 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录的 `[id]/page.tsx`）

`linkTo` 必须是匹配 `/^[a-zA-Z0-9_-]+$/` 的单一子目录名。
`ModelCard` 有意不支持自由点击处理器与跨路由 URL——将点击目标保持在当前路由子树内，与权限边界一致。

### 默认

```tsx
// Clicking card with id "abc" navigates to ${pathname}/abc?mode=read
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

### 使用 `linkTo`（子目录）

详情页再深一层时（常见于 `MultiView` 内）：

```tsx
// Clicking card with id "abc" navigates to ${pathname}/edit/abc?mode=read
<ModelCard modelName="DesignApp" linkTo="edit">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## 删除操作

`enableDelete={true}` 时，每张卡片悬停显示带「Delete」选项的 `...` 菜单。点击后确认对话框，再调用删除 API 并刷新卡片网格。

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## 侧栏

`ModelCard` 支持与 `ModelTable` 相同的侧栏组件。声明一个侧栏作为直接子节点：

```tsx
import { SideTree } from "@/components/views/shared/side-panel/SideTree";

<ModelCard modelName="Product" enableDelete>
  <SideTree
    title="Category"
    modelName="Category"
    filterField="categoryId"
    labelField="name"
    parentField="parentId"
    selectionMode="single"
  />
  <ModelCard.Header>
    <Field fieldName="name" />
  </ModelCard.Header>
  <Field fieldName="sku" />
  <Field fieldName="status" />
</ModelCard>
```

侧栏行为与 `ModelTable` 相同：

- 选择构建过滤条件，与 `AND` 合并
- 固定宽度 280px
- 支持 `SideTree`、`SideCard`、`SideList`
- 活动树过滤在工具栏活动状态栏显示为徽章
- 所有侧栏组件支持 `remoteSearch` 在客户端过滤与服务端搜索间切换

完整侧栏属性参考见 [ModelTable 侧栏](./table#side-panel-optional)。

## 标签页过滤

`ModelCard` 本身无 `tabs` 属性。基于标签的过滤切换（或混合视图类型）请用 `<MultiView>` 包裹卡片网格——见 [MultiView](./multi-view)。

## 网格布局

卡片在响应式 CSS Grid 中渲染：

| 屏幕       | 默认列数 |
| ------------ | --------------- |
| `< sm`       | 1               |
| `sm` – `lg`  | 2               |
| `lg` – `xl`  | 3               |
| `>= xl`      | 4               |

用 `columns` 属性覆盖：

```tsx
<ModelCard modelName="DesignApp" columns={3}>
  ...
</ModelCard>
```

## 工具栏

卡片工具栏是 `ModelTable` 工具栏的简化子集：

| 功能       | ModelCard | ModelTable |
| ------------- | --------- | ---------- |
| 搜索        | 是       | 是        |
| 过滤对话框 | 是       | 是        |
| 排序对话框   | 是       | 是        |
| 创建按钮 | 是       | 是        |
| 列       | -         | 是        |
| 分组         | -         | 是        |
| 批量编辑     | -         | 是        |
| 导入/导出 | -         | 是        |
| 行选择 | -         | 是        |

活动过滤/排序状态在工具栏下方以可清除徽章显示。

## 核心属性

| 属性          | 类型                                                          | 必填 | 默认值 | 说明                                                                                                        |
| ------------- | ------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `modelName`   | `string`                                                      | 是      | -       | 元数据与数据 API 的模型名。                                                                        |
| `label`   | `string`                                                      | 否       | -       | 覆盖头部页面标题。默认为 `metaModel.label`。                                   |
| `description` | `string`                                                      | 否       | -       | 覆盖头部副标题。默认为 `metaModel.description`。                                   |
| `orders`      | `OrderCondition`                                              | 否       | -       | 推荐默认排序。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。            |
| `filters`     | `FilterCondition`                                             | 否       | -       | 推荐基础过滤。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区/运行时过滤 AND 合并。见 [precedence](./multi-view#filter--order-precedence)。 |
| `initialParams` | `QueryParamsWithoutFields`                                  | 否       | -       | 高级初始查询设置（`pageSize` 等）。`filters` / `orders` 优先用顶层属性。        |
| `children`    | `ReactNode`                                                   | 否       | -       | `ModelCard.Header`、`Field`、`ModelCard.Footer`，以及一个可选侧栏。                                |
| `enableCreate`| `boolean`                                                     | 否       | `true`  | 工具栏显示创建按钮。                                                                               |
| `enableDelete`| `boolean`                                                     | 否       | `false` | 每张卡片显示 `...` 删除操作。                                                                       |
| `pageSize`    | `number`                                                      | 否       | `20`    | 服务端页大小。                                                                                       |
| `columns`     | `number`                                                      | 否       | -       | 固定网格列数（1–6）。默认响应式。                                                             |
| `linkTo`      | `string`                                                      | 否       | -       | 点击导航的子目录名（单段）。前往 `${pathname}/${linkTo}/${id}?mode=read`。省略则默认 `${pathname}/${id}?mode=read`。 |

## 过滤合并行为

与 `ModelTable` 相同。运行时过滤以 `AND` 合并：

- 基础过滤（`initialParams.filters`）
- 活动标签过滤
- 侧栏过滤
- 搜索过滤（`["searchName", "CONTAINS", keyword]`）
- 工具栏条件过滤

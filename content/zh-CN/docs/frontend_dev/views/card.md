# ModelCard

可组合的卡片网格视图，具备：

- 通过 `RecordContext` 由元数据驱动的卡片渲染
- 服务端分页查询
- 工具栏搜索 / 筛选 / 排序控制
- 可选侧栏筛选（SideTree、SideCard、SideList）
- 每张卡片的删除操作
- 点击导航到记录详情（通过 `linkTo` 限制在当前路由子树内）

## 相关文档

- [ModelTable](./table) — 表格网格视图（共用工具栏对话框、侧栏与数据钩子）
- [ModelForm](./form) — 卡片点击后打开的详情表单
- [Action](../actions) — 动作系统（用于侧栏等）
- [Field](../fields/fields) — 通过 `RecordContext` 在卡片内渲染的字段控件

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

`ModelCard` 使用复合组件模式拆分插槽。直接子节点分为：

| 插槽               | 组件                                  | 渲染位置           |
| ------------------ | ------------------------------------- | ------------------ |
| Header             | `ModelCard.Header`                   | 卡片头部区域       |
| Body（默认）       | `Field` / 任意子节点                   | 卡片内容区域       |
| Footer             | `ModelCard.Footer`                   | 卡片底部区域       |
| Actions            | `Action`                             | 由声明位置推断（见下文） |
| Side Panel         | `SideTree` / `SideCard` / `SideList` | 左侧侧栏 —— 见 [侧栏](../components/side-panel) |

未包裹在 `ModelCard.Header` 或 `ModelCard.Footer` 中的子节点作为主体内容渲染。任意插槽内的 `Field` 通过 `RecordContext` 以展示模式渲染 —— 机制与 `SideCard` 相同。

含全部插槽的示例：

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
  <Field fieldName="portfolioId" />
  <Field fieldName="appType" />
  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## 动作

`ModelCard` 支持用 `Action` 做每张卡片的操作。**放置方式由 `Action` 在 JSX 中的定义位置推断**，不依赖 `placement` prop。

| 定义位置                     | 渲染位置                               | 等效 placement |
| ---------------------------- | -------------------------------------- | -------------- |
| `ModelCard.Header` 内        | 卡片头部右侧，始终可见                 | `"header"`     |
| 主体顶层子节点               | 卡片正文内容右侧                       | `"inline"`     |
| 上述任一且 `placement="more"` | `...` 下拉（与 Delete 合并）          | `"more"`       |

只有检测到 `placement="more"` 时才参考该 prop；`"header"` / `"inline"` 以树形位置为准。

### 头部动作

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      type="link"
      labelName="Edit"
      href="/studio/app/{id}/workbench"
    />
  </ModelCard.Header>
</ModelCard>
```

位于 `ModelCard.Header` 的 `Action` 在头部右侧渲染为 `outline` 按钮。

### 行内（正文）动作

```tsx
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="status" />
  <Action
    labelName="Publish"
    operation="publish"
    confirmMessage="Publish this app?"
  />
</ModelCard>
```

顶层 `Action` 子节点（不在插槽包装内）渲染在正文区域右侧。

### 下拉（更多）动作

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    <Action
      labelName="Archive"
      operation="archive"
      placement="more"
    />
  </ModelCard.Header>
</ModelCard>
```

`placement="more"` 将动作放入 hover 时的 `...` 下拉。若同时 `enableDelete`，删除项会通过分隔条附在同一下拉底部。

### 链接动作的字符串模板插值

字符串 `href` 支持 `{placeholder}` 占位符：

| 占位符           | 解析为           |
| ---------------- | ---------------- |
| `{id}`           | 当前记录 ID      |
| `{modelName}`    | 卡片模型名       |
| `{任意字段名}`   | 记录中该字段值   |

```tsx
// 记录 ID
<Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />

// 任意记录字段
<Action type="link" labelName="Open" href="/studio/{appCode}/workbench" />

// 多个占位符
<Action type="link" labelName="Open" href="/studio/app/{id}/version/{currentVersion}" />
```

需要条件逻辑时使用函数形式：

```tsx
<Action
  type="link"
  labelName="Open"
  href={({ id }) => `/studio/app/${id}/workbench`}
/>
```

### 组合示例

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
    {/* → CardHeader 内的 outline 按钮 */}
    <Action type="link" labelName="Edit" href="/studio/app/{id}/workbench" />
    {/* → ... 下拉 */}
    <Action type="default" labelName="Archive" operation="archive" placement="more" />
  </ModelCard.Header>

  <Field fieldName="status" />
  {/* → CardContent 内的行内按钮 */}
  <Action type="default" labelName="Publish" operation="publish" />

  <ModelCard.Footer>
    <Field fieldName="updatedTime" />
  </ModelCard.Footer>
</ModelCard>
```

## 点击导航

卡片点击行为限制在当前路由子树内：

1. `linkTo="x"`（或由 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录下的 `[id]/page.tsx`）

`linkTo` 必须是匹配 `/^[a-zA-Z0-9_-]+$/` 的**单一路径段**名称。  
`ModelCard` 故意不支持自由形式的点击处理器与跨路由 URL —— 将点击目标限制在当前路由子树内，与权限边界一致。

### 默认

```tsx
// 点击 id 为 "abc" 的卡片会导航到 ${pathname}/abc?mode=read
<ModelCard modelName="DesignApp">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

### 使用 `linkTo`（子目录）

当详情页位于更深一层路径段时（常见于 `MultiView` 内）：

```tsx
// 点击 id 为 "abc" 的卡片会导航到 ${pathname}/edit/abc?mode=read
<ModelCard modelName="DesignApp" linkTo="edit">
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## 删除操作

`enableDelete={true}` 时，每张卡片悬停会显示 `...` 菜单，其中包含「Delete」。点击后弹出确认，再调用删除 API 并刷新卡片网格。

```tsx
<ModelCard modelName="DesignApp" enableDelete>
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
</ModelCard>
```

## 侧栏

`ModelCard` 支持与 `ModelTable` 相同的侧栏组件。将**一个**侧栏作为直接子节点声明：

```tsx
import { SideTree } from "@/components/views/shared/side-panel/SideTree";

<ModelCard modelName="DesignApp" enableDelete>
  <SideTree
    title="Portfolio"
    modelName="DesignPortfolio"
    filterField="portfolioId"
    labelField="name"
    parentField="parentId"
    selectionMode="single"
  />
  <ModelCard.Header>
    <Field fieldName="appName" />
  </ModelCard.Header>
  <Field fieldName="appCode" />
  <Field fieldName="status" />
</ModelCard>
```

侧栏行为与 `ModelTable` 一致：

- 选择会生成筛选条件，与 `AND` 合并
- 固定宽度 280px
- 支持 `SideTree`、`SideCard`、`SideList`
- 激活的树筛选在工具栏激活状态栏中以徽章展示
- 各侧栏组件均支持 `remoteSearch`，可从客户端筛选切换为服务端搜索

完整侧栏 props 说明见 [ModelTable 侧栏（可选）](./table#side-panel-optional)。

## 标签页筛选

`ModelCard` 本身没有 `tabs` prop。若需基于标签切换筛选（或混合多种视图），请用 `<MultiView>` 包裹卡片网格 —— 参见 [MultiView](./multi-view)。

## 网格布局

卡片在响应式 CSS Grid 中渲染：

| 屏幕        | 默认列数 |
| ----------- | -------- |
| `< sm`      | 1        |
| `sm` – `lg` | 2        |
| `lg` – `xl` | 3        |
| `>= xl`     | 4        |

使用 `columns` 覆盖：

```tsx
<ModelCard modelName="DesignApp" columns={3}>
  ...
</ModelCard>
```

## 工具栏

卡片工具栏是 `ModelTable` 工具栏的简化子集：

| 功能          | ModelCard | ModelTable |
| ------------- | --------- | ---------- |
| 搜索          | 支持      | 支持       |
| 筛选对话框    | 支持      | 支持       |
| 排序对话框    | 支持      | 支持       |
| 新建按钮      | 支持      | 支持       |
| 列配置        | -         | 支持       |
| 分组          | -         | 支持       |
| 批量编辑      | -         | 支持       |
| 导入/导出     | -         | 支持       |
| 行选择        | -         | 支持       |

激活的筛选/排序状态在工具栏下方以可清除的徽章展示。

## 核心 Props

| Prop            | 类型                     | 必填 | 默认值  | 说明 |
| --------------- | ------------------------ | ---- | ------- | ---- |
| `modelName`     | `string`                 | 是   | -       | 元数据与数据 API 使用的模型名。 |
| `labelName`     | `string`                 | 否   | -       | 覆盖页头标题。默认 `metaModel.labelName`。 |
| `description`   | `string`                 | 否   | -       | 覆盖页头副标题。默认 `metaModel.description`。 |
| `orders`        | `OrderCondition`         | 否   | -       | 推荐的默认排序。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。 |
| `filters`       | `FilterCondition`        | 否   | -       | 推荐的基础筛选。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区/运行时筛选按 `AND` 合并。参见 [筛选与排序优先级](./multi-view#filter--order-precedence)。 |
| `initialParams` | `QueryParamsWithoutFields` | 否 | -     | 高级初始查询（`pageSize` 等）。`filters` / `orders` 建议用顶层 props。 |
| `children`      | `ReactNode`              | 否   | -       | `ModelCard.Header`、`Field`、`ModelCard.Footer`，以及可选的一个侧栏。 |
| `enableCreate`  | `boolean`                | 否   | `true`  | 在工具栏显示新建按钮。 |
| `enableDelete`  | `boolean`                | 否   | `false` | 每张卡片显示 `...` 删除操作。 |
| `pageSize`      | `number`                 | 否   | `20`    | 服务端分页大小。 |
| `columns`       | `number`                 | 否   | -       | 固定网格列数（1–6）。默认响应式。 |
| `linkTo`        | `string`                 | 否   | -       | 点击导航用的单一路径段（子目录名）。跳转到 `${pathname}/${linkTo}/${id}?mode=read`。省略则为默认 `${pathname}/${id}?mode=read`。 |

## 筛选合并行为

与 `ModelTable` 相同。运行时筛选以 `AND` 合并：

- 基础筛选（`initialParams.filters`）
- 当前标签筛选
- 侧栏筛选
- 搜索筛选（`["searchName", "CONTAINS", keyword]`）
- 工具栏条件筛选

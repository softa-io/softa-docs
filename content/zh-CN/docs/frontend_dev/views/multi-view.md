# MultiView

**类别：** 页面编排器——**不是**数据视图。MultiView 用共享头部 + 标签栏包裹单个 `page.tsx`；本身不渲染数据，而是将其他视图（Model\* / 自定义仪表盘等）**组合**成标签页。

| 层级 | 范围 | 示例 |
| ----- | ----- | -------- |
| 应用壳 | 整个应用 | `Header` / `Sidebar`（见 [layout/](../layout)） |
| **页面编排器（本文）** | 单个 `page.tsx` | **`MultiView`** |
| 数据视图 | 单个数据集 | `ModelTable` / `ModelBoard` / `ModelCard` / `ModelForm` |

完整分层分类见 [索引](../index)。

MultiView 提供：

- 由 MultiView 渲染的共享头部（标题 + 描述 + 标签 pill）
- 每标签 `view` 为组件引用——渲染标签主体的 `ComponentType`
- 每标签 `filters` 与 `orders` 通过 React Context 注入内部 Model\* 视图
- 活动标签自动同步到 `?tab=<id>`（浏览器前进/后退可用）
- 标签间完全状态隔离（切换时卸载再挂载）
- 与模型无关：MultiView 本身不拉元数据；各内部视图自有模型

## 相关文档

- [ModelTable](./table) — 表格视图，作为标签 `view`
- [ModelBoard](./board) — 看板视图，作为标签 `view`
- [ModelCard](./card) — 卡片网格视图，作为标签 `view`

## 快速开始

每个标签主体抽到独立 `<view-kind>-view.tsx`（如 `board-view.tsx`、`table-view.tsx`）并导出组件。页面通过 MultiView 组合：

```tsx
// design-app-env/board-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export function BoardView() {
  return (
    <ModelBoard
      modelName="DesignAppEnv"
      filters={["active", "=", true]}
      orders={["sequence", "ASC"]}
      groupBy={{ field: "envType" }}
      enableColumnCreate
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
      </ModelBoard.Header>
      <Field fieldName="connectorType" />
      <Field fieldName="databaseType" />
    </ModelBoard>
  );
}
```

```tsx
// design-app-env/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="DesignAppEnv">
      <Field fieldName="name" />
      <Field fieldName="envType" />
      <Field fieldName="envStatus" />
      <Field fieldName="updatedTime" />
    </ModelTable>
  );
}
```

```tsx
// design-app-env/page.tsx
"use client";
import { MultiView } from "@/components/views/multi-view";

import { BoardView } from "./board-view";
import { TableView } from "./table-view";

export default function DesignAppEnvPage() {
  return (
    <MultiView label="Design App Env">
      <MultiView.Tab
        id="board"
        label="Board"
        orders={["sequence", "ASC"]}
        view={BoardView}
      />
      <MultiView.Tab id="table" label="Table" view={TableView} />
    </MultiView>
  );
}
```

`label` 为头部显示的页面标题文案。MultiView 与模型无关、不拉元数据——直接传标题文案。各视图组件从 `useMultiViewContext()` 读取 `filters` / `orders` / `linkTo` / `embedded`（Model\* 视图内部已处理）。

活动标签 id 自动同步到 `?tab=<id>`。首次访问在挂载时读 URL；点击标签经 `router.push` 更新 URL（浏览器后退/前进在标签间导航）。无需 opt-in 开关。

## 概念

### 标签 `view` 为 `ComponentType`

`view` 是**组件引用**（非元素）。MultiView 在标签激活时实例化为 `<view />`。该组件：

- 通常包裹单个 Model\* 视图（`ModelTable` / `ModelBoard` / `ModelCard`）——这些组件通过 context 读取活动标签的 `orders` / `filters`
- 也可以是任意其他组件（自定义仪表盘、图表、第三方）——原样渲染

`MultiView.Tab` 不接受 `children`。属于标签主体的一切都在 view 组件内。视图专有属性（`groupBy`、`columns` 等）留在内部 Model\* 元素上。

### 每标签 `filters` 与 `orders`

在 `MultiView.Tab` 上声明的 `filters` 与 `orders` 通过 React Context 暴露。标签 view 组件内的 Model\* 元素会自动拾取：

```tsx
// sys-model/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="SysModel">
      <Field fieldName="modelName" />
      <Field fieldName="label" />
      {/* ... */}
    </ModelTable>
  );
}
```

```tsx
// sys-model/page.tsx
<MultiView label="Sys Model">
  <MultiView.Tab
    id="all"
    label="All"
    orders={["modelName", "ASC"]}
    view={TableView}
  />
  <MultiView.Tab
    id="timeline"
    label="Timeline Model"
    orders={["modelName", "ASC"]}
    filters={[["timeline", "=", true]]}
    view={TableView}
  />
</MultiView>
```

同一 `TableView` 组件在两个标签间复用。过滤/排序因标签而异（通过 context）；切换时主体经 `key={active.id}` 重新挂载。

完整优先级规则（层内 + 跨层）见下方 [过滤与排序优先级](#过滤与排序优先级)。

### 每标签不同模型

各 view 组件在其内部 Model\* 上提供自有 `modelName`，不同标签可展示不同模型。配合每标签 `linkTo`，使各行点击导航到正确详情子目录：

```tsx
// app-overview/page.tsx
import { VersionsView } from "./versions/table-view";
import { EnvsView } from "./envs/table-view";

<MultiView label="App Overview">
  <MultiView.Tab
    id="versions"
    label="Versions"
    linkTo="versions"   // row click → ./versions/{id}?mode=read
    view={VersionsView}
  />
  <MultiView.Tab
    id="envs"
    label="Environments"
    linkTo="envs"       // row click → ./envs/{id}?mode=read
    view={EnvsView}
  />
</MultiView>
```

共享头部（标题 + 描述）为页面级文案——不来自任何模型元数据。直接传 `label` / `description`。

### 点击导航（`linkTo`）

默认点击记录导航至 `${pathname}/${id}?mode=read`——当前目录的 `[id]/page.tsx`。适用于详情页直接在列表下的单模型页面。

多模型 MultiView（或详情在子目录的其他情况）用 `linkTo` 指定子目录名：

| 设置位置                          | 效果                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| `<MultiView.Tab linkTo="x">`       | 经 context 传播到活动视图。                      |
| `<ModelTable linkTo="x">`（等）   | 直接使用。若与 Tab 级同时设置则优先。   |
| 各处均省略                 | 默认：`${pathname}/${id}?mode=read`。                         |

`linkTo` 必须是匹配 `/^[a-zA-Z0-9_-]+$/` 的**单一子目录名**（无斜杠、无 `..`、无 leading dot）。无效值回退默认并在开发环境 `console.warn`。

从 `linkTo` 详情页返回完全由面包屑推导（导航清单 + pathname），不携带查询状态。头部面包屑将标签级 crumb 发为 `type: "tab"`，指向 `${listRoute}?tab=<tab>`（`linkTo` 段兼作 tab id），详情页「返回」按钮（`resolveBackRoute`）导航到同一 crumb。面包屑标签 crumb 与返回均落在带 originating 标签选中的 MultiView 列表页（`/list?tab=<tab>`，而非无路由的 `/list/<tab>`）——刷新 / 深链解析一致。

共享单一 `[id]` 详情页的状态过滤标签（无 `linkTo`，如 preboarding）详情路径各标签相同，返回解析到列表页默认标签（仍为有效路由，非 404）。

此约束有意为之：点击导航始终留在当前路由子树内，与权限边界一致。Model\* 视图不支持自由点击处理器与跨路由 URL——若确需，在视图外的页面级实现点击。

### 每标签可见性（`navId`）

在 `MultiView.Tab` 上传 `navId` 以按当前用户导航授权门控该标签。用户 `PermissionInfo.navigations` 不含该 id（且非 SUPER_ADMIN）时隐藏标签 pill，URL `?tab=<id>` 静默回退到第一个可见标签。权限变更使当前标签中途消失时也会重新吸附活动标签。无 `navId` 的标签人人可见——用于仅 UI 分组、各变体只是同一底层权限上不同过滤的情况。

```tsx
<MultiView label="Contracts">
  <MultiView.Tab
    id="unsigned-new-hires"
    navId="navigation.core-hr.employee-document.contract.unsigned-new-hires"
    label="Unsigned New Hires"
    view={UnsignedNewHiresView}
  />
  {/* Sibling tabs without their own nav id stay visible to anyone who can see the parent. */}
  <MultiView.Tab id="signing-processes" label="Signing Processes" view={SigningProcessesView} />
  <MultiView.Tab id="signed" label="Signed" view={SignedView} />
</MultiView>
```

注意后端访问控制是端点级——共享同一 `/Model/searchPage` URL 的兄弟标签无法被 Spring PermissionInterceptor 区分。此处每标签 `navId` 因此是管理员是否应看到该标签的权威来源；有父权限的用户仍可直接 POST 底层端点，但前端不再提供该入口。

### 自定义（非模型）视图

任意组件均可。自定义视图忽略 context，原样渲染：

```tsx
import { EnvDashboard } from "./components/env-dashboard";
import { TableView } from "./table-view";

<MultiView label="Design App Env">
  <MultiView.Tab id="dashboard" label="Dashboard" view={EnvDashboard} />
  <MultiView.Tab
    id="table"
    label="Table"
    orders={["sequence", "ASC"]}
    view={TableView}
  />
</MultiView>
```

共享头部归 `MultiView` 所有。若自定义视图也渲染标题块，用 `useMultiViewContext()?.embedded` 门控以避免双头部：

```tsx
import { useMultiViewContext } from "@/components/views/multi-view";
import { ViewTitle } from "@/components/views/shared/ViewTitle";

export function EnvDashboard() {
  const isEmbedded = !!useMultiViewContext()?.embedded;
  return (
    <div className="flex h-full flex-col">
      {!isEmbedded && (
        <div className="border-b border-border/60" style={{ padding: "var(--ui-page-padding)" }}>
          <ViewTitle label="Design App Env" />
        </div>
      )}
      {/* dashboard body — refresh button, cards, etc. */}
    </div>
  );
}
```

### URL 同步

活动标签 id 始终同步到 `?tab=<id>`：

- 挂载时读 URL；若匹配已知标签 id 则为初始活动标签，否则第一个声明标签胜出。
- 点击标签经 `router.push` 推送活动 id，每次切换产生历史条目——浏览器后退/前进在标签间导航。
- 外部 URL 变化（后退/前进）时活动标签同步更新。

同一页多个 `MultiView` 共享 `?tab` 参数。若标签 id 互斥（如一为 `board` / `table`，另一为 `dashboard` / `chart`），可和平共存——各自忽略不认识的值。

### 标签切换与缓存

切换标签卸载前一视图（主体上 `key={active.id}`）并挂载新视图。内部 Model\* 视图重新初始化查询钩子。是否发网络请求取决于 TanStack Query 缓存：

| 查询类型                            | `staleTime` | 跨标签切换行为                                                                  |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| 元数据（`useMetadataQuery`）         | `Infinity`  | 按 modelName 永久缓存。每模型元数据每页生命周期最多拉一次。 |
| 列表 / 计数 / 查找（数据查询）  | 5 分钟   | 每标签首次激活发网络请求（不同 `filters` / `orders` → 不同 queryKey → 独立缓存项）。5 分钟内再激活同一标签为缓存命中（无网络、即时渲染）。5 分钟后缓存立即返回并在后台重新拉取。 |

默认值在 `query-provider.tsx` 全局配置。v1 标签切换不合并或共享工具栏状态；每标签挂载时获得全新状态。

### 标签状态隔离

切换标签卸载前一视图并挂载新视图。工具栏过滤、排序、搜索、分页与选择全部重置。v1 标签间无共享状态。`key={active.id}` 重挂载保证即使两标签共用同一 view 组件（sys-model、sys-field）也隔离。

## 过滤与排序优先级

`filters` 与 `orders` 出现在多层——弄清何时**覆盖** vs **合并**很重要。

### 三层

| 层级 | 来源 | 角色 |
| ----- | ------- | ---- |
| **A. 开发者声明** | `ModelTable.filters` / `ModelTable.initialParams.filters` / `MultiView.Tab.filters`（context） | 页面级基础条件 |
| **B. 系统范围** | `useWorkspaceFilter()` 的 `workspaceFilter` | 强制数据隔离（安全边界） |
| **C. 用户运行时** | 搜索输入、列过滤、工具栏过滤、侧栏选择 | 页面上实时收窄 |

### 过滤：A 层内 → 覆盖；跨层 → AND

**A 层内**（取第一个非 undefined，不合并）：

```
top-level filters  >  initialParams.filters  >  MultiView.Tab.filters (context)
```

`<MultiView.Tab filters={Y}>` 内渲染 `<ModelTable filters={X}>` 时，有效基础为 `X`——`Y` 被**覆盖**，非 AND 合并。覆盖语义避免「两过滤静默合并」的意外。

**跨层**（全部 AND 合并）：

```
finalFilter = (Layer A: chosen base)
        AND  (Layer B: workspaceFilter)
        AND  (Layer C: tree filter, search, column filters, toolbar filters)
```

每层加自己的约束；最终查询满足全部。在 `buildModelTableFilterCondition` 中实现。

### 排序：A 层内 → 覆盖；用户运行时 → 替换

```
Within Layer A (pick first non-undefined):
  top-level orders  >  initialParams.orders  >  MultiView.Tab.orders (context)
                                              ↓
                                  (seeds initial sort state)
                                              ↓
At runtime (replacement, not merge):
  user toolbar sort  >  column header click sort
  (whichever the user touches replaces the previous sort entirely)
```

`workspaceFilter` 不参与排序（行可见性约束，非排序提示）。

运行时为何「替换」而非「合并」？排序始终只有一个有效次序（优先级列表仍是一个次序）。用户选新排序是改变主意，非叠加约束——先前排序被替换。

### 常见陷阱 — Tab `filters` **不会**与内部 `filters` 合并

```tsx
// ❌ Probably not what you want
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// where SomeTable does:
<ModelTable filters={[["status", "=", "Live"]]} />
// Effective base filter:  [["status", "=", "Live"]]
// (Tab's [["active","=",true]] is overridden — NOT AND-merged)

// ✅ Don't redeclare on inner ModelTable; let Tab's filter pass through
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// where SomeTable does:
<ModelTable />
// Effective base filter:  [["active", "=", true]]

// ✅ Or write the AND explicitly
<ModelTable filters={[
  ["active", "=", true], "AND", ["status", "=", "Live"]
]} />
```

## API

### `<MultiView>` 属性

| 属性          | 类型        | 必填 | 默认值                  | 说明                                                                |
| ------------- | ----------- | -------- | ------------------------ | -------------------------------------------------------------------- |
| `label`   | `string`    | 否       | -                        | 共享头部标题文案。                                     |
| `description` | `string`    | 否       | -                        | 共享头部副标题文案。                                  |
| `className`   | `string`    | 否       | `"flex h-full flex-col"` | 外层包装 className。                                             |
| `children`    | `ReactNode` | 是      | -                        | 一个或多个 `<MultiView.Tab>` 标记。非 Tab 子节点被忽略。 |

活动标签跟踪、默认标签与 URL 同步内部管理——无受控模式逃生舱。URL 无 `?tab` 时第一个声明标签为默认。

### `<MultiView.Tab>` 属性

| 属性      | 类型              | 必填 | 默认值 | 说明                                                                |
| --------- | ----------------- | -------- | ------- | -------------------------------------------------------------------- |
| `id`      | `string`          | 是      | -       | 稳定 id，用于活动标签跟踪、`?tab=<id>` URL 值与主体重挂载 key。 |
| `label`   | `string`          | 是      | -       | 标签 pill 文案。                                                      |
| `icon`    | `ReactNode`       | 否       | -       | pill 内标签前的可选图标。                |
| `filters` | `FilterCondition` | 否       | -       | 标签级基础过滤，经 context 传播到活动视图。    |
| `orders`  | `OrderCondition`  | 否       | -       | 标签级默认排序，经 context 传播到活动视图。  |
| `linkTo`  | `string`          | 否       | -       | 记录点击导航的子目录名。见上文「点击导航」。 |
| `view`    | `ComponentType`   | 是      | -       | 标签激活时实例化的组件。必须是组件引用，非 JSX 元素（`view={MyView}`，非 `view={<MyView />}`）。 |

### `useMultiViewContext()`

返回活动 context 值（`MultiView` 外为 `null`）：

```ts
type MultiViewContextValue = {
  filters?: FilterCondition;
  orders?: OrderCondition;
  linkTo?: string;
  /** Always true inside MultiView. Custom views check this to suppress duplicate headers. */
  embedded: true;
  /** Active tab id. More reliable than the `?tab=` URL param (absent on first visit). Used to scope persisted view state. */
  tabId: string;
};
```

内部 Model\* 视图内部读取此钩子——多数调用方不需要。自定义视图（仪表盘、图表）读取以：

- 嵌入时跳过重复标题块
- 判断是否处于 multi-view 容器内

## 何时使用 `MultiView`

| 页面形态                                                | 使用                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| 单模型、单视图、无过滤标签                 | 直接用 `ModelTable` / `ModelBoard` / `ModelCard`                |
| 单模型、单视图、多个过滤标签           | `MultiView` + 跨标签复用同一 `view` 组件   |
| 单模型、多种视图（看板 / 表格等）  | `MultiView`，每标签一个 view 组件                       |
| 一个容器内多个相关模型                  | `MultiView`，每标签自有 view 组件（自有 `modelName`） |

## 文件组织

MultiView 页面的常规布局：

```
<page>/
├── page.tsx                # MultiView composition (~30 lines)
├── board-view.tsx          # exports BoardView (when board tab exists)
├── table-view.tsx          # exports TableView (when table tab exists)
└── [id]/page.tsx           # detail (single model)
```

多模型 MultiView 且每标签有详情子目录：

```
<page>/
├── page.tsx
├── <entity-a>/
│   ├── table-view.tsx      # exports TableView
│   └── [id]/page.tsx       # detail for entity A
└── <entity-b>/
    ├── table-view.tsx      # exports TableView
    └── [id]/page.tsx       # detail for entity B
```

同一页两个 view 文件导出同名（`TableView`）时，在调用处用导入别名：

```tsx
import { TableView as LoginHistoryView } from "./login-history/table-view";
import { TableView as AuthFailuresView } from "./auth-failures/table-view";
```

### 替代布局（合并 / 内联）

默认每文件夹布局在每标签自有 `[id]/page.tsx` 时划算——view 文件与详情页同置。所有标签共享**单一** `[id]/page.tsx`（如对同一模型的状态过滤标签）时，每文件夹结构无该收益，两种替代可行：

**1. 单文件合并** — `<page>/table-views.tsx` 每标签导出一个组件：

```
<page>/
├── page.tsx           # MultiView composition
├── table-views.tsx    # exports PendingView, HiredView, CancelledView
└── [id]/page.tsx      # shared detail page for all tabs
```

**2. 内联于 `page.tsx`** — 与 `MultiView` 同文件声明 view 组件。

决策是**结构性**的，由最重 view 门控，非总行数：

| 条件                                                        | 布局                          |
| ---------------------------------------------------------------- | ------------------------------- |
| 每标签自有 `[id]/page.tsx`                             | 每文件夹（默认）            |
| 共享 `[id]/page.tsx`，**任一** view 有对话框 / 处理器 / 显著状态 | 每文件夹（所有标签）  |
| 共享 `[id]/page.tsx`，每 view ≲ 80 行（过滤 + Fields + Actions，无每标签状态） | 合并 `table-views.tsx`  |
| 共享 `[id]/page.tsx`，每 view ≲ 20 行（裸 `ModelTable` + Fields）       | 内联于 `page.tsx`            |

若单标签需要处理器/对话框，**所有**标签优先每文件夹，而非混用布局（一重一合并比三个统一文件夹难导航）。

共享 `[id]` 的标签也应在 `MultiView.Tab` 上省略 `linkTo`，使默认 `${pathname}/${id}` 命中共享详情页。

## 限制（v1）

- 标签间无共享状态。切换完全卸载，工具栏过滤/排序/搜索/分页/选择重置。若未来页面需跨标签保状态，计划中的逃生舱为 `keepMounted`。
- 共享头部仅渲染标题 + 描述 + 标签 pill。不支持头部级操作插槽（标题旁额外按钮等）——将每视图工具栏放在 view 主体内。EnvDashboard 用刷新按钮如此。
- 需要 embedded 标志的自定义视图须自行读 `useMultiViewContext()`。无属性注入（无 `cloneElement`），无关组件不会收到意外 props。
- Model\* 视图点击导航限定为 `${pathname}/${linkTo?}/${id}`。无 `onClick` / `href` 逃生舱。若视图确需导航别处，在页面级包装而非视图上实现。
- URL 同步用 Next.js `router.push`，每次点击标签产生历史条目。有意为之——浏览器后退回到上一标签。
- 同一页多个 `MultiView` 共享 `?tab` 参数。需独立共存时使用互斥标签 id。
- `view` 必须是组件引用（如 `view={TableView}`），非 JSX 元素（`view={<TableView />}`）。MultiView 内部实例化组件；避免与 context 注入模型冲突的在元素创建时烘焙 props 的模式。

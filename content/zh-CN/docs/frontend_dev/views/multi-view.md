# MultiView

**分类：**页面编排器 —— **不是**数据视图。MultiView 用共享顶栏 + 标签栏包裹单个
`page.tsx`；它自身不渲染数据，而是把其他视图（Model\* / 自定义仪表盘等）**组合**成标签页。

| 层级 | 范围 | 示例 |
| ----- | ----- | -------- |
| 应用壳层 | 整个应用 | `Header` / `Sidebar`（见 [layout/](../layout)） |
| **页面编排器（本页）** | 单个 `page.tsx` | **`MultiView`** |
| 数据视图 | 一套数据 | `ModelTable` / `ModelBoard` / `ModelCard` / `ModelForm` |

完整分层说明见 [Index](../index)。

MultiView 提供的能力：

- 由 MultiView 渲染共享页头（标题 + 描述 + 标签 pill）
- 每个标签的 `view` 是**组件引用**——用于渲染标签正文的 `ComponentType`
- 每个标签的 `filters` / `orders` 通过 React Context 注入内部 Model\* 视图
- 当前标签自动与 `?tab=<id>` 同步（浏览器前进/后退可用）
- 标签之间状态完全隔离（切换时卸载再挂载）
- 与模型无关：MultiView 不拉取元数据；各内层视图自行持有 `modelName`

## 相关文档

- [ModelTable](./table) — 表格视图，可作为标签 `view`
- [ModelBoard](./board) — 看板视图，可作为标签 `view`
- [ModelCard](./card) — 卡片网格，可作为标签 `view`

## 快速开始

每个标签正文抽到各自的 `<视图类型>-view.tsx`（例如
`board-view.tsx`、`table-view.tsx`）并导出组件。页面通过 MultiView 组合：

```tsx
// design-app-version/board-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export function BoardView() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
      groupBy={{
        type: "enum",
        field: "status",
        columns: [
          { value: "Draft", label: "Draft" },
          { value: "Sealed", label: "Sealed" },
          { value: "Frozen", label: "Frozen" },
        ],
      }}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
        <Field fieldName="versionType" widgetType="Badge" />
      </ModelBoard.Header>
      <Field fieldName="sealedTime" />
    </ModelBoard>
  );
}
```

```tsx
// design-app-version/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="DesignAppVersion">
      <Field fieldName="name" />
      <Field fieldName="status" />
      <Field fieldName="sealedTime" />
      <Field fieldName="updatedTime" />
    </ModelTable>
  );
}
```

```tsx
// design-app-version/page.tsx
"use client";
import { MultiView } from "@/components/views/multi-view";

import { BoardView } from "./board-view";
import { TableView } from "./table-view";

export default function DesignAppVersionPage() {
  return (
    <MultiView labelName="Design App Version">
      <MultiView.Tab
        id="board"
        label="Board"
        orders={["updatedTime", "DESC"]}
        view={BoardView}
      />
      <MultiView.Tab id="table" label="Table" view={TableView} />
    </MultiView>
  );
}
```

`labelName` 是页头展示的标题文案。MultiView 不拉元数据——标题请直接传入字符串。
各视图组件从 `useMultiViewContext()` 读取 `filters` / `orders` / `linkTo` / `embedded`（Model\* 内部已处理）。

当前标签 id 会自动同步到 `?tab=<id>`。首次进入在 mount 时读 URL；点击标签通过 `router.push` 更新 URL（因此前进/后退可切换标签）。无需额外开关。

## 概念

### 标签 `view` 是 `ComponentType`

`view` 是**组件引用**（不是元素）。MultiView 在标签激活时以 `<view />` 实例化。该组件：

- 通常包裹单一 Model\* 视图（`ModelTable` / `ModelBoard` /
  `ModelCard`）——这些组件从上下文读取当前标签的 `orders` / `filters`
- 也可以是任意其他组件（自定义仪表盘、图表、第三方）——原样渲染

`MultiView.Tab` **不接受** `children`。属于标签正文的一切都写在视图组件内。视图特有 props（`groupBy`、`columns` 等）应放在内层 Model\* 上。

### 每个标签的 `filters` 与 `orders`

在 `MultiView.Tab` 上声明的 `filters` / `orders` 通过 React Context 暴露。
视图组件内的 Model\* 会自动拾取：

```tsx
// sys-model/table-view.tsx
"use client";
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";

export function TableView() {
  return (
    <ModelTable modelName="SysModel">
      <Field fieldName="modelName" />
      <Field fieldName="labelName" />
      {/* ... */}
    </ModelTable>
  );
}
```

```tsx
// sys-model/page.tsx
<MultiView labelName="Sys Model">
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

同一个 `TableView` 可在两个标签复用。各标签通过上下文区分 filters/orders；切换时正文通过 `key={active.id}` 重挂载。

完整优先级（层内 + 跨层）见下文 [Filter & order precedence](#filter--order-precedence)。

### 每个标签不同模型

各视图在内层 Model\* 上自行提供 `modelName`，因此不同标签可展示不同模型。配合每个标签各自的 `linkTo`，使行点击进入正确详情子目录：

```tsx
// app-overview/page.tsx
import { VersionsView } from "./versions/table-view";
import { EnvsView } from "./envs/table-view";

<MultiView labelName="App Overview">
  <MultiView.Tab
    id="versions"
    label="Versions"
    linkTo="versions"   // 行点击 → ./versions/{id}?mode=read
    view={VersionsView}
  />
  <MultiView.Tab
    id="envs"
    label="Environments"
    linkTo="envs"       // 行点击 → ./envs/{id}?mode=read
    view={EnvsView}
  />
</MultiView>

// 文件结构：
//   /studio/app/[appId]/app-overview/page.tsx              ← MultiView
//   /studio/app/[appId]/app-overview/versions/table-view.tsx
//   /studio/app/[appId]/app-overview/versions/[id]/page.tsx
//   /studio/app/[appId]/app-overview/envs/table-view.tsx
//   /studio/app/[appId]/app-overview/envs/[id]/page.tsx
```

共享页头（标题 + 描述）是**页面级**文案——不从任何模型元数据推导。请直接传 `labelName` / `description`。

### 点击导航（`linkTo`）

默认点击记录跳 `${pathname}/{id}?mode=read`——对应当前目录下的 `[id]/page.tsx`。适用于单模型且详情在列表正下方。

多模型 MultiView（或详情在子目录）时，用 `linkTo` 指定子目录名：

| 设置位置 | 效果 |
| ---------------------------------- | --------------------------------------------------------------- |
| `<MultiView.Tab linkTo="x">` | 通过上下文传给当前激活视图。 |
| `<ModelTable linkTo="x">` 等 | 直接使用。若与 Tab 同时设置，以内层为准。 |
| 全部省略 | 默认：`${pathname}/{id}?mode=read`。 |

`linkTo` 必须是匹配 `/^[a-zA-Z0-9_-]+$/` 的**单一路径段**（无斜杠、无 `..`、无句点前缀）。非法值回退默认并在开发环境 `console.warn`。

此约束有意为之：点击导航始终留在当前路由子树，与权限边界一致。Model\* 视图不支持自由 `onClick` / 跨路由 `href`——若确实需要，请在页面层包一层实现。

### 自定义（非模型）视图

任意组件均可。自定义视图可忽略上下文，直接渲染：

```tsx
import { EnvDashboard } from "./components/env-dashboard";
import { TableView } from "./table-view";

<MultiView labelName="Design App Env">
  <MultiView.Tab id="dashboard" label="Dashboard" view={EnvDashboard} />
  <MultiView.Tab
    id="table"
    label="Table"
    orders={["sequence", "ASC"]}
    view={TableView}
  />
</MultiView>
```

共享页头由 `MultiView` 持有。若自定义视图也渲染标题区，请用 `useMultiViewContext()?.embedded` 门禁，避免双标题：

```tsx
import { useMultiViewContext } from "@/components/views/multi-view";
import { ViewTitle } from "@/components/views/shared/ViewTitle";

export function EnvDashboard() {
  const isEmbedded = !!useMultiViewContext()?.embedded;
  return (
    <div className="flex h-full flex-col">
      {!isEmbedded && (
        <div className="border-b border-border/60" style={{ padding: "var(--ui-page-padding)" }}>
          <ViewTitle labelName="Design App Env" />
        </div>
      )}
      {/* dashboard body — refresh button, cards, etc. */}
    </div>
  );
}
```

### URL 同步

当前标签 id 始终同步到 `?tab=<id>`：

- mount 时读取 URL；若与已知标签 id 匹配则作为初始激活标签，否则第一个声明的标签生效。
- 点击标签通过 `router.push` 写入 id，每次切换产生历史记录——前进/后退在标签间导航。
- 外部 URL 变化（后退/前进）时，激活标签随之更新。

同一页面多个 `MultiView` 共用 `?tab` 参数。若标签 id 互不重叠（例如一组 `board`/`table`，另一组 `dashboard`/`chart`），可共存——各自忽略不认识的值。

### 标签切换与缓存

切换标签会卸载前一视图（正文 `key={active.id}`）并挂载新视图。内层 Model\* 会重新初始化查询钩子。是否发请求取决于 TanStack Query 缓存：

| 查询类型 | `staleTime` | 跨标签切换行为 |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| 元数据（`useMetadataQuery`） | `Infinity` | 按 `modelName` 永久缓存；每个模型的元数据在页面生命周期内至多请求一次。 |
| 列表 / count / lookup（数据查询） | 5 分钟 | 每个标签首次激活会发请求（不同 `filters` / `orders` → 不同 queryKey → 独立缓存）。5 分钟内再次激活同一标签为缓存命中（无网络、即时渲染）。超过 5 分钟则先返回缓存再在后台重新请求。 |

默认值在 `query-provider.tsx` 全局配置。v1 下标签切换不会在工具栏状态间合并或共享；每次挂载都是全新状态。

### 标签状态隔离

切换标签卸载旧视图、挂载新视图。工具栏筛选、排序、搜索、分页、选择在切换时全部重置。v1 标签间无共享状态。`key={active.id}` 的重挂载保证即使用相同视图组件（如 sys-model、sys-field）也会重置。

## Filter & order precedence

`filters` 与 `orders` 出现在多层——需分清何时**覆盖**、何时**合并**。

### 三层

| 层 | 来源 | 作用 |
| ----- | ------- | ---- |
| **A. 开发者声明** | `ModelTable.filters` / `ModelTable.initialParams.filters` / `MultiView.Tab.filters`（上下文） | 页面级基础条件 |
| **B. 系统作用域** | `useWorkspaceFilter()` 的 `workspaceFilter` | 强制数据隔离（安全边界） |
| **C. 用户运行时** | 搜索、列筛选、工具栏筛选、侧栏选中 | 页面上的即时收窄 |

### Filters：A 层内 → 覆盖；跨层 → AND

**A 层内**（取第一个非 undefined，不合并）：

```
顶层 filters  >  initialParams.filters  >  MultiView.Tab.filters（上下文）
```

若 `<MultiView.Tab filters={Y}>` 内渲染 `<ModelTable filters={X}>`，
有效基础为 `X`——`Y` 被**覆盖**，不会做 AND。避免「两套筛选静默合并」的意外。

**跨层**（全部 AND）：

```
finalFilter =（A 层：选中的基础）
        AND （B 层：workspaceFilter）
        AND （C 层：树筛选、搜索、列筛选、工具栏筛选）
```

实现于 `buildModelTableFilterCondition`。

### Orders：A 层内 → 覆盖；用户运行时 → 替换

```
A 层内（取第一个非 undefined）：
  顶层 orders  >  initialParams.orders  >  MultiView.Tab.orders（上下文）
                                              ↓
                                  （作为初始排序状态）
                                              ↓
运行时（替换，非合并）：
  用户工具栏排序  >  列头点击排序
  （用户最后一次操作会完整替换前一排序）
```

`workspaceFilter` 不参与排序（它是行可见性约束，不是排序提示）。

运行时为何「替换」而非「合并」？排序只有一个有效顺序（多级优先级仍是一条顺序）。用户选新排序是在改变主意，而不是叠加约束。

### 常见陷阱 — Tab `filters` 不会与内层 `filters` 合并

```tsx
// ❌ 多半不是预期
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// 而 SomeTable 内：
<ModelTable filters={[["status", "=", "Live"]]} />
// 有效基础筛选：  [["status", "=", "Live"]]
//（Tab 的 [["active","=",true]] 被覆盖 —— 不会 AND）

// ✅ 内层 ModelTable 不要重复声明；让 Tab 的 filter 透传
<MultiView.Tab filters={[["active", "=", true]]} view={SomeTable} />
// SomeTable 内：
<ModelTable />
// 有效基础筛选：  [["active", "=", true]]

// ✅ 或把 AND 写显式
<ModelTable filters={[
  ["active", "=", true], "AND", ["status", "=", "Live"]
]} />
```

## API

### `<MultiView>` props

| Prop          | Type        | Required | Default                  | Notes |
| ------------- | ----------- | -------- | ------------------------ | ---- |
| `labelName`   | `string`    | No       | -                        | 共享页头标题。 |
| `description` | `string`    | No       | -                        | 共享页头副标题。 |
| `className`   | `string`    | No       | `"flex h-full flex-col"` | 外层 wrapper `className`。 |
| `children`    | `ReactNode` | Yes      | -                        | 一个或多个 `<MultiView.Tab>`。非 Tab 子节点会被忽略。 |

激活标签跟踪、默认标签与 URL 同步由内部管理——无受控模式出口。URL 无 `?tab` 时以第一个声明的标签为默认。

### `<MultiView.Tab>` props

| Prop      | Type              | Required | Default | Notes |
| --------- | ----------------- | -------- | ------- | ---- |
| `id`      | `string`          | Yes      | -       | 稳定 id：激活跟踪、`?tab=<id>`、正文 remount key。 |
| `label`   | `string`          | Yes      | -       | 标签 pill 文案。 |
| `icon`    | `ReactNode`       | No       | -       | pill 内标签前的可选图标。 |
| `filters` | `FilterCondition` | No       | -       | 标签级基础筛选，经上下文传给激活视图。 |
| `orders`  | `OrderCondition`  | No       | -       | 标签级默认排序，经上下文传给激活视图。 |
| `linkTo`  | `string`          | No       | -       | 行点击导航子目录名。见上文「点击导航」。 |
| `view`    | `ComponentType`   | Yes      | -       | 该标签激活时实例化的组件。必须是组件引用，不能是 JSX 元素（`view={MyView}`，勿 `view={<MyView />}`）。 |

### `useMultiViewContext()`

返回当前上下文（在 `MultiView` 外为 `null`）：

```ts
type MultiViewContextValue = {
  filters?: FilterCondition;
  orders?: OrderCondition;
  linkTo?: string;
  /** MultiView 内恒为 true。自定义视图用它判断是否抑制重复标题。 */
  embedded: true;
};
```

内层 Model\* 内部已使用该 hook——多数调用方不需要。
自定义视图（仪表盘、图表）用它：

- 嵌入时跳过重复标题
- 判断是否处于多视图容器内

## 何时使用 `MultiView`

| 页面形态 | 建议 |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| 单模型、单视图、无筛选标签 | 直接使用 `ModelTable` / `ModelBoard` / `ModelCard` |
| 单模型、单视图、多筛选标签 | `MultiView` + 跨标签复用同一 `view` 组件 |
| 单模型、多种视图（看板/表格等） | `MultiView`，每个标签一个视图组件 |
| 单容器内多个相关模型 | `MultiView`，每标签自有视图组件（各自 `modelName`） |

## 文件组织

MultiView 页面的惯例目录：

```
<page>/
├── page.tsx                # MultiView 组合（约 30 行）
├── board-view.tsx          # 有看板标签时导出 BoardView
├── table-view.tsx          # 有表格标签时导出 TableView
└── [id]/page.tsx           # 详情（单模型）
```

每标签详情在不同子目录的多模型 MultiView：

```
<page>/
├── page.tsx
├── <entity-a>/
│   ├── table-view.tsx      # exports TableView
│   └── [id]/page.tsx       # 实体 A 详情
└── <entity-b>/
    ├── table-view.tsx      # exports TableView
    └── [id]/page.tsx       # 实体 B 详情
```

同页两个 view 文件都导出同名 `TableView` 时，在引用处用别名：

```tsx
import { TableView as LoginHistoryView } from "./login-history/table-view";
import { TableView as AuthFailuresView } from "./auth-failures/table-view";
```

## 限制（v1）

- 标签间不共享状态。切换时整标签卸载，工具栏筛选/排序/搜索/分页/选择重置。若将来需跨标签保留状态，计划提供 `keepMounted` 等逃生口。
- 共享页头仅标题 + 描述 + 标签 pill。不支持页头级动作位（例如标题旁额外按钮）——请把各视图工具栏放在视图正文内。EnvDashboard 的 Refresh 即如此。
- 需要 `embedded` 的自定义视图须自行调用 `useMultiViewContext()`。无 props 注入（无 `cloneElement`），无关组件不会被动接收 props。
- Model\* 点击导航限定在 `${pathname}/${linkTo?}/${id}`。无 `onClick` / `href` 逃生口。确需跳别处时请在页面层包装，而非改视图。
- URL 同步使用 Next.js `router.push`，每次点击标签产生历史记录——有意为之，后退回到上一标签。
- 同页多个 `MultiView` 共用 `?tab`。若需独立共存请使用互不重叠的标签 id。
- `view` 必须是组件引用（如 `view={TableView}`），不能是 JSX 元素（`view={<TableView />}`）。MultiView 内部实例化组件，避免与上下文注入模型冲突的元素级 baked-in props。

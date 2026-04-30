# 组件

按**作用域**组织——每个组件包装什么、在页面层级中处于何处。从外到内共五层：

```
┌──────────────────────────────────────────────────────┐
│ 1. 应用壳层  ─── 包裹整个应用                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 2. 页面编排器  ─── 包裹单个 page.tsx            │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │ 3. 数据视图  ─── 渲染单套数据                │ │ │
│  │  │  ┌───────────────────────────────────────┐ │ │ │
│  │  │  │ 4. 构建块  ─── 视图内部复用单元        │ │ │ │
│  │  │  │  ┌──────────────────────────────────┐ │ │ │ │
│  │  │  │  │ 5. UI 原语                       │ │ │ │ │
│  │  │  │  └──────────────────────────────────┘ │ │ │ │
│  │  │  └───────────────────────────────────────┘ │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 1. 应用壳层

应用级外壳——各页面通用。

| 组件 | 作用 |
| --------- | ---- |
| `Header` | 顶栏：模块切换、面包屑、搜索、用户菜单 |
| `Sidebar` | 可折叠导航，来自当前模块清单 |
| `WorkspaceSwitcher` | 可搜索的工作区记录选择器 |
| `BrowsePagesDialog` | 全屏页面浏览 |

→ [layout/](./layout)

## 2. 页面编排器

为单个 `page.tsx` 包一层导航壳。**不是数据视图**——把多种视图组合成统一页面级 UI。

| 组件 | 作用 |
| --------- | ---- |
| `MultiView` | 多标签容器，共享顶栏 + URL 同步的当前标签 |

→ [views/multi-view/](./views/multi-view)

（`PageTabs` 曾属于本层；已由 `MultiView` 取代。未来的页面编排器——如 `WizardPage`、`MasterDetailPage` 等——会加入本层。）

## 3. 数据视图

渲染某一模型的记录。每一种都是独立的「视图形态」。

| 组件 | 作用 |
| --------- | ---- |
| `ModelTable` | 表格：工具栏、行内编辑、侧栏、批量操作 |
| `ModelBoard` | 看板分列、拖拽、按列「加载更多」 |
| `ModelCard` | 响应式卡片栅格与模板插槽 |
| `ModelForm` | 详情 / 新建 / 编辑表单 |
| `ModelSideForm` | 主从布局（左侧列表 + 右侧表单） |

→ [views/table/](./views/table) · [views/board/](./views/board) · [views/card/](./views/card) · [views/form/](./views/form) · [views/sideForm/](./views/sideForm)

以上均支持顶层 `filters` / `orders`；嵌套在 `MultiView` 中时可继承 `MultiView.Tab` 的上下文。跨层合并规则见
[views/multi-view/README.md#filter--order-precedence](./views/multi-view/README.md#filter--order-precedence)。

## 4. 构建块

数据视图与编排器消费的复用单元。通常不直接在 `page.tsx` 使用（少数例外）；它们位于视图内部。

| 组件 | 使用场景 |
| --------- | ------- |
| `Field` | 列 / 表单字段声明；只读与编辑模式 |
| `Action` / `BulkAction` | 单条 / 批量操作 |
| `SideTree` / `SideCard` / `SideList` | Model\* 视图内的侧栏筛选 |
| `ViewTitle` | 视图头部的标题区（Model\* 与 MultiView 使用） |

→ [fields/](./fields) · [actions/](./actions) · [views/shared/side-panel/](./views/shared/side-panel) · [views/shared/ViewTitle.tsx](./views/shared/ViewTitle.tsx)

## 5. UI 原语

更底层的 UI，供上层使用。多为第三方封装或窄用途工具。

| 组件 | 作用 |
| --------- | ---- |
| `ui/` (shadcn) | Button / Input / Dialog / Tabs 等 |
| `TreePanel` | 树渲染原语（供 `SideTree` 使用） |
| Dialog hosts | 动作 / 表格动作类对话框承载 |

→ [ui/] · [views/tree/](./views/tree) · [views/dialogs/](./views/dialogs)

---

## 新组件应落在哪一层

决策树：

1. 是否出现在每个页面（例如始终可见的导航）？→ **应用壳层**
2. 是否包裹整个 `page.tsx` 并在内部承载其他视图？→ **页面编排器**
3. 是否渲染单个模型的记录？→ **数据视图**
4. 是否是视图内部的片段（列、动作、侧栏筛选项）？→ **构建块**
5. 是否是无模型语义的底层 UI 原语？→ **UI 原语**

在 **2** 与 **3** 之间犹豫时：页面编排器自身不拉取数据；数据视图负责拉取数据。

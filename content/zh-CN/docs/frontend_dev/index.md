# 组件

按**作用域**组织——每个组件包装什么、在页面层级中处于何处。从外到内共五层：

```
┌──────────────────────────────────────────────────────┐
│ 1. 应用壳层  ─── 包裹整个应用                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 2. 页面编排器  ─── 包裹单个 page.tsx            │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │ 3. 数据视图  ─── 渲染一套数据集              │ │ │
│  │  │  ┌───────────────────────────────────────┐ │ │ │
│  │  │  │ 4. 构建块  ─── 位于视图内部           │ │ │ │
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

→ [views/table/](./views/table) · [views/board/](./views/board) · [views/card/](./views/card) · [views/form/](./views/form) · [views/side-form/](./views/side-form)

以上组件均接受顶层 `filters` / `orders`；嵌套时继承 `MultiView.Tab`。跨层规则见
[filter 与排序优先级](./views/multi-view#filter--order-precedence)。

## 4. 构建块

数据视图、编排器与页面消费的复用单元。按**是否感知模型**再分为三个子类：

### 4a. 通用 UI 部件（无模型感知）

纯展示类控件——输入为简单数据，无 `modelName` / `FilterCondition`。

| 组件 | 作用 |
| --------- | ---- |
| `pagination-bar` | 页码 / 每页条数控制 |
| `empty-state` | 空列表占位 |
| `status-badge` | 彩色状态徽标 |
| `user-avatar` | 用户头像 + 名称 |
| `timeline` | 纵向事件时间线 |
| `datetime-picker` / `time-picker` | 日期 / 时间输入 |
| `density-switcher` | 界面密度切换 |
| `loading-skeleton` / `full-screen-loading` | 加载态 |
| `check-list` / `option-select` | 选择类输入 |

→ [common/](./components/common)

### 4b. 感知模型的视图子节点（用于 Model\* 视图内部）

需要 `modelName`，并通过 `SidePanelContainerContext` 等与宿主 Model\* 视图集成——**不适合**在宿主视图外单独使用。

| 组件 | 使用于 |
| --------- | ------- |
| `SideTree` / `SideCard` / `SideList` | `ModelTable` / `ModelCard` 内的侧栏筛选 |
| `RecordPickerField` / `RecordPickerList` | 字段与表单中的关联记录选择器 |

→ [components/side-panel/](./components/side-panel) · [components/picker/](./components/picker)

### 4c. 感知模型且可独立声明（在视图声明中以 JSX 子节点出现）

在 Model\* / MultiView 声明中作为 JSX 子节点使用，但每一块都是自包含单元：

| 组件 | 作用 |
| --------- | ---- |
| `Field` | 列 / 表单字段声明；只读与编辑模式 |
| `Action` / `BulkAction` | 单条 / 基于选中的批量操作 |
| 单元格渲染器 | `ModelTable` 使用的 `BooleanCell` / `OptionCell` / `ReferenceCell` 等 |

→ [fields/](./fields) · [actions/](./actions)

### 子类对照

不确定新组件归哪一类时：

- 不了解模型？→ **4a（`common/`）**
- 了解模型**且**必须活在 Model\* 宿主内（向宿主上下文发布或从宿主上下文读取）？→ **4b（`views/shared/`）**
- 了解模型**且**是宿主下的自包含子节点？→ **4c**

## 5. UI 原语

更底层的 UI，供以上各层使用。多为第三方适配或窄用途工具。

| 组件 | 作用 |
| --------- | ---- |
| `ui` (shadcn) | Button / Input / Dialog / Tabs 等 |
| `TreePanel` | 树渲染原语（供 `SideTree` 使用） |
| Dialog hosts | 动作 / 表格动作类对话框承载 |

→ [views/tree/](./views/tree) · [views/dialogs/](./views/dialogs)

---

## 新组件应落在哪一层

决策树：

1. 是否出现在每个页面（例如始终可见的导航）？→ **应用壳层**
2. 是否包裹整个 `page.tsx` 并在内部承载其他视图？→ **页面编排器**
3. 是否渲染单个模型的记录？→ **数据视图**
4. 是否是视图内部的片段（列、动作、侧栏筛选项）？→ **构建块**
5. 是否是无模型语义的底层 UI 原语？→ **UI 原语**

在 **2** 与 **3** 之间犹豫时：页面编排器自身不拉取数据；数据视图负责拉取数据。

# 布局组件

应用外壳使用的客户端组件：顶栏、侧栏、工作区切换、全局页面浏览器，以及路由级标签页。它们位于业务页面之上，与 `@/navigation` 清单和工作区上下文集成——不依赖模型元数据（后者在 `src/components/views/` 下）。

对于单个页面内的多视图标签（多个列表或视图类型），请参阅 [MultiView](../views/multi-view)。

| 文件 | 导出 | 作用 |
|------|------|------|
| `header.tsx` | `Header` | 顶栏壳层：模块切换入口、面包屑、搜索入口、用户菜单、按需加载的对话框 |
| `sidebar.tsx` | `Sidebar` | 由当前模块清单生成的可折叠导航；模块声明了 workspace 配置时内嵌 `WorkspaceSwitcher` |
| `WorkspaceSwitcher.tsx` | `WorkspaceSwitcher` | 可搜索的工作区记录选择器（如应用/租户），在导航清单中 `workspace` 存在时启用 |
| `browse-pages-dialog.tsx` | `BrowsePagesDialog` | 全屏式对话框，跨模块浏览并跳转页面（从顶栏打开） |

导入路径使用 `@/components/layout/...` 别名，例如 `@/components/layout/header`。

---

## Header

**导入：** `import { Header } from "@/components/layout/header";`

**Props**

| Prop | 类型 | 说明 |
|------|------|------|
| `className` | `string` | 可选；与壳层样式合并 |
| `toggleMobileSidebar` | `() => void` | 小屏打开/关闭侧栏 |

**行为**

- 高度为 `var(--ui-shell-header-height)`，水平内边距来自 `var(--ui-page-padding)`。
- **模块 / 浏览：** 打开 `BrowsePagesDialog`（代码分割）。存在多个模块时，触发器旁显示当前模块名称。
- **面包屑：** 使用导航清单的 `getBreadcrumbItems`；未注册路由回退为路径分段。
- **右侧区域：** 全局搜索输入（占位 UI；Cmd+K 提示）、通知占位、帮助链接、`DensitySwitcher`、用户下拉（个人设置、设计系统链接、登出）。
- **对话框：** `PersonalSettingsDialog` 与 `BrowsePagesDialog` 仅在打开时通过 `next/dynamic` 加载。

---

## Sidebar

**导入：** `import { Sidebar } from "@/components/layout/sidebar";`

**Props**

| Prop | 类型 | 说明 |
|------|------|------|
| `className` | `string` | 可选 |
| `isDesktopCollapsed` | `boolean` | 桌面端为 `true` 时为窄图标轨 |
| `toggleDesktopSidebar` | `() => void` | 在 `sm+` 上折叠/展开 |
| `isMobileOpen` | `boolean` | 小屏全屏覆盖侧栏 |
| `toggleMobileSidebar` | `() => void` | 导航后关闭移动端抽屉 |

**行为**

- 通过 `getCurrentModule(NAVIGATION_MANIFESTS, pathname)` 从 `pathname` 解析当前模块。
- **链接：** `getSidebarSections` + `fillRouteTemplate`，配合 `useWorkspaceContext`，使含工作区参数的路由解析到当前工作区。
- **当前项：** `isRouteTemplateMatch(pathname, route)`。
- **工作区：** 若 `currentModule.workspace` 已配置，在非折叠时在品牌行下方渲染 `WorkspaceSwitcher`。
- 导航项使用语义化菜单 token（`ui-menu-item`、`--ui-menu-icon-size` 等）。

---

## WorkspaceSwitcher

**导入：** `import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";`

**Props：** 无（读取 `useWorkspaceContext()`）。

**行为**

- 当前模块没有 workspace 配置时返回 `null`。
- 否则渲染组合框式浮层：通过 `modelService` 加载工作区记录，支持搜索、选择，以及在允许时（`module.workspace.clearable`）清空。
- 设计为嵌在 `Sidebar`（或任何已具备当前模块工作区上下文处）中使用。

---

## BrowsePagesDialog

**导入：** `import { BrowsePagesDialog } from "@/components/layout/browse-pages-dialog";`

**Props**

| Prop | 类型 | 说明 |
|------|------|------|
| `open` | `boolean` | 受控显示 |
| `onOpenChange` | `(open: boolean) => void` | 标准对话框回调 |

**行为**

- 由 `getCommandPaletteItems(NAVIGATION_MANIFESTS)` 构建可搜索、可筛选的列表，含模块/分类筛选，以及基于 `localStorage`（`browse-recent-pages`）的可选「最近」模式。
- 使用 `router.push` 导航，并像侧栏一样尊重工作区模板填充。

`Header` 会懒加载该组件；若在其他位置挂载，可采用相同模式。

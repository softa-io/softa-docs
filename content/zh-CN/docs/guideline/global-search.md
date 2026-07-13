# 全局搜索（Global Search）

Cmd+K 命令面板与 Header 搜索框，用于页面导航、记录查询（员工、部门等）以及重新呈现最近使用项。

本文档适用于：

- 在应用壳中挂载面板与 Header 搜索框
- 配置防抖 / 缓存 / Recent 容量
- 注册新的可搜索作用域
- 扩展 Recent 后端
- 终端用户文案（最后一节）

相关文档：

- [导航清单](../frontend_dev/module)：清单注册、路由模板、权限过滤——全局搜索消费此层。
- [BrowsePagesDialog](../frontend_dev/layout#browsepagesdialog)：「浏览全部页面」的兄弟组件。与全局搜索共享 Recent 存储。

## 导入

```tsx
import { GlobalSearchProvider } from "@/components/global-search/hooks/useGlobalSearch";
import { HeaderSearchBox } from "@/components/global-search/ui/HeaderSearchBox";
```

壳层只需以上导入。内部钩子与辅助函数由兄弟模块再导入；通常无需直接接触。

## 快速集成

在根节点挂载一个 Provider，放在 `UserProvider` / `QueryProvider` / `WorkspaceProvider` 之内。面板由 Provider 自动渲染——**不要**自行渲染 `<GlobalSearchPalette>`。

```tsx
<UserProvider>
  <QueryProvider>
    <WorkspaceProvider>
      <GlobalSearchProvider>
        <Header />
        <main>{children}</main>
      </GlobalSearchProvider>
    </WorkspaceProvider>
  </QueryProvider>
</UserProvider>
```

将 Header 搜索框放在页面 chrome 中任意可见位置：

```tsx
<HeaderSearchBox className="hidden w-[200px] md:block lg:w-[280px]" />
```

任意位置按 `Cmd+K`（mac）/ `Ctrl+K`（win/linux）打开面板。Header 框与面板共享同一套 Recent 存储与选择逻辑——任选入口，行为一致。

## 目录结构

```
src/components/global-search/
├── recent/                          # Recent（按频次排序的历史）子系统
│   ├── recentStore.ts               # LocalRecentStore + frecency() 纯函数
│   ├── types.ts                     # RecentEntry / RecentStore 契约
│   └── useRecentEntries.ts          # 基于 RecentStore 的钩子
├── hooks/                           # React 钩子：状态 + 副作用
│   ├── useGlobalSearch.tsx          # provider + 开/关 + Cmd+K 热键
│   ├── useGlobalSearchSelection.ts  # 共享选择副作用（记录 + 导航）
│   ├── useScopeSearch.ts            # 作用域路由：菜单本地 / 记录走 API
│   ├── useSearchIndex.ts            # 记忆化 manifest → SearchEntry[]
│   └── useSearchInput.ts            # 输入状态机：作用域 chip + 查询
├── ui/                              # 仅渲染组件，属性来自钩子
│   ├── GlobalSearchPalette.tsx      # Cmd+K 模态容器
│   ├── HeaderSearchBox.tsx          # Header 内联 + 弹出容器
│   ├── ScopeChip.tsx                # 输入框前的作用域标签
│   ├── SearchFooterShortcuts.tsx    # ↑↓ 导航 · ⏎ 选择 · Esc 关闭
│   ├── SearchInputTrailing.tsx      # 输入框右侧：加载 / 清除 / 快捷键
│   └── SearchResults.tsx            # Recent + 分组结果 + 空态/加载
├── config.tsx                       # GlobalSearchConfig + Provider + 钩子
├── parseQuery.ts                    # SearchScope + SEARCH_SCOPES + parseQuery()
├── resolveSearchRoute.ts            # 工作区 [id] 模板填充辅助
└── searchIndex.ts                   # SearchEntry + manifest → entries 适配器
```

分层如下：

- **`recent/`** — 持久化子系统，自有类型、存储、钩子。可干净替换后端（如服务端同步）而不动其他代码。
- **`hooks/`** — 拥有全部状态与副作用（开/关、输入、作用域路由、选择）。供 `ui/` 与外部集成方导入。
- **`ui/`** — 仅渲染组件，属性来自钩子。除本地 ref 外无自有状态。
- **根文件**（`config`、`parseQuery`、`searchIndex`、`resolveSearchRoute`）— 类型、注册表与纯辅助函数，供上述各层共享。

## 配置

所有调优常量位于 `GlobalSearchConfig`。向 `<GlobalSearchProvider>` 传入部分覆盖；未提供的键使用默认值。

```tsx
<GlobalSearchProvider config={{ debounceMs: 300, recordLimit: 50 }}>
```

| 键                  | 默认值  | 效果                                                            |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `debounceMs`         | `200`    | 用户按键与 `searchName` API 调用之间的延迟。          |
| `recordLimit`        | `20`     | 每次 `searchName` 请求返回的最大行数。                       |
| `recordStaleTimeMs`  | `30_000` | TanStack Query 缓存窗口——重复查询跳过重新拉取。      |
| `recentLimit`        | `5`      | 调用方未传 `limit` 时默认可见的 Recent 条数。    |
| `recentCapacity`     | `80`     | 存储中保留的最大条目数（溢出时按频次淘汰）。       |
| `recentHalfLifeDays` | `7`      | 频次衰减率。越小 → 新近性相对使用次数越占主导。  |

调优说明：

- 若用户输入快且 API 便宜，可将 `debounceMs` 降至约 100。
- 读多写少数据可将 `recordStaleTimeMs` 提高到数分钟。
- 若用户任务轮换快，可将 `recentHalfLifeDays` 降至 1–2，避免陈旧项压过新鲜项。

## 作用域注册表

`parseQuery.ts` 中的 `SEARCH_SCOPES` 是前缀作用域的单一事实来源。三种状态：

| 状态        | 做法                          | 用户体验                                                |
| ------------ | ---------------------------- | ---------------------------------------------------------- |
| 隐藏       | 删除该条目             | 前缀无法识别；用户无法进入该作用域。        |
| 即将推出  | 保留条目，省略 `record`    | 前缀可识别；结果区显示「即将推出」。        |
| 已上线         | 保留条目，填写 `record`    | 真实 `searchName` API 调用。                                |

### 添加新的记录作用域

```ts
// 1. Extend the SearchScope union in parseQuery.ts
export type SearchScope =
  | "menu" | "employee" | "department" | "help"
  | "project";

// 2. Add an entry with record config
{
  scope: "project",
  prefix: "$",                                  // any single ASCII char
  label: "Project",
  description: "Search projects",
  record: {
    modelName: "Project",                       // backend: capitalized
    detailRoute: "/corehr/organization/project-team/[id]",
  },
}
```

`useScopeSearch`、chip、占位符与 API 接线会自动拾取——无需改其他文件。

### `detailRoute` 中的自定义参数名

`detailRoute` 使用 `[id]` 占位符。若未来模型需要不同参数（如 `[employeeNumber]`），可在 `ScopeRecordConfig` 上增加可选 `paramName` 字段——尚未实现，首次需要时再添加。

## 公开 API

集成方通常导入的模块：

| 模块                       | 用途                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `<GlobalSearchProvider>`     | 在根节点挂载一次。自动渲染面板并注册 Cmd+K。                  |
| `useGlobalSearch()`          | 读取 `isOpen`，派发 `open()` / `close()` / `toggle()`。                      |
| `<HeaderSearchBox>`          | 应用 Header 内联搜索框。自包含。                              |
| `useRecentEntries()`         | 读写用户 Recent 列表。与 `BrowsePagesDialog` 共享。                |
| `useSearchIndex()`           | 从导航清单记忆化得到 `SearchEntry[]`。                             |
| `useGlobalSearchConfig()`    | 读取合并后的配置。便于下游调试或管理面板。                   |

集成方通常不导入（由两个面板内部使用）：`useSearchInput`、`useScopeSearch`、`useGlobalSearchSelection`、`SearchResults`、`SearchInputTrailing`、`SearchFooterShortcuts`、`ScopeChip`、`parseQuery`、`resolveSearchRoute`。

## 扩展点

### 服务端同步的 Recent

`RecentStore` 是接口。默认 `LocalRecentStore` 写入 `localStorage`。要跨设备同步，实现 `SyncedRecentStore`，在 `record/list/clear` 时调用后端并保留本地缓存。在 `useRecentEntries` 内替换构造（或通过 context 注入）。

### 自定义数据源

对非记录源（应用内操作、帮助文章、全文搜索），在 `useScopeSearch` 中按 `scope` 增加分支，由适配器发出 `SearchEntry[]`。`SearchEntry` 上的 `kind` 字段是开放的（`'page' | 'action' | 'record'`），正是为此设计。

### 记录类条目的图标注册表

`SearchEntry.icon` 为 `LucideIcon`（运行时），`RecentEntry.iconKey` 为可序列化字符串。要在记录结果上显示图标，在全局映射中注册（`{ employee: User, department: Building, ... }`），在 `<SearchResults>` 渲染时按 `iconKey` 解析。目前记录类回退为 `Circle`。

## 已知限制

- **记录结果无副标题** — `searchName` 默认只返回 `id + displayName`。待后端字段集确定后，传入 `additionalFields` 并扩展 `useScopeSearch` 中的映射器。
- **`SearchScope` 是 TS 联合类型** — 添加作用域需编辑联合类型。有利于类型收窄；若作用域将来在运行时由用户扩展，可再评估。

## 测试

```
tests/recent-store.test.ts          # frecency + LocalRecentStore 行为（23 例）
tests/search-index.test.ts          # manifest → SearchEntry 适配器（10 例）
tests/parse-query.test.ts           # 前缀解析器 + SEARCH_SCOPES 完整性（26 例）
```

运行：`pnpm exec vitest run tests/recent-store.test.ts tests/search-index.test.ts tests/parse-query.test.ts`

UI 组件（面板、结果、chip、页脚）目前缺少 jsdom + RTL 测试。行为变复杂后再补。

---

# 用户指南

> 本节为**面向终端用户**的文案（HR / 员工 / 平台管理员）。避免技术术语。就绪后可原样迁入产品帮助中心或引导流程；发布时按用户语言本地化。

## 打开搜索面板

| 入口                       | 操作                                                  |
| --------------------------------- | ---------------------------------------------------- |
| 应用内任意位置               | 按 **⌘ K**（macOS）/ **Ctrl K**（Windows / Linux） |
| 顶栏搜索框（桌面）      | 点击页面顶部的搜索框         |
| 顶栏搜索图标（移动）      | 点击右上角放大镜图标      |

三种方式访问同一数据——选你觉得最快的即可。

## 输入搜索

输入几个字符。面板会在**页面名称、模块名称，以及（当前分类下）员工或部门名称**中匹配。

```
employees       matches the "Employees" page, "Employee Documents", etc.
salary          matches any page whose name or description contains "salary"
```

## 按分类过滤 — 前缀语法

在输入开头加特殊字符，将搜索限定在单一分类：

| 前缀 | 搜索目标                   | 示例         |
| ------ | ------------------------------- | --------------- |
| `/`    | 页面与功能              | `/leave`        |
| `@`    | 员工                       | `@Alice Wang`   |
| `#`    | 部门                     | `#Engineering`  |
| `?`    | 帮助文章（即将推出）     | `?onboarding`   |

前缀生效时，输入框前会出现小的**分类 chip**（如 `Employee`）。前缀字符会转为 chip，输入区保持干净，只显示你的关键词。

## 清除或切换分类

- 输入为空时按 **Backspace** → 移除 chip，回到通用搜索
- 点击 chip 上的 **×** → 同上
- 点击输入框右侧 **×** → 仅清除已输入文字（chip 保留）

## 最近使用

不输入任何内容打开面板时，顶部显示**最近使用**列表——你最近访问的页面与记录。排序结合两个信号：

- **最近使用时间** — 越新排名越高
- **使用频率** — 常用项排名更高

因此常用项即使闲置几天仍靠前；偶尔一次的访问会随时间自然下沉。

⚠️ Recent 数据**仅保存在当前设备 / 浏览器**。换设备或清除浏览器数据会重新开始。Recent 不同步到云端，其他用户也看不到。

## 面板内键盘快捷键

| 键                  | 操作                                |
| -------------------- | ------------------------------------- |
| **↑ / ↓**            | 上下移动高亮          |
| **⏎ (Enter)**        | 打开高亮项             |
| **Esc**              | 关闭面板                       |
| **⌘ K** / **Ctrl K** | 任意位置切换面板        |

## 找不到想要的内容？

- 检查关键词是否拼写错误
- 尝试不用前缀的普通搜索——目标可能在其他分类
- `?` 帮助文章尚未上线——产品指引请联系 HR / IT
- 仍然没有？你可能**没有权限**访问该功能。向管理员申请权限后再试。

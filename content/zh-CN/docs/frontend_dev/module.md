# 前端模块开发

本文是 `src/app` 模块导航的开发者指南。
它定义了导航声明的**唯一可信来源**，以及如何安全地新增页面/模块。

## 1) 唯一来源

模块 Manifest 文件：

- `src/app/system/manifest.ts` -> `SYSTEM_NAVIGATION_MANIFESTS`
- `src/app/user/manifest.ts` -> `USER_NAVIGATION_MANIFESTS`
- `src/app/ai/manifest.ts` -> `AI_NAVIGATION_MANIFESTS`

聚合文件：

- `src/modules.ts` -> `MODULE_NAVIGATION_MANIFESTS`

自动注册消费方：

- `src/navigation/registry.ts` 自动读取 `MODULE_NAVIGATION_MANIFESTS` 并构建：
  - 模块列表
  - 默认路由
  - 页面查找/面包屑/命令面板/侧边栏索引

## 2) 依赖方向

- `src/app/*/manifest.ts` 负责领域语义和导航元数据：
  - 模块/分组/页面标签
  - 路由
  - 图标
  - 描述
  - 排序
- `src/modules.ts` 仅聚合并导出 Manifests，不包含业务逻辑。
- 引入新领域时：
  1. 添加 `src/app/<domain>/manifest.ts`
  2. 在 `src/modules.ts` 中注册

## 3) Manifest 契约

每个 `NavigationManifest` 有 3 层：

- `module`
- `groups[]`
- `groups[].pages[]`

类型定义在 `src/navigation/types.ts`。

### 3.1 `module` 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 全局唯一模块 id。 |
| `label` | `string` | 是 | 模块展示名称。 |
| `description` | `string` | 是 | 用于导航/搜索/帮助文案。 |
| `order` | `number` | 是 | 稳定排序键（升序）。 |
| `category` | `string` | 否 | 用于 UI 中的模块分组。 |
| `defaultPageId` | `string` | 否 | 若提供，必须引用本模块中有效页面 id。 |
| `icon` | `LucideIcon` | 否 | 模块图标。 |

### 3.2 `group` 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 在模块内唯一。 |
| `label` | `string` | 是 | 分组展示名称。 |
| `order` | `number` | 是 | 稳定排序键（升序）。 |
| `icon` | `LucideIcon` | 否 | 可选分组图标。 |
| `pages` | `NavigationPage[]` | 是 | 分组页面列表。 |

### 3.3 `page` 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 全局唯一页面 id。 |
| `label` | `string` | 是 | 页面展示名称。 |
| `route` | `string` | 是 | 全局唯一路由（必须匹配 Next.js 页面路由）。 |
| `order` | `number` | 是 | 稳定排序键（升序）。 |
| `icon` | `LucideIcon` | 否 | 页面图标。 |
| `description` | `string` | 否 | 用于命令面板和导航提示。 |
| `permission` | `NavigationPermission` | 否 | 可选权限元数据。 |

## 4) 校验规则

`src/navigation/registry.ts` 提供 `validateNavigationManifests(...)` 并强制以下规则：

- `module.id` 必须唯一。
- `page.id` 必须全局唯一。
- `page.route` 必须全局唯一。
- 若指定了 `defaultPageId`，它必须存在于同一模块内。
- 若省略 `defaultPageId`，按声明顺序使用第一个页面作为回退。

## 5) 开发流程

### 5.1 给现有模块新增页面

1. 创建路由页面文件（示例）：
   - `src/app/user/user-role/page.tsx`
2. 在模块 Manifest 声明文件的对应分组中添加页面元数据：
   - `src/app/user/manifest.ts`
3. 确保：
   - `page.id` 全局唯一。
   - `page.route` 与实际 Next.js 路由一致。
   - `order` 位置正确。
4. 验证导航项出现在侧边栏/页头/命令面板中。

### 5.2 新增领域模块

1. 创建 `src/app/<domain>/manifest.ts` 并导出 `<DOMAIN>_NAVIGATION_MANIFESTS`。
2. 在 `src/modules.ts` 注册。
3. 在 `src/app/<domain>/...` 下添加与声明路由匹配的页面。
4. 验证模块排序/分类/默认页行为。

## 6) Manifest 示例

```ts
import type { NavigationManifest } from "@/navigation/types";
import { AlertCircle, History, Shield, User, UserCircle, UserPlus, Users } from "lucide-react";

export const USER_NAVIGATION_MANIFESTS: NavigationManifest[] = [
  {
    module: {
      id: "users",
      label: "Users",
      category: "Admin",
      description: "User directory, profile and identity management workspace.",
      order: 10,
      icon: Users,
    },
    groups: [
      {
        id: "people",
        label: "People",
        order: 10,
        pages: [
          {
            id: "user-account",
            label: "User Accounts",
            route: "/user/user-account",
            icon: UserCircle,
            description: "Maintain account identity and access state.",
            order: 10,
          },
          {
            id: "user-profile",
            label: "User Profiles",
            route: "/user/user-profile",
            icon: User,
            description: "Manage user profile records.",
            order: 20,
          },
        ],
      },
      {
        id: "security",
        label: "Security",
        order: 30,
        pages: [
          {
            id: "user-security-policy",
            label: "Security Policies",
            route: "/user/user-security-policy",
            icon: Shield,
            description: "Manage user security policies.",
            order: 10,
          },
          {
            id: "user-login-history",
            label: "Login History",
            route: "/user/user-login-history",
            icon: History,
            description: "Audit sign-in traces and outcomes.",
            order: 20,
          },
        ],
      },
    ],
  },
];
```

## 7) 当前模块 Manifest

基于当前 Manifest：

- `system`（默认页由第一个页面推断）
- `users`（默认页由第一个页面推断）
- `ai`（默认页由第一个页面推断）

## 8) 提交代码前检查 Manifest

- 路由文件存在且可访问。
- `page.id` 和 `page.route` 全局唯一。
- 模块/分组/页面 `order` 设计明确。
- Manifest 路由与真实 Next.js 路由路径一致。
- 导航项在以下位置展示正确：
  - 侧边栏
  - 面包屑/页头
  - 命令面板

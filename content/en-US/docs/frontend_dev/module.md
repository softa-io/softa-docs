# App Navigation Manifests Guide

This document is the developer guide for module navigation in `src/app`.
It defines the **single source of truth** for navigation declarations and how to safely add new pages/modules.

## 1) Source of Truth

Domain manifest files:

- `src/app/system/manifest.ts` -> `SYSTEM_NAVIGATION_MANIFESTS`
- `src/app/user/manifest.ts` -> `USER_NAVIGATION_MANIFESTS`
- `src/app/ai/manifest.ts` -> `AI_NAVIGATION_MANIFESTS`

Aggregation file:

- `src/modules.ts` -> `MODULE_NAVIGATION_MANIFESTS`

Registry consumer:

- `src/navigation/registry.ts` reads `MODULE_NAVIGATION_MANIFESTS` and builds:
  - module list
  - default routes
  - indexes for page lookup/breadcrumb/command palette/sidebar

## 2) Dependency Direction

- `src/app/*/manifest.ts` owns domain semantics and navigation metadata:
  - module/group/page labels
  - route
  - icon
  - description
  - order
- `src/modules.ts` only aggregates and exports manifests. No business logic.
- When introducing a new domain:
  1. add `src/app/<domain>/manifest.ts`
  2. register it in `src/modules.ts`

## 3) Manifest Contract

Each `NavigationManifest` has 3 levels:

- `module`
- `groups[]`
- `groups[].pages[]`

Type definitions live in `src/navigation/types.ts`.

### 3.1 `module` fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Globally unique module id. |
| `label` | `string` | Yes | Module display name. |
| `description` | `string` | Yes | Used by navigation/search/help text. |
| `order` | `number` | Yes | Stable sort key (ascending). |
| `category` | `string` | No | Used by module grouping in UI. |
| `defaultPageId` | `string` | No | Must reference a valid page id in this module if provided. |
| `icon` | `LucideIcon` | No | Module icon. |

### 3.2 `group` fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique within module. |
| `label` | `string` | Yes | Group display name. |
| `order` | `number` | Yes | Stable sort key (ascending). |
| `icon` | `LucideIcon` | No | Optional group icon. |
| `pages` | `NavigationPage[]` | Yes | Group pages. |

### 3.3 `page` fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Globally unique page id. |
| `label` | `string` | Yes | Page display name. |
| `route` | `string` | Yes | Globally unique route (must match Next.js page route). |
| `order` | `number` | Yes | Stable sort key (ascending). |
| `icon` | `LucideIcon` | No | Page icon. |
| `description` | `string` | No | Used by command palette and navigation hints. |
| `permission` | `NavigationPermission` | No | Optional permission metadata. |

## 4) Validation Rules

`src/navigation/registry.ts` provides `validateNavigationManifests(...)` and enforces:

- `module.id` must be unique.
- `page.id` must be unique globally.
- `page.route` must be unique globally.
- `defaultPageId`, if specified, must exist inside the same module.
- If `defaultPageId` is omitted, the first page by declaration order is used as fallback.

## 5) Developer Workflows

### 5.1 Add a new page to an existing module

1. Create the route page file (example):
   - `src/app/user/user-role/page.tsx`
2. Add page metadata under the target group in that domain manifest:
   - `src/app/user/manifest.ts`
3. Ensure:
   - `page.id` is globally unique.
   - `page.route` matches actual Next.js route.
   - `order` is correctly positioned.
4. Verify navigation entry appears in sidebar/header/command palette.

### 5.2 Add a new domain module

1. Create `src/app/<domain>/manifest.ts` and export `<DOMAIN>_NAVIGATION_MANIFESTS`.
2. Register it in `src/modules.ts`.
3. Add pages under `src/app/<domain>/...` matching declared routes.
4. Verify module order/category/default page behavior.

## 6) Example Manifest Snippet

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

## 7) Current Module Inventory

From current manifests:

- `system` (default page inferred from first page)
- `users` (default page inferred from first page)
- `AI` (default page inferred from first page)

## 8) Checklist Before Merge

- Route file exists and is reachable.
- `page.id` and `page.route` are globally unique.
- Module/group/page `order` is intentional.
- Manifest route equals real Next.js route path.
- Navigation entry appears correctly in:
  - sidebar
  - breadcrumb/header
  - command palette

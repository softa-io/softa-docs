# 可观测性（Sentry）

前端经 `@sentry/nextjs` 提供错误追踪与性能链路。集成位于前端模板的框架层，且**默认禁用**：未设置 DSN（`SENTRY_DSN`）时，SDK 以 no-op 初始化，本地开发完全不受影响。后端对应能力见[可观测性](../backend_dev/observability)。

## 接入点

| 文件 | 职责 |
| --- | --- |
| `src/instrumentation.ts` | 服务端初始化（Node.js 与 Edge 运行时）+ `onRequestError`，上报 React Server Components 与 route handler 的错误。 |
| `src/instrumentation-client.ts` | 浏览器端初始化 + `onRouterTransitionStart`，把 App Router 导航记录为事务。 |
| `src/app/error.tsx` | 路由错误边界；显式调用 `Sentry.captureException`——边界会先于 `window.onerror` 吞掉错误，不显式上报 Sentry 看不到。 |
| `src/app/global-error.tsx` | 根布局自身抛错时的兜底边界；自渲染 `<html>`/`<body>` 并上报错误。 |
| `src/lib/runtime-env.ts` | 按环境变化的值的唯一读取入口：服务端读 `process.env`，浏览器读 `window.__ENV__`。 |
| `src/app/runtime-env.js/route.ts` | 每次请求时把这些值输出为一段脚本（`window.__ENV__ = …`）；根布局用 `next/script` 的 `beforeInteractive` 加载它，Next 会在 hydration 之前执行。脚本执行完还会触发 `instrumentation-client.ts` 订阅的 `onRuntimeEnv` 钩子：Next 先求值该文件、再运行 `beforeInteractive` 脚本，所以 SDK 在值到达的那一刻初始化——仍早于任何应用代码。脚本加载失败时没有 DSN，页面就不做监控。 |
| `next.config.ts` | 经 `env` 把构建期的采样率（`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`）内联进服务端与客户端两份 bundle，并用 `withSentryConfig` 包装以命名 release、上传 source map。 |

## 配置

值分两类。采样率是项目级常量，因此是**构建期**的：在 `next build` 时内联进 bundle。DSN 与环境标签随部署变化，因此是**运行时**的：镜像与环境无关（同一个镜像部署到 UAT 和 prod），`SENTRY_DSN` / `SENTRY_ENVIRONMENT` 是普通的容器环境变量，服务端直接读取，浏览器经 `/runtime-env.js` 拿到；SDK 在该脚本执行完立即初始化，仍在 hydration 之前。

| 变量 | 时机 | 含义 |
| --- | --- | --- |
| `SENTRY_DSN` | 运行时 | 项目 DSN，总开关，由各部署自行决定是否上报。留空 = SDK 完全禁用。前端 DSN 按设计就是公开的。它必须属于 CI 上传 source map 的那个项目（`SENTRY_PROJECT`），否则报错堆栈无法还原。 |
| `SENTRY_ENVIRONMENT` | 运行时 | 环境标签，如 `uat` / `prod`。配在容器环境变量里（部署侧的 `.env`，与后端共用同一行），绝不作为 `NEXT_PUBLIC_*` 值。 |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | 构建 | 页面加载/导航被记录为事务的比例，默认 `0.1`。 |
| `SENTRY_AUTH_TOKEN` | 仅 CI | 启用 source map 上传。以 **docker build secret** 传入，绝不用 build-arg——build-arg 会烙进镜像层历史。缺省时静默跳过上传，构建照常通过。 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | 仅 CI | 定位 source map 上传的目标 Sentry 项目。 |

构建期值在 CI 中的取值链路：GitHub secrets/vars → docker build-args（auth token 走 build secret）→ `next.config.ts` 的 `env` 内联 → 两份 bundle。DSN 与环境标签走运行时链路：部署 `.env` → 容器环境变量 → `/runtime-env.js` → `window.__ENV__`。

本地开发在 `.env` 里让 `SENTRY_DSN` 保持为空（`.env.example` 的默认值即如此）。

## Release 与 source map

release 标识复用既有的构建身份 `v{pkg.version}-{shortSha}`（`NEXT_PUBLIC_APP_VERSION`）。`withSentryConfig` 以同名 release 上传 source map，生产环境压缩后的堆栈可还原为源码。没有独立的版本簿记——镜像 tag、`/version.json`、Sentry release 全部派生自同一个值。

## 分布式链路

SDK 给同源 API 调用附加 `sentry-trace` / `baggage` 头；接入 softa `sentry-starter` 的后端自动接续这些 trace，一条链路贯穿浏览器交互、Next.js 服务端与后端请求。网关对同源流量原样转发，不涉及 CORS 或头配置。

## 个人敏感信息（PII）

两个运行时的 `sendDefaultPii` 均为 `false`：不带 cookie、不带用户 IP。不要把个人数据写进错误消息；sentry.io 服务端的脱敏规则是第二道防线。

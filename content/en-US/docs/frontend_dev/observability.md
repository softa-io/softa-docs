# Observability (Sentry)

Error tracking and performance tracing for the frontend via `@sentry/nextjs`. The integration lives in the framework layer of the frontend template, and it is **disabled by default**: with no DSN set (`SENTRY_DSN`), the SDK initializes as a no-op and local development is unaffected. The backend counterpart is described in [Observability](../backend_dev/observability).

## Integration points

| File | Responsibility |
| --- | --- |
| `src/instrumentation.ts` | Server-side init (Node.js and Edge runtimes) + `onRequestError`, which reports errors from React Server Components and route handlers. |
| `src/instrumentation-client.ts` | Browser init + `onRouterTransitionStart`, which records App Router navigations as transactions. |
| `src/app/error.tsx` | Route error boundary; explicitly calls `Sentry.captureException` because the boundary swallows errors before `window.onerror` can fire. |
| `src/app/global-error.tsx` | Last-resort boundary for errors thrown by the root layout itself; renders its own `<html>`/`<body>` and reports the error. |
| `src/lib/runtime-env.ts` | The one place per-environment values are read: `process.env` on the server, `window.__ENV__` in the browser. |
| `src/app/runtime-env.js/route.ts` | Serves those values as a script (`window.__ENV__ = …`) on every request; the root layout loads it with `next/script` `beforeInteractive`, so Next runs it before hydration. It also fires the `onRuntimeEnv` hook that `instrumentation-client.ts` waits on: Next evaluates that file before it runs `beforeInteractive` scripts, so the SDK initializes the moment the values land — still ahead of any application code. Should the script fail to load, there is no DSN and the page runs unmonitored. |
| `next.config.ts` | Inlines the build-time sample rate (`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`) into both server and client bundles via `env`, and wraps the config with `withSentryConfig` for release naming and source map upload. |

## Configuration

Two kinds of values. The sample rate is a project-level constant, so it is **build-time**: inlined into the bundles during `next build`. The DSN and the environment label differ per deployment, so they are **runtime**: the image is environment-agnostic (the same image is deployed to UAT and prod), and `SENTRY_DSN` / `SENTRY_ENVIRONMENT` are plain container environment variables that the server reads directly and the browser receives through `/runtime-env.js`; the SDK initializes as soon as that script has run, still before hydration.

| Variable | When | Meaning |
| --- | --- | --- |
| `SENTRY_DSN` | runtime | The project DSN; the master switch, so each deployment decides whether it reports. Empty = SDK fully disabled. Frontend DSNs are public by design. It must belong to the project the CI uploads source maps to (`SENTRY_PROJECT`), or stack traces stay minified. |
| `SENTRY_ENVIRONMENT` | runtime | Environment label, e.g. `uat` / `prod`. Set in the container environment (the deployment's `.env`, shared with the backend), never as a `NEXT_PUBLIC_*` value. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | build | Fraction of page loads / navigations recorded as transactions; defaults to `0.1`. |
| `SENTRY_AUTH_TOKEN` | CI only | Enables source map upload. Passed as a **docker build secret**, never a build-arg — build-args are baked into image layer history. Absent = upload silently skipped, build still succeeds. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | CI only | Locate the Sentry project for the source map upload. |

Value flow for the build-time values in CI: GitHub secrets/vars → docker build-args (+ the auth token as a build secret) → `next.config.ts` `env` inlining → both bundles. The DSN and the environment label take the runtime path instead: deployment `.env` → container environment → `/runtime-env.js` → `window.__ENV__`.

For local development, leave `SENTRY_DSN` empty in `.env` (the default in `.env.example`).

## Releases and source maps

The release identifier is the existing build identity `v{pkg.version}-{shortSha}` (`NEXT_PUBLIC_APP_VERSION`). `withSentryConfig` uploads source maps under the same release name, so minified production stack traces resolve to original source. No separate release bookkeeping exists — the image tag, `/version.json`, and the Sentry release all derive from the same value.

## Distributed tracing

The SDK attaches `sentry-trace` / `baggage` headers to same-origin API calls; a backend instrumented with softa's `sentry-starter` continues those traces automatically, so one trace spans the browser interaction, the Next.js server, and the backend request. The gateway forwards same-origin traffic verbatim, so no CORS or header configuration is involved.

## PII

`sendDefaultPii` is `false` in both runtimes: no cookies, no user IP. Keep personal data out of error messages; server-side scrubbing rules on sentry.io are the second line of defense.

# Observability (Sentry)

Error tracking and performance tracing for the frontend via `@sentry/nextjs`. The integration lives in the framework layer of the frontend template, and it is **disabled by default**: with no DSN baked into the build, the SDK initializes as a no-op and local development is unaffected. The backend counterpart is described in [Observability](../backend_dev/observability).

## Integration points

| File | Responsibility |
| --- | --- |
| `src/instrumentation.ts` | Server-side init (Node.js and Edge runtimes) + `onRequestError`, which reports errors from React Server Components and route handlers. |
| `src/instrumentation-client.ts` | Browser init + `onRouterTransitionStart`, which records App Router navigations as transactions. |
| `src/app/error.tsx` | Route error boundary; explicitly calls `Sentry.captureException` because the boundary swallows errors before `window.onerror` can fire. |
| `src/app/global-error.tsx` | Last-resort boundary for errors thrown by the root layout itself; renders its own `<html>`/`<body>` and reports the error. |
| `next.config.ts` | Inlines the `NEXT_PUBLIC_SENTRY_*` values into both server and client bundles via `env`, and wraps the config with `withSentryConfig` for release naming and source map upload. |

## Configuration

All values are **build-time**: they are inlined into the bundles during `next build`, and the runtime container carries no Sentry variables. Because images are baked per environment (same pattern as `NEXT_PUBLIC_API_BASE_URL`), the environment label is baked too.

| Variable | When | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | build | The project DSN; the master switch. Empty = SDK fully disabled. Frontend DSNs are public by design. |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | build | Environment label, e.g. `uat` / `prod`. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | build | Fraction of page loads / navigations recorded as transactions; defaults to `0.1`. |
| `SENTRY_AUTH_TOKEN` | CI only | Enables source map upload. Passed as a **docker build secret**, never a build-arg — build-args are baked into image layer history. Absent = upload silently skipped, build still succeeds. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | CI only | Locate the Sentry project for the source map upload. |

Value flow in CI: GitHub secrets/vars → docker build-args (+ the auth token as a build secret) → `next.config.ts` `env` inlining → both bundles.

For local development, leave `NEXT_PUBLIC_SENTRY_DSN` empty in `.env` (the default in `.env.example`).

## Releases and source maps

The release identifier is the existing build identity `v{pkg.version}-{shortSha}` (`NEXT_PUBLIC_APP_VERSION`). `withSentryConfig` uploads source maps under the same release name, so minified production stack traces resolve to original source. No separate release bookkeeping exists — the image tag, `/version.json`, and the Sentry release all derive from the same value.

## Distributed tracing

The SDK attaches `sentry-trace` / `baggage` headers to same-origin API calls; a backend instrumented with softa's `sentry-starter` continues those traces automatically, so one trace spans the browser interaction, the Next.js server, and the backend request. The gateway forwards same-origin traffic verbatim, so no CORS or header configuration is involved.

## PII

`sendDefaultPii` is `false` in both runtimes: no cookies, no user IP. Keep personal data out of error messages; server-side scrubbing rules on sentry.io are the second line of defense.

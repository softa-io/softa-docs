## Debug: Use Cases and Usage

`debug` is used to enable debug context (`Context.debug=true`) during a request or a specific method execution. A common use is printing SQL logs and returning more detailed exception information.

### 1. Use Cases

- Troubleshoot whether ORM filters, sorting, and pagination behave as expected.
- Troubleshoot actual SQL statements and parameters used in batch writes (`create/update/delete`).
- Initial performance checks by observing SQL execution time per call.
- Faster issue diagnosis during integration/debugging (client-side error details are richer in debug mode).

### 2. How to Enable

1. Request parameter or header (Web API)
- Add `?debug=true` or `?debug=1` to any API URL.
- Or send `debug: true` / `debug: 1` / `X-Debug: true` / `X-Debug: 1` in request headers.
- Examples:
  - `GET /api/demo/User/searchList?debug=true`
  - `POST /api/demo/User/searchPage?debug=1`

2. Annotation-based (local to code path)
- Use `@io.softa.framework.orm.annotation.Debug` on a method.
- It temporarily enables debug during method execution and restores the previous value afterward.

3. Global enablement (Spring Boot configuration)
- Set `debug: true` in `application.yml` / `application-dev.yml`.
- This is Spring Boot's global debug switch and increases framework-level debug output (for example, auto-configuration report and some component debug logs).
- It does not set `Context.debug` directly, so it is not the same mechanism as `?debug=` / `@Debug`.
- Therefore, it does not automatically trigger this framework's `@ExecuteSql` aspect timing output (`Time: xxx ms`).

### 3. What Debug SQL Logs Include

- SQL (human-readable statement with placeholders replaced).
- Batch parameters (by default, up to the first 3 rows in batch scenarios).
- Result summary (for list results, by default up to the first 3 rows).
- Execution time (milliseconds).
- Current datasource key in multi-datasource mode.

### 4. Notes

- `?debug=` and `@Debug` are request/method-level switches for the current execution context.
- `debug: true` in `application*.yml` is an application-level switch that affects global logging behavior.
- Debug logs may contain sensitive data; use only in development/testing or temporary troubleshooting.

### 5. Frontend Debug Settings

The app supports a global **debug flag** that, when enabled, attaches `X-Debug: true` to every outgoing API request via the axios interceptor. This is intended for diagnosing issues in coordination with backend logs — it should not be left on in production for normal users.

#### Environment variable

`NEXT_PUBLIC_DEBUG` (defined in [`.env.example`](.env.example)) is a build-time flag:

- `true` — debug subsystem is enabled. The header toggle is exposed in non-dev environments, and `X-Debug: true` is sent by default until the user toggles it off.
- `false` / unset — debug subsystem is disabled outside of dev. The header toggle is hidden, and `X-Debug` is never sent.

#### Visibility rules

| Environment | `NEXT_PUBLIC_DEBUG` | Toggle visible | Initial value | `X-Debug` can be sent |
| --- | --- | --- | --- | --- |
| `pnpm dev` | (any) | Yes | `false` (or `true` if env=true) | Yes, controlled by toggle |
| Non-dev build | `true` | Yes | `true` | Yes, controlled by toggle |
| Non-dev build | unset / `false` | No | `false` | **Never** |

#### Runtime toggle

When the debug subsystem is enabled, a bug-icon button appears in the app header next to the density switcher. Clicking it flips the flag; the choice is persisted in `localStorage["app:debug"]` and survives reloads. The active state uses a destructive-tinted style as a deliberate visual warning.

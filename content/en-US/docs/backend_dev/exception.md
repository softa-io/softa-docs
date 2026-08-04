# Exception Handling

## Graceful response handling
* `WebExceptionHandler`: centralized `@RestControllerAdvice` that captures every API exception and wraps it into the standard envelope. Every handled exception is logged with the request info and trace ID.
* `ApiResponse`: standardizes the response format. A normal API response carries `data` with `code` 200; an error response carries `{code, message, data, error, traceId}` — `message` is the generic category label of the response code, `error` is the user-facing reason (i18n-resolved against the caller's language at throw time), and `traceId` echoes the request's `X-B3-TraceId` (generated server-side when absent) so support can correlate the response with the server logs.
* Business errors vs system errors: `BusinessException` (code 440) messages are designed to be shown to end users — clients should display `error` directly. System errors (code 500+) never carry the raw exception message outside debug mode — clients show the generic message plus the `traceId` reference; in debug mode (`X-Debug` header or a debug-enabled environment) `error` carries the full exception text.
* Custom Exceptions (inheriting from `BaseException`): associated with specific `responseCode` values and log `level`; the message supports `{0}`-style placeholders and is translated via `I18n` at construction. Throw with `throw new xxxException(...)`.

## Exception Capture and Monitoring

### Sentry Integration
Modify the configuration file `sentry.properties`

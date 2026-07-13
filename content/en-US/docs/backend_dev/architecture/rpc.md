## Service-to-Service RPC

### When to use it

When an entity model is **owned by a different app** (e.g. `Order` is owned by
the `payments` app but is read from this app), the framework redirects ORM
calls for that model over HTTP to the owning app. Your code keeps calling
`JdbcService` as if the model were local.

Routing keys on **app identity**, not on an annotation: every model row in the
`sys_*` catalog carries the owning app's `app_code` (stamped from that app's
`system.app-code` by its scanner). When an operation targets a model whose
`appCode` differs from this runtime's `system.app-code`, `SwitchServiceAspect`
routes the call to the owning app. The retired `@Model.serviceName` attribute
no longer exists.

This is not a general-purpose RPC mechanism — only `JdbcService` methods on
metadata-driven models are RPC-able. For arbitrary cross-service calls, use a
plain `RestClient`.

### Quick start

1. Give every app a stable, distinct identity in its `application.yml`
   (mandatory when `metadata-starter` is active):

   ```yaml
   # payments app
   system:
     app-code: payments
   ```

   The `Order` model scanned by the payments app is stamped with
   `app_code = payments` in the shared `sys_*` catalog — nothing to declare on
   the entity class in the caller.

2. Configure the **caller's** `application.yml` — the `rpc.services` map is
   keyed by the **owning app's `app-code`**:

   ```yaml
   rpc:
     enable: true
     services:
       payments:                     # key = the owning app's system.app-code
         api-url: http://payments.internal:8080
         api-key: <shared>
         api-secret: <shared>
   ```

3. Configure the **receiver's** `application.yml` (only this line is needed):

   ```yaml
   rpc:
     enable: true
   ```

4. Call `JdbcService` normally — the framework auto-routes:

   ```java
    List<Map<String, Object>> rows = jdbcService.getList("Order", filters);
    // Order.appCode = "payments" ≠ this runtime's app-code
    //   → POST to http://payments.internal:8080/rpc/Order/getList
   ```

**How it works**: ORM calls on a model whose `appCode` differs from the
current runtime's `system.app-code` are intercepted and POSTed to
`/rpc/{modelName}/{methodName}` on the owning app (resolved from
`rpc.services.<appCode>`). The caller's request `Context` (tenant / user /
language) is propagated so the remote invocation runs with the same identity.
A blank `appCode`, or one equal to the runtime's own, always runs locally.

### Configuration

#### Minimal (caller)

```yaml
rpc:
  enable: true
  services:
    payments:                       # key = the owning app's system.app-code
      api-url: http://payments.internal:8080
      api-key: <shared>
      api-secret: <shared>
```

Receiver only needs `rpc.enable: true`.

With this minimal config you get framework defaults: 3 retries with exponential
backoff (300 ms → 3 s cap), per-host circuit breaker, 3 s connect / 30 s read
timeout.

#### Full (caller, custom resilience policies)

```yaml
rpc:
  enable: true
  services:
    payments:
      api-url: http://payments.internal:8080
      api-key: <shared>
      api-secret: <shared>
    fast-dfs:
      api-url: http://fast-dfs.internal:8888
      api-key: <shared>
      api-secret: <shared>

resilience4j:
  retry:
    instances:
      softa-rpc:                    # instance name is fixed — applies to all RPC targets
        max-attempts: 3
        wait-duration: 300ms
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        exponential-max-wait-duration: 3s
        retry-exceptions:
          - io.softa.framework.web.resilience.TransientHttpException
          - java.io.IOException
  circuitbreaker:
    instances:
      softa-rpc:
        sliding-window-size: 20
        failure-rate-threshold: 50
        wait-duration-in-open-state: 15s
```

#### Field reference

| Field | Required | Description |
|---|---|---|
| `rpc.enable` | yes | Gates the dispatcher (caller) and the `/rpc` endpoint (receiver) |
| `rpc.services.<appCode>.api-url` | yes (caller) | Base URL of the app whose `system.app-code` is `<appCode>`; framework appends `/rpc/{model}/{method}` |
| `rpc.services.<appCode>.api-key` | yes (caller) | Sent as `X-Api-Key` header |
| `rpc.services.<appCode>.api-secret` | yes (caller) | Sent as `X-Api-Secret` header |
| `resilience4j.retry.instances.softa-rpc.*` | no | Overrides the default retry policy |
| `resilience4j.circuitbreaker.instances.softa-rpc.*` | no | Overrides the default circuit-breaker policy |

### Constraints

- **Single endpoint shape**: only methods on `JdbcServiceImpl` are RPC-targetable,
  and the first argument must be `String modelName`. Custom service methods are
  not transparently RPC-able.
- **Java serialization on the wire**: all method arguments and return values
  must implement `Serializable`. Cross-language consumers are not supported.
- **Static service registry**: appCode → URL is resolved from YAML only;
  no service discovery. Switch per environment via `application-{profile}.yml`.
  A missing `rpc.services.<appCode>` entry for a remote model fails fast.
- **One Resilience4j policy for all targets**: every RPC call shares the
  `softa-rpc` retry + circuit-breaker instance — you can't tune SLAs per target.
- **System models never redirect**: `sys_*` catalog models always serve
  locally, whatever their `appCode`. Prevents circular routing during
  bootstrap.

### Failure handling

- RPC failures (non-success `ApiResponse`, null body, or deserialization error)
  surface as `io.softa.framework.base.exception.ExternalException`.
- HTTP-layer errors (status codes, network timeouts) bubble up as
  `RestClientResponseException` after being logged with target URL + status +
  body.
- Retry / circuit-breaker activity is exposed at `/actuator/retries` and
  `/actuator/circuitbreakers` (via the Resilience4j Spring Boot starter).

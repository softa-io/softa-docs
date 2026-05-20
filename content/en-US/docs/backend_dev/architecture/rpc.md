## Service-to-Service RPC

### When to use it

When an entity model is owned by a different microservice (e.g. `Order` lives in
the `payments` service but is read from this app), set
`@Model(serviceName = "payments")` and the framework redirects ORM calls for
that model over HTTP to the owning service. Your code keeps calling
`JdbcService` as if the model were local.

This is not a general-purpose RPC mechanism — only `JdbcService` methods on
metadata-driven models are RPC-able. For arbitrary cross-service calls, use a
plain `RestClient`.

### Quick start

1. Annotate the entity in the **caller** with the target service name:

   ```java
   @Model(labelName = "Order", serviceName = "payments")
   public class Order extends AuditableModel { ... }
   ```

2. Configure the **caller's** `application.yml`:

   ```yaml
   rpc:
     enable: true
     services:
       payments:
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
    // Order.serviceName = "payments" → POST to http://payments.internal:8080/rpc/Order/getList
   ```

**How it works**: ORM calls on models with a non-empty `serviceName` are
intercepted and POSTed to `/rpc/{modelName}/{methodName}` on the target
service. The caller's request `Context` (tenant / user / language) is
propagated so the remote invocation runs with the same identity.

### Configuration

#### Minimal (caller)

```yaml
rpc:
  enable: true
  services:
    payments:                       # key matches @Model.serviceName
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
| `rpc.services.<name>.api-url` | yes (caller) | Base URL; framework appends `/rpc/{model}/{method}` |
| `rpc.services.<name>.api-key` | yes (caller) | Sent as `X-Api-Key` header |
| `rpc.services.<name>.api-secret` | yes (caller) | Sent as `X-Api-Secret` header |
| `resilience4j.retry.instances.softa-rpc.*` | no | Overrides the default retry policy |
| `resilience4j.circuitbreaker.instances.softa-rpc.*` | no | Overrides the default circuit-breaker policy |

### Constraints

- **Single endpoint shape**: only methods on `JdbcServiceImpl` are RPC-targetable,
  and the first argument must be `String modelName`. Custom service methods are
  not transparently RPC-able.
- **Java serialization on the wire**: all method arguments and return values
  must implement `Serializable`. Cross-language consumers are not supported.
- **Static service registry**: service-name → URL is resolved from YAML only;
  no service discovery. Switch per environment via `application-{profile}.yml`.
- **One Resilience4j policy for all targets**: every RPC call shares the
  `softa-rpc` retry + circuit-breaker instance — you can't tune SLAs per target.
- **System models never redirect**: `sys_*` catalog rows always serve locally,
  even if their model metadata carries a `serviceName`. Prevents circular
  routing during bootstrap.

### Failure handling

- RPC failures (non-success `ApiResponse`, null body, or deserialization error)
  surface as `io.softa.framework.base.exception.ExternalException`.
- HTTP-layer errors (status codes, network timeouts) bubble up as
  `RestClientResponseException` after being logged with target URL + status +
  body.
- Retry / circuit-breaker activity is exposed at `/actuator/retries` and
  `/actuator/circuitbreakers` (via the Resilience4j Spring Boot starter).

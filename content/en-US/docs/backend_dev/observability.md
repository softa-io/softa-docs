# Observability

How a softa application exposes what it is doing in production: structured logs that carry the request identity, error tracking, and distributed tracing. Everything on this page is opt-in, costs nothing when not configured, and works the same on any container platform.

## Request identity in logs (MDC)

For every bound request scope, softa-web's `ContextScopeFilter` mirrors the request identity from the softa `Context` into SLF4J's MDC: `traceId`, plus `tenantId` and `userId` when present. Every log line written inside the request carries these fields with no application code involved. The key names are defined as constants in `MdcKeys` (softa-base) — reference them instead of repeating the literals.

## Structured logs (ECS format)

Spring Boot ships a structured console encoder — one property switches console output to single-line ECS JSON:

```yaml
logging:
  structured:
    format:
      console: ecs
```

Multi-line stack traces fold into the `error.stack_trace` field and MDC entries become top-level JSON fields, so any log platform (CloudWatch Logs Insights, Elasticsearch, Loki, ...) can filter by `tenantId` or `traceId` directly. Enable it for server/container profiles only — the default human-readable format is what you want in a local terminal. In containers, switch it per environment with `LOGGING_STRUCTURED_FORMAT_CONSOLE=ecs` instead of hard-coding it in a profile.

## Log collection

softa applications log to stdout and leave collection to the platform. On Kubernetes, the cluster's log agent (Fluent Bit DaemonSet or equivalent) picks up stdout automatically. Under plain Docker you configure the log driver yourself, and two of its defaults are traps worth knowing:

* **`json-file` does not rotate.** The default driver keeps writing until the disk is full. Always pin `max-size` / `max-file` — local development stacks included.
* **Remote drivers block by default.** With any driver that ships off-host (`awslogs`, `gelf`, `fluentd`, ...), Docker's delivery mode is *blocking*: if the destination slows down or the network hiccups, the container's write to stdout blocks and takes application threads with it. Set `mode: non-blocking` with a `max-buffer-size`. The trade-off is explicit — a full buffer drops log lines — and losing lines is preferable to stalling request handling.

**Prefer the daemon over the compose file for the driver itself.** A driver pinned per service cannot be conditional: Docker validates option keys per driver, so `json-file`'s `max-size` and `awslogs`'s `awslogs-group` cannot coexist in one `logging:` block. Making one compose file serve both a laptop and a server therefore forces an overlay file that has to be remembered on every manual `up`, and forgetting it silently drops a stack back to local logging. Configuring `/etc/docker/daemon.json` instead gives one setting per host that covers every container on it — application, database, message broker — with nothing to forget:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
```

```json
{
  "log-driver": "awslogs",
  "log-opts": {
    "awslogs-region": "<region>",
    "awslogs-group": "<group>",
    "awslogs-create-group": "true",
    "mode": "non-blocking",
    "max-buffer-size": "4m",
    "tag": "{{.Name}}"
  }
}
```

The setting applies to containers **created after** a daemon restart, and an explicit `logging:` block in a compose file still overrides it — which is the point: keep compose free of logging config when the host decides, and pin it in compose only for a stack that never leaves a developer's machine.

With ECS format enabled, whatever platform receives the stream can query by field. Note that a container log driver only ever moves *container stdout* — host-level material (system messages, the container runtime's own log, kernel OOM-killer output) needs a host agent, and its absence is a blind spot for exactly the incidents where a container dies without explaining itself.

## Error tracking and tracing (sentry-starter)

The `sentry-starter` integrates [Sentry](https://sentry.io) for error tracking and performance tracing, pre-wired for the softa runtime:

```xml
<dependency>
    <groupId>io.softa</groupId>
    <artifactId>sentry-starter</artifactId>
</dependency>
```

The SDK stays fully disabled until a DSN is configured, so the dependency is free for environments that do not use Sentry (local development, tests).

### What the starter adds

* **Context-aware events** — every Sentry event and transaction is tagged with `trace_id` / `tenant_id` / `user_id` from the softa `Context`, so issues can be filtered per tenant and cross-referenced with log lines carrying the same `traceId`.
* **Log-based capture** — anything logged at ERROR level with a throwable becomes a Sentry event. This is the capture channel that works with softa's `WebExceptionHandler` (see [Exception Handling](./exception)), which handles every exception itself — an MVC-level interceptor would never see them. Business exceptions logged at WARN/INFO stay out by design.
* **Switchable JDBC spans** — per-statement database spans via a P6Spy proxy, off by default and free when off (no proxy is installed at all).

### Configuration

All standard `sentry.*` properties apply (relaxed binding: `SENTRY_DSN` ⇔ `sentry.dsn`). The ones that matter:

| Property / env var | Default | Meaning |
| --- | --- | --- |
| `SENTRY_DSN` | unset (SDK disabled) | The project DSN from sentry.io. |
| `SENTRY_ENVIRONMENT` | unset | Environment label, e.g. `uat` / `prod`. |
| `SENTRY_RELEASE` | unset | Release identifier; set it to the deployed image tag so regressions map to versions. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` (tracing off) | Fraction of requests recorded as transactions, e.g. `0.1`. |
| `SOFTA_SENTRY_JDBCTRACING_ENABLED` | `false` | Record a span per SQL statement (on sampled requests only). |

### Complete configuration example

Split the configuration by what varies: static policy is committed with the app in `application.yml`, while per-environment values come from the environment — relaxed binding maps `SENTRY_DSN` ⇔ `sentry.dsn` and `SOFTA_SENTRY_JDBCTRACING_ENABLED` ⇔ `softa.sentry.jdbc-tracing.enabled`.

**application.yml** — environment-independent defaults:

```yaml
sentry:
  # Data-protection red line — never attach cookies, user IP or request bodies.
  send-default-pii: false
  # Release identifier: taken from the image tag the platform injects, so issues
  # and regressions map to deployed versions with no extra plumbing.
  release: ${APP_IMAGE_TAG:}
  logging:
    # Defaults shown, spelled out for discoverability: ERROR logs with a throwable
    # become events; INFO and above are recorded as breadcrumbs on those events.
    minimum-event-level: error
    minimum-breadcrumb-level: info
```

**Per environment** — e.g. the server's `.env` / container environment:

```bash
# The DSN is the master switch: without it everything below is inert.
SENTRY_DSN=https://<key>@o<org-id>.ingest.us.sentry.io/<project-id>
SENTRY_ENVIRONMENT=uat
# Fraction of requests recorded as transactions (0 = error tracking only).
# Test environments: 1.0 is fine. Prod: start at 0.1–0.2 and adjust to quota.
SENTRY_TRACES_SAMPLE_RATE=1.0
# Optional per-statement SQL spans (P6Spy proxy) — see the overhead notes below.
SOFTA_SENTRY_JDBCTRACING_ENABLED=true
```

The same configuration expressed entirely in a profile, for setups that prefer `application-<profile>.yml` over environment variables:

```yaml
sentry:
  dsn: https://<key>@o<org-id>.ingest.us.sentry.io/<project-id>
  environment: prod
  traces-sample-rate: 0.1

softa:
  sentry:
    jdbc-tracing:
      enabled: false
```

Troubleshooting: set `SENTRY_DEBUG=true` and the SDK logs why events are (or are not) being sent.

### PII

`send-default-pii` defaults to `false` and should stay that way for applications holding personal data. Exception *messages* still travel to Sentry — keep personal data out of them (good logging hygiene regardless). Server-side scrubbing rules on sentry.io are the second line of defense.

### JDBC tracing

`softa.sentry.jdbc-tracing.enabled=true` wraps every `DataSource` bean in a P6Spy proxy, whose proxied statements fire events to registered listeners; sentry-jdbc registers one that opens a child span per statement. Because the wrap sits on the `DataSource` bean, it covers everything reaching the database through Spring — `JdbcTemplate`, framework internals, and a routing `DataSource` alike (wrapped once, on the outside, so no statement is recorded twice).

**Spans only, never logs.** P6Spy enables a statement-logging module of its own by default, appending every statement to a `spy.log` FILE. The starter switches it off (the module list is narrowed to the core factory): a file inside the container is invisible to any stdout-based log pipeline, unrotated, and would duplicate SQL the ORM already logs. Sentry's listener is unaffected — P6Spy composes module listeners and ServiceLoader listeners from two independent sources. An application that configures `p6spy.config.modulelist` itself keeps its own setup.

**Relationship to the ORM's own SQL logging.** softa-orm logs SQL through `ExecuteSqlAspect`, gated per request on `Context.isDebug()` (the `X-Debug` header). The two are complementary, not redundant:

| | ORM debug logging | Sentry JDBC spans |
| --- | --- | --- |
| Trigger | per request, `X-Debug` | global switch + trace sampling |
| Layer | AOP around `@ExecuteSql` methods | JDBC driver proxy |
| Content | SQL + **parameter values** + timing + result | SQL description + timing, in the request's span tree |
| Destination | SLF4J (WARN) → stdout | Sentry transaction |
| Answers | "what SQL did this request run, with what values" | "which statement is this request slow in" |

⚠️ Because the ORM's log is WARN it never becomes a Sentry *event*, but it does become a **breadcrumb** on any error event later in the same request — carrying its parameter values along. On a request that ran with `X-Debug`, personal data in those parameters reaches Sentry that way, and `send-default-pii: false` does not cover it (that setting governs cookies, IP and request bodies). `X-Debug` being a deliberate per-request tool rather than a steady state is what keeps the exposure narrow.

**Overhead.** With the switch off, nothing is wrapped — zero cost. With it on, every JDBC call goes through one extra proxy invocation (microseconds; relevant only in hot loops issuing thousands of tiny statements), and span objects are allocated only for requests the sampler selected. Enable it freely on test environments; on production, decide based on the sample rate and statement volume.

### Distributed tracing with a frontend

The Sentry browser SDKs attach `sentry-trace` / `baggage` headers to same-origin API calls; the backend SDK continues those traces automatically. A frontend and backend instrumented against the same Sentry organization share one trace view — no extra configuration on the softa side. The frontend template's integration is described in [Observability (Sentry)](../frontend_dev/observability).

# 可观测性

本页介绍 softa 应用在生产环境的"可见性"三件事：携带请求身份的结构化日志、错误追踪、分布式链路追踪。所有能力均为可选，不配置时零开销，且在任何容器平台上行为一致。

## 日志中的请求身份（MDC）

softa-web 的 `ContextScopeFilter` 在每个请求作用域内，把 softa `Context` 的请求身份镜像进 SLF4J 的 MDC：`traceId`，以及存在时的 `tenantId` 和 `userId`。请求内写出的每条日志自动携带这些字段，业务代码无需任何处理。键名以常量形式定义在 `MdcKeys`（softa-base）中——请引用常量而不要重复字面量。

## 结构化日志（ECS 格式）

Spring Boot 内建结构化控制台编码器，一个配置项即可把控制台输出切换为单行 ECS JSON：

```yaml
logging:
  structured:
    format:
      console: ecs
```

多行堆栈折进 `error.stack_trace` 字段，MDC 条目成为顶层 JSON 字段，因此任何日志平台（CloudWatch Logs Insights、Elasticsearch、Loki 等）都能直接按 `tenantId` 或 `traceId` 过滤。建议仅在服务器/容器环境开启——本地终端保持默认的人类可读格式。容器内推荐用环境变量 `LOGGING_STRUCTURED_FORMAT_CONSOLE=ecs` 按环境切换，而不是写死在 profile 里。

## 日志采集

softa 应用把日志写到 stdout，采集交给平台。Kubernetes 下由集群的日志代理（Fluent Bit DaemonSet 或同类）自动收集 stdout。纯 Docker 下需要自己配置日志驱动，其中两个默认值是值得知道的陷阱：

* **`json-file` 不轮转。** 默认驱动会一直写到磁盘写满。务必钉上 `max-size` / `max-file`，本地开发栈同样如此。
* **远程驱动默认阻塞。** 任何把日志送出主机的驱动（`awslogs`、`gelf`、`fluentd` 等），Docker 的投递模式都是 *blocking*：目标端变慢或网络抖动时，容器写 stdout 会被阻塞，进而拖住应用线程。请设置 `mode: non-blocking` 并配 `max-buffer-size`。这个权衡是明确的——缓冲写满时会丢弃日志行——丢几行远好于拖停请求处理。

**驱动本身建议配在 daemon 而非 compose 文件里。** 按服务钉死的驱动无法条件化：Docker 按驱动校验 option 键名，`json-file` 的 `max-size` 与 `awslogs` 的 `awslogs-group` 不能共存于同一个 `logging:` 块。要让一份 compose 同时服务开发机和服务器，就只能再加一个 overlay 文件，而它必须在每次手工 `up` 时被记得——忘掉一次，整个栈就静默退回本地日志。改配 `/etc/docker/daemon.json` 则是每台主机一处设置，覆盖其上所有容器（应用、数据库、消息队列），没有可忘的东西：

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

该设置对 daemon 重启**之后新建**的容器生效；compose 里显式的 `logging:` 块仍然会覆盖它——这正是要点所在：由主机决定时就让 compose 不带日志配置，只有永远不离开开发机的栈才把它钉在 compose 里。

开启 ECS 格式后，接收方即可按字段查询。注意容器日志驱动只搬运*容器 stdout*——主机级内容（系统消息、容器运行时自身的日志、内核 OOM killer 输出）需要主机侧 agent；缺了它，恰恰是"容器无声无息地死掉"这类故障的盲区。

## 错误追踪与链路追踪（sentry-starter）

`sentry-starter` 集成 [Sentry](https://sentry.io) 提供错误追踪和性能链路，并为 softa 运行时做好了预配：

```xml
<dependency>
    <groupId>io.softa</groupId>
    <artifactId>sentry-starter</artifactId>
</dependency>
```

未配置 DSN 时 SDK 完全禁用——不使用 Sentry 的环境（本地开发、测试）引入该依赖没有任何代价。

### starter 额外提供的能力

* **上下文感知事件**——每个 Sentry 事件和事务自动携带来自 softa `Context` 的 `trace_id` / `tenant_id` / `user_id` 标签，问题可按租户过滤，并能与携带相同 `traceId` 的日志互查。
* **基于日志的捕获**——任何以 ERROR 级别记录且带异常的日志都会成为 Sentry 事件。这是与 softa `WebExceptionHandler` 配合的捕获通道（见[异常处理](./exception)）：处理器自己兜住了所有异常，MVC 层拦截器永远看不到它们。以 WARN/INFO 记录的业务异常按设计不上报。
* **可开关的 JDBC span**——经 P6Spy 代理按语句记录数据库 span，默认关闭，关闭时零开销（完全不安装代理）。

### 配置

所有标准 `sentry.*` 配置项均可用（relaxed binding：`SENTRY_DSN` ⇔ `sentry.dsn`）。关键项：

| 配置项 / 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `SENTRY_DSN` | 未设（SDK 禁用） | sentry.io 上的项目 DSN。 |
| `SENTRY_ENVIRONMENT` | 未设 | 环境标签，如 `uat` / `prod`。 |
| `SENTRY_RELEASE` | 未设 | 版本标识；建议设为部署的镜像 tag，回归问题可映射到版本。 |
| `SENTRY_TRACES_SAMPLE_RATE` | `0`（追踪关闭） | 记录为事务的请求比例，如 `0.1`。 |
| `SOFTA_SENTRY_JDBCTRACING_ENABLED` | `false` | 按 SQL 语句记录 span（仅对被采样的请求）。 |

### 完整配置示例

按"是否随环境变化"拆分配置：不变的策略随应用提交在 `application.yml`，按环境变化的值走环境变量——relaxed binding 自动映射 `SENTRY_DSN` ⇔ `sentry.dsn`、`SOFTA_SENTRY_JDBCTRACING_ENABLED` ⇔ `softa.sentry.jdbc-tracing.enabled`。

**application.yml**——与环境无关的默认值：

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

**按环境注入**——例如服务器的 `.env` / 容器环境变量：

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

偏好 profile 而非环境变量的部署方式，也可以把同一份配置整体写在 `application-<profile>.yml`：

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

排障：设置 `SENTRY_DEBUG=true`，SDK 会输出事件被发送（或未被发送）的原因。

### 个人敏感信息（PII）

`send-default-pii` 默认 `false`，持有个人数据的应用应保持如此。异常*消息*仍会进入 Sentry——不要把个人数据写进异常消息（这本来也是好的日志习惯）。sentry.io 服务端的脱敏规则是第二道防线。

### JDBC 追踪

`softa.sentry.jdbc-tracing.enabled=true` 会把每个 `DataSource` bean 包进 P6Spy 代理，代理的语句在执行时向注册的监听器发事件，sentry-jdbc 注册的监听器为每条语句开一个子 span。因为包装点在 `DataSource` bean 上，凡是经 Spring 访问数据库的路径都被覆盖——`JdbcTemplate`、框架内部、以及路由型 `DataSource`（只在最外层包一次，语句不会被记录两遍）。

**只产生 span，不产生日志。** P6Spy 默认启用自带的语句日志模块，会把每条语句追加到 `spy.log` **文件**里。starter 把它关掉（模块列表收窄为核心工厂）：容器内的文件对任何基于 stdout 的日志管道都不可见、不轮转，而且与 ORM 已有的 SQL 日志重复。Sentry 的监听器不受影响——P6Spy 的模块监听器与 ServiceLoader 监听器来自两条独立路径。应用自己配置了 `p6spy.config.modulelist` 时，以应用的配置为准。

**与 ORM 自带 SQL 日志的关系。** softa-orm 经 `ExecuteSqlAspect` 打印 SQL，按请求由 `Context.isDebug()`（`X-Debug` 头）门控。两者互补而非重复：

| | ORM 调试日志 | Sentry JDBC span |
| --- | --- | --- |
| 触发 | 每请求，`X-Debug` | 全局开关 + 链路采样 |
| 层次 | AOP 切 `@ExecuteSql` 方法 | JDBC 驱动层代理 |
| 内容 | SQL + **参数值** + 耗时 + 执行结果 | SQL 描述 + 耗时，位于请求的 span 树中 |
| 去向 | SLF4J（WARN）→ stdout | Sentry 事务 |
| 回答 | "这个请求发了什么 SQL、参数是什么" | "这个请求慢在哪条语句上" |

⚠️ ORM 的日志是 WARN 级，因此不会成为 Sentry **事件**，但会成为同一请求后续错误事件上的**面包屑**——并带着参数值一起。某个请求若带了 `X-Debug`，参数里的个人数据就会这样进入 Sentry，而 `send-default-pii: false` 管不到（该设置只管 cookie、IP 和请求体）。`X-Debug` 是人工排障时才带的头、不是常态，这才是暴露面窄的原因。

**开销。** 开关关闭时不做任何包装——零开销。开启后每次 JDBC 调用多一次代理调用（微秒级；只在循环内打出成千上万条小语句的热点路径才需要关注），且只有被采样选中的请求才会分配 span 对象。测试环境可放心开启；生产环境视采样率与语句量决定。

### 与前端的分布式链路

Sentry 浏览器端 SDK 会给同源 API 调用附加 `sentry-trace` / `baggage` 头，后端 SDK 自动接续这些 trace。接入同一 Sentry 组织的前后端共享同一条链路视图——softa 侧无需额外配置。前端模板的接入方式见[可观测性（Sentry）](../frontend_dev/observability)。

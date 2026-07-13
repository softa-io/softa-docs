## 服务间 RPC

### 何时使用

当实体模型**由其他应用拥有**时（例如 `Order` 由 `payments` 应用拥有，但在此应用中读取），框架会将该模型的 ORM 调用通过 HTTP 重定向到拥有方应用。你的代码仍可像模型在本地一样调用 `JdbcService`。

路由键基于**应用身份**，而非注解：每个 `sys_*` 目录中的模型行都携带拥有方应用的 `app_code`（由其扫描器从该应用的 `system.app-code` 写入）。当操作目标模型的 `appCode` 与当前运行时的 `system.app-code` 不同时，`SwitchServiceAspect` 会将调用路由到拥有方应用。已退役的 `@Model.serviceName` 属性不再存在。

这不是通用 RPC 机制——只有元数据驱动模型上的 `JdbcService` 方法支持 RPC。对于任意跨服务调用，请使用普通 `RestClient`。

### 快速开始

1. 在每个应用的 `application.yml` 中赋予稳定且唯一的身份（启用 `metadata-starter` 时为必填）：

   ```yaml
   # payments app
   system:
     app-code: payments
   ```

   由 payments 应用扫描的 `Order` 模型会在共享 `sys_*` 目录中写入 `app_code = payments`——调用方无需在实体类上声明任何内容。

2. 配置**调用方**的 `application.yml`——`rpc.services` 映射以**拥有方应用的 `app-code`** 为键：

   ```yaml
   rpc:
     enable: true
     services:
       payments:                     # key = the owning app's system.app-code
         api-url: http://payments.internal:8080
         api-key: <shared>
         api-secret: <shared>
   ```

3. 配置**接收方**的 `application.yml`（仅需这一行）：

   ```yaml
   rpc:
     enable: true
   ```

4. 正常调用 `JdbcService`——框架自动路由：

   ```java
    List<Map<String, Object>> rows = jdbcService.getList("Order", filters);
    // Order.appCode = "payments" ≠ this runtime's app-code
    //   → POST to http://payments.internal:8080/rpc/Order/getList
   ```

**工作原理**：对 `appCode` 与当前运行时 `system.app-code` 不同的模型的 ORM 调用会被拦截，并 POST 到拥有方应用的 `/rpc/{modelName}/{methodName}`（从 `rpc.services.<appCode>` 解析）。调用方的请求 `Context`（租户 / 用户 / 语言）会传播，使远程调用以相同身份运行。`appCode` 为空或等于运行时自身时，始终在本地执行。

### 配置

#### 最小配置（调用方）

```yaml
rpc:
  enable: true
  services:
    payments:                       # key = the owning app's system.app-code
      api-url: http://payments.internal:8080
      api-key: <shared>
      api-secret: <shared>
```

接收方仅需 `rpc.enable: true`。

在此最小配置下，你将获得框架默认值：3 次重试、指数退避（300 ms → 3 s 上限）、按主机的熔断器、3 s 连接 / 30 s 读取超时。

#### 完整配置（调用方，自定义弹性策略）

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

#### 字段参考

| 字段 | 必填 | 说明 |
|---|---|---|
| `rpc.enable` | 是 | 控制调度器（调用方）和 `/rpc` 端点（接收方） |
| `rpc.services.<appCode>.api-url` | 是（调用方） | `system.app-code` 为 `<appCode>` 的应用的基础 URL；框架会追加 `/rpc/{model}/{method}` |
| `rpc.services.<appCode>.api-key` | 是（调用方） | 作为 `X-Api-Key` 头发送 |
| `rpc.services.<appCode>.api-secret` | 是（调用方） | 作为 `X-Api-Secret` 头发送 |
| `resilience4j.retry.instances.softa-rpc.*` | 否 | 覆盖默认重试策略 |
| `resilience4j.circuitbreaker.instances.softa-rpc.*` | 否 | 覆盖默认熔断策略 |

### 约束

- **单一端点形态**：只有 `JdbcServiceImpl` 上的方法可作为 RPC 目标，且第一个参数必须是 `String modelName`。自定义服务方法无法透明地 RPC 化。
- **线上使用 Java 序列化**：所有方法参数和返回值必须实现 `Serializable`。不支持跨语言消费者。
- **静态服务注册表**：appCode → URL 仅从 YAML 解析；无服务发现。通过 `application-{profile}.yml` 按环境切换。远程模型缺少 `rpc.services.<appCode>` 条目时会快速失败。
- **所有目标共享一个 Resilience4j 策略**：每次 RPC 调用共享 `softa-rpc` 重试 + 熔断实例——无法按目标调整 SLA。
- **系统模型永不重定向**：`sys_*` 目录模型始终在本地服务，无论其 `appCode` 为何。防止引导期间的循环路由。

### 失败处理

- RPC 失败（非成功 `ApiResponse`、空 body 或反序列化错误）会表现为 `io.softa.framework.base.exception.ExternalException`。
- HTTP 层错误（状态码、网络超时）在记录目标 URL + 状态 + body 后，以 `RestClientResponseException` 向上抛出。
- 重试 / 熔断活动暴露在 `/actuator/retries` 和 `/actuator/circuitbreakers`（通过 Resilience4j Spring Boot starter）。

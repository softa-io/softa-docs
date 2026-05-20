## 服务间 RPC 调用

### 使用场景

当某个实体模型由其他微服务持有（例如 `Order` 实际属于 `payments` 服务，但需要在当前应用中读取）时，在实体上声明 `@Model(serviceName = "payments")`，框架会将针对该模型的 ORM 调用通过 HTTP 透明转发到所属服务。业务代码继续以本地方式调用 `JdbcService` 即可。

这不是一种通用的 RPC 机制——只有基于元数据模型的 `JdbcService` 方法才可被远程化。如需任意的跨服务调用，请直接使用 `RestClient`。

### 快速开始

1. 在**调用方**的实体上标注目标服务名：

   ```java
   @Model(labelName = "Order", serviceName = "payments")
   public class Order extends AuditableModel { ... }
   ```

2. 配置**调用方**的 `application.yml`：

   ```yaml
   rpc:
     enable: true
     services:
       payments:
         api-url: http://payments.internal:8080
         api-key: <shared>
         api-secret: <shared>
   ```

3. 配置**接收方**的 `application.yml`（只需要这一行）：

   ```yaml
   rpc:
     enable: true
   ```

4. 像往常一样调用 `JdbcService`，框架会自动路由：

   ```java
    List<Map<String, Object>> rows = jdbcService.getList("Order", filters);
    // Order.serviceName = "payments" → 转发为 POST http://payments.internal:8080/rpc/Order/getList
   ```

**工作原理**：对于 `serviceName` 非空的模型，框架会拦截其 ORM 调用，并 POST 到目标服务的 `/rpc/{modelName}/{methodName}`。调用方的请求 `Context`（租户 / 用户 / 语言）会一并透传，保证远端调用以相同身份执行。

### 配置

#### 最小配置（调用方）

```yaml
rpc:
  enable: true
  services:
    payments:                       # key 与 @Model.serviceName 对应
      api-url: http://payments.internal:8080
      api-key: <shared>
      api-secret: <shared>
```

接收方只需要 `rpc.enable: true`。

使用最小配置时，会自动启用框架默认策略：重试 3 次（指数退避，300 ms → 3 s 上限）、按 host 维度的熔断、连接超时 3 s / 读超时 30 s。

#### 完整配置（调用方，自定义韧性策略）

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
      softa-rpc:                    # 实例名固定，作用于所有 RPC 目标
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

#### 字段说明

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `rpc.enable` | 是 | 调用方用于启用分发器，接收方用于启用 `/rpc` 端点 |
| `rpc.services.<name>.api-url` | 是（调用方） | 基础 URL，框架会自动追加 `/rpc/{model}/{method}` |
| `rpc.services.<name>.api-key` | 是（调用方） | 作为 `X-Api-Key` 请求头发送 |
| `rpc.services.<name>.api-secret` | 是（调用方） | 作为 `X-Api-Secret` 请求头发送 |
| `resilience4j.retry.instances.softa-rpc.*` | 否 | 覆盖默认重试策略 |
| `resilience4j.circuitbreaker.instances.softa-rpc.*` | 否 | 覆盖默认熔断策略 |

### 约束

- **端点形态唯一**：仅 `JdbcServiceImpl` 上的方法可被 RPC 化，且第一个参数必须是 `String modelName`。自定义服务方法无法透明远程化。
- **基于 Java 序列化**：所有方法参数和返回值必须实现 `Serializable`。不支持跨语言消费。
- **静态服务注册表**：服务名 → URL 仅从 YAML 解析，没有服务发现。通过 `application-{profile}.yml` 切换环境。
- **所有目标共用一份 Resilience4j 策略**：所有 RPC 调用共用 `softa-rpc` 这一份重试 + 熔断实例，无法为不同目标设置不同的 SLA。
- **系统模型永不转发**：`sys_*` 元数据表始终在本地执行，即使其模型元数据上声明了 `serviceName`，用于避免框架启动期出现循环路由。

### 失败处理

- RPC 业务失败（`ApiResponse` 非成功、body 为空、反序列化失败）统一抛出 `io.softa.framework.base.exception.ExternalException`。
- HTTP 层错误（错误状态码、网络超时）以 `RestClientResponseException` 形式向上抛出，并在日志中记录目标 URL、状态码与响应体。
- 重试 / 熔断的运行情况通过 Resilience4j Spring Boot Starter 暴露在 `/actuator/retries` 与 `/actuator/circuitbreakers`。

# 多租户支持

## 1. 多租户介绍

多租户是一种软件架构模式，允许多个租户共享同一个系统实例，同时确保租户间数据隔离，从而实现资源复用、统一升级维护、标准化数据分析以及规模化推广。

Softa 原生支持两种多租户模式：共享应用配合共享数据库，以及共享应用配合独立数据库。启用多租户后，数据会按租户自动隔离。
![Multi tenancy](/image/multi-tenancy.png)

## 2. 启用多租户

### 2.1 多租户模式一：共享应用-共享数据库

在配置文件中设置 `system.multi-tenancy.enable=true` 启用多租户。例如：

```yaml
system:
  enable-multi-tenancy: true
```

### 2.2 多租户模式二：共享应用-独立数据库

由于 Softa 支持 [动态多数据源](./datasource)，`UserInfo` 对象包含 `tenantId` 与 `datasourceKey` 字段。

用户登录时，可在 `ContextInterceptor` 拦截器实现中为上述字段赋值。

在配置文件中启用多租户：`system.multi-tenancy.enable=true`，同时启用动态多数据源，并将 `mode` 设为 `multi-tenancy-isolated`。

```yaml
system:
  enable-multi-tenancy: true
spring:
  datasource:
    dynamic:
      enable: true
      # mode: read-write-separation, switch-by-model, multi-tenancy-isolated, multi-datasource(default)
      mode: multi-tenancy-isolated
      datasource:
        tenant1:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/demo
          username: user0
          password: pass0
        tenant2:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db1
          username: user1
          password: pass1
        tenant3:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db2
          username: user2
          password: pass2
```

## 3. 多租户数据模型

启用多租户后，可在模型级别配置是否进行租户数据隔离。

**模型启用租户隔离的条件**：

- 在模型元数据中设置 `multiTenant = true`。该属性决定哪些数据模型参与租户隔离；`multiTenant = false` 的模型可在租户间共享。
- 模型需包含 `tenantId` 字段。该字段全局只读，创建时由当前用户的租户填充，不允许修改。

## 4. 租户间数据隔离策略

启用多租户后，ORM 会强制执行隔离与校验。当前用户的 `tenantId` 记录在上下文（`user.tenantId`）中。

### 4.1 简单查询

ORM 会自动在 `WHERE` 条件中追加租户过滤：

```sql
tenant_id = user.tenantId
```

### 4.2 JOIN 查询

主表与关联表都会自动追加租户条件，无需业务代码干预：

```sql
t0.tenant_id = user.tenantId AND t1.tenant_id = user.tenantId
```

### 4.3 数据创建

创建数据时，ORM 会自动填充 `tenantId`：

```java
tenantId = user.tenantId
```

若客户端指定的 `tenantId` 与当前用户的 `tenantId` 不一致，系统将抛出异常，表示可能存在未授权访问。

### 4.4 数据更新

由于模型中的 `tenantId` 为只读，ORM 会忽略对该字段的修改。

### 4.5 数据删除

删除前，ORM 会校验数据范围，仅允许删除当前用户所属租户的数据。

## 5. 多租户系统的运营平台

运营多租户系统时，往往需要跨租户访问数据，用于租户管理、数据配置与分析等。

### 5.1 运营平台不启用租户隔离

运营平台应部署独立的前后端与专用访问域名。在该系统中不要启用多租户，即 `system.multi-tenancy.enable = false`。

### 5.2 运营平台中的租户属性

在运营平台中，租户视为数据授权维度之一。数据模型中的 `tenantId` 仅作为跨租户授权条件；即便存在 `tenantId` 字段，也不受 ORM 层的多租户强制限制。

## 6. 多租户开发

### 6.1 运行前置条件

正确使用共享库多租户需要：

- 配置 `system.enable-multi-tenancy=true`
- 模型元数据标记 `multiTenant=true`
- 模型包含 `tenantId` 字段

启动校验：

- `ModelManager` 会校验每个 `multiTenant=true` 的模型都包含 `tenantId`
- 否则启动失败，错误信息：`The multi-tenant model {modelName} must contain the tenantId field`

### 6.2 默认 ORM 行为

启用多租户且当前上下文非跨租户时：

- 读操作对多租户模型自动追加 `tenant_id = Context.tenantId`
- 写操作（插入）自动从当前上下文填充 `tenantId`
- 非多租户模型不受影响

当 `Context.crossTenant=true` 时：

- 跳过租户过滤
- 插入时跳过租户自动填充

因此若跨租户写入仍需写入带租户归属的行，需显式设置 `tenantId`。

### 6.3 `@CrossTenant`

需要在一次调用内看到全租户数据时使用。

行为：

- 克隆当前上下文
- 设置 `crossTenant=true`
- 设置 `skipPermissionCheck=true`
- 执行该方法一次

典型用法：

```java
@CrossTenant
public void rebuildGlobalStatistics() {
    // 此处 ORM 读操作不受 tenant_id 限制
}
```

适用场景：

- 全局对账
- 数据迁移
- 管理端全量报表

### 6.4 `@PerTenant`

需要将一次方法调用展开为「每个活跃租户各执行一次」时使用。

行为：

- 依赖 `TenantInfoService`，即必须启用多租户
- 方法返回值类型须为 `void`
- 从 `TenantInfoService` 查询活跃租户 ID
- 每个活跃租户执行一次
- 每次调用设置对应 `tenantId`
- 每次调用设置 `skipPermissionCheck=true`
- 使用虚拟线程，最大并发 `100`
- 等待全部租户执行完成，收集失败后再抛出

典型用法：

```java
@PerTenant
public void syncTenantCache() {
    // 每个活跃租户各执行一次，并带上该租户的上下文
}
```

适用场景：

- 按租户的定时任务
- 租户内缓存刷新
- 租户内对账

重要约定：

- 不要将 `@PerTenant` 与上游已按租户拆分的逻辑叠加（例如 `cron-starter` 中 `SysCron.tenantJobMode=PerTenant`），否则任务会被展开两次。

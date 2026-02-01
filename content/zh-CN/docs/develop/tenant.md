# 多租户支持
## 1 多租户介绍
多租户是一种软件架构模式，允许多个租户（Tenant）共享同一个系统实例，同时又能确保租户间数据隔离，从而实现资源复用、统一升级维护、标准化数据分析，以及规模化推广。

Softa 原生支持两种多租户模式：共享应用-共享数据库模式、共享应用-独立数据库模式。启用多租户后，自动根据租户隔离数据。
![Multi tenancy](/image/multi-tenancy.png)

## 2 启用多租户
### 2.1 多租户模式一：共享应用-共享数据库
在配置文件中设置 `system.multi-tenancy.enable=true` 启用多租户。如：
```yaml
system:
  multi-tenancy:
    enable: true
```

### 2.2 多租户模式二：共享应用-独立数据库
由于 Softa 本身支持 [动态多数据源](./datasource)，且 UserInfo 对象包含 tenantId 和 datasourceKey 两个字段。

当用户登录时，在 ContextInterceptor 拦截器的实现类中，给这两个字段赋值即可。

在配置文件中启用多租户 `system.multi-tenancy.enable=true`，同时启用动态多数据源，并且设置 `mode` 为 `multi-tenancy-isolated`。
```yaml
system:
  multi-tenancy:
    enable: true
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

## 3 多租户数据模型
启用多租户后，可以从模型级别设置是否进行租户数据隔离。

**模型启用多租户隔离的条件**：
* 模型元数据设置 `multiTenant = true`，通过`multiTenant`属性控制哪些数据模型进行多租户隔离，也即`multiTenant = false`的模型可以在租户间共享。

* 给模型添加 `tenantId` 字段。该字段属性全局表现为只读，创建时根据当前用户的所属租户，填充`tenantId`字段值，且不允许修改。

## 4 租户间数据隔离方案
启用多租户后，ORM 会进行强制隔离和校验，且上下文 Context 中记录了当前用户的 tenantId（下文用 `user.tenantId` 表示）。

### 4.1 简单查询
ORM 层强制在 WHERE 条件中追加租户过滤条件：
```sql
tenant_id = user.tenantId
```

### 4.2 JOIN 查询
主表和关联表都会被自动追加租户过滤条件，无需开发人员代码干预。
```sql
t0.tenant_id = user.tenantId  AND t1.tenant_id = user.tenantId
```

### 4.3 创建数据
创建数据时，ORM 层自动填充 `tenantId` 字段值：
```java
tenantId = user.tenantId
```
如果客户端传递的数据指定了 tenantId，且值与当前用户的 tenantId 不相同，程序会抛出异常，需要关注可能发生的越权尝试事件。

### 4.4 更新数据
由于数据模型的 tenantID 是只读字段，ORM 层会自动忽略对 tenantId 的修改。

### 4.5 删除数据
删除前，ORM 层会检查数据范围，仅能删除当前用户所属租户的数据。

## 5 多租户系统的运营平台
在运营多租户系统时，需要跨租户访问数据，进行租户授权、数据配置、数据分析等操作。

### 5.1 运营平台不启用多租户隔离
运营平台需要部署独立的前后端服务，具备独立的访问域名。该系统本身的配置中，不启用多租户，也即 `system.multi-tenancy.enable = false`。

### 5.2 运营平台的租户属性
在运营平台中，租户只是数据授权属性中的一种。也即，数据模型的 tenantId 字段，仅仅作为跨租户授权的数据范围条件。即使数据模型包含 tenantId 字段，也不会受到 ORM 层的多租户限制。

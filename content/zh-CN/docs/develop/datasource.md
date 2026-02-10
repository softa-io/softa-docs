# 多数据源支持

## 多数据源的四种应用模式
Softa 的动态多数据源，支持四种不同的应用模式：
1. `读写分离（read-write-separation）`：用于降低单个数据库的负载，提高系统的可用性。单租户模式、共享数据库的多租户模式皆可使用。
2. `根据模型自动切换（switch-by-model）`：同一个项目内，访问多个数据库，同时又要保留元数据驱动的所有能力，可以在模型元数据层面配置数据源 `key`，不同模型访问不同数据库。
3. `共享应用-独立数据库的多租户模式(multi-tenancy-isolated)`：每个租户使用独立的数据库，在用户登录信息中，指定数据源。
4. `普通多数据源（multi-datasource）`：同一个项目内，仅在需要时通过 `@DataSource` 注解切换到不同数据源。其它模式也支持使用 `@DataSource` 注解。

建议：为降低系统间耦合度，鼓励根据负载情况设计合适的架构，如 `switch-by-model`、`multi-datasource` 模式仅用于低复杂度、低负载的系统。

## 多数据源配置
首先，启用多数据源的配置开关：`spring.datasource.dynamic.enable=true`。
否则，无论是否配置了多个数据源，仍然以原先的 `spring.datasource.*` 作为单数据源配置。

然后，可以选择性通过 `spring.datasource.dynamic.mode` 配置动态多数据源的应用模式。如果未配置 `mode`， 将以 `multi-datasource` 作为默认模式。

多数据源配置列表的第一个数据源，将作为默认数据源。未通过 `@DataSource` 注解指定数据源时，都访问默认数据源。可以在 `application.yml` 文件中自定义数据源的 key，该 key 也即数据源的名称。
```yml
spring:
  datasource:
    dynamic:
      enable: true
      # mode: read-write-separation, switch-by-model, multi-tenancy-isolated, multi-datasource(default)
      datasource:
        default:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/demo
          username: user0
          password: pass0
        db1:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db1
          username: user1
          password: pass1
        db2:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db2
          username: user2
          password: pass2
```

### 在 Java 代码中指定数据源
通过 `@DataSource("db1")` 注解指定数据源的名称，也即配置文件中对应的 key。
```java
@DataSource("db1")
public void method1() {
    // ...
}
```
通过 `@DataSource()` 注解的数据源传播机制:
* 方法没有 `@DataSource()` 注解时，获取类上的该注解。
* 如果链路中已经指定了数据源，且与当前数据源相同，则不切换。
* 如果链路中已经指定了数据源，且与当前数据源不相同，抛出异常，也即不允许跨数据源操作。
* 如果链路中没有指定数据源，则使用当前指定的数据源。
* 当首次指定访问某数据源时，方法执行结束后，会删除该设定。

## 读写分离
通过设置 `spring.datasource.dynamic.mode=read-write-separation`，即启用读写分离。

以多数据源配置中，第一个数据源作为主库，其它数据源作为只读库。路由规则：
* 事务操作：访问主库。
* 非事务的写操作：访问主库。
* 非事务的读操作：默认访问从库，指定 DataSource 时，访问指定数据源。
```yml
spring:
  datasource:
    dynamic:
      enable: true
      mode: read-write-separation
      datasource:
        primary:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/demo
          username: user0
          password: pass0
        read1:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db1
          username: user1
          password: pass1
        read2:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db2
          username: user2
          password: pass2
```

### 处理写后读的一致性问题
在读写分离的场景下，且非事务上下文中，会发生写后读的问题。也即写数据到主库，立即非事务性读取数据时，会路由到从库进行读取，但由于数据同步存在延迟，导致读到从库中的脏数据。

解决方案是在该读方法上，添加 `@DataSource` 注解，指定访问主库。
```java
// When 'primary' is the write datasource.
@DataSource("primary")
public void readMethod1() {
    // ...
}
```

## 根据模型切换数据源
首先，将多数据源 `mode` 设置为 `switch-by-model`。

然后在业务模型元数据的 `dataSource` 属性填写数据源的 `key` 即可。
注意，系统级别的模型（模型属性 `systemModel` 配置为 `true`，如以 `Sys` 开头的模型）不能配置 `dataSource` 属性。
```yml
spring:
  datasource:
    dynamic:
      enable: true
      mode: switch-by-model
      datasource:
        default:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/demo
          username: user0
          password: pass0
        db1:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db1
          username: user1
          password: pass1
        db2:
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://localhost:3306/db2
          username: user2
          password: pass2
```

## 共享应用-独立数据库的多租户模式
同时配置启用多租户、启用多数据源，并将多数据源 `mode` 设置为 `multi-tenancy-isolated`。

在 ContextInterceptor 拦截器（加载用户信息）的实现类中，同时指定 tenantId 和 datasourceKey 即可。
```yml
system:
  enable-multi-tenancy: true
spring:
  datasource:
    dynamic:
      enable: true
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
多租户的其它介绍内容，请参考 [多租户](./tenant)

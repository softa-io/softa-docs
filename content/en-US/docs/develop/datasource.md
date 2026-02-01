# Multi-DataSource Support

## Four Application Modes of Multi-DataSource
Softa's dynamic multi-data source supports four different application modes:
1. `Read-Write Separation (read-write-separation)`: Used to reduce the load on a single database and improve system availability. This can be used in both single-tenant and shared database multi-tenant modes.
2. `Auto-Switch by Model (switch-by-model)`: Within the same project, access multiple databases while retaining all metadata-driven capabilities. You can configure the data source `key` at the model metadata level, so different models access different databases.
3. `Shared Application - Isolated Database Multi-Tenant Mode (multi-tenancy-isolated)`: Each tenant uses an isolated database, and the data source is specified in the user login information.
4. `General Multi-DataSource (multi-datasource)`: In the same project, switch between different data sources only when needed using the `@DataSource` annotation. Other modes also support the use of `@DataSource`.

Recommendation: To reduce coupling between systems, it is encouraged to design appropriate architecture based on load conditions. Modes like `switch-by-model` and `multi-datasource` should only be used in low-complexity, low-load systems.

## Multi-DataSource Configuration
First, enable the multi-data source configuration switch: `spring.datasource.dynamic.enable=true`.
Otherwise, regardless of whether multiple data sources are configured, it will still use the original `spring.datasource.*` as the single data source configuration.

Then, optionally configure the dynamic multi-data source application mode through `spring.datasource.dynamic.mode`. If `mode` is not configured, `multi-datasource` will be used as the default mode.

The first datasource in the configuration list will act as the default datasource. If no datasource is specified via the `@DataSource` annotation, the default datasource will be used. You can customize the keys for datasources in the `application.yml` file, where the keys represent the names of the datasources.
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

### Specifying a DataSource in Java Code
Use the `@DataSource("db1")` annotation to specify the name of the datasource, corresponding to the key in the configuration file.
```java
@DataSource("db1")
public void method1() {
    // ...
}
```

Datasource propagation mechanism with the `@DataSource()` annotation:
* If a method lacks the `@DataSource()` annotation, the class-level annotation is applied.
* If a datasource is already specified in the chain and matches the current datasource, no switching occurs.
* If a datasource is already specified in the chain and differs from the current datasource, an exception is thrown, as cross-data-source operations are not allowed.
* If no datasource is specified in the chain, the current specified datasource is used.
* When accessing a datasource for the first time, the specification is cleared after the method execution completes.

## Read-Write Separation
Enable read-write separation by setting `spring.datasource.dynamic.mode=read-write-separation`.

In a multi-datasource configuration, the first datasource is treated as the primary (write) database, and others as read-only databases. The routing rules are as follows:
* **Transactional Operations**: Access the primary database.
* **Non-transactional Write Operations**: Access the primary database.
* **Non-transactional Read Operations**: Access a read-only database by default. If a datasource is specified, access the specified datasource.
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

### Handling Write-Read Consistency Issues
In scenarios with read-write separation and non-transactional contexts, issues may arise when reading after writing. Specifically, data written to the primary database may not yet be synchronized with the read-only database, resulting in stale data being read.

The solution is to add the `@DataSource` annotation to the read method, specifying access to the primary database.
```java
// When 'primary' is the write datasource.
@DataSource("primary")
public void readMethod1() {
    // ...
}
```

## Switch Data Source by Model
First, set the multi-data source `mode` to `switch-by-model`.

Then, in the business model metadata, set the `dataSource` property with the data source `key`.
Note: System-level models (with the `systemModel` property set to `true`, such as models starting with `Sys`) cannot configure the `dataSource` property.
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

## Shared Application - Isolated Database Multi-Tenant Mode
Enable both multi-tenancy and multi-data sources, and set the multi-data source `mode` to `multi-tenancy-isolated`.

In the implementation of the `ContextInterceptor` (which loads user information), specify both the `tenantId` and the `datasourceKey`.
```yml
system:
  multi-tenancy:
    enable: true
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

For more information on multi-tenancy, refer to [Multi-Tenancy](./tenant).

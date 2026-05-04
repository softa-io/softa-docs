# Softa Base

## Debug：使用场景与用法

`debug` 用于在请求或指定方法执行期间开启调试上下文（`Context.debug=true`），常见用途是输出 SQL 执行日志与更详细的异常信息。

### 1. 使用场景

- 排查 ORM 查询条件、排序、分页是否符合预期。
- 排查批量写入（create/update/delete）实际执行的 SQL 和参数。
- 性能初查：观察单次 SQL 调用执行耗时。
- 联调/排障时加快问题定位（debug 模式下客户端错误信息更丰富）。

### 2. 开启方式

1. 请求参数或请求头（Web API）
- 在任意 API URL 增加 `?debug=true` 或 `?debug=1`。
- 或在请求头中发送 `debug: true` / `debug: 1` / `X-Debug: true` / `X-Debug: 1`。
- 示例：
  - `GET /api/demo/User/searchList?debug=true`
  - `POST /api/demo/User/searchPage?debug=1`

2. 注解开启（代码内局部开启）
- 在方法上使用 `@io.softa.framework.orm.annotation.Debug`。
- 该注解会在方法执行期间临时开启 debug，方法结束后自动恢复原值。

3. 全局开启（Spring Boot 配置）
- 在 `application.yml` / `application-dev.yml` 配置 `debug: true`。
- 这是 Spring Boot 的全局调试开关，会提高部分框架级调试输出（例如自动配置报告、部分组件调试日志）。
- 该开关不直接设置 `Context.debug`，与 `?debug=` / `@Debug` 不是同一机制。
- 因此不会自动触发本框架 `@ExecuteSql` 切面的 SQL 耗时输出（`Time: xxx ms`）。

### 3. Debug SQL 日志包含内容

- SQL（占位符已替换的可读语句）。
- 批量参数（批量场景默认最多展示前 3 行）。
- 结果摘要（列表结果默认最多展示前 3 行）。
- 执行耗时（毫秒）。
- 多数据源模式下当前数据源 key。

### 4. 注意事项

- `?debug=` 与 `@Debug` 是「请求/方法级」开关，作用于当前执行上下文。
- `application*.yml` 中 `debug: true` 是「应用级」开关，影响全局日志行为。
- 调试日志可能包含敏感数据；请仅在开发/测试或临时排障期间使用。

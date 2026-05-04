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

### 5. 前端调试配置

应用支持全局 **debug 开关**：开启后，axios 拦截器会为每个出站 API 请求附加 `X-Debug: true`，便于结合后端日志排查问题——不应在生产环境对普通用户长期开启。

#### 环境变量

`NEXT_PUBLIC_DEBUG`（定义见 [`.env.example`](.env.example)）为构建期开关：

- `true` — 启用调试子系统。在非 dev 环境中会显示请求头开关，且默认发送 `X-Debug: true`，直至用户关闭。
- `false` / 未设置 — dev 以外环境关闭调试子系统。不显示请求头开关，且绝不发送 `X-Debug`。

#### 可见性与行为

| 环境 | `NEXT_PUBLIC_DEBUG` | 开关是否可见 | 初始值 | 是否可发送 `X-Debug` |
| --- | --- | --- | --- | --- |
| `pnpm dev` | （任意） | 是 | `false`（若 env=true 则为 `true`） | 是，由开关控制 |
| 非 dev 构建 | `true` | 是 | `true` | 是，由开关控制 |
| 非 dev 构建 | 未设置 / `false` | 否 | `false` | **永不** |

#### 运行时开关

调试子系统启用时，顶栏在密度切换旁会显示虫子图标的调试按钮。点击可切换开关；选择会持久化到 `localStorage["app:debug"]`，刷新后仍保留。激活状态采用偏警示的 destructive 色调，作为刻意的视觉提醒。

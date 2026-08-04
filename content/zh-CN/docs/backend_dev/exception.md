# 异常处理

## 优雅的响应处理
* `WebExceptionHandler`：`@RestControllerAdvice` 统一捕获全部 API 异常并封装为标准响应体；每个被处理的异常都会连同请求信息与 trace ID 一起写入日志。
* `ApiResponse`：统一响应格式。正常响应 `code` 为 200、结果在 `data`；错误响应为 `{code, message, data, error, traceId}`——`message` 是响应码的类别标签，`error` 是面向用户的具体原因（抛出时按调用方语言经 `I18n` 解析），`traceId` 回显请求的 `X-B3-TraceId`（缺省时服务端生成），供支持人员与服务端日志关联。
* 业务异常与系统异常：`BusinessException`（code 440）的 message 设计上就是给最终用户看的——客户端应直接展示 `error`；系统异常（code 500+）在非 debug 模式下不回传原始异常文本——客户端展示通用文案 + `traceId` 参考号，debug 模式（`X-Debug` 请求头或 debug 环境）下 `error` 携带完整异常信息。
* 通过继承 `BaseException` 自定义异常，可指定 `responseCode` 和 log `level`；message 支持 `{0}` 占位符并在构造时经 `I18n` 翻译，然后 `throw new xxxException(...)` 抛出。

## 异常捕获和异常监控

### 集成Sentry
修改配置文件 `sentry.properties`

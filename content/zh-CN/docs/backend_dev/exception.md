# 异常处理

## 优雅的响应处理
* 通过 `GlobalExceptionHandler` 统一捕获和处理 Web 请求异常
* 通过 `ApiResponse` 统一封装返回数据格式，正常 API 返回 `message` 或者 Object `data`，`code` 为 200.
* 通过继承 `BaseException` 自定义异常，可选择性指定 `statusCode` 和 log `level`，然后通过 `throw new xxxException` 抛出自定义异常。

## 异常捕获和异常监控

### 集成Sentry
修改配置文件 `sentry.properties`

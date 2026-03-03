# Exception Handling

## Graceful response handling
* `GlobalExceptionHandler`: Centralized handling of exceptions, capturing and processing them uniformly.
* `ApiResponse`: Standardizes the response data format for APIs. A normal API response includes a `message` or an Object data, with a `code` of 200.
* Custom Exceptions (Inheriting from `BaseException`): Custom exceptions created by inheriting from `BaseException`. These exceptions are associated with specific `statusCode` values and log `level`. Then, custom exceptions can be thrown using `throw new xxxException`.

## Exception Capture and Monitoring

### Sentry Integration
Modify the configuration file `sentry.properties`

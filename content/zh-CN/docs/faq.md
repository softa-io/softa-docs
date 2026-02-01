# FAQ

### 1. 静态与动态的权衡

### 2. 同步与异步的权衡

### 3. 为什么没有选择 Spring 内置的国际化支持
Spring 使用 `MessageSource` 支持消息国际化翻译，通过将译文定义在 *.properties 文件或自定义文件中，译文定义格式如下：

```jsx
operator.name.cannot.empty = The operator name cannot be empty.
operator.{0}.not.exist = The operator {0} does not exist.
```

这种机制存在两个明显的问题：

（1）字符串 key 不支持空格，代码中定义的是消息的 key，用法如下：

```java
throw new BusinessException("operator.{0}.not.exist", name);
```

这种机制在 key 不发生变化时，直接修改译文是比较方便的，当 key 发生变化时，依然需要更新每一个翻译文件的 key。

另外，在不需要抛给用户的异常消息场景中，如后台程序本身的异常，则仍然需要使用原始消息。

（2）在数据验证的多语言场景，使用 hibernate validator 注解时，必须用大括号包裹，跟异常消息的原始文本不一致。

```java
@NotBlank(message = "{login.username.empty}")
private String username;

@NotBlank(message = "{login.password.empty}")
private String password;
```

为了统一后台消息多语言的使用机制，同时使开发过程和翻译过程分离，Softa 在异常消息中仍然保留原文，而在 `JSON` 翻译文件中，原文直接与译文对应。

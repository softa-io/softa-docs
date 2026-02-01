# FAQ
### 1. The trade-off between static and dynamic

### 2. The trade-off between synchronous and asynchronous

### 3. Why not choose Spring's built-in internationalization support?
Spring uses `MessageSource` to support message internationalization translation, which allows defining translations in *.properties files or custom files. The format for defining translations is as follows:

```jsx
operator.name.cannot.empty = The operator name cannot be empty.
operator.{0}.not.exist = The operator {0} does not exist.
```

There are two obvious problems with this mechanism:

(1) String keys do not support spaces, and the keys defined in the code are message keys, used as follows:

```java
throw new BusinessException("operator.{0}.not.exist", name);
```

This mechanism is quite convenient for directly modifying translations when the key does not change. However, when the key changes, it is still necessary to update the key in every translation file.

Additionally, in scenarios where the exception messages are not meant to be thrown to the user, such as the program's own exceptions in the backend, the original message still needs to be used.

(2) In the scenario of multilingual data validation, when using hibernate validator annotations, braces must be used to enclose the message, which is inconsistent with the original text of exception messages.

```java
@NotBlank(message = "{login.username.empty}")
private String username;

@NotBlank(message = "{login.password.empty}")
private String password;
```

To unify the mechanism of multilingual message usage in the backend and separate the development process from the translation process, Softa still retains the original text in exception messages, while in the `JSON` translation files, the original text is directly matched with the translations.

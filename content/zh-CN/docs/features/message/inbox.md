
## 收件箱

### 核心逻辑

- 收件箱用于应用内沟通，而非外部渠道投递
- `InboxNotification` 为只读信息，推送给用户
- `InboxTodo` 为可处理的工作项，可完成、拒绝或过期
- `flow-starter` 可在审批或审核步骤中创建待办

### 收件箱通知

使用 `InboxService` 向用户推送只读通知：

```java
@Autowired
private InboxService inboxService;

inboxService.notify(userId, "Order shipped", "Your order #1234 has been dispatched.");
inboxService.notify(List.of(userId1, userId2), "System update", "Scheduled maintenance tonight.");

int unread = inboxService.countUnread(userId);
inboxService.markAsRead(notificationId);
inboxService.markAsRead(List.of(id1, id2, id3));
```

### 收件箱待办

将待办用于审批、审核与待处理业务动作：

```java
@Autowired
private InboxService inboxService;

InboxTodo todo = inboxService.createTodo(
    approverId,
    "Approve leave request",
    "Employee Alice has requested 3 days of annual leave.",
    "FLOW_INSTANCE", flowInstanceId,
    "/flow/approval/" + flowInstanceId
);

inboxService.completeTodo(todoId);
inboxService.rejectTodo(todoId);

int pending = inboxService.countPendingTodos(assigneeId);
```

### 收件箱状态参考

#### InboxTodo

```text
PENDING -> DONE
PENDING -> REJECTED
PENDING -> EXPIRED
```

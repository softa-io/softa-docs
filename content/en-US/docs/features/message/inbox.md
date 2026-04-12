
## Inbox

### Core Logic

- Inbox is used for in-app communication rather than external channel delivery
- `InboxNotification` is read-only information sent to users
- `InboxTodo` is an actionable work item that can be completed, rejected, or expired
- `flow-starter` can create todos during approval or review steps

### Inbox Notifications

Use `InboxService` to push read-only notifications to users:

```java
@Autowired
private InboxService inboxService;

inboxService.notify(userId, "Order shipped", "Your order #1234 has been dispatched.");
inboxService.notify(List.of(userId1, userId2), "System update", "Scheduled maintenance tonight.");

int unread = inboxService.countUnread(userId);
inboxService.markAsRead(notificationId);
inboxService.markAsRead(List.of(id1, id2, id3));
```

### Inbox Todos

Use todos for approvals, reviews, and pending business actions:

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

### Inbox Status Reference

#### InboxTodo

```text
PENDING -> DONE
PENDING -> REJECTED
PENDING -> EXPIRED
```
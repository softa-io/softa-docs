## 收件箱

### 核心逻辑

- 收件箱用于应用内通信，而非外部渠道投递
- `InboxNotification` 是发送给用户的只读信息
- `flow-starter` 在审批或审核步骤中推送通知

### 收件箱通知

使用 `MessageService` 提交只读通知。查询/已读操作仍在 `InboxNotificationService` 上，因为它们不是消息提交：

```java
@Autowired
private MessageService messageService;
@Autowired
private InboxNotificationService inboxNotificationService;

SendInboxDTO notification = new SendInboxDTO();
notification.setRecipientId(userId);
notification.setTitle("Order shipped");
notification.setContent("Your order #1234 has been dispatched.");
Long notificationId = messageService.sendInbox(notification);

int unread = inboxNotificationService.countUnread(userId);
inboxNotificationService.markAsRead(notificationId);
inboxNotificationService.markAllAsRead(userId);
```

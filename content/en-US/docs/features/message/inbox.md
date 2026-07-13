## Inbox

### Core Logic

- Inbox is used for in-app communication rather than external channel delivery
- `InboxNotification` is read-only information sent to users
- `flow-starter` pushes notifications during approval or review steps

### Inbox Notifications

Use `MessageService` to submit read-only notifications. Query/read operations
remain on `InboxNotificationService` because they are not message submission:

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


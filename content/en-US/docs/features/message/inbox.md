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

### The caller's own notifications (`my*` endpoints)

These endpoints always read and write the caller's own notifications (`ContextHolder.getContext().getUserId()`) and are not subject to row scope: `InboxNotification` has no anchor a business role is granted, so row scope could only empty the result. The application opens `/InboxNotification/my*` under `permission.authenticated-bypass-patterns`, so every signed-in user can use them — the header bell needs them on every page.

| Method | Path | Purpose |
|---|---|---|
| GET | `/InboxNotification/myCountUnread` | Unread count |
| GET | `/InboxNotification/myRecent?limit=` | Recent notifications (max 50) |
| POST | `/InboxNotification/myMarkAsRead?id=` | Mark one of the caller's notifications read |
| POST | `/InboxNotification/myMarkAllAsRead` | Mark all of the caller's notifications read |
| POST | `/InboxNotification/myMarkAsReadBySource?sourceModel=&sourceId=` | Mark the caller's unread notifications about one object read — an approval they opened |
| POST | `/InboxNotification/mySearch` | One page of the caller's notifications for a table: body `{ filters, orders, pageNumber, pageSize }`, newest first by default |
| POST | `/InboxNotification/myMarkAsReadByIds` | Mark the caller's unread notifications among the ids in the body (a JSON array) read; another user's ids are passed over. Returns how many were marked |

`mySearch` serves a metadata-driven table — a notification center with search, column filters, sort and paging. The request's `filters` are ANDed onto the caller's own notifications, so a filter naming another recipient finds nothing; `searchName` matches `title` and `content` (the model's `searchName`). Since row scope is waived, `filters` and `orders` may name only fields the model stores: a dotted path (`createdId.…`) or an unknown name is refused with 400 rather than answered from rows the caller could not read. A sort of the caller's ends on `id` in the direction of its first, so pages never overlap; the index `(recipientId, createdTime)` serves the default order.

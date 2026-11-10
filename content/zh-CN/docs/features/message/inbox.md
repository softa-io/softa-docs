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

### 本人的通知（`my*` 接口）

以下接口一律只读写调用者本人的通知（`ContextHolder.getContext().getUserId()`），不受行范围限制：`InboxNotification` 没有任何业务角色会被授予的锚点，行范围只会把结果清空。应用在 `permission.authenticated-bypass-patterns` 里放开 `/InboxNotification/my*`，所有登录用户都能用，铃铛在每个页面上都要用它们。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/InboxNotification/myCountUnread` | 未读数 |
| GET | `/InboxNotification/myRecent?limit=` | 最近的通知（最多 50 条） |
| POST | `/InboxNotification/myMarkAsRead?id=` | 标记一条本人的通知为已读 |
| POST | `/InboxNotification/myMarkAllAsRead` | 本人的通知全部已读 |
| POST | `/InboxNotification/myMarkAsReadBySource?sourceModel=&sourceId=` | 本人关于某个对象的未读通知标为已读（打开了某个审批） |
| POST | `/InboxNotification/mySearch` | 给表格分页读本人的通知：请求体 `{ filters, orders, pageNumber, pageSize }`，默认按时间倒序 |
| POST | `/InboxNotification/myMarkAsReadByIds` | 请求体里的 id（JSON 数组）中，本人未读的标为已读；别人的 id 直接跳过。返回标记了几条 |

`mySearch` 供元数据驱动的表格使用（一个通知中心：搜索、列筛选、排序、分页）。请求里的 `filters` 与"本人的通知"做 AND，所以按别的接收人筛选只会什么都查不到；`searchName` 匹配 `title` 和 `content`（模型的 `searchName`）。因为不受行范围限制，`filters` 和 `orders` 只能写模型存储的字段：带点的路径（`createdId.…`）或不存在的字段名直接 400，不会拿调用者本不能读的行来回答。调用方给了排序时，末尾补上按 `id` 同方向排序，翻页不会重叠；默认排序由索引 `(recipientId, createdTime)` 支撑。

# common — 通用 UI 小组件

**不感知模型**的纯视觉组件。可在任意处直接使用——页面、布局、对话框、视图组件。入参是基础数据（字符串、数字、回调）；均不涉及 `modelName`、`MetaModel` 或 `FilterCondition`。

要了解 `common/` 在五层分工中的位置，见 [索引](../index)。

| 文件 | 导出 | 类别 |
| ---- | ---- | ---- |
| `pagination-bar.tsx` | `PaginationBar` | 分页 |
| `empty-state.tsx` | `EmptyState` | 空态 / 加载 |
| `loading-skeleton.tsx` | `LoadingSkeleton` | 空态 / 加载 |
| `full-screen-loading.tsx` | `FullScreenLoading`（默认导出） | 空态 / 加载 |
| `status-badge.tsx` | `StatusBadge` | 状态 / 标识 |
| `user-avatar.tsx` | `UserAvatar` | 状态 / 标识 |
| `timeline.tsx` | `Timeline` | 展示 |
| `check-list.tsx` | `CheckList` | 展示 |
| `datetime-picker.tsx` | `DateTimePicker` | 输入 |
| `time-picker.tsx` | `TimePicker` | 输入 |
| `option-select.tsx` | `OptionSelect` | 输入 |
| `density-switcher.tsx` | `DensitySwitcher` | 应用控件 |

导入示例：`import { PaginationBar } from "@/components/common/pagination-bar";`

---

## 分页

### `PaginationBar`

独立分页行（翻页按钮 + 每页条数下拉 + 记录数）。供 `ModelTable` / `ModelCard` 工具栏使用，也可用于自定义列表。

```tsx
<PaginationBar
  pageNumber={page}
  totalPages={totalPages}
  pageSize={pageSize}
  totalCount={totalCount}
  selectedCount={selectedIds.length}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `pageNumber` | `number` | 是 | - | 当前页码（从 1 起） |
| `totalPages` | `number` | 是 | - | 总页数（展示时下限夹紧为 ≥ 1） |
| `pageSize` | `number` | 是 | - | 当前每页行数 |
| `onPageChange` | `(n: number) => void` | 是 | - | 传入从 1 起的新页码 |
| `onPageSizeChange` | `(n: number) => void` | 是 | - | 新的每页条数 |
| `totalCount` | `number` | 否 | - | 显示为 `Total N records`；省略则不显示汇总 |
| `selectedCount` | `number` | 否 | `0` | 大于 0 时追加显示 `· Selected N` |
| `availablePageSizes` | `number[]` | 否 | `[10,20,50,100]` | 下拉可选每页条数 |
| `className` | `string` | 否 | - | |

---

## 空态 / 加载

### `EmptyState`

居中的「无数据 / 无结果」占位。未传 `icon` 时默认使用数据库图标。

```tsx
<EmptyState
  title="暂无部署"
  description="请选择环境后查看部署。"
  action={<Button>开始使用</Button>}
/>

// 紧凑变体——用于卡片/面板内的行内空态
<EmptyState compact title="暂无条目" />
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `title` | `string` | 是 | - | 主文案 |
| `description` | `string` | 否 | - | 辅助说明（最大宽度 `max-w-sm`） |
| `icon` | `ReactNode` | 否 | `<Database>` | 自定义图标 |
| `action` | `ReactNode` | 否 | - | 文案下方的按钮或链接 |
| `compact` | `boolean` | 否 | `false` | 更小的内边距与字号，用于行内 |
| `className` | `string` | 否 | - | |

### `LoadingSkeleton`

预置整页骨架（输入行 + 主体 + 分页底栏占位）。用于即将渲染 Model\* 视图但数据尚未加载完成的页面。

```tsx
if (isLoading) return <LoadingSkeleton />;
```

无 props。

### `FullScreenLoading`

带转圈的模态全屏遮罩。默认导出。用于阻塞整个应用的操作。

```tsx
import FullScreenLoading from "@/components/common/full-screen-loading";

{isSaving && <FullScreenLoading />}
```

无 props。

---

## 状态 / 标识

### `StatusBadge`

基于 `class-variance-authority` 变体的彩色胶囊徽标。不解析状态含义——由调用方选择 `variant`。

```tsx
<StatusBadge variant="success">生效中</StatusBadge>
<StatusBadge variant="warning">待处理</StatusBadge>
<StatusBadge variant="error">失败</StatusBadge>
<StatusBadge variant="info">草稿</StatusBadge>
<StatusBadge variant="neutral">已归档</StatusBadge>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `variant` | `"success" \| "warning" \| "error" \| "info" \| "neutral"` | 否 | `"neutral"` | 配色主题 |
| `className` | `string` | 否 | - | 与变体类名合并 |
| ...HTMLSpanAttributes | - | - | - | 透传给底层 `<span>` |

### `UserAvatar`

圆形头像。`photoUrl` 能加载则显示图片，否则退回 `User` 图标。`photoUrl` 的域名无需加入 `next.config.js` 的 `remotePatterns`（使用原生 `<img>`）。

```tsx
<UserAvatar photoUrl={user.avatarUrl} />
<UserAvatar />  {/* 退回图标 */}
<UserAvatar className="h-12 w-12" />  {/* 自定义尺寸 */}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `photoUrl` | `string` | 否 | - | 头像 URL；加载失败自动退回默认 |
| `className` | `string` | 否 | `h-(--ds-h-xl) w-(--ds-h-xl)` | 用 Tailwind 类覆盖尺寸 |

---

## 展示

### `Timeline`

竖向事件时间线，中间有连接线。第一项高亮；后续项弱化显示。

```tsx
<Timeline
  events={[
    {
      idField: "evt-1",
      timeField: "2026-04-30 09:30",
      userField: "Alice Lee",
      actionField: "submitted the request",
      detailsField: "Reason: vacation",
    },
    {
      idField: "evt-2",
      timeField: "2026-04-30 10:15",
      userField: "Bob Manager",
      actionField: "approved the request",
    },
  ]}
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `events` | `TimelineEvent[]` | 是 | - | 空列表不渲染 |
| `className` | `string` | 否 | - | |

`TimelineEvent` 结构（每个字段已是格式化后的展示值）：

| 字段 | 类型 | 说明 |
| ----- | ---- | ---- |
| `idField` | `string` | 用作 React key；通常为事件记录 id |
| `timeField` | `string` | 预先格式化的时间戳文案 |
| `userField` | `string` | 操作者名称 |
| `actionField` | `string` | 动词短语，例如 `"approved the request"` |
| `detailsField` | `string?` | 可选第二行 |

### `CheckList`

竖向清单。已勾选显示绿色勾 + 删除线；未勾选显示空心圆。

```tsx
<CheckList
  items={[
    { idField: "1", labelField: "提交表单", statusField: true },
    { idField: "2", labelField: "等待审批", statusField: false, descriptionField: "经理审批中" },
  ]}
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `items` | `CheckListItem[]` | 是 | - | 空列表不渲染 |
| `className` | `string` | 否 | - | |

`CheckListItem` 结构：

| 字段 | 类型 | 说明 |
| ----- | ---- | ---- |
| `idField` | `string` | React key |
| `labelField` | `string` | 条目标签 |
| `statusField` | `boolean` | `true` = 已勾选（删除线、绿色）；`false` = 未勾选 |
| `descriptionField` | `string?` | 可选第二行 |

---

## 输入

### `DateTimePicker`

日历 + 时刻选择（合一）。受控组件。

```tsx
<DateTimePicker
  value={selectedDate}
  onChange={setSelectedDate}
  timeFormat="hh:mm:ss"
  defaultTime="09:00:00"
  onApply={handleApply}
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `value` | `Date` | 否 | - | 选中的日期与时间 |
| `onChange` | `(date: Date \| undefined) => void` | 是 | - | 日历点选或时间编辑时触发 |
| `timeFormat` | `"hh:mm" \| "hh:mm:ss"` | 否 | `"hh:mm:ss"` | 时间精度 |
| `defaultTime` | `string` | 否 | - | `value` 为空时的初始时间；格式须与 `timeFormat` 一致 |
| `disabled` | `boolean` | 否 | `false` | |
| `onApply` | `() => void` | 否 | - | 点击应用——通常用于关闭选择器 |
| `className` | `string` | 否 | - | |

### `TimePicker`

仅时间（无日历）。交互与 `DateTimePicker` 底部一致。

```tsx
<TimePicker
  value={selectedTime}
  onChange={setSelectedTime}
  timeFormat="HH:mm"
  defaultTime="08:00"
  onApply={handleApply}
/>
```

除 `timeFormat` 使用大写 `"HH:mm"` / `"HH:mm:ss"` 外，其余与 `DateTimePicker` 对齐。

### `OptionSelect`

绑定选项集（服务端枚举）的独立下拉。内部处理加载 / 错误态。

```tsx
<OptionSelect
  optionSetCode="DocumentStatus"
  value={status}
  onChange={setStatus}
  filters={[["disabled", "=", false]]}  // 可选：客户端过滤
  placeholder="请选择状态"
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `optionSetCode` | `string` | 是 | - | 服务端选项集标识 |
| `value` | `string \| number` | 否 | - | 当前选中的 `itemCode` |
| `onChange` | `(value: string \| undefined) => void` | 否 | - | 新的 `itemCode`（清空时为 `undefined`） |
| `placeholder` | `string` | 否 | `"Please select..."` | |
| `disabled` | `boolean` | 否 | `false` | |
| `readOnly` | `boolean` | 否 | `false` | 视觉上不可交互，保持正常对比度 |
| `filters` | `FilterCondition` | 否 | - | 对拉取到的选项做客户端过滤 |
| `className` | `string` | 否 | - | |

加载中 → 渲染 `Skeleton`。出错 → 渲染禁用下拉，文案 `"Failed to load options"`。

---

## 应用控件

### `DensitySwitcher`

通过 `@/providers/density-provider` 的 `useDensity()` 切换紧凑 / 舒适密度。用在应用 `Header` 中。除 `className` 外无其他 props。

```tsx
<DensitySwitcher />
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `className` | `string` | 否 | - | |

---

## 新增 common 组件的准则

当且仅当**全部**满足时，组件应放在 `common/`：

- 只接收朴素数据（无 `modelName` / `MetaModel` / `FilterCondition` 等 props）
- 不依赖 Model\* 视图容器（如 `SidePanelContainerProvider` 等）
- 可在非 Model\* 宿主中使用（对话框、布局、自定义页面）

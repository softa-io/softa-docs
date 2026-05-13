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
| `date-picker.tsx` | `DatePicker` | 输入 |
| `datetime-picker.tsx` | `DateTimePicker` | 输入 |
| `time-picker.tsx` | `TimePicker` | 输入 |
| `time-column-panel.tsx` | `TimeColumnPanel` | 输入（构建块） |
| `time-utils.ts` | `resolveTimeConfig`、类型 | 工具 |
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

竖向事件时间线，中间有连接线。首条事件高亮；后续事件以弱化颜色渲染。

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

三种选择器（`DatePicker` / `DateTimePicker` / `TimePicker`）形态一致：**字符串入、字符串出**。触发器上的文案可用 `displayFormat` 设为另一种展示格式（例如 12 小时制或与区域相关的格式），但机器值始终使用规范机器格式，下游链路（表单值、`FilterCondition`、后端约定）无需了解展示模式。

`triggerWrapper` 可供表单适配器注入 `<FormControl>{button}</FormControl>`，使 react-hook-form 的无障碍挂钩（id / aria-describedby / aria-invalid）作用于触发按钮。独立调用方省略该项时，按钮即作为触发器。

### `DatePicker`

纯日历日期选择。

```tsx
<DatePicker value={value} onChange={setValue} />
<DatePicker value={value} onChange={setValue} dateFormat="yyyy-MM" />
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `value` | `string` | 是 | - | `dateFormat` 下的日期字符串；`""` 表示未选 |
| `onChange` | `(next: string) => void` | 是 | - | 新值；清空时为 `""` |
| `dateFormat` | `string` | 否 | `configs.dateTimeFormats.date`（`yyyy-MM-dd`） | 机器格式。可传 `"yyyy-MM"` / `"MM-dd"` 等部分日期选择器 |
| `displayFormat` | `string` | 否 | = `dateFormat` | 触发器标签格式 |
| `disabled` | `boolean` | 否 | `false` | |
| `placeholder` | `string` | 否 | `"Pick a date"` | |
| `className` | `string` | 否 | - | 作用于触发按钮 |
| `triggerWrapper` | `(button) => ReactElement` | 否 | - | 表单适配器用 `<FormControl>` 包裹 |
| `triggerStyle` | `CSSProperties` | 否 | - | 触发按钮行内样式 |

### `DateTimePicker`

日历与 24 小时时刻列并排。页脚提供清除 / 现在 / 应用。

```tsx
<DateTimePicker value={value} onChange={setValue} />
<DateTimePicker value={value} onChange={setValue} defaultTime="23:59:59" />
```

机器格式固定为 `yyyy-MM-dd HH:mm:ss`（与 `configs.dateTimeFormats.dateTime` 一致）。

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `value` | `string` | 是 | - | `yyyy-MM-dd HH:mm:ss`；`""` 表示未选 |
| `onChange` | `(next: string) => void` | 是 | - | |
| `displayFormat` | `string` | 否 | `configs.dateTimeFormats.dateTime` | 触发器标签格式。可传如 `"yyyy-MM-dd hh:mm:ss a"` 表示 12 小时制 |
| `defaultTime` | `string` | 否 | `"00:00:00"` | 用户选日期但值尚无时间时填充的时刻。范围筛选端点可传 `"23:59:59"` |
| `disabled` | `boolean` | 否 | `false` | |
| `placeholder` | `string` | 否 | `"Pick date & time"` | |
| `className` | `string` | 否 | - | |
| `triggerWrapper` | `(button) => ReactElement` | 否 | - | |
| `triggerStyle` | `CSSProperties` | 否 | - | |

### `TimePicker`

仅时间（无日历）。在浮层内渲染 `TimeColumnPanel`。

```tsx
<TimePicker value={value} onChange={setValue} timeFormat="HH:mm:ss" />
<TimePicker
  value={value}
  onChange={setValue}
  timeFormat="HH:mm"
  config={resolveTimeConfig({ min: "08:00", max: "18:00", minuteStep: 15 }, "HH:mm")}
/>
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| `value` | `string` | 是 | - | `timeFormat` 下的 24 小时字符串；`""` 表示未选 |
| `onChange` | `(next: string) => void` | 是 | - | |
| `timeFormat` | `"HH:mm" \| "HH:mm:ss"` | 是 | - | 机器格式；面板列始终以 24 小时渲染 |
| `displayFormat` | `string` | 否 | = `timeFormat` | date-fns 格式的触发标签（例如 `"hh:mm:ss a"` 表示 12 小时制） |
| `config` | `ResolvedTimeConfig` | 否 | `resolveTimeConfig(undefined, timeFormat)` | 边界 / 快捷选项 |
| `disabled` | `boolean` | 否 | `false` | |
| `placeholder` | `string` | 否 | `"Pick time"` | |
| `className` | `string` | 否 | - | |
| `triggerWrapper` | `(button) => ReactElement` | 否 | - | |
| `triggerStyle` | `CSSProperties` | 否 | - | |

### `TimeColumnPanel`

可滚动的小时 / 分 /（秒）列面板，供 `TimePicker` 与 `DateTimePicker` 使用。仅在需将列嵌入自定义布局时直接使用。页脚「清除 / 现在 / 应用」是否出现取决于 `onClear` / `onApply` / `config.clearable` / `config.showQuickPick`。

### `resolveTimeConfig`

解析 `TimePicker` / `TimeColumnPanel` 配置的纯函数（不含组件逻辑）。接收 `Partial<TimePickerConfig>` 与 `TimeFormat`，返回已解析边界、校验步长并将 `defaultTime` 对齐到步长网格的 `ResolvedTimeConfig`。

```ts
import { resolveTimeConfig } from "@/components/common/time-utils";

const config = resolveTimeConfig(
  { min: "08:00", max: "18:00", minuteStep: 15, quickOptions: ["09:00", "12:00"] },
  "HH:mm",
);
```

`TimePickerConfig` 结构：

| 字段 | 类型 | 说明 |
| ----- | ---- | ---- |
| `min` / `max` | `string` | 含边界的上下界，格式为 `timeFormat` |
| `minuteStep` / `secondStep` | `number` | 取值之一为 `[1,2,3,4,5,6,10,12,15,20,30,60]`（60 的因数）；`60` 表示仅允许 `00`；非法值将告警并退回 1 |
| `defaultTime` | `string` | 首次打开时预填；自动向上对齐到步长网格 |
| `quickOptions` | `string[]` | 列上方的快捷按钮；超出范围或不在网格上的项自动禁用 |
| `clearable` | `boolean` | 页脚是否显示清除（默认 `true`） |
| `showQuickPick` | `boolean` | 页脚是否显示「现在」（默认 `true`） |

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

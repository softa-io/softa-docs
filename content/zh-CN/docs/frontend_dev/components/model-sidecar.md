# ModelSidecar

附加在列表 / 看板 / 表格视图中每条主记录上的辅助数据：批量拉取一次，按主 id 关联，通过 `RecordContext` 逐条暴露。

## 为什么

很常见：环境列表想在每行旁显示漂移状态；员工表格想在每行下显示假期余额与近期请假；客户看板想在卡片上显示未结 AR 徽章。朴素实现会变成每卡一条查询（N+1）或页面级自定义仪表盘。

`ModelSidecar` 用**每个 sidecar 模型一次批量查询**、按主 id 关联、经 context 分发到对应卡片 —— 且**从不伪装成真实列**。

## 铁律

> **Sidecar 数据不能变成可排序 / 可筛选 / 可导出的列。**
> 若用户需要据此排序、筛选或导出，应提升为真实字段 —— 纳入主模型（virtual / cascaded / view），使其具备列契约。

Sidecar 只出现在两处：

- **行内附属** —— 追加在已有字段旁（徽章、状态指示）。
- **行展开（Master-Detail）** —— 行下方全宽面板。

仅此两种，没有第三种位置。

## 快速开始 —— Board / Card 视图中的行内插槽

在 `<ModelBoard>` / `<ModelCard>` 上直接声明 sidecars。视图从自身记录推导 `primaryIds`，将活跃 workspace 过滤 AND 合并进各 sidecar 的 `filters`，经 `useQueries` 批量查询，并向卡片内插槽暴露数据。工具栏会增加 Refresh 按钮，使主查询与所有 sidecar 模型失效。

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";
import {
  SidecarSlot,
  useSidecar,
} from "@/components/views/shared/model-sidecar";

function MyBoardView() {
  return (
    <ModelBoard
      modelName="DesignAppEnv"
      groupBy={{ field: "envType" }}
      sidecars={[
        {
          id: "lastActivity",
          model: "DesignActivity",
          joinField: "envId",
          orders: ["id", "DESC"],
          reduce: "first",
        },
      ]}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
      </ModelBoard.Header>
      <Field fieldName="connectorType" />
      <SidecarSlot
        slotId="lastActivity"
        render={(lastActivity) => (
          <LastActivityRow lastActivity={lastActivity} />
        )}
      />
    </ModelBoard>
  );
}
```

在任意 per-card 作用域内，需要组合多个 slot 时可直接调用 `useSidecar`：

```tsx
function HealthDot() {
  const lastActivity = useSidecar<ActivityRow>("lastActivity");
  return <span className={dotColor(lastActivity)} />;
}
```

## 快速开始 —— `<ModelTable>` 中的 Master-Detail

```tsx
import { Field } from "@/components/fields";
import { ModelTable } from "@/components/views/table/ModelTable";
import {
  SidecarStatPanel,
  SidecarTablePanel,
  SidecarListPanel,
} from "@/components/views/shared/model-sidecar";

<ModelTable
  modelName="Employee"
  sidecars={[
    { id: "leaveBalance", model: "LeaveBalance", joinField: "employeeId",
      reduce: "first" },
    { id: "recentLeaves", model: "LeaveRecord", joinField: "employeeId",
      orders: ["startDate", "DESC"], reduce: "all" },
    { id: "recentActivities", model: "EmployeeActivity", joinField: "employeeId",
      orders: ["createdTime", "DESC"], reduce: "all" },
  ]}
  expandChildren={(employee) => (
    <div className="grid gap-3 md:grid-cols-3">
      <SidecarStatPanel
        slotId="leaveBalance"
        label="Leave Balance"
        render={(data) => (
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Annual" value={data?.annualRemaining ?? 0} />
            <Stat label="Sick" value={data?.sickRemaining ?? 0} />
          </dl>
        )}
      />
      <SidecarTablePanel
        slotId="recentLeaves"
        label="Recent Leaves"
        maxRows={5}
        columns={[
          { header: "Type", render: (r) => r.leaveType },
          { header: "Start", render: (r) => formatDate(r.startDate) },
          { header: "Days", render: (r) => r.days, align: "right" },
          { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <SidecarListPanel
        slotId="recentActivities"
        label="Activities"
        maxRows={10}
        renderItem={(row) => <ActivityRow activity={row} />}
      />
    </div>
  )}
>
  <Field fieldName="name" />
  <Field fieldName="department" />
  <Field fieldName="status" />
</ModelTable>
```

`reduce: "all"` 默认 `limitSize` 为 `primaryIds.length * 10`，适合多数「每行最近 N 条」场景。仅当面板有意多拉或少拉行时再覆盖 `limitSize`。

展开行跨所有列。各面板自行决定标题语义：`Stat` 无列头，`Table` 从 `columns` 自动渲染列头，`List` 仅显示面板标题。

## API

### `<ModelBoard>` / `<ModelTable>` / `<ModelCard>` 上的 `sidecars` prop

传入 `SidecarConfig` 数组。视图会：

1. 从自身已渲染记录推导 `primaryIds`（去重、保序）。
2. 将活跃 workspace 过滤 AND 合并进各 config 的 `filters`（用 `inheritWorkspaceFilter: false` 跳过）。
3. 用 `<ModelSidecarProvider>` 包裹卡片 / 行，使 `useSidecar` / `<SidecarSlot>` / panels 可解析。
4. Board / Card：工具栏渲染 Refresh，使主模型与所有 sidecar 模型失效。ModelTable 工具栏 Refresh 尚未实现 —— 页面需要刷新入口时请手动 `queryClient.invalidateQueries({ queryKey: [model] })`。

这是**默认路径**。除需直接控制外，所有带 sidecar 的列表场景都应使用。

### `<ModelSidecarProvider>`（底层）

独立 provider 用于视图不拥有记录列表的情况（例如自定义布局混合主列表与 detached 面板）。自行管理 `primaryIds` 并应用 workspace 过滤 —— 通常通过导出的 `applyWorkspaceFilterToSidecars(sidecars, workspaceFilter)`。

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `primaryIds` | `string[]` | 是 | 当前渲染记录的 id。空数组 → 不拉取。 |
| `configs` | `SidecarConfig[]` | 是 | 每个 sidecar 插槽一条。顺序无关。 |
| `children` | `ReactNode` | 是 | sidecar 所装饰的视图。 |

### `SidecarConfig`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 插槽 id；须与读取时的 `slotId` 一致。 |
| `model` | `string` | Sidecar 模型名。 |
| `joinField` | `string` | Sidecar 模型上指向主 id 的外键（如 `envId`）。 |
| `filters` | `FilterCondition?` | 额外范围，与 `[joinField, "IN", primaryIds]` AND 合并。 |
| `orders` | `OrderCondition?` | 排序。`reduce: "first"` 时决定哪行胜出。 |
| `reduce` | `"first" \| "all"` | 单条或列表。见下文。 |
| `limitSize` | `number?` | 覆盖拉取上限。 |
| `inheritWorkspaceFilter` | `boolean?` | 宿主视图应用 workspace 过滤时（`<ModelBoard sidecars>` / `<ModelTable sidecars>` / `<ModelCard sidecars>` 默认行为），设为 `false` 可退出 —— 适用于跨 workspace 查找（系统参考数据等）。直接使用 `<ModelSidecarProvider>` 时忽略此字段。 |

#### `reduce` 语义

- **`"first"`** → 返回 `T \| undefined`。配合 `useSidecar<T>` / `SidecarSlot<T>` / `SidecarStatPanel<T>`。默认 `limitSize = primaryIds.length`。
- **`"all"`** → 返回 `T[]`（始终为数组；无匹配行为空数组）。配合 `SidecarTablePanel<T>` / `SidecarListPanel<T>`。默认 `limitSize = primaryIds.length * 10`。

1:1 关联可无 `orders` 使用 `"first"` —— 本来就只有一行。

高基数 1:N（一条主记录可能有数百子行）时不要无限增大 `limitSize`。**尽力批量不能替代每组 Top-N**；应在后端聚合。

### Hooks

```ts
useSidecar<T>(slotId): T | undefined
```

读取当前记录的 sidecar 值。从周围 `RecordContext` 解析主 id。无 record context、无插槽或主 id 不在预取批次中时返回 `undefined`。`reduce: "all"` 始终返回数组（无 context 时为 `undefined`）。

```ts
useSidecarLoading(slotId): boolean
```

插槽底层查询是否仍在加载。

```ts
useModelSidecarRegistry(): ModelSidecarRegistry
useOptionalModelSidecarRegistry(): ModelSidecarRegistry | null
```

底层访问。registry 暴露 `getChannel(slotId)` 与 `refetchAll()`。多数消费者用上面的 hooks 即可。

### Slot

```tsx
<SidecarSlot<T>
  slotId="lastActivity"
  render={(data, { isLoading }) => /* … */}
/>
```

围绕 `useSidecar` + `useSidecarLoading` 的 render-prop 包装。用于行内附属。

### Panels（Master-Detail 构建块）

| Panel | 形态 | Reduce | 有列头？ |
| --- | --- | --- | --- |
| `SidecarStatPanel<T>` | KV / 指标 —— 单记录量级 | `"first"` | 否 |
| `SidecarTablePanel<T>` | 多记录 × 多字段子表 | `"all"` | 是（由 `columns` 自动生成） |
| `SidecarListPanel<T>` | 多记录活动流 | `"all"` | 否 |

三者均接受 `label?`（面板标题）、`emptyText?`、`className?`。

`SidecarTablePanel` 与 `SidecarListPanel` 接受 `maxRows?`（限制渲染行数）与 `footer?`（如「View all (N)」链接）。

## `<ModelTable expandChildren>`

```tsx
<ModelTable
  modelName="Employee"
  expandChildren={(employee) => /* panels go here */}
>
  …
</ModelTable>
```

设置 `expandChildren` 时，ModelTable 在左侧增加 chevron 列，并在每条展开行下方渲染返回的 ReactNode。展开内容包在 `RecordContextProvider` 中，内部 `useSidecar` / `<SidecarSlot>` / panels 无需额外配置。

说明：

- 提供 `expandChildren` 时**自动禁用虚拟滚动**。
- **固定列**仍正确固定 —— `left` 偏移会加上 chevron 列宽。
- 展开列与 `select` / `actions` 列独立，可共存。

## 陷阱

- **变更后刷新。** Sidecar 查询以 sidecar 模型名作为 key（如 `["DesignActivity", …]`）。动作变更主模型时，框架失效仅触及 `[primaryModel, …]` —— sidecar 不会自动重拉。Board / Card 工具栏 Refresh（设置 `sidecars` 时自动渲染）可处理；异步动作更新 sidecar 状态后请使用。ModelTable 工具栏 Refresh 尚未接入 —— 需要时请手动 invalidate。
- **形态不一致。** Sidecar 上 join 字段若为 `ModelReference`（`{id, displayName}`），框架的 `getModelRefId` 会处理。若后端对部分 sidecar 返回裸 string id、部分返回对象，请在 API 层归一 —— 不要让框架猜测。
- **加载闪烁。** Sidecar 查询在主记录到达后才触发。卡片首屏 sidecar 为空；数据到达后徽章填充。需要骨架屏时用 `useSidecarLoading(slotId)`。
- **直接使用 `<ModelSidecarProvider>`。** 绕过宿主集成（少见）时，你负责 `primaryIds` 引用稳定 —— 请 memoize：`useMemo(() => records.map(r => r.id), [records])`。宿主视图已替你处理。

## 何时*不要*用

- 辅助数据已在主模型上（如 `lastDeployedAt` 是真实字段）。直接用 `<Field>`。
- 用户需要按该指标排序 / 筛选 / 导出。提升为真实字段；sidecar 不是正确工具。
- 关系是「按已知 id 查一条特定关联记录」，而非「跨主 id 列表 join」。普通 `useGetByIdQuery` 足够。

## 文件映射

```
ModelSidecarProvider.tsx     # Provider + context + useQueries-based batch fetcher
useSidecar.ts                # useSidecar / useSidecarLoading
SidecarSlot.tsx              # Inline render-prop slot
applyWorkspaceFilter.ts      # Helper used by host-view integrations
panels/
  SidecarPanelShell.tsx      # Shared shell (border / title / loading / empty)
  SidecarStatPanel.tsx       # Metric / KV
  SidecarTablePanel.tsx      # Multi-record sub-table with column headers
  SidecarListPanel.tsx       # Activity feed
types.ts                     # SidecarConfig / SidecarReduce / channel types
```

`ModelBoard` / `ModelTable` / `ModelCard` 上的 `sidecars` prop 是公开 surface；上文其余内容业务代码很少需要直接接触。

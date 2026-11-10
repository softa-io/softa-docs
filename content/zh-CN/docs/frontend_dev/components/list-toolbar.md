# 列表工具栏（ListToolbar）

列表页面的工具栏这一行，以及筛选条件在工具栏上的药丸。`ModelTable`、`ModelCard`、`ModelBoard` 的工具栏都是用它们搭的；不是 `ModelTable` 的列表 —— 行由自己的接口拼出来、单元格可以就地编辑 —— 也用同一套组件排布工具栏，换行方式和读法与其它列表一致。

| 文件 | 内容 |
| --- | --- |
| `list-toolbar.tsx` | `ListToolbar`（这一行）、`ListToolbarGroup`（一起移动的一组按钮）与 `ListToolbarLabel`（窄时让位给图标的按钮文字） |
| `pinned-filter-pill.tsx` | `PinnedFilterPill`、`PinnedFilterPopover`、`PinnedFilterSelect` —— 画成药丸的筛选 |
| `pinned-filter-search.tsx` | `PinnedFilterSearch`、`PinnedFilterSearchOptions` —— 搜索后选一条记录的药丸 |
| `date-range-filter.tsx` | `DateRangeFilter` —— "From ~ To" 药丸 —— 以及 `dateRangeCondition`、`dateRangeSummary`、`EMPTY_DATE_RANGE` |

目录：`src/components/views/shared/list-toolbar/`。

## 这一行

```tsx
import { ListToolbar } from "@/components/views/shared/list-toolbar/list-toolbar";

<div className="border-b border-border/60" style={{ paddingInline: "var(--ui-page-padding)", paddingBlock: "var(--ui-form-row-gap)" }}>
  <ListToolbar
    search={<SearchField composing iconSize="md" placeholder="Search profiles" value={search} onValueChange={setSearch} />}
    filters={<DateRangeFilter label="Created" value={range} onChange={setRange} active={Boolean(range.from || range.to)} onReset={() => setRange(EMPTY_DATE_RANGE)} />}
    actions={<Button size="sm">Create</Button>}
  />
</div>
```

- `search` 排在第一个。宽度由工具栏决定 —— 不小于 12rem，最宽 24rem —— 所以传入的搜索框不要再带自己的宽度（不要 `containerClassName="w-72"`）。没有药丸时，它先缩到 12rem，按钮才换到单独一行；后面有药丸时，搜索框缩到 16rem 之前，药丸就先换到下一行。
- `filters` 紧跟在搜索框后：药丸原样传入 —— 一个 fragment，不要再包一层盒子 —— 因为每个药丸都是这一行的一项：放不进搜索框旁边的药丸从下一行开始，按钮放得下时与它们同处那一行。看板把卡片计数放在这里（"42 total"）。
- `actions` 被推到右侧。放不下时换行而不是挤压搜索框和药丸：放不进它们旁边时，整体换到下一行并靠右；一行也放不下时，各组再分开 —— 每组是一个 `ListToolbarGroup`，就像 `ModelTable` 把自己的按钮放一组、页面的按钮放一组；单独一组比一行还宽时，组内按钮再换行。几个不必放在一起的按钮直接传入即可。手机宽度下搜索框和按钮各占一行，按钮那一行可横向滚动。
- `collapseLabels` 给要放的东西不止搜索框和按钮的工具栏用：工具栏宽度小于 64rem 时，用 `ListToolbarLabel` 包住的文字让位给按钮图标，仍是按钮的无障碍名称。开启时给这些按钮加 `title`，因为那时只显示图标。`ModelTable` 有固定筛选时开启它，作用于自己的 Filter / Sort / Group / Columns / More；页面的按钮保留文字。它是具名的 container query（`@container/list-toolbar`），外层容器的宽度不会让它收起。
- 这一行外面的带子 —— 边框和内边距 —— 归容器，不归这一行：页面工具栏放在带页面内边距的带子里，卡片里的列表（角色成员）只需要下边距（`className="mb-(--ds-space-5)"`）。
- 不是列表工具栏的东西 —— 页签条旁边一个搜索框、侧栏列表的头部 —— 保持自己的布局。

在用：`ModelTableToolbarControls`（每个 `ModelTable`）、`ModelCardToolbar`（每个 `ModelCard`）、`BoardToolbar`（每个 `ModelBoard`）、Consultant Profiles（`src/app/system/consultant-profile/page.tsx`）、角色成员（`src/app/user/access/roles/components/` 下的 `MembersStep`、`RoleDetailView`）。

## 药丸

药丸是筛选在工具栏上的样子：名称和当前值放在一个按钮里，点开是控件；筛选在缩小列表时（`active`：值不是默认值）高亮，旁边一个 × 把它恢复默认（`onReset`）。在 `ModelTable` 里，`<PinnedFilter>` 把 `label`、`value`、`onChange`、`active`、`onReset` 交给它的控件（见 [ModelTable 固定筛选](../views/table)）；自己管理筛选状态的列表自行算出 `active` 和 `onReset`，渲染同样的控件。

| 药丸 | 用于 | 除 `label`、`active`、`onReset` 外还要传 |
| --- | --- | --- |
| `PinnedFilterSelect` | 几个值里选一个 | `summary`、`value` 与 `onValueChange`（字符串：表示"任意"的值换成一个占位值），子节点是 `SelectItem` |
| `PinnedFilterPopover` | 弹层里放一个控件：要勾选的项、要挑的日期 | `summary`、子节点是控件；需要受控时传 `open` / `onOpenChange`，是选项列表时传 `role="combobox"` |
| `PinnedFilterSearch` | 搜索后选一条记录 | `value`（`{ id, displayName }` 或 null）、`onChange`、`anyText`（未选时的读法）、`list` |
| `DateRangeFilter` | 日期范围，两端都可留空 | `value` 与 `onChange`（`{ from, to }`，`yyyy-MM-dd` 或 `""`） |

`summary` 是值在药丸上的读法："All types"、"Within 30 Days"、"2026-01-01 – 2026-03-31"。超过 15rem 截断，悬停显示全文。

### 搜索后选一条记录

`PinnedFilterSearch` 把选中的记录存成引用 —— id 加上选它时的名称 —— 药丸不用再查一次就能显示名称，记住的选择在重新打开列表时也照样显示。它的 `list` 是一个负责搜索和列出记录的组件：只在弹层打开时挂载，所以只在那时搜索，而不是每次进页面都搜。围绕一个搜索 hook 和 `PinnedFilterSearchOptions` 写它，后者画出搜索框、搜到的条目（选中的打勾，名称旁边是编号或部门）以及滚到底时的更多条目：

```tsx
function DepartmentList({ selectedId, onPick }: PinnedFilterSearchListProps) {
  const [keyword, setKeyword] = useState("");
  const { departments, isLoading, paging } = useDepartmentSearch(keyword);
  return (
    <PinnedFilterSearchOptions
      entries={departments}
      isLoading={isLoading}
      paging={paging}
      selectedId={selectedId}
      onPick={onPick}
      onSearch={setKeyword}
      searchPlaceholder="Search departments..."
      emptyText="No departments found."
    />
  );
}

export function DepartmentFilter({ value, onChange, label, active, onReset }: PinnedFilterControlProps<ModelReference | null>) {
  return <PinnedFilterSearch label={label} value={value} onChange={onChange} active={active} onReset={onReset} anyText="All departments" list={DepartmentList} />;
}
```

条目的形状与目录选择器和模型名称搜索一致（`value`、`label`、`hint`、`inactive`），所以 `usePeopleSearch`、`useDepartmentSearch` 和模型名称搜索的 options 可以原样传入。在 `ModelTable` 里，`<PinnedFilter fieldName="departmentId" defaultValue={null} control={DepartmentFilter} />` 用引用的 id 与字段比较。

### 日期范围

`DateRangeFilter` 的弹层里是两个日期。每个日历把会让 From 晚于 To 的日期置灰；仍然出现这种范围时，在输入框下方提示且不生效，列表保留上一个有效范围。它的条件是 `dateRangeCondition(field, range)`：只有 From 时 `>=`，只有 To 时 `<=`，两端都有时 `BETWEEN`，都没有时不加条件 —— 日期为空的行不满足其中任何一个。

```tsx
<PinnedFilter
  id="effectiveDate"
  label="Effective"
  control={DateRangeFilter}
  defaultValue={EMPTY_DATE_RANGE}
  toFilter={(range) => dateRangeCondition("effectiveDate", range)}
/>
```

范围无效时它保留自己的草稿，重新挂载时从已生效的范围重新开始：`ModelTable` 在固定筛选的 × 或 Clear all 把它恢复默认时会重新挂载控件。自己管理状态的列表在重置时给控件换一个新的 `key`，效果相同。

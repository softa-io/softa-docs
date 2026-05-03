# ModelBoard

可组合的看板 / 多列泳道视图，具备：

- 通过 `RecordContext` 以元数据驱动卡片渲染（委托给 `ModelCardItem`）
- **一次主查询** + **客户端分组**
- 每列计数 + 每列「加载更多」
- **两种列来源模式**：静态枚举字段，或从另一模型动态查找
- 与 `ModelCard` 共用的复合组件插槽系统（Header / 正文 / Footer / Action）

## 相关文档

- [ModelCard](./card) — 卡片栅格视图（共享卡片项渲染、插槽布局、动作系统）
- [ModelTable](./table) — 表格视图；通过 `<Tabs>` 将 Board 与 Table 搭配，为高级用户提供表格回退

## 快速开始 — 枚举形态（静态列）

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export default function VersionsPage() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
      orders={["updatedTime", "DESC"]}
      groupBy={{
        type: "enum",
        field: "status",
        columns: [
          { value: "Draft", label: "Draft" },
          { value: "Sealed", label: "Sealed" },
          { value: "Frozen", label: "Frozen" },
        ],
      }}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
        <Field fieldName="versionType" />
      </ModelBoard.Header>
      <Field fieldName="sealedTime" />
    </ModelBoard>
  );
}
```

每一列对应 `groupBy.columns` 中的一项 `value`。若记录的
`groupBy.field` 取值不在列出值中，则丢弃。

## 快速开始 — 查找形态（动态列）

```tsx
<ModelBoard
  modelName="DesignDeployment"
  initialParams={{ filters: ["appId", "=", appId] }}
  orders={["createdTime", "DESC"]}
  groupBy={{
    type: "lookup",
    sourceModel: "DesignAppEnv",
    sourceFilters: [["appId", "=", appId], "AND", ["active", "=", true]],
    sourceOrders: ["sequence", "ASC"],
    columnIdField: "id",         // env.id → 列 id
    columnLabelField: "name",    // env.name → 列标题
    cardFilterField: "envId",    // deployment.envId → 所属列
    columnHeaderRender: (env) => <EnvColumnHeader env={env} />,
  }}
>
  <ModelBoard.Header>
    <Field fieldName="targetVersionId" />
    <Field fieldName="deployStatus" />
  </ModelBoard.Header>
  <Field fieldName="startedTime" />
</ModelBoard>
```

看板先查 `sourceModel` 得到列，再执行主查询。
每列的过滤条件为 `[cardFilterField, "=", columnId]`。

## 数据流

1. 解析列：
   - **enum**：由 props 同步得到。
   - **lookup**：通过 `searchList` 拉取 `sourceModel`（`limitSize = 200`），每条映射为一列。
2. **主批量查询**（`searchList`，单次调用）：`limitSize = initialFetchSize`（默认 100），filters/orders 来自 props 与搜索词。无分页——批量读出后在客户端分组。
3. **内存分组**：主批次每条记录落入 `matches` 为真的那一列。
4. **按列计数**（总计一次调用）：单次 `count` 且 `groupBy: [groupByField]`，一次性返回各列数量。看板兼容行数组或记录映射两种响应形状。
5. **加载更多**（`searchPage`，按需）：当某列 `count > 已渲染` 时出现「加载更多」按钮。点击后对该列发起分页 `searchPage`，起始位置紧接主批次边界（`floor(baseInColumn / loadMorePageSize) + 1`）。结果在主批次与历次扩展去重（按 id）后追加。

## 插槽系统

`ModelBoard.Header`、作为顶层正文的子节点、`ModelBoard.Footer` 与 `Action` 的用法与 `ModelCard` 相同。详见 [ModelCard 文档](./card#卡片插槽声明)。简言之：

| 定义位置 | 渲染位置 | 等效 placement |
| ---------------------------- | ----------------------------------------- | ------------------- |
| `ModelBoard.Header` 内 | CardHeader 右侧，始终可见 | `"header"` |
| 顶层正文子节点 | CardContent 右侧 | `"inline"` |
| 任一处且 `placement="more"` | `...` 下拉（与「删除」合并） | `"more"` |

按记录条件过滤 `Action`（`hidden`、`disabled`）的方式与 `ModelCard` / `ModelTable` 相同。

## 点击导航

点击导航限制在当前路由子树内：

1. `linkTo="x"`（或由 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录的 `[id]/page.tsx`）

有意不支持自由形式的点击处理与跨路由 URL，
从而保证每条记录点击仍落在当前路由的权限范围内。

## 与 Table 视图搭配

`ModelBoard` 不包含内建的视图切换。若页面需要「看板 / 表格」切换，请用 `<Tabs>` 同时包裹两种视图：

```tsx
<Tabs defaultValue="board">
  <TabsList>
    <TabsTrigger value="board">Board</TabsTrigger>
    <TabsTrigger value="table">Table</TabsTrigger>
  </TabsList>
  <TabsContent value="board">
    <ModelBoard {...props} />
  </TabsContent>
  <TabsContent value="table">
    <ModelTable {...sameQueryProps} />
  </TabsContent>
</Tabs>
```

## 核心 Props

| Prop               | Type                                                         | 必填 | 默认 | 说明                                                                                              |
| ------------------ | ------------------------------------------------------------ | -------- | ------- | -------------------------------------------------------------------------------------------------- |
| `modelName`        | `string`                                                     | 是      | -       | 元数据与数据 API 使用的模型名。                                                              |
| `groupBy`          | `EnumGroupBy \| LookupGroupBy`                               | 是      | -       | 列来源。                                                                                     |
| `labelName`        | `string`                                                     | 否       | -       | 页面标题；默认 `metaModel.labelName`。                                                     |
| `description`      | `string`                                                     | 否       | -       | 副标题；默认 `metaModel.description`。                                                     |
| `orders`           | `OrderCondition`                                             | 否       | -       | 推荐默认排序；高于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。   |
| `filters`          | `FilterCondition`                                            | 否       | -       | 推荐基础筛选；高于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区、运行时筛选以 AND 合并。见 [优先级说明](./multi-view#filter--order-precedence)。 |
| `initialParams`    | `QueryParamsWithoutFields`                                   | 否       | -       | 高级查询参数。`pageSize` 与 `fields` 由内部管理；`filters` / `orders` 建议用顶层 props。 |
| `enableCreate`     | `boolean`                                                    | 否       | `true`  | 工具栏显示新建按钮。                                                                     |
| `enableDelete`     | `boolean`                                                    | 否       | `false` | 每张卡片显示 `...` 删除动作。                                                             |
| `initialFetchSize` | `number`                                                     | 否       | `100`   | 主查询 `pageSize`。记录在客户端分组。                                            |
| `loadMorePageSize` | `number`                                                     | 否       | `20`    | 「加载更多」请求的每页大小。                                                                |
| `disableLoadMore`  | `boolean`                                                    | 否       | `false` | 即便 `count > 已渲染` 也隐藏每列「加载更多」按钮。适用于后端无法按 `cardFilterField` 分页的情形；列计数仍反映真实总数。 |
| `enableDragDrop`   | `boolean`                                                    | 否       | `false` | 启用列间拖拽改派。见 [拖拽跨列改派](#拖拽跨列改派)。 |
| `onCardMove`       | `(ctx: CardMoveContext) => void \| Promise<void>`            | 否       | -       | 将卡片拖到其他列时触发的自定义移动处理；提供时替代默认的 `updateOne`。 |
| `linkTo`           | `string`                                                     | 否       | -       | 点击导航用的单子目录名（单一路径段）。跳转到 `${pathname}/${linkTo}/${id}?mode=read`。省略则为默认 `${pathname}/{id}?mode=read`。 |
| `sidecars`         | `SidecarConfig[]`                                            | 否       | -       | 按主键 id 关联合并到每张卡片上的附属记录。工具栏会增加刷新按钮，用于使主查询及每个 sidecar 模型的查询失效。见 [ModelSidecar](../components/model-sidecar)。 |
| `children`         | `ReactNode`                                                  | 否       | -       | `ModelBoard.Header`、`Field` / 任意节点、`ModelBoard.Footer`、`Action` 等。                   |

## 何时选用 Board、Card 与 Table

| 视图      | 最适合                                                  |
| --------- | --------------------------------------------------------- |
| Table     | 大量记录、高级用户、批量操作、导出。     |
| Card      | 视觉突出的列表，没有明显的分组维度。     |
| **Board** | 记录有离散分组维度（状态、环境、负责人、标签等），希望按泳道一眼看清分布。 |

## 拖拽跨列改派

设置 `enableDragDrop` 后，可在列间拖拽卡片。默认在放下时看板会调用：

```ts
modelService.updateOne(modelName, { id, ...toColumn.movePatch })
```

其中 `movePatch` 将记录改写到目标列：

- 枚举形态：`{ [groupBy.field]: column.value }` — 选项集的 code 字符串
- 查找形态：`{ [cardFilterField]: column.id }` — 新的 lookup 目标 id

业务上需要服务端校验时（例如版本状态机 `Draft → Sealed`），请改用自定义 `onCardMove`：

```tsx
<ModelBoard
  modelName="DesignAppVersion"
  enableDragDrop
  onCardMove={async ({ recordId, toColumnId, fromColumnId }) => {
    // 将 Draft→Sealed 映射为 sealVersion 操作
    if (fromColumnId === "Draft" && toColumnId === "Sealed") {
      await actionDispatcher.run("sealVersion", recordId);
      return;
    }
    throw new Error(`Move from ${fromColumnId} to ${toColumnId} is not allowed`);
  }}
  groupBy={{ ... }}
>
  ...
</ModelBoard>
```

移动成功后，看板会使 `[modelName, ...]` 下的查询失效，
从而重新拉取主列表、分组计数以及各列的扩展数据。

## 限制（v1）

- 工具栏无筛选 / 排序对话框（上述能力请使用成对的 `ModelTable` 视图）。
- 无标签页或侧栏筛选。
- Lookup 源一次性拉取 `limitSize = 200`；不分页。候选列超过 200 时请在 `sourceFilters` 中预缩。
- 分组计数假定后端遵循 `count({ filters, groupBy: [field] })` 语义，并返回 `{value: count}` 形式的映射或 `[{field: value, count: N}, ...]` 形式的行。

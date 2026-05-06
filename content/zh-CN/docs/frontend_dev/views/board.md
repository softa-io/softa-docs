# ModelBoard

可组合的看板 / 多列泳道视图，具备：

- 通过 `RecordContext` 以元数据驱动卡片渲染（委托给 `ModelCardItem`）
- **一次主查询** + **客户端分组**
- 每列计数 + 每列「加载更多」
- **元数据驱动的列来源**：`Option` 字段 → 选项集；`ManyToOne` / `OneToOne` 字段 → 关联模型
- 与 `ModelCard` 共用的复合组件插槽系统（Header / 正文 / Footer / Action）

## 相关文档

- [ModelCard](./card) — 卡片栅格视图（共享卡片项渲染、插槽布局、动作系统）
- [ModelTable](./table) — 表格视图；通过 `<Tabs>` 将 Board 与 Table 搭配，为高级用户提供表格回退

## 快速开始

`groupBy` 唯一必填的是 `field` —— 即看板按其分组的记录字段。看板会读取该字段的元数据，决定列从何而来。

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export default function VersionsPage() {
  return (
    <ModelBoard
      modelName="DesignAppVersion"
      orders={["updatedTime", "DESC"]}
      groupBy={{ field: "status" }}
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

`status` 为 `Option` 字段时，看板会拉取其选项集，并按选项集自身顺序为每个选项渲染一列。

## 字段元数据决定列来源

| `metaField.fieldType`       | 列来源                                     | 列 id           | 列标题                                        | 匹配谓词                                       |
| --------------------------- | ------------------------------------------ | --------------- | --------------------------------------------- | ---------------------------------------------- |
| `Option`                    | `useOptionSet(metaField.optionSetCode)`    | `item.itemCode` | `item.itemName`                               | `getOptionCode(record[field]) === itemCode`    |
| `ManyToOne` / `OneToOne`    | `searchList(metaField.relatedModel)`       | `record.id`     | `record[metaField.relatedField ?? "name"]`    | `getModelRefId(record[field]) === id`          |
| 其他类型                    | 渲染时抛错。传入 `groupBy.columns` 可绕过。 | —               | —                                             | —                                              |

`groupBy.sourceFilters` 会覆盖查找模式下的 `metaField.filters`。当前工作区筛选始终与之 AND 合并，以保证来源限定在当前应用/组合范围内。

## 查找模式示例与自定义列头

```tsx
<ModelBoard
  modelName="DesignDeployment"
  orders={["createdTime", "DESC"]}
  groupBy={{
    field: "envId",
    sourceFilters: ["active", "=", true],
    sourceOrders: ["sequence", "ASC"],
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

`envId` 是指向 `DesignAppEnv` 的 `ManyToOne`；看板会拉取关联环境记录，每个环境一列。`columnHeaderRender` 会收到来源记录（Option 模式下为选项项）。

## 数据流

1. 解析元数据：`useMetadataQuery(modelName)` → 查找 `groupBy.field` 对应的 `metaField`。
2. 按字段元数据解析列：
   - **Option**：通过 `useOptionSet` 拉取选项集。条目顺序与选项集一致。
   - **查找**：通过 `searchList` 拉取关联模型记录（`limitSize = 200`）。
3. **主批量查询**（`searchList`，单次调用）：`limitSize = initialFetchSize`（默认 100），filters/orders 来自 props 与搜索词。无分页 —— 批量读出后在客户端分组。在列就绪后才发起。
4. **内存分组**：主批次每条记录落入 `matches` 为真的那一列。
5. **按列计数**（总计一次调用）：单次 `count` 且 `groupBy: [field]`，一次性返回各列数量。看板兼容行数组或记录映射两种响应形状。
6. **加载更多**（`searchPage`，按需）：当某列 `count > 已渲染` 时出现「加载更多」按钮。点击后对该列发起分页 `searchPage`，起始位置紧接主批次边界（`floor(baseInColumn / loadMorePageSize) + 1`）。结果在与主批次及历次扩展按 id 去重后追加。

## 插槽系统

`ModelBoard.Header`、顶层正文子节点、`ModelBoard.Footer` 与 `Action` 的用法与 `ModelCard` 相同。详见 [ModelCard 文档](./card#卡片插槽声明)。简言之：

| 定义位置                     | 渲染位置                              | 等效 placement |
| ---------------------------- | ------------------------------------- | -------------- |
| `ModelBoard.Header` 内       | CardHeader 右侧，始终可见             | `"header"`     |
| 顶层正文子节点               | CardContent 右侧                      | `"inline"`     |
| 任一处且 `placement="more"`  | `...` 下拉（与「删除」合并）          | `"more"`       |

按记录条件过滤 `Action`（`hidden`、`disabled`）的方式与 `ModelCard` / `ModelTable` 相同。

## 点击导航

点击导航限制在当前路由子树内：

1. `linkTo="x"`（或由 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录的 `[id]/page.tsx`）

有意不支持自由形式的点击处理与跨路由 URL，从而保证每条记录点击仍落在当前路由的权限范围内。

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
| ------------------ | ------------------------------------------------------------ | ---- | ---- | ------------------------------------------------------------------------------------------------- |
| `modelName`        | `string`                                                     | 是   | -    | 元数据与数据 API 使用的模型名。                                                                   |
| `groupBy`          | `ModelBoardGroupBy`                                          | 是   | -    | 至少 `{ field }`。详见 [字段元数据决定列来源](#字段元数据决定列来源)。                          |
| `labelName`        | `string`                                                     | 否   | -    | 页面标题；默认 `metaModel.labelName`。                                                            |
| `description`      | `string`                                                     | 否   | -    | 副标题；默认 `metaModel.description`。                                                          |
| `orders`           | `OrderCondition`                                             | 否   | -    | 推荐默认排序；高于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。                   |
| `filters`          | `FilterCondition`                                            | 否   | -    | 推荐基础筛选；高于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区、运行时筛选以 AND 合并。见 [优先级说明](./multi-view#filter--order-precedence)。 |
| `initialParams`    | `QueryParamsWithoutFields`                                   | 否   | -    | 高级查询参数。`pageSize` 与 `fields` 由内部管理；`filters` / `orders` 建议用顶层 props。           |
| `enableCreate`     | `boolean`                                                    | 否   | `true`  | 工具栏显示新建按钮。                                                                           |
| `enableDelete`     | `boolean`                                                    | 否   | `false` | 每张卡片显示 `...` 删除动作。                                                                  |
| `initialFetchSize` | `number`                                                     | 否   | `100`   | 主查询 `pageSize`。记录在客户端分组。                                                          |
| `loadMorePageSize` | `number`                                                     | 否   | `20`    | 「加载更多」请求的每页大小。                                                                   |
| `disableLoadMore`  | `boolean`                                                    | 否   | `false` | 即便 `count > 已渲染` 也隐藏每列「加载更多」。适用于后端无法按 `groupBy.field` 分页时；列计数仍反映真实总数。 |
| `enableDragDrop`   | `boolean`                                                    | 否   | `false` | 启用列间拖拽改派。见 [拖拽跨列改派](#拖拽跨列改派)。                                           |
| `onCardMove`       | `(ctx: CardMoveContext) => void \| Promise<void>`            | 否   | -       | 将卡片拖到其他列时的自定义移动处理；提供时替代默认的 `updateOne`。                             |
| `linkTo`           | `string`                                                     | 否   | -       | 点击导航用的单子目录名（单一路径段）。跳转到 `${pathname}/${linkTo}/${id}?mode=read`。省略则为默认 `${pathname}/${id}?mode=read`。 |
| `sidecars`         | `SidecarConfig[]`                                            | 否   | -       | 按主键 id 关联合并到每张卡片上的附属记录。工具栏会增加刷新按钮，用于使主查询及每个 sidecar 模型的查询失效。见 [ModelSidecar](../components/model-sidecar)。 |
| `children`         | `ReactNode`                                                  | 否   | -       | `ModelBoard.Header`、`Field` / 任意节点、`ModelBoard.Footer`、`Action` 等。                      |

## `groupBy` 相关 Props

| Prop                 | Type                                             | 必填 | 默认                         | 说明 |
| -------------------- | ------------------------------------------------ | ---- | ---------------------------- | ---- |
| `field`              | `string`                                         | 是   | -                            | 用于分组的记录字段；其元数据决定列来源。 |
| `sourceFilters`      | `FilterCondition`                                | 否   | 若有则为 `metaField.filters` | 仅查找模式。与工作区筛选 AND 合并。 |
| `sourceOrders`       | `OrderCondition`                                 | 否   | -                            | 仅查找模式。Option 模式沿用选项集顺序。 |
| `columns`            | `{ value, label }[]`                             | 否   | 由元数据推导                 | 绕过元数据解析；用于收窄或改列标题。 |
| `columnHeaderRender` | `(source: Record<string, unknown>) => ReactNode` | 否   | -                            | 收到 Option 模式下的选项项或查找模式下的来源记录。显式传入 `columns` 时不调用。 |

## 何时选用 Board、Card 与 Table

| 视图      | 最适合                                                      |
| --------- | ----------------------------------------------------------- |
| Table     | 大量记录、高级用户、批量操作、导出。                        |
| Card      | 视觉突出的列表，没有明显的分组维度。                        |
| **Board** | 记录有离散分组维度（状态、环境、负责人、标签等），希望按泳道一眼看清分布。 |

## 拖拽跨列改派

设置 `enableDragDrop` 后，可在列间拖拽卡片。默认在放下时看板会调用：

```ts
modelService.updateOne(modelName, { id, [groupBy.field]: column.id })
```

`column.id` 在 Option 模式下为选项的 `itemCode`，在查找模式下为关联记录的主键。

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
  groupBy={{ field: "status" }}
>
  ...
</ModelBoard>
```

移动成功后，看板会使 `[modelName, ...]` 下的查询失效，从而重新拉取主列表、分组计数以及各列的扩展数据。

## 限制（v1）

- 工具栏无筛选 / 排序对话框（请使用成对的 `ModelTable` 视图）。
- 无标签页或侧栏筛选。
- 查找来源一次性拉取 `limitSize = 200`；不分页。候选列超过 200 时，请通过 `groupBy.sourceFilters` 收窄。
- 分组计数假定后端支持 `count({ filters, groupBy: [field] })`，并返回 `{value: count}` 形式的映射或 `[{field: value, count: N}, ...]` 形式的行。

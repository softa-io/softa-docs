# ModelBoard

可组合的看板 / 多列泳道视图，具备：

- 通过 `RecordContext` 以元数据驱动卡片渲染（委托给 `ModelCardItem`）
- **一次主查询** + **客户端分组**
- 每列计数 + 每列「加载更多」
- **两种列来源模式**：静态枚举字段，或从另一模型动态查找
- 与 `ModelCard` 共用的复合组件插槽系统（Header / 正文 / Footer / Action）

## 相关文档

- [ModelCard](./card) — 卡片栅格视图（共享卡片项渲染、插槽布局、动作系统）
- [ModelTable](./table) — 表格视图；可用 `<Tabs>` 与 Board 搭配，给高级用户表格回退

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
        <Field fieldName="versionType" widgetType="Badge" />
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
    columnLabelField: "name",    // env.name → 列标题文案
    cardFilterField: "envId",    // deployment.envId → 归属列
    columnHeaderRender: (env) => <EnvColumnHeader env={env} />,
  }}
>
  <ModelBoard.Header>
    <Field fieldName="targetVersionId" />
    <Field fieldName="deployStatus" widgetType="Badge" />
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

`ModelBoard.Header`、顶层正文子节点、`ModelBoard.Footer` 与 `Action`
的规则与 `ModelCard` 相同。完整说明见 [ModelCard 文档](./card#卡片插槽声明)。简表：

| 声明位置 | 渲染位置 | 等效 placement |
| ---------------------------- | ----------------------------------------- | ------------------- |
| `ModelBoard.Header` 内 | CardHeader 右侧，始终可见 | `"header"` |
| 顶层正文子节点 | CardContent 右侧 | `"inline"` |
| 任一处且 `placement="more"` | `...` 下拉（与删除合并） | `"more"` |

按记录条件过滤 `Action`（`hidden`、`disabled`）与 `ModelCard` / `ModelTable` 相同。

## 点击导航

点击导航限制在当前路由子树内：

1. `linkTo="x"`（或由 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录的 `[id]/page.tsx`）

不支持自定义点击处理与跨路由 URL，
以保证每条记录点击仍在当前路由的权限范围内。

## 与 Table 视图搭配

`ModelBoard` 无内建视图切换。需要「看板 / 表格」切换的页面可用 `<Tabs>` 包裹：

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
| `orders`           | `OrderCondition`                                             | 否       | -       | 推荐默认排序。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。   |
| `filters`          | `FilterCondition`                                            | 否       | -       | 推荐基础过滤。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区/运行时 filters 做 AND 合并。见 [优先级](./multi-view#filter--order-precedence)。 |
| `initialParams`    | `QueryParamsWithoutFields`                                   | 否       | -       | 高级查询参数。`pageSize` 与 `fields` 由内部管理；`filters` / `orders` 建议用顶层 props。 |
| `enableCreate`     | `boolean`                                                    | 否       | `true`  | 工具栏显示新建按钮。                                                                     |
| `enableDelete`     | `boolean`                                                    | 否       | `false` | 每张卡片显示 `...` 删除动作。                                                             |
| `initialFetchSize` | `number`                                                     | 否       | `100`   | 主查询 `pageSize`。记录在客户端分组。                                            |
| `loadMorePageSize` | `number`                                                     | 否       | `20`    | 「加载更多」请求的每页大小。                                                                |
| `linkTo`           | `string`                                                     | 否       | -       | 点击导航的单段子目录名。跳转到 `${pathname}/${linkTo}/${id}?mode=read`。省略则为 `${pathname}/${id}?mode=read`。 |
| `children`         | `ReactNode`                                                  | 否       | -       | `ModelBoard.Header`、`Field` 等节点、`ModelBoard.Footer`、`Action`。                   |

## Board vs Card vs Table

| 视图      | 最适合                                                  |
| --------- | --------------------------------------------------------- |
| Table     | 大量记录、高级用户批量操作、导出。     |
| Card      | 视觉丰富的列表，无强分组维度。     |
| **Board** | 记录有离散分组维度（状态、环境、负责人、标签），需要泳道式一览。 |

## 拖拽跨列改派

设置 `enableDragDrop` 可在列间拖拽卡片。默认在放下时看板会调用：

```ts
modelService.updateOne(modelName, { id, ...toColumn.movePatch })
```

其中 `movePatch` 将记录路由到新列：

- 枚举形态：`{ [groupBy.field]: column.value }` — 选项集 code 字符串
- 查找形态：`{ [cardFilterField]: column.id }` — 新关联目标 id

若业务需服务端校验（例如版本状态机 `Draft → Sealed`），请改用自定义 `onCardMove`：

```tsx
<ModelBoard
  modelName="DesignAppVersion"
  enableDragDrop
  onCardMove={async ({ recordId, toColumnId, fromColumnId }) => {
    // 将 Draft→Sealed 译为 sealVersion 操作
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
主列表、分组计数与各列扩展都会重新拉取。

## 限制（v1）

- 工具栏无筛选 / 排序对话框（可与成对的 `ModelTable` 视图配合）。
- 无标签页或侧栏筛选。
- Lookup 源一次性拉取 `limitSize = 200`；不分页。候选列超过 200 时请在 `sourceFilters` 中预缩。
- 分组计数假定后端支持 `count({ filters, groupBy: [field] })`，并返回 `{value: count}` 映射或 `[{field: value, count: N}, ...]` 行。

# ModelBoard

可组合的看板 / 多列视图，具备：

- 通过 `RecordContext` 元数据驱动卡片渲染（委托给 `ModelCardItem`）
- 单次主查询 + **客户端分组**
- 每列计数 + 每列「加载更多」
- **元数据驱动列来源**：`Option` 字段 → 选项集；`ManyToOne` / `OneToOne` 字段 → 关联模型
- 与 `ModelCard` 共用的复合组件插槽系统（Header / 主体 / Footer / Action）

## 相关文档

- [ModelCard](./card) — 卡片网格视图（共用卡片项渲染、插槽布局、操作系统）
- [ModelTable](./table) — 表格视图；可与 `<Tabs>` 配对看板，供高级用户回退

## 快速开始

`groupBy` 唯一必填字段是 `field`——用于分组的记录字段。看板读取其元数据以决定列来源。

```tsx
import { Field } from "@/components/fields";
import { ModelBoard } from "@/components/views/board";

export default function EnvironmentsPage() {
  return (
    <ModelBoard
      modelName="DesignAppEnv"
      orders={["sequence", "ASC"]}
      groupBy={{ field: "envType" }}
    >
      <ModelBoard.Header>
        <Field fieldName="name" />
        <Field fieldName="envStatus" />
      </ModelBoard.Header>
      <Field fieldName="connectorType" />
    </ModelBoard>
  );
}
```

`envType` 为 `Option` 字段，看板会拉取对应选项集，按选项集自身顺序每选项一列渲染。

## 字段元数据驱动列来源

| `metaField.fieldType`       | 列来源                                     | 列 id          | 列标签                                  | 匹配谓词                                |
| --------------------------- | ------------------------------------------------- | ------------------ | --------------------------------------------- | ---------------------------------------------- |
| `Option`                    | `useOptionSet(metaField.optionSetCode)`           | `item.itemCode`    | `item.label`                               | `getOptionCode(record[field]) === itemCode`    |
| `ManyToOne` / `OneToOne`    | `searchList(metaField.relatedModel)`              | `record.id`        | `record[metaField.relatedField ?? "name"]`    | `getModelRefId(record[field]) === id`          |
| 其他               | 渲染时抛错。传 `groupBy.columns` 可退出。 | —              | —                                             | —                                              |

`groupBy.sourceFilters` 覆盖查找模式下的 `metaField.filters`。当前工作区过滤始终 AND 合并，将来源限定在当前应用。

## 查找模式示例与自定义列头

```tsx
<ModelBoard
  modelName="DesignActivity"
  orders={["createdTime", "DESC"]}
  groupBy={{
    field: "envId",
    sourceFilters: ["active", "=", true],
    sourceOrders: ["sequence", "ASC"],
    columnHeaderRender: (env) => <EnvColumnHeader env={env} />,
  }}
>
  <ModelBoard.Header>
    <Field fieldName="kind" />
    <Field fieldName="status" />
  </ModelBoard.Header>
  <Field fieldName="startedTime" />
</ModelBoard>
```

`envId` 为指向 `DesignAppEnv` 的 `ManyToOne`；看板拉取关联环境，每个环境一列。`columnHeaderRender` 接收源记录（Option 模式下为选项项）。

## 数据流

1. 解析元数据：`useMetadataQuery(modelName)` → 查找 `groupBy.field` 的 `metaField`。
2. 根据字段元数据解析列：
   - **Option**：通过 `useOptionSet` 拉取选项集。项按选项集自身顺序返回。
   - **Lookup**：通过 `searchList` 拉取关联模型记录（`limitSize = 200`）。
3. **主批量拉取**（`searchList`，一次调用）：`limitSize = initialFetchSize`（默认 100），过滤/排序来自 props 加搜索词。无分页——为客户端分组做批量读取。在列就绪后才会执行。
4. **内存分组**：主批次每条记录落入 `matches` 谓词为真的列。
5. **每列计数**（总共一次调用）：单次 `count` 调用 `groupBy: [field]` 一次返回各列计数。看板解析数组行或记录映射两种响应形态。
6. **加载更多**（`searchPage`，按需）：当某列 `count > rendered` 时出现「加载更多」按钮。点击对该列发起分页 `searchPage`，从主批次边界之后开始（`floor(baseInColumn / loadMorePageSize) + 1`）。追加记录前会对主批次与先前展开按 id 去重。

## 卡片主体中的级联字段

主体插槽接受点号记法的 `<Field>` 声明，将关联记录字段拉到每张卡片上：

```tsx
<ModelBoard modelName="AppEnv" groupBy={{ field: "envType" }}>
  <Field fieldName="name" />
  <Field fieldName="lastActivityId.status" widgetType="StatusIcon" />
  <Field fieldName="lastActivityId.finishedTime" widgetType="Relative" />
</ModelBoard>
```

看板遍历器收集顶层声明的每条级联路径，每个看板挂载时调用一次 `POST /metadata/resolveCascadedPaths`，将匹配的 SubQuery 折叠进批量 `searchList` 请求，并向 `<Field>` 暴露解析结果用于展示。嵌套在自定义函数组件（如主体内的子组件）中的级联路径对遍历器**不可见**——请在顶层声明。完整参考：[级联字段路径](../fields/fields#cascaded-field-path-display)。

## 插槽系统

`ModelBoard.Header`、顶层主体子节点、`ModelBoard.Footer` 与 `Action` 元素遵循与 `ModelCard` 相同规则。详见 [ModelCard README](./card#card-slot-declaration)。简要如下：

| 定义位置                | 渲染位置                                | 有效 placement |
| ---------------------------- | ----------------------------------------- | ------------------- |
| `ModelBoard.Header` 内   | CardHeader 右侧，始终可见     | `"header"`          |
| 顶层主体子节点         | CardContent 右侧                    | `"inline"`          |
| 任一处，且 `placement="more"` | `...` 下拉（与删除合并）    | `"more"`            |

按记录条件过滤 `Action`（`hidden`、`disabled`）与 `ModelCard` / `ModelTable` 相同。

## 点击导航

点击导航限定在当前路由子树内：

1. `linkTo="x"`（或从 `<MultiView.Tab>` 继承）→ `${pathname}/x/{id}?mode=read`
2. 默认 — `${pathname}/{id}?mode=read`（当前目录的 `[id]/page.tsx`）

有意不支持自由点击处理器与跨路由 URL。这使每条记录点击都落在当前路由的权限范围内。

## 与表格视图配对

`ModelBoard` 无内置视图切换。需要「看板 / 表格」切换的页面用 `<Tabs>` 包裹两种视图：

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

## 核心属性

| 属性               | 类型                                                         | 必填 | 默认值 | 说明                                                                                              |
| ------------------ | ------------------------------------------------------------ | -------- | ------- | -------------------------------------------------------------------------------------------------- |
| `modelName`        | `string`                                                     | 是      | -       | 元数据与数据 API 的模型名。                                                              |
| `groupBy`          | `ModelBoardGroupBy`                                          | 是      | -       | 至少 `{ field }`。见 [字段元数据驱动列来源](#字段元数据驱动列来源)。 |
| `label`        | `string`                                                     | 否       | -       | 页面标题；默认为 `metaModel.label`。                                                     |
| `description`      | `string`                                                     | 否       | -       | 副标题；默认为 `metaModel.description`。                                                     |
| `orders`           | `OrderCondition`                                             | 否       | -       | 推荐默认排序。优先于 `initialParams.orders` 与 `MultiView.Tab.orders`（上下文）。   |
| `filters`          | `FilterCondition`                                            | 否       | -       | 推荐基础过滤。优先于 `initialParams.filters` 与 `MultiView.Tab.filters`（上下文）。与工作区/运行时过滤 AND 合并。见 [precedence](./multi-view#filter--order-precedence)。 |
| `initialParams`    | `QueryParamsWithoutFields`                                   | 否       | -       | 高级查询参数。`pageSize` 与 `fields` 内部管理；`filters` / `orders` 优先用顶层属性。 |
| `enableCreate`     | `boolean`                                                    | 否       | `true`  | 工具栏显示创建按钮。                                                                     |
| `enableColumnCreate` | `boolean`                                                  | 否       | `false` | 每列列头显示「+」按钮。导航至 `${pathname}/new?{groupBy.field}={column.id}`；接收表单预填该列值。见 [按列创建](#按列创建)。 |
| `enableDelete`     | `boolean`                                                    | 否       | `false` | 每张卡片显示 `...` 删除操作。                                                             |
| `initialFetchSize` | `number`                                                     | 否       | `100`   | 主查询 `pageSize`。记录在客户端分组。                                            |
| `loadMorePageSize` | `number`                                                     | 否       | `20`    | 「加载更多」请求的页大小。                                                                |
| `disableLoadMore`  | `boolean`                                                    | 否       | `false` | 即使 `count > rendered` 也隐藏每列「加载更多」。用于后端无法按 `groupBy.field` 分页时；列计数仍反映真实总数。 |
| `enableDragDrop`   | `boolean`                                                    | 否       | `false` | 启用列间拖放重分配。见 [拖放列重分配](#拖放列重分配)。 |
| `onCardMove`       | `(ctx: CardMoveContext) => void \| Promise<void>`            | 否       | -       | 卡片拖到不同列时调用，替代默认 `updateOne`。 |
| `linkTo`           | `string`                                                     | 否       | -       | 点击导航的子目录名（单段）。前往 `${pathname}/${linkTo}/${id}?mode=read`。省略则默认 `${pathname}/${id}?mode=read`。 |
| `sidecars`         | `SidecarConfig[]`                                            | 否       | -       | 按主 id 关联到每张卡片的辅助记录。工具栏增加刷新按钮，使主查询与各 sidecar 模型失效。见 [ModelSidecar](../components/model-sidecar)。 |
| `children`         | `ReactNode`                                                  | 否       | -       | `ModelBoard.Header`、`Field` / 任意节点、`ModelBoard.Footer`、`Action` 元素。                   |

## `groupBy` 属性

| 属性                  | 类型                                              | 必填 | 默认值                                | 说明 |
| --------------------- | ------------------------------------------------- | -------- | -------------------------------------- | ----- |
| `field`               | `string`                                          | 是      | -                                      | 用于分组的记录字段。其元数据决定列来源。 |
| `sourceFilters`       | `FilterCondition`                                 | 否       | 若有则 `metaField.filters`         | 仅查找模式。与工作区过滤 AND 合并。 |
| `sourceOrders`        | `OrderCondition`                                  | 否       | -                                      | 仅查找模式。Option 模式信任选项集自身顺序。 |
| `columns`             | `{ value, label }[]`                              | 否       | 由元数据推导                  | 绕过元数据驱动解析。用于收窄或重命名标签。 |
| `columnHeaderRender`  | `(source: Record<string, unknown>) => ReactNode`  | 否       | -                                      | 接收选项项（Option 模式）或源记录（查找模式）。显式传 `columns` 时不调用。 |

## 按列创建

设置 `enableColumnCreate` 可在每列列头显示「+」。点击导航至 `${pathname}/new?{groupBy.field}={column.id}`。`ModelForm` 在 new 模式路由读取 URL 查询参数，将匹配字段名合并进表单默认值：

| `metaField.fieldType`              | 查询字符串强制转换 |
| ---------------------------------- | -------------------------- |
| `String`, `Option`, `Date`, `DateTime`, `Time` | 原样字符串      |
| `Boolean`                          | `value === "true"`         |
| `Integer`, `Long`, `Double`, `BigDecimal` | `Number(value)`（NaN 则跳过） |
| `ManyToOne`, `OneToOne`            | `{ id: value }`（展示名由组件在需要时解析） |
| 其他                              | 忽略                    |

URL 参数优先于 `defaultValues` 与工作区默认值，显式点击「+ Dev」反映用户意图。编辑路由忽略搜索参数默认值——仅 new 模式生效。

目前为可选：状态机看板（通常拒绝自由移动）通常不需要每列「+」，除非列代表真正可创建的类别（环境类型、负责人等），否则保持 `enableColumnCreate` 默认 `false`。

## 何时用看板 vs 卡片 vs 表格

| 视图      | 最适合                                                  |
| --------- | --------------------------------------------------------- |
| 表格     | 大量记录、高级用户、批量操作、导出。     |
| 卡片      | 视觉丰富的列表，无强分组维度。     |
| **看板** | 记录有离散分组维度（状态、环境、负责人、标签等），需要泳道式一览状态。 |

## 拖放列重分配

设置 `enableDragDrop` 允许卡片在列间拖动。默认放下时看板调用：

```ts
modelService.updateOne(modelName, { id, [groupBy.field]: column.id })
```

`column.id` 为选项的 `itemCode`（Option 模式）或关联记录主键（查找模式）。

需要服务端校验的业务动作（如环境互斥转换 Stable → Deploying）可自定义 `onCardMove`：

```tsx
<ModelBoard
  modelName="DesignAppEnv"
  enableDragDrop
  onCardMove={async ({ recordId, toColumnId, fromColumnId }) => {
    // Publish only from Stable; refuse other moves
    if (fromColumnId === "Stable" && toColumnId === "Deploying") {
      await actionDispatcher.run("publish", recordId);
      return;
    }
    throw new Error(`Move from ${fromColumnId} to ${toColumnId} is not allowed`);
  }}
  groupBy={{ field: "envStatus" }}
>
  ...
</ModelBoard>
```

移动成功后看板使 `[modelName, ...]` 下查询失效，主列表、分组计数与各列展开均重新拉取。

## 限制（v1）

- 工具栏无过滤 / 排序对话框（与配对的 `ModelTable` 视图配合使用）。
- 无标签页或侧栏过滤。
- 查找来源一次拉取 `limitSize = 200`；无分页。候选列超过 200 时用 `groupBy.sourceFilters` 收窄。
- 分组计数假定后端支持 `count({ filters, groupBy: [field] })`，并返回 `{value: count}` 映射或 `[{field: value, count: N}, ...]` 行之一。

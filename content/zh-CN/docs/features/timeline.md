# 时间轴模型

时间轴模型（Timeline Model）用于按时间维度记录一条业务数据在不同时期的历史切片。它适合那些**依赖生效日期**的业务场景，例如组织架构、价格、报表口径等。对于同一个业务记录 `id`，可以存在多条切片记录，每条切片由 `sliceId` 标识，其有效期由 `effectiveStartDate` / `effectiveEndDate` 描述。

## 1. 时间轴模型元数据

### 1.1 模型级 Timeline 属性

- 当 `timeline = true` 时，表示该模型为时间轴模型，必须包含保留字段 `effectiveStartDate` 和 `effectiveEndDate`。系统会在启动时校验，如缺失则抛出异常。
- 当 `timeline = false` 时，表示普通模型，**不允许**定义 `effectiveStartDate` 与 `effectiveEndDate` 保留字段。

### 1.2 主键与关键字段

- `sliceId`：时间轴模型的物理主键，用于更新单个切片。
- `effectiveStartDate`：切片生效开始日期。
- `effectiveEndDate`：切片生效结束日期。
- `id`：逻辑（业务）主键，用于与非时间轴模型兼容。所有指向时间轴模型的业务外键都引用该字段。
- 如数据库需要用于变更日志的自增“记录号”（如 `record_id`），可以自行增加，不属于框架保留字段。
- 推荐的唯一约束：`(id, effectiveStartDate, effectiveEndDate)`。

### 1.3 元数据关联关系

- 时间轴模型之间可以通过 One2One、Many2One、One2Many、Many2Many 互相关联，存储与引用都基于逻辑主键 `id`。
- 当时间轴模型关联到非时间轴模型时，中间表同样存储时间轴模型的逻辑主键 `id`。
- 当非时间轴模型关联到时间轴模型时，Many2One/One2One 字段以及 Many2Many 连接表也统一存储时间轴模型的逻辑主键 `id`。
- 关联读取时，默认使用 `effectiveDate`（未指定时为当前日期）过滤时间轴数据，因此在当前日期下可能不存在有效切片。
- 在级联查询链路中（例如 时间轴模型 → 非时间轴模型 → 时间轴模型），需要将 `effectiveDate` 一路传递到链路末端，保证前后一致。

### 1.4 级联字段

- 级联字段基于 Many2One/One2One 关联。当关联模型是时间轴模型时，会使用 `Context.effectiveDate` 查询关联记录。

### 1.5 时间轴数据语义

- 每个切片必须具有 `effectiveStartDate` 与 `effectiveEndDate`，同一 `id` 下的切片期望在时间上**连续、不重叠**。
- 为简化查询，最后一个切片通常使用 `effectiveEndDate = 9999-12-31`。
- 在大多数场景下，业务只需设置 `effectiveStartDate`，系统会根据前后切片自动计算与填充 `effectiveEndDate`。
- 物理记录：每条切片是一条物理记录（由 `sliceId` 标识），任意生效区间的变化都会新增或更新切片，变更日志与物理记录绑定。
- 逻辑记录：同一 `id` 下的一组物理切片视为一条逻辑业务记录，业务外键始终指向逻辑 `id`，查询时根据请求的有效日期返回对应切片。

示例（同一部门逻辑 ID 的时间轴切片）：

| sliceId（物理） | id（逻辑） | 部门编码 | 部门名称 | effectiveStartDate | effectiveEndDate | Manager |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 6 | D001 | 产品研发部 | 2022-09-01 | 9999-12-31 | Joan |
| 2 | 6 | D001 | 研发部 | 2020-05-11 | 2022-08-31 | Tom |
| 1 | 6 | D001 | 研发部 | 2019-08-01 | 2020-05-10 | Mars |

## 2. 常见使用场景

### 2.1 生效日期的传递

- `effectiveDate` 是存放在 `Context` 中的 `LocalDate` 值，默认是当前日期。
- 查询某个日期下生效的数据：

  ```text
  effectiveStartDate <= effectiveDate && effectiveEndDate >= effectiveDate
  ```

- 按区间查询生效数据（`startDateValue` 和 `endDateValue` 均非空）：

  ```text
  effectiveStartDate <= endDateValue && effectiveEndDate >= startDateValue
  ```

- 查询某个业务记录的所有切片，可以使用 `acrossTimelineData()` 并配合 `id` 过滤（或在 Filters 中显式加入 `effectiveStartDate` / `effectiveEndDate`）。

- 邻接切片查询示例：

  ```text
  上一切片：id = {id} AND effective_end_date = {effectiveStartDate - 1}
  下一切片：id = {id} AND effective_start_date = {effectiveEndDate + 1}
  ```

### 2.2 读取 / 搜索 API

- `getById` / `getByIds` / `searchList` / `searchPage` 默认只返回在当前 `effectiveDate` 下生效的切片。
- 如需跨时间维度查询历史记录，可使用 `FlexQuery#acrossTimelineData()`，或在筛选条件中显式包含 `effectiveStartDate` / `effectiveEndDate`。
- 级联查询会自动传递 `effectiveDate` 到关联的时间轴模型。

### 2.3 创建接口

- 在 `createOne` / `createList` 中，如果未提供 `effectiveStartDate`，则默认使用当前 `effectiveDate`；如果未提供 `effectiveEndDate`，则默认使用 `9999-12-31`。
- 当为已有 `id` 再创建新切片时，系统会根据新的 `effectiveStartDate` 自动拆分或调整相邻切片。

### 2.4 更新接口

- 当前实现以 `sliceId` 作为更新主键。更新 `effectiveStartDate` 时，系统会自动修正前后相邻切片的 `effectiveEndDate`。
- 不推荐直接手动修改 `effectiveEndDate`。如果希望新增一个新生效期的切片，应当使用 `create`，传入已有的 `id` 和新的 `effectiveStartDate`。
- 如果上层需要支持“更正（correct）”类接口（对历史切片就地更正而不新增切片），通常需要通过 `sliceId` 精确定位；目前 ORM 未内置专门的 correct API。

### 2.5 删除接口

- `deleteById` / `deleteByIds`：删除某个业务 `id` 下的所有切片。
- `deleteBySliceId`：删除单个切片，并自动修正前后切片的时间范围。

### 2.6 时间轴关联查询规则

- 当关联对象是时间轴模型时，Many2One/One2One 的关联查询会在 `LEFT JOIN ON` 中自动附加：

  ```text
  effectiveStartDate <= effectiveDate AND effectiveEndDate >= effectiveDate
  ```

- One2Many / ManyToMany 的级联查询同样会基于 `effectiveDate` 过滤切片。

## 3. 示例

### 3.1 模型定义示例

```java
@Data
@Schema(name = "ProductPrice")
@EqualsAndHashCode(callSuper = true)
public class ProductPrice extends TimelineModel {
    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "业务 ID")
    private Long id;

    @Schema(description = "产品 ID")
    private Long productId;

    @Schema(description = "价格")
    private BigDecimal price;
}
```

### 3.2 查询当前生效与历史切片

```java
ContextHolder.getContext().setEffectiveDate(LocalDate.of(2025, 1, 1));

Filters filters = new Filters().eq("productId", 1001L);
List<Map<String, Object>> current = modelService.searchList("ProductPrice", new FlexQuery(filters));

FlexQuery historyQuery = new FlexQuery(new Filters().eq("id", 1L))
        .acrossTimelineData()
        .orderBy(Orders.ofAsc("effectiveStartDate"));
List<Map<String, Object>> history = modelService.searchList("ProductPrice", historyQuery);
```

## 4. 性能考虑

- 默认情况下，如果未显式指定 `effectiveStartDate`/`effectiveEndDate` 条件且未调用 `acrossTimelineData()`，查询不会跨时间维度扫描所有切片，这有助于降低扫描范围。
- 建议为 `effectiveStartDate` 与 `effectiveEndDate` 建立索引。

## 5. 仅需要“生效时间”而非时间轴的场景

有些模型只需要记录带生效时间的历史（例如人事变动、工作履历、教育经历等），但**并不需要**严格的时间轴语义（允许同一天多条记录、切片不连续等）。

在 Softa 中，`effectiveStartDate` / `effectiveEndDate` 被保留给时间轴模型使用。如果只需要“生效时间”而不希望启用时间轴语义，建议：

- 使用单独的历史模型或使用不同字段名称（避免使用保留字段名）；
- 将 `timeline = false`，避免被时间轴相关逻辑误处理。

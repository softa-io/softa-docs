# 字段元数据

> **另见**：若要通过 Java 实体字段上的注解声明这些属性，请参阅 [`@Field` 注解](../../backend_dev/model_dev/annotation#field--sysfield)。

字段元数据是关于模型字段的描述信息集合。它定义模型在业务场景中使用的字段，以及类型、长度、默认值、必填/只读约束、关联等。借助此元数据，Softa 可以一致地处理数据响应、处理与交互，并抽象通用需求以确保数据一致性、准确性与完整性。

## 1. 字段类型概览

| 序号 | 类型 | 类型名称 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | String | String | "" | 通过 `length` 配置最大字符串长度。 |
| 2 | Integer | Integer | 0 | 通过 `length` 配置整数位数。 |
| 3 | Long | Long | 0L |  |
| 4 | Double | Double | 0.00 | 通用小数（可接受精度损失）。 |
| 5 | BigDecimal | BigDecimal | "0" | 高精度小数（金额/货币/汇率等）。 |
| 6 | Boolean | Boolean | false |  |
| 7 | Date | Date |  | 格式 `yyyy-MM-dd`，如 `2026-02-01`。 |
| 8 | DateTime | DateTime |  | 格式 `yyyy-MM-dd HH:mm:ss`，如 `2026-02-01 12:15:20`。 |
| 9 | Option | 单选 |  |  |
| 10 | MultiOption | 多选 | [] |  |
| 11 | MultiString | 字符串列表 | [] |  |
| 12 | File | 单文件 |  | 虚拟字段：上传并绑定文件。 |
| 13 | MultiFile | 多文件 |  | 虚拟字段：上传并绑定多个文件。 |
| 14 | JSON | JSON |  | 以 JSON 字符串存储。 |
| 15 | Filters | Filters |  | 存储过滤条件（中缀表达式）。 |
| 16 | Orders | Orders |  | 存储多字段排序条件。 |
| 17 | OneToOne | 一对一 |  | 配置 `relatedModel`。 |
| 18 | ManyToOne | 多对一 |  | 配置 `relatedModel`。 |
| 19 | OneToMany | 一对多 |  | 虚拟字段：配置 `relatedModel` + `relatedField`。 |
| 20 | ManyToMany | 多对多 |  | 虚拟字段：配置 `relatedModel` + `joinModel` + `joinLeft` + `joinRight`。 |

> 说明：
> 1. 对于 OneToOne/ManyToOne/OneToMany/ManyToMany，外键为**逻辑**外键，非物理数据库外键。
> 2. 虚拟字段在当前表中不存在列。操作虚拟字段时，框架自动处理相关逻辑。

**需要额外说明的字段类型：**

### 1.1 `Date`

在代码中为 `LocalDate` 对象。显示格式为 `yyyy-MM-dd`，如 `2026-02-01`。

### 1.2 `DateTime`

精确到秒的日期时间类型。在代码中为 `LocalDateTime` 对象。在数据库中以 timestamp 存储。显示格式为 `yyyy-MM-dd HH:mm:ss`，如 `2026-02-01 12:15:20`。

### 1.3 `Option`

单选字段。必须配置 `optionSetCode` 属性（选项集编码）。注解声明的实体从枚举类型自动派生。

保存单选字段时，传入并存储的是选项条目编码。

通过 API 获取单选字段时，默认响应为 `OptionReference` 对象（`itemCode` + `label`，以及可选的 `itemTone` / `itemIcon`）。

选项集配置与用法见 [选项集](option) 章节。

### 1.4 `MultiOption`

多选字段允许从同一选项集中选择多个选项。保存时传入选项条目编码列表，数据库以 `,` 分隔存储编码。

通过 API 读取多选字段时，默认响应为 `OptionReference` 对象列表（`[{itemCode, label, ...}, ...]`）。

### 1.5 `MultiString`

用于在单个字段中存储多个字符串值。在代码中作为字符串列表处理；在数据库中以 `,` 分隔存储。

### 1.6 `File`

用于上传并绑定单个文件。文件自动存储在 `FileRecord` 模型中。

### 1.7 `MultiFile`

用于上传并绑定多个文件。文件自动存储在 `FileRecord` 模型中。

### 1.8 `JSON`

通常仅用于 JSON 存储与对象转换。若需对 JSON 数据索引或条件查询，须手动处理。

### 1.9 `Filters`

仅用于存储 `Filters` 对象的 JSON 字符串。

### 1.10 `Orders`

仅用于存储 `Orders` 对象的 JSON 字符串。

### 1.11 `OneToOne`

关联字段。配置 `relatedModel` 和 `relatedField`。所选数据唯一。可选配置 `onDelete`，声明被引用行删除时的 FK 策略（见 [`onDelete`](#224-ondelete)）。

### 1.12 `ManyToOne`

关联字段。配置 `relatedModel` 和 `relatedField`。可选配置 `onDelete`，声明被引用行删除时的 FK 策略（见 [`onDelete`](#224-ondelete)）。

### 1.13 `OneToMany`

多数情况下，OneToMany 数据在客户端通过对单条记录调用 Many 侧模型 API 进行创建、更新或删除。

1. **全量提交**：`[{row1}, {row2}]`。更新 API 中字段值为 `[]` 时，清除所有关联记录。
2. **补丁提交**，以 `PatchType` 为键：

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": 101, "name": "changed" }],
  "Delete": [102, 103]
}
```

更多细节请参阅 [API 提交](../../backend_dev/api/apiSubmit.md)。

3. **API 响应**：OneToMany 字段的返回形态取决于 `QueryParams.fields`、`QueryParams.subQueries` 和 `ConvertType`。见 [API 响应](../../backend_dev/api/apiResponse.md) 中的 OneToMany 章节。

说明：
- `OneToMany` 为虚拟字段。根据关联模型的逻辑外键查询并绑定数据，字段本身无物理数据库列。


### 1.14 `ManyToMany`

1. **全量提交**：`[id1, id2, id3]`。框架计算 diff 并相应创建或删除连接（中间）表行。
2. **补丁提交**，以 `PatchType` 为键：

```json
{
  "Add": [1, 2, 3],
  "Remove": [4, 5]
}
```

更多细节请参阅 [API 提交](../../backend_dev/api/apiSubmit.md)。

3. **ManyToMany 级联搜索**：用例——按连接表字段条件过滤当前表记录（如「在某时间范围内被分配某角色的用户」）。见 [查询条件](../../backend_dev/api/apiQuery.md) 章节。

4. **API 响应**：ManyToMany 字段的返回形态（`List<ModelReference>` 或 `List<Row Map>`）由 `QueryParams.fields`、`QueryParams.subQueries` 和 `ConvertType` 决定。见 [API 响应](../../backend_dev/api/apiResponse.md) 中的 ManyToMany 章节。

说明：
- `ManyToMany` 亦为虚拟字段。根据 JoinModel 中的逻辑外键查询并绑定数据，字段本身无物理数据库列。


## 2. 字段元数据属性

| 序号 | 属性 | 数据类型 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| 1 | label | String | 字段标签 |  |
| 2 | modelName | String | 模型名 |  |
| 3 | fieldName | String | 字段名 |  |
| 4 | renamedFrom | String | 重命名时紧邻的前一个字段名 | 单步，无链 |
| 5 | fieldType | Option | 字段类型 |  |
| 6 | optionSetCode | String | 选项集编码 | 注解实体从枚举类型派生 |
| 7 | defaultValue | String | 默认值 |  |
| 8 | length | Integer | 字段长度 |  |
| 9 | scale | Integer | 小数位数 |  |
| 10 | required | Boolean | 必填，默认 `false` |  |
| 11 | readonly | Boolean | 只读，默认 `false` |  |
| 12 | hidden | Boolean | 隐藏，默认 `false` | 仅 UI 标志，通过 Studio 设置 |
| 13 | copyable | Boolean | 可复制，默认 `true` | `false` ⇒ `copyById` 不携带该值；字段选择约定见 [§2.12](#212-copyable) |
| 14 | unsearchable | Boolean | 排除在默认搜索外，默认 `false` |  |
| 15 | dynamic | Boolean | 动态，默认 `false` |  |
| 16 | translatable | Boolean | 可翻译，默认 `false` |  |
| 17 | encrypted | Boolean | 加密，默认 `false` |  |
| 18 | maskingType | Option | 脱敏类型 |  |
| 19 | computed | Boolean | 计算，默认 `false` |  |
| 20 | expression | String | 计算表达式 |  |
| 21 | cascadedField | String | 级联字段 | 关联属性 |
| 22 | relatedModel | String | 关联模型 | 关联属性 |
| 23 | relatedField | String | 关联字段 | OneToMany：Many 侧字段名；TO_ONE 仅 join `id` |
| 24 | relatedFieldType | Option | TO_ONE FK 列的物理类型 | 系统计算，从被引用模型的 `id` 镜像 |
| 25 | onDelete | Option | TO_ONE FK 删除策略（`RESTRICT` / `CASCADE` / `SET_NULL`） | 未设置 = KEEP；见 [§2.24](#224-ondelete) |
| 26 | joinModel | String | 连接模型（ManyToMany） | 中间模型 |
| 27 | joinLeft | String | 连接模型左侧字段 | 存储左模型 FK |
| 28 | joinRight | String | 连接模型右侧字段 | 存储右模型 FK |
| 29 | filters | String | 关联字段过滤条件 | 关联属性 |
| 30 | widgetType | Option | 首选 UI 组件 |  |
| 31 | columnName | String | 表列名 | 只读 |
| 32 | description | String | 字段描述 |  |
| 33 | autoSequence | Boolean | 插入时自动取号，默认 `false` | 见 [§2.31](#231-autosequence) |

### 2.1 `label`

字段的标签（语义）名。通常在列表页显示为列标题，或在表单显示为字段标签，如 `Contact Number`。

### 2.2 `modelName`

字段所属模型（技术模型名），如 `ProductCategory`。

### 2.3 `fieldName`

字段的技术名（lower camelCase），对应实体类中的属性名，如 `unitPrice`。

查询前，Softa 根据存储类型将字段名转换为下划线命名，如 `unit_price`。

### 2.4 `fieldType`

内置类型集中的字段类型，包括字符串、数值、日期时间、选项集、JSON 和关联类型。详见上文字段类型章节。

### 2.5 `optionSetCode`

选项集适用于选项相对稳定、数量有限但需可扩展的业务场景。在 Softa 中，选项信息存储在 `OptionSet` 模型和 `OptionItem` 模型中。

当字段类型为 `Option` 或 `MultiOption` 时，必须配置 `optionSetCode`。

### 2.6 `defaultValue`

默认值配置。创建新记录时，若未赋值字段，将使用默认值。

Create 中的默认值赋值逻辑：

1. 若字段已有值（非 `NULL`），Softa 使用当前值，不应用默认值。文本字段中空字符串 `""` 视为有值；数值字段中 `0` 亦视为有值。
2. 若未赋值，Softa 优先使用 `defaultValue`。
3. 若未配置 `defaultValue`，Softa 使用该字段类型的全局默认值（见上文字段类型）。

### 2.7 `length`

字段长度：字符串字符长度、整数位数，以及高精度数值类型的位数。

### 2.8 `scale`

浮点和高精度数值类型的小数位数。默认为 2。

### 2.9 `required`

必填字段校验。Softa 在应用层校验必填字段，不依赖数据库。

创建或更新数据时，Softa 检查 `required` 属性。这与数据库 `NOT NULL` 约束不同：数据库 `NOT NULL` 列可能有默认值，因此从应用视角可能并非「必填」。Softa 的 `required` 更严格：

- 当 `required=true` 时，创建时必须提供值，且值不能为空（包括不允许空字符串）。
- 更新字段时，不能设为 null/空。

### 2.10 `readonly`

客户端是否允许更新此字段。若 `readonly=true`，客户端/API 不能赋值或更新该字段；仅允许服务端更新（如计算字段或自动填充字段）。客户端创建/更新会校验此属性；尝试赋值将报错。

审计字段 `createdId`、`createdTime`、`updatedId`、`updatedTime` 自动维护，默认 `readonly=true`。

### 2.11 `hidden`

字段在客户端是否默认隐藏。默认为 `false`。

### 2.12 `copyable`

`copyById`（及客户端 Duplicate）是否携带该字段值。默认为 `true`。业务键、凭证、运行时状态等不应被复制的字段设为 `false`。

**复制字段选择约定**（与 `copyable` 标志无关、始终生效）：`ONE_TO_ONE` FK **始终排除**——复制会让两行共享独占关联行，破坏 1:1（或其唯一索引硬失败）；动态字段（`ONE_TO_MANY` / `MANY_TO_MANY` / computed / cascaded）因非存储列而排除；`MANY_TO_ONE` **仍可复制**——共享引用正是其语义。历史陷阱：`nonCopyable` → `copyable` 的重命名是作为迁移（V6）完成的，**不是**通过 `renamedFrom`，因为语义取反——若用值保留重命名会带上错误值。

### 2.13 `searchable`

字段是否可作为一般搜索的查询条件。默认为 `true`。

### 2.14 `dynamic`

字段是否动态。默认为 `false`。

当 `dynamic=true` 时，字段值动态计算。典型情况包括动态计算字段和动态级联字段。

运行时，系统自动计算动态字段值，该字段在数据库中无物理列。

动态字段的值通常表示最新计算结果。使用动态计算字段时，应仔细考虑场景是否合适及对客户端性能的潜在影响。

### 2.15 `translatable`

在多语言数据场景中，`translatable=true` 表示字段值可翻译（多语言字段）。默认为 `false`。

### 2.16 `encrypted`

字段是否加密。Softa 默认使用 AES256。

### 2.17 `maskingType`

当字段含敏感数据时，配置脱敏类型（电话号码、姓名、身份证号、银行卡号等）。

客户端通过 API 获取数据时，Softa 自动脱敏字段值。脱敏可将全部或部分值替换为 `****`。

脱敏字段不影响服务端计算字段或级联字段。计算字段可依赖脱敏字段，计算字段本身也可脱敏。

客户端可使用 `getUnmaskedField` API 获取特定字段的敏感值；服务端在此过程中记录访问日志。

- `All`：脱敏所有字符（替换为 `****`）。
- `Name`：保留首尾字符；姓名仅 2 字时保留末字。
- `Email`：保留前 4 个字符。
- `PhoneNumber`：脱敏末 4 位。
- `IdNumber`：保留首尾各 4 位。
- `CardNumber`：保留末 4 位。

### 2.18 `computed`

字段是否计算。计算字段可配置表达式，并可依赖当前模型的其他字段。

目前出于性能考虑，单个表达式不支持跨模型字段引用。若需要，可在 Flow 编排中读取跨模型字段值并纳入计算。

- 对于 `dynamic=false` 的计算字段，依赖字段变更时 Softa 自动触发重算。
- 对于 `dynamic=true` 的计算字段，计算结果不存储。Softa 在读取时求值表达式。

### 2.19 `expression`

计算表达式。可引用当前模型的其他字段，并使用算术运算、字符串函数、日期函数及其他常用工具函数。

对于数值类型，Softa 使用高精度计算以避免精度损失：计算期间保留 16 位小数，最后应用**银行家舍入**。由于数值字段的 `scale` 通常 \(\le 16\)，这不影响字段自身的精度控制。

Softa 使用 **[AviatorScript](https://github.com/killme2008/aviatorscript)** 作为表达式引擎，并在安全沙箱模式下运行。

### 2.20 `cascadedField`

级联字段通过 OneToOne/ManyToOne 关联引用关联模型的字段值。格式为点分：左侧为当前模型上的 OneToOne/ManyToOne 字段名，右侧为关联模型上的字段名，如 `productId.productName`。

- 对于 `dynamic=false` 的级联字段，依赖的 OneToOne/ManyToOne 字段变更时 Softa 自动触发重算。
- 对于 `dynamic=true` 的级联字段，级联值不存储。读取时 Softa 动态获取最新关联值。

这是逻辑级联，非数据库级联。仅 OneToOne/ManyToOne 支持级联值访问。

### 2.21 `relatedModel`

关联字段（OneToOne、ManyToOne、OneToMany、ManyToMany）的关联模型。

### 2.22 `relatedField`

- 对于 OneToMany，为关联模型（Many 侧）中存储当前模型外键的字段名；不得为空。
- 对于 OneToOne/ManyToOne，默认为关联模型的 `id`。

### 2.23 `relatedFieldType`

系统计算的 TO_ONE FK 列物理类型（`STRING` / `LONG` / …），在协调时从被引用模型的 `id`（以及镜像的 `length` / `scale`）写入。从不通过 `@Field` 声明；用于在 `fieldType` 保持逻辑 `MANY_TO_ONE` / `ONE_TO_ONE` 的同时让 DDL 渲染正确列类型。非 FK 字段为 null。

### 2.24 `onDelete`

**TO_ONE** 外键（`ManyToOne` / `OneToOne`）的删除策略：当被引用（"One"）行被删除时，**引用方**行如何处理。

这是在 `ModelServiceImpl.deleteByIds` 中执行的**应用层**策略。Softa **不会**生成物理数据库 `FOREIGN KEY ... ON DELETE` 约束。为何必须应用层、从不建真实 DB FK：软删是 `UPDATE`，对 DB `ON DELETE` 不可见（FK 根本不会触发）；DB 级联会绕过权限、变更日志、审计戳、软删转换与租户隔离；DB FK 无法表达「仅统计 `deleted=false` 引用方」或「仅硬删时 SET_NULL」；物理 FK 也与永不自动 DROP 的 DDL 治理冲突。

| 取值 | 行为 |
| --- | --- |
| `RESTRICT` | 若存在存活（`deleted=false`）引用方，阻止删除。 |
| `CASCADE` | 在同一事务中删除引用方；每个子行遵循其自身的软删/硬删模式。 |
| `SET_NULL` | 将引用方 FK 置空；仅在 One 侧**硬删**时生效（软删为 no-op，以便恢复后仍能解析链接）。要求 FK 可空（`required=false`）。 |
| 未设置（`null`） | **KEEP**（默认）——框架不处理引用方。 |

要点：

- 仅在 **TO_ONE 反向 FK**（子侧）上声明 `onDelete`。**不要**设在 `OneToMany` / `ManyToMany` 虚拟字段上——若要「删父级联删子」，把 `CASCADE` 放在子侧 FK。
- **允许**指向时间轴模型：策略在**实体删除**（`deleteByIds`，按逻辑 id 删除全部切片）时触发。切片级 `deleteBySliceId` 实体仍存活，**故意不**触发 `onDelete`。
- 与前端 `cascadedField`（值自动填充）或 UI 删行回调（关联表上的 `onDeleteRow`）不是同一概念。
- 前端 `<Field>` 没有 `onDelete` prop；运行时从元数据读取，在删除模型时生效。

启动期校验会拒绝不安全组合（例如软删父级联硬删子、循环 `CASCADE`、共享父指向多租户子等）。完整矩阵、批量上限与注解映射见 [删除策略（`onDelete`）](../../backend_dev/model_dev/annotation#delete-strategy-ondelete)。

### 2.25 `joinModel`

对于 ManyToMany，`joinModel` 不得为空。为存储两模型映射关系的连接（中间）模型。

查询时，Softa 先从 `joinModel` 查询映射关系，再从 `relatedModel` 读取关联模型数据以完成多对多查询。

默认命名规则：Softa 自动拼接左模型名 + 右模型名 + `Rel`，如 `User` + `Role` + `Rel` → `UserRoleRel`。

### 2.26 `joinLeft`

对于 ManyToMany，连接模型中存储左模型外键的字段名。

默认命名规则：左模型名首字母小写后追加 `Id`，如 `User` → `userId`。

### 2.27 `joinRight`

对于 ManyToMany，连接模型中存储右模型外键的字段名。

默认命名规则：右模型名首字母小写后追加 `Id`，如 `Role` → `roleId`。

### 2.28 `filters`

OneToOne/ManyToOne 关联字段的基本过滤条件。这是基于业务场景的固定过滤，与用户搜索条件以 `AND` 组合。

### 2.29 `columnName`

只读属性：从字段名派生的物理表列名（如 `unitPrice` → `unit_price`）。

`fieldName` 变更时，Softa 默认同步列名。可通过全局 DDL 开关禁用自动表列重命名，以支持通过其他方式提交 DDL 的工作流。

### 2.30 `description`

字段的业务描述——面向使用者的简明摘要，会渲染为表单字段的提示（tooltip），并写入生成的 API 文档。上限 **512 字符**，启动解析注解时强制校验；设计动机与贡献者备注请写在代码注释中。

### 2.31 `autoSequence`

INSERT 时若提交值为空，则从序列自动为该字段取号。仅限 STRING 字段（不支持 `dynamic` / `computed` / 主键；仅 RDBMS 存储），并需配套名为 `"<Model>.<field>"` 的 `sys_sequence` 行——缺少序列行时插入直接失败（fail-closed）。与 `readonly` 组合即严格系统取号（拒绝调用方传值）；不加 `readonly` 则信任调用方传值（导入场景）。复制记录时该值永不携带——副本在插入时重新取号。

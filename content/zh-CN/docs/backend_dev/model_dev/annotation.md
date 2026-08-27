## 元数据注解

> **需要 `metadata-starter`** 作为应用依赖，这些注解才会生效。`softa-orm` 定义注解；`metadata-starter` 包含读取注解并与 `sys_*` 协调的扫描器和检查器。没有 `metadata-starter` 时，注解存在于类上但无扫描器消费——`sys_*` 行永远不会写入，也不会生成 DDL。

Softa 通过实体类上的 Java 注解描述模型、字段、选项集、选项条目和索引。启动时扫描器读取这些注解，与 `metadata-starter` 管理的 `sys_*` 目录表协调，并对 `scanner-scope` 中的包**将物理 schema 收敛到注解**——声明的变更与手工制造的漂移一视同仁，因此任何一次重启结束时，范围所辖的一切都满足 schema ≡ 注解。

**五个注解**——`@Model` / `@Field` / `@Index` 位于 `io.softa.framework.orm.annotation`；`@OptionSet` / `@OptionItem` 位于 `io.softa.framework.base.annotation`（以便 `softa-base` 中的框架级枚举可携带它们，避免模块循环）：

| 注解 | 目标 | 写入的 `sys_*` 表 | 用途 |
|---|---|---|---|
| `@Model` | class | `sys_model` | 描述实体（表、业务键、多租户、软删除等） |
| `@Field` | field | `sys_field` | 描述列（label、类型、长度、必填、关联等） |
| `@OptionSet` | enum class | `sys_option_set` | 将枚举标记为受管选项集 |
| `@OptionItem` | enum constant | `sys_option_item` | 每个常量的显示属性 |
| `@Index` | class (`@Repeatable`) | `sys_model_index` | 声明数据库索引 |

```java
@Data
@EqualsAndHashCode(callSuper = true)
@Model(
    label = "Customer",
    businessKey = {"code"},
    description = "Customer master"
)
@Index(indexName = "uk_customer_code", fields = {"code"}, unique = true)
@Index(fields = {"status", "createdTime"})
public class Customer extends AuditableModel {

    @Field(label = "ID")
    private Long id;

    @Field(label = "Customer Code", required = true, length = 32)
    private String code;

    @Field(label = "Customer Tier")
    private CustomerTier tier;   // enum → FieldType.OPTION (inferred)
}

@OptionSet(label = "Customer Tier")
public enum CustomerTier {
    @OptionItem(label = "VIP Gold") GOLD("g"),   // explicit: "VIP Gold" ≠ humanize("GOLD")
    SILVER("s");                                 // bare: label defaults to humanize("SILVER") = "Silver"

    @JsonValue private final String code;       // itemCode = @JsonValue
    CustomerTier(String code) { this.code = code; }
}
```

### 推断规则（无需注解）

| 概念 | 来源 | 覆盖 |
|---|---|---|
| `modelName` | 类简单名 | —（不可覆盖） |
| `fieldName` | Java 字段名 | —（不可覆盖） |
| `optionSetCode` | 枚举类简单名 | —（不可覆盖） |
| `itemCode` | `@JsonValue` 字段值（回退 `enum.name()`） | —（不可覆盖） |
| `tableName` | `snake_case(modelName)` | `@Model.tableName` |
| `columnName` | `snake_case(fieldName)` | `@Field.columnName` |
| `fieldType` | 通过 `TypeInference` 从 Java 类型推断（如 `String`→`STRING`、enum→`OPTION`、`List<enum>`→`MULTI_OPTION`、`@Model` POJO→`MANY_TO_ONE`、`DTOFieldObject` POJO→`DTO`） | `@Field.fieldType = FieldType.X`（单值，无花括号）；**`OPTION` / `MULTI_OPTION` 不能显式书写**；`TEXT`（无界长文本）**从不推断**——须在 `String` 字段上显式声明 |
| index `indexName` | `idx_<table>_<col>...` / 唯一时为 `uk_<table>_<col>...` | `@Index.indexName` |

### `@Model` ↔ `SysModel`

| `@Model` 属性 | 类型 | 默认值 | `SysModel` 列 | 说明 |
|---|---|---|---|---|
| （类简单名） | — | — | `modelName` | 推断，不可覆盖 |
| `label` | String | `""` | `label` | 空 → 人性化类名（`DeptInfo`→"Dept Info"）；i18n 翻译按 id 覆盖 |
| `renamedFrom` | String | `""` | `renamedFrom` | 重命名时紧邻的前一个模型名（单步，无链）——见下文「重命名」 |
| `tableName` | String | `""` | `tableName` | 空 → `snake_case(modelName)` |
| `description` | String | `""` | `description` | **≤512 字符**，解析期强制校验（目录列宽）；写面向使用者的简明摘要——设计备注放 Javadoc |
| `displayName` | String[] | `{}` | `displayName` | 列表显示默认值 |
| `searchName` | String[] | `{}` | `searchName` | 搜索字段默认值 |
| `defaultOrder` | String[] | `{}` | `defaultOrder` | 如 `"createdTime:desc"` |
| `softDelete` | boolean | `false` | `softDelete` | |
| `activeControl` | boolean | `false` | `activeControl` | 添加 `active` 门控列；与 `timeline` 互斥（启动时拒绝） |
| `timeline` | boolean | `false` | `timeline` | 生效日期行（见 Timeline Model）；与 `activeControl` 互斥——期间状态建为版本化业务字段，终结走 `setEndDate` |
| `idStrategy` | `IdStrategy` | `DB_AUTO_ID` | `idStrategy` | |
| `storageType` | `StorageType` | `RDBMS` | `storageType` | |
| `versionLock` | boolean | `false` | `versionLock` | 乐观锁列 |
| `multiTenant` | boolean | `false` | `multiTenant` | 要求类上有 `tenantId` 字段 |
| `copyable` | boolean | `true` | `copyable` | `false` ⇒ 复制 API 拒绝该模型；UI 隐藏 Duplicate |
| `projection` | boolean | `false` | `projection` | `true` ⇒ 只读模型，映射到一张**不归它所有**的表（另一模型的表，或外部创建的表，如 BI 管线产物）。永不生成 DDL；写 API 拒绝；声明 `@Index` 在启动时被拒；仅限 RDBMS。每个非投影 RDBMS 模型独占其表——同一 `tableName` 出现两个 owner 会启动失败 |
| `dataSource` | String | `""` | `dataSource` | 空 → 主数据源 |
| `businessKey` | String[] | `{}` | `businessKey` | 支持组合 |
| `partitionField` | String | `""` | `partitionField` | |
| （扫描器设置） | — | — | `appCode` | 始终由扫描器 / Studio 设置 |
| （DB 自动） | — | — | `id` | 主键 |

审计字段（`createdTime` / `createdBy` / `createdId` / `updatedTime` / `updatedBy` / `updatedId`）来自 `AuditableModel`，**不**通过 `@Field` 声明——当类继承 `AuditableModel` 时由 `DdlGenerator` 自动注入。

### `@Field` ↔ `SysField`

| `@Field` 属性 | 类型 | 默认值 | `SysField` 列 | 说明 |
|---|---|---|---|---|
| （Java 字段名） | — | — | `fieldName` | 推断，不可覆盖 |
| （Java 类型） | — | — | `fieldType` | 通过 `TypeInference` 推断 |
| `label` | String | `""` | `label` | 空 → 人性化字段名（`deptId`→"Dept Id"）；i18n 翻译按 id 覆盖 |
| `renamedFrom` | String | `""` | `renamedFrom` | 重命名时紧邻的前一个字段名（单步）——见下文「重命名」 |
| `description` | String | `""` | `description` | **≤512 字符**，解析期强制校验（目录列宽）；写面向使用者的简明摘要——设计备注放 Javadoc |
| `fieldType` | `FieldType[]` | `{}` | `fieldType` | 单值，无花括号（如 `fieldType = FieldType.MULTI_FILE`）；`OPTION`/`MULTI_OPTION` **不能**显式书写 |
| `columnName` | String | `""` | `columnName` | 空 → `snake_case(fieldName)` |
| `length` | int | `0` | `length` | `0` → 类型默认：STRING/OPTION 64，MULTI_STRING/ORDERS 256，DOUBLE 24（测量），BIG_DECIMAL 32（金额）；其他需显式声明。`TEXT` 字段的 length 可选——纯应用层守卫（列本身无界）。遗留路由：MySQL 将 STRING `length > 16383` 渲染为 TEXT（64KB 字节；新代码用 `fieldType = TEXT`） |
| `scale` | int | `0` | `scale` | `0` → 类型默认：DOUBLE 2，BIG_DECIMAL 8（DECIMAL 小数位） |
| `required` | boolean | `false` | `required` | NOT NULL 约束 |
| `readonly` | boolean | `false` | `readonly` | UI 提示 |
| `translatable` | boolean | `false` | `translatable` | i18n 感知列 |
| `copyable` | boolean | `true` | `copyable` | `false` ⇒ `copyById` 不携带该值（业务键、凭证、运行时状态） |
| `unsearchable` | boolean | `false` | `unsearchable` | 排除在默认搜索之外 |
| `computed` | boolean | `false` | `computed` | 需要 `expression` |
| `expression` | String | `""` | `expression` | AviatorScript |
| `dynamic` | boolean | `false` | `dynamic` | 非物理存储 |
| `encrypted` | boolean | `false` | `encrypted` | 静态加密 |
| `autoSequence` | boolean | `false` | `auto_sequence` | INSERT 时字段为空则从序列自动取号；仅 STRING（不支持 `dynamic`/`computed`/id，仅 RDBMS）；需配套 `sys_sequence` 行 `"<Model>.<field>"`（缺行则插入失败，fail-closed）。搭配 `readonly` = 严格系统取号（拒绝调用方传值）；不搭配 = 信任调用方传值（导入场景）。复制时永不携带 |
| `maskingType` | `MaskingType[]` | `{}` | `maskingType` | 单元素 |
| `defaultValue` | String | `""` | `defaultValue` | |
| `relatedModel` | `Class<?>` | `Void.class` | `relatedModel` | 类引用（编译期检查），如 `Foo.class`；`Void.class` → 从 POJO 类型推断；`Long` FK **必填**。跨模块/动态模型使用 `relatedModelName`（String） |
| `relatedModelName` | String | `""` | `relatedModel` | 字符串回退到 `relatedModel`（跨模块/动态） |
| `relatedField` | String | `""` | `relatedField` | TO_ONE：始终为 `id`——留空（非 id 值在启动时被拒绝；若要存储业务编码，使关联模型以 code-as-id）。ONE_TO_MANY：命名子 FK 列 |
| `onDelete` | `OnDelete[]` | `{}` | `on_delete` | TO_ONE FK 删除策略：`RESTRICT` / `CASCADE` / `SET_NULL`；`{}`/未设置 = KEEP（默认——不执行任何操作）。应用层（无 DB FK）。见下文「删除策略」 |
| `joinModel` | `Class<?>` | `Void.class` | `joinModel` | M2M 连接模型类；`joinModelName`（String）回退 |
| `joinLeft` | String | `""` | `joinLeft` | |
| `joinRight` | String | `""` | `joinRight` | |
| `cascadedField` | String | `""` | `cascadedField` | 点分路径，如 `"owner.name"` |
| `filters` | String | `""` | `filters` | 关联字段过滤表达式 |
| `widgetType` | `WidgetType[]` | `{}` | `widgetType` | 单元素覆盖 |
| （扫描器设置） | — | — | `modelName` | 来自外层 `@Model` 类 |
| （扫描器设置） | — | — | `optionSetCode` | 当 fieldType 为 `OPTION`/`MULTI_OPTION` 时从枚举类型派生 |
| （扫描器设置） | — | — | `appCode` / `id` | |
| （FK 修复 post-init） | — | — | `modelId` | |
| （系统计算） | — | — | `relatedFieldType` | TO_ONE FK 列的物理类型，在协调时从被引用模型的 `id` 镜像（+ 镜像 `length`/`scale`）；永不在 `@Field` 上声明 |
| （不通过 `@Field` 暴露） | — | — | `hidden` | 仅 UI 标志，通过 Studio 设置 |

**复制字段选择约定**（无论 `copyable` 标志如何均适用）：`ONE_TO_ONE` FK **始终排除**——复制会使两行共享独占关联行，破坏 1:1（或其唯一索引硬失败）；动态字段（`ONE_TO_MANY` / `MANY_TO_MANY` / computed / cascaded）因不是存储列而被排除；`MANY_TO_ONE` **保持可复制**——共享引用正是其语义。历史陷阱：`nonCopyable` → `copyable` 重命名是作为迁移（V6）完成的，**不是**通过 `renamedFrom`，因为该重命名会反转值的含义——值保留式重命名会带入错误值。

#### 删除策略（`onDelete`）

在 `MANY_TO_ONE` / `ONE_TO_ONE` FK 上，`onDelete` 声明当被引用（"One"）行被删除时，对**引用方**行采取的操作。在 `ModelServiceImpl.deleteByIds` 中于应用层强制执行——永不发出物理 DB `FOREIGN KEY ... ON DELETE`。为何走应用层且永不使用真实 DB FK：软删除是 `UPDATE`，对 DB `ON DELETE` 不可见（FK 根本不会触发）；DB 级联会绕过权限、变更日志、审计盖章、软删除转换与租户范围；DB FK 无法表达「只统计 `deleted=false` 引用方」「不论租户一律拦截」或「仅在硬删除时置空」；且物理 FK 约束游离于注解驱动的 DDL 治理之外（扫描器既不声明也不管理它们）。策略：

- `RESTRICT` — 若存在任何存活（`deleted=false`）引用方，则阻止删除。
- `CASCADE` — 在同一事务中删除引用方（每个遵循自身的软/硬删除）。**启动时拒绝**软删除 One 级联到硬删除 Many（可恢复的父级不得不可逆地删除子级——使 Many 也软删除，或使用 RESTRICT/SET_NULL）。
- `SET_NULL` — 将引用方 FK 置空；**仅在 One 硬删除时**（软删除时为 no-op，因此恢复后仍可解析链接）。要求可空 FK（`required = false`）。
- 未设置（`{}` / `on_delete` NULL）= **KEEP**（默认）——框架不执行任何操作。

**CASCADE 软/硬删除矩阵**——每个 Many 上的级联遵循 *Many 自身*的删除模式（而非 One 的）；一种不安全组合在启动时被拒绝：

| One（被引用 / 父） | Many（引用方 / 子） | CASCADE 结果 |
|---|---|---|
| 软删除 | 软删除 | Many **软删除**（两者均可恢复） |
| 软删除 | 硬删除 | **启动时拒绝**——可恢复的父级不得不可逆地删除子级 |
| 硬删除 | 软删除 | Many **软删除** |
| 硬删除 | 硬删除 | Many **硬删除** |

**共享（非多租户）父级到多租户子级**的 `CASCADE` 同样在启动时被拒绝——一次删除会级联到所有租户（使用 RESTRICT）。

**运行时安全**——影响超过 `MAX_BATCH_SIZE` 个引用方（*每个级联层级*）的 `CASCADE` / `SET_NULL` 会被拒绝：`referrerIds` 在一次 `LIMIT` 查询中最多获取 `MAX_BATCH_SIZE + 1` 个 id，因此超限删除会**在不加载完整集合的情况下**快速失败（有界内存，无额外 `count`）。大批量删除分块为 `DEFAULT_BATCH_SIZE`，以限制 SELECT/DELETE 语句 + IN 子句大小（同一事务——分块限制语句大小，而非锁持续时间）。

对于 OneToMany「删除父级 → 删除子级」，在**子级反向引用 FK** 上设置 `CASCADE`（FK 是唯一真相来源；`onDelete` 不在 `ONE_TO_MANY` 上声明）。

启动时守卫（快速失败）：`onDelete` 仅对 TO_ONE 有效；`SET_NULL` 要求可空 FK；**循环 / 自引用 `CASCADE`** 被拒绝（在应用代码中删除此类层次——组织树、BOM、分类树）；**深度超过 `MAX_CASCADE_DEPTH` 个模型的 `CASCADE` 链** 被拒绝（限制递归；错误会命名完整链）；以及从**软删除父级到硬删除子级**，或从**共享父级到多租户子级**的 `CASCADE` 被拒绝（见上表）。

**timeline** 目标是允许的：入站 FK 策略在**实体删除**时触发（`deleteByIds`，会移除该逻辑 id 的所有切片——引用方 FK 存的是该逻辑 id，因此 RESTRICT 计数 / CASCADE 删除 / SET_NULL 置空均按它进行，不涉及生效日期解析）；切片级 `deleteBySliceId` 保持实体存活，故意不触发该策略。

面向产品/元数据作者的字段级概述：[字段元数据中的 `onDelete`](../../features/metadata/field#224-ondelete)。

### `@OptionSet` ↔ `SysOptionSet`

| `@OptionSet` 属性 | 类型 | 默认值 | `SysOptionSet` 列 | 说明 |
|---|---|---|---|---|
| （枚举简单名） | — | — | `optionSetCode` | 推断，不可覆盖 |
| `label` | String | `""` | `label` | 显示标签；空 → 人性化枚举名（`TenantStatus`→"Tenant Status"） |
| `renamedFrom` | String | `""` | `renamedFrom` | 重命名时紧邻的前一个选项集编码（单步） |
| `description` | String | `""` | `description` | **≤512 字符**，解析期强制校验（目录列宽）；写面向使用者的简明摘要——设计备注放 Javadoc |
| （扫描器设置） | — | — | `appCode` / `id` | |
| （Studio 开关） | — | — | `active` / `optionItems` | 运行时聚合 |

### `@OptionItem` ↔ `SysOptionItem`

| `@OptionItem` 属性 | 类型 | 默认值 | `SysOptionItem` 列 | 说明 |
|---|---|---|---|---|
| （枚举上 `@JsonValue` 字段值） | — | — | `itemCode` | 无 `@JsonValue` 时回退 `enum.name()` |
| （外层枚举简单名） | — | — | `optionSetCode` | 推断 |
| `label` | String | `""` | `label` | 默认为人性化常量名（`MULTI_FILE`→"Multi File"）；显式声明以自定义。当等于人性化名称时可省略（若别无他物可省略整个 `@OptionItem`） |
| `renamedFrom` | String | `""` | `renamedFrom` | 重命名时紧邻的前一个条目编码（单步） |
| `description` | String | `""` | `description` | **≤512 字符**，解析期强制校验（目录列宽）；写面向使用者的简明摘要——设计备注放 Javadoc |
| `sequence` | int | `-1` | `sequence` | `-1` → 使用 `ordinal() + 1` |
| `parentItemCode` | String | `""` | `parentItemCode` | 层次结构 |
| `itemTone` | `OptionItemTone[]` | `{}` | `itemTone` | 单元素 |
| `itemIcon` | `OptionItemIcon[]` | `{}` | `itemIcon` | 单元素 |
| （扫描器设置） | — | — | `appCode` / `id` / `optionSetId` | |
| （Studio 开关） | — | — | `active` | |

### `@Index` ↔ `SysModelIndex`

`@Index` 为 `@Repeatable`——可在同一 `@Model` 类上堆叠多个声明。

| `@Index` 属性 | 类型 | 默认值 | `SysModelIndex` 列 | 说明 |
|---|---|---|---|---|
| （外层类） | — | — | `modelName` | 推断 |
| `indexName` | String | `""` | `indexName` | 空 → 自动派生 `idx_<table>_<col>...` / 唯一时为 `uk_<table>_<col>...`；索引名**全局唯一**（≤ 60 字符，启动时强制） |
| `fields` | String[] | 必填 | `indexFields` | **camelCase Java 字段名**，非列名 |
| `unique` | boolean | `false` | `uniqueIndex` | |
| `message` | String | `""` | `message` | 仅唯一索引：唯一性违反时向用户显示的消息（有独立 i18n 键） |
| （扫描器设置） | — | — | `appCode` / `id` | |
| （FK 修复 post-init） | — | — | `modelId` | |

**注意**：`@Model.businessKey` **不会**自动创建 UNIQUE 索引。多租户模型通常需要 `UNIQUE (tenant_id, businessKey...)`，其租户感知语义无法仅靠 `@Index` 表达——请显式声明此类索引：
```java
@Index(fields = {"tenantId", "code"}, unique = true)
```

## 重命名（`renamedFrom`）

扫描器的 diff 以 `modelName` / `fieldName` / `optionSetCode` / `itemCode` 为键，因此*未声明*的重命名看起来就是「删除旧的 + 添加新的」——在 `scanner-scope` 激活的环境里，收敛过程会把这两步如实执行：新列以空列身份添加，而旧列已不被任何声明拥有，会在**同一次启动中连同数据一起被 DROP**。数据不会到达新列。

应声明紧邻的前一个名称：

```java
@Model(renamedFrom = "OldCustomer")          // model rename
public class Customer extends AuditableModel {

    @Field(renamedFrom = "customerName")     // field rename
    private String name;
}
```

`DiffEngine` 随后将两侧配对为单一重命名修改，自动执行 `CHANGE COLUMN`（字段）/ `ALTER TABLE … RENAME TO`（模型），并原地更新 `sys_*` 行（id 保留）——数据被携带，而非分离。模型重命名会级联到其字段和索引，因此不会显示字段变动。`@OptionSet` / `@OptionItem` 支持相同属性。

规则与守卫：

- `renamedFrom` 为**单个** String——仅紧邻的前一个名称（单步，无链）。跳过版本的链需要手动迁移。
- 声明仍作为存活字段/模型的前一个名称，或两个兄弟声称同一前一个名称，会在解析时失败。
- 「新名称和前一个名称都已存在」会快速失败——请手动解决半应用的重命名。
- 携带业务数据 UPDATE 的 `@OptionItem` 编码重命名仍需要手写迁移。

## `scanner-scope`（扫描器管理哪些包）

`scanner-scope` 是正则模式列表，对每个 `@Model` / `@OptionSet` 类的**包名**进行全匹配。`"*"`（唯一条目）= 所有包；空 / 未设置 = 不管理任何内容。**生产环境绝不应非空**——生产中由 Studio / connector publish 应用应用范围的设计目录。

```yaml
# application-dev.yml
system:
  metadata:
    scanner-scope:
      - "*"          # manage every package; on a shared dev DB, narrow to
                     # your own packages, e.g. ["io\\.acme\\.app.*"]
```

| `system.metadata.scanner-scope` | 扫描器运行 | DDL 执行 | 漂移检测 |
|---|---|---|---|
| `["*"]` | 启动时、急切、所有包 | **物理收敛**（见下文）：每张所辖的表在每次启动时收敛到注解——CREATE / ADD / MODIFY（含收窄）/ 声明式 RENAME，外加**对未声明列与索引执行 DROP** | 无 Java 类的目录聚合根以 WARN 列名并附可复制 SQL；漂移审计报告残差（投影表、未声明的整表） |
| `["io\\.acme\\.foo.*", …]` | 启动时、仅范围内包 | 相同的收敛，仅范围内模型——范围外的表永不触碰 | n/a |
| 空 / 未设置（默认，生产） | n/a | n/a | `MetadataAnnotationChecker` 在虚拟线程上于启动后运行；若代码与 DB 漂移则记录 WARN——只报告，不执行 |

在**共享开发数据库**上，为每位开发者设置窄范围（其自身包），使扫描器仅协调——并收敛——其正在积极修改的 Java 包。范围按包而非按类；应用身份仍为 `app_code`，物理表名冲突仍是数据库级问题。

### 目录行策略

目录是一个聚合：`sys_model` / `sys_option_set` 是**聚合根**，`sys_field` / `sys_model_index` / `sys_option_item` 是其属性。

| 变更 | 是否应用 |
|---|---|
| 聚合根新增 / 修改 | ✅ |
| 属性新增 / 修改 / **删除**（其聚合根有对应类时） | ✅ —— 注解拥有聚合根的属性集 |
| **聚合根删除**（目录中存在但无 `@Model` / `@OptionSet` 类的行） | ❌ 在**任何** scope 下都不删，含 `["*"]` —— 聚合根及其属性行原样保留；`["*"]` 会以 WARN 列出名称并附可复制的 `DELETE` SQL |

「无 Java 类的聚合根」是一等状态：Studio 无代码巷道与种子文件授权的模型本就没有 Java 类，且目录中没有任何列记录行归属——因此「孤儿」与「刻意无类」无法区分，自动删除会在每次启动时静默摧毁手工授权的定义。请留意它与下方物理 schema 的对照：所辖表上的未声明**列**没有任何正当作者（owner 的注解就是该表唯一的事实来源），会被收敛清除；而无类的**聚合根**可能是某人的刻意定义，永远只被 WARN 点名。

### DDL 执行策略（物理收敛）

`scanner-scope` 激活时，每个所辖模型的物理表是注解的纯函数——每次启动都会收敛，声明的变更与手工漂移一视同仁：

| 状态（注解 vs 物理） | DDL | 是否执行 |
|---|---|---|
| 新 `@Model` / 表物理缺失 | `CREATE TABLE`（含内联索引）；表已预先存在时改为逐列收编（adoption） | ✅ |
| 新 `@Field` / 声明的列物理缺失 | `ADD COLUMN` | ✅ |
| `@Field` 属性变更（类型 / 长度 / 必填 / 默认值 / 注释） | `MODIFY COLUMN`，重申声明的形状 | ✅ |
| 物理类型/宽度不符——拓宽、**收窄**、不可比 | `MODIFY COLUMN` 收敛到声明的形状——声明即事实，且非空 `scanner-scope` 定义上就是非生产环境 | ✅ |
| `@Field` 删除 / **未声明的物理列** | `DROP COLUMN` | ✅ |
| **未声明的物理索引** | `DROP INDEX`（主键支撑索引除外） | ✅ |
| 新 `@Index` / 声明的索引物理缺失 / 定义变更 | `ADD INDEX` / 重建（DROP + ADD） | ✅ |
| `@Model` 删除 | `DROP TABLE` | ❌ —— 无类聚合根保留其行**和**表；`["*"]` 的 WARN 打印清理 SQL |
| 裸改 `tableName` 而旧表物理仍存在 | — | ❌ **启动失败**并给出指引——创建新表会静默造成数据分家，规划器绝不猜测 |
| 未声明的整**表**；投影模型上的一切 | — | ❌ 不动——所有权无法证明（另一个 `app_code`、遗留表）/ 表归 owner 所有；漂移审计是报告通道 |

若物理内省失败，本次启动降级为保守的**纯元数据规划**：增量变更与声明式重命名自动执行；一切破坏性动词转入 warn-only 的可复制 SQL 块——没有事实时，漂移与意图无法区分。破坏性收敛永远到不了生产：生产运行空 scope（仅 checker），闸门就是既有的 `scanner-scope` 姿态，而非一个新开关。

**投影模型完全不在上表范围内**：声明 `@Model(projection = true)` 的模型（只读模型，映射到一张不归它所有的表——另一模型的表，或外部创建的表，如 BI 管线产物）**任何变更都不生成 DDL**。其 `sys_*` 行仍正常对账，但表的物理形状归其 owner 模型或外部进程所有。一张表只有一个非投影 owner——出现第二个 owner 会启动失败，这既让全新数据库自举变得确定（每表恰好一条 `CREATE`），也把意外的 `tableName` 撞名从静默合表变成启动报错。物理漂移审计对投影只做单向检查（它声明的列必须物理存在；owner 的其他列/索引不会被报为 undeclared），投影的表物理缺失时记录 **ERROR**——不会导致启动失败，也不会被自动创建。应用内共表的约定：投影暴露的列逐字重复 owner 的声明，其余字段全部声明为 `dynamic`。

### 目录表自举（`sys_*` 表自身的结构）

五张启动读取的目录表（`sys_model`、`sys_field`、`sys_option_set`、
`sys_option_item`、`sys_model_index`）没有行级的"上次已应用状态"——记录其他
模型状态的行就存放在它们内部。因此在 `scanner-scope` 非空的每次启动中，扫描器
会在严格读取目录之前，**依据这些表自身的注解对其做物理对账**：

- 表不存在 → `CREATE TABLE` —— 全新空库**无需任何基线 SQL** 即可自举；
- 列缺失 → `ADD COLUMN` —— 新框架版本新增的目录列在存量库上自动收敛，无需手写迁移；
- 声明了 `renamedFrom` 且旧列存在 → `CHANGE COLUMN`（数据随行迁移）；新旧列同时
  存在 → 启动失败并给出处理指引；
- 物理列窄于声明（仅限有界宽度）→ 拓宽 `MODIFY COLUMN`；更宽 / 不可比 / 未声明的
  物理列**本阶段**一律不动——它先于 diff 存在而运行，且窄 scope 下目录可能不归本
  应用管辖，故只允许增长。目录包在 scope 内时，同一次启动稍后的主收敛过程会像处理
  其他所辖表一样消除这些漂移；否则由物理漂移审计报告。

整个启动 DDL 窗口（目录对账 → 严格读取 → diff → DDL → 行写入）由数据库会话锁
（MySQL `GET_LOCK` / PostgreSQL advisory lock，等待预算 60 秒）跨实例串行化，
多副本同时启动同一数据库不会发生 DDL 竞争。

仍需手写迁移的场景：为新增列在扫描器不管理的行上回填真实值的 `UPDATE`、**范围外**
表上的破坏性变更、以及 `scanner-scope` 为空的环境——那里不会自动应用任何变更，
目录表也不例外。

## 元数据身份（`app_code`）

`sys_*` 目录上**没有所有权层级列**。注解通道与 Studio 无代码通道协调**同一行，按业务键匹配**（`modelName` / `fieldName` / `optionSetCode` / `itemCode`，加上 `renamedFrom`）——同键行原地更新，不会按通道重复。

每个运行时在 `application.yml` 中声明 `system.app-code`（启用 `metadata-starter` 时必填；启动时快速失败）。所有清扫的 `sys_*` 行携带 `app_code`，在每条写入路径（扫描器、Studio 信封、plan/apply）上**服务端**盖章——不信任线上值。签名的 Studio 调用携带目标 `appCode`，运行时不匹配则拒绝。多个应用可安全共享一个数据库：行按 `app_code` 匹配，共享数据库永不交叉链接目录。

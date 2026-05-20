## 元数据注解

Softa 通过**两条并存的路径**维护 `sys_*` 目录表：

1. **注解（本页）**——代码先行（code-first）。在 Java 实体类上声明元数据，
   启动时由扫描器读取这些注解，与 `sys_*` 表对齐，并在开发模式下执行相应 DDL。
   适合随代码库交付的基础定义——平台 / 框架模型，与源码一同版本化，
   受代码评审和 CI/CD 约束。
2. **Studio（可视化设计器）**——配置先行（config-first）。可视化工作台
   通过 `WorkItem → Version → Deployment` 的发布流程写入同样的 `sys_*` 行。
   适合租户自定义与业务团队主导的配置，无需重新发布也能调整。
   详见 [Studio 使用指南](../../features/studio)。

两条路径不会互相覆盖：每条 `sys_*` 行都带有
[`Ownership`](#row-ownership-ownership-enum) 标记，注解扫描器只读写
`PLATFORM_MAINTAINED` 行。

> **需要 `metadata-starter`** 作为应用的依赖，本节中的注解才会生效。
> `softa-orm` 负责定义注解，`metadata-starter` 提供读取注解并与 `sys_*`
> 目录表对齐的扫描器和校验器。若缺少 `metadata-starter`，注解虽然仍写在你的类上，
> 但没有任何扫描器消费它们——`sys_*` 行不会被写入，也不会生成 DDL。

**五个注解**，全部位于 `io.softa.framework.orm.annotation`：

| 注解 | 作用目标 | 写入的 `sys_*` 表 | 用途 |
|---|---|---|---|
| `@Model` | 类 | `sys_model` | 描述一个实体（表名、业务键、多租户、软删除等） |
| `@Field` | 字段 | `sys_field` | 描述一列（标签、类型、长度、是否必填、关联等） |
| `@OptionSet` | 枚举类 | `sys_option_set` | 将枚举标记为受管的选项集 |
| `@OptionItem` | 枚举常量 | `sys_option_item` | 选项项级别的展示属性 |
| `@Index` | 类（`@Repeatable`） | `sys_model_index` | 声明数据库索引 |

```java
@Data
@EqualsAndHashCode(callSuper = true)
@Model(
    labelName = "Customer",
    businessKey = {"code"},
    description = "Customer master"
)
@Index(name = "uk_customer_code", fields = {"code"}, unique = true)
@Index(fields = {"status", "createdTime"})
public class Customer extends AuditableModel {

    private Long id;

    @Field(labelName = "Customer Code", required = true, length = 32)
    private String code;

    @Field(labelName = "Customer Tier")
    private CustomerTier tier;   // enum → FieldType.OPTION (inferred)
}

@OptionSet(name = "Customer Tier")
public enum CustomerTier {
    @OptionItem(itemName = "VIP Gold") GOLD("g"),
    @OptionItem(itemName = "Silver")   SILVER("s");

    @JsonValue private final String code;       // itemCode = @JsonValue
    CustomerTier(String code) { this.code = code; }
}
```

### 推断规则（无需注解）

| 概念 | 推断来源 | 覆盖方式 |
|---|---|---|
| `modelName` | 类的简单名 | —（不可覆盖） |
| `fieldName` | Java 字段名 | —（不可覆盖） |
| `optionSetCode` | 枚举类的简单名 | —（不可覆盖） |
| `itemCode` | `@JsonValue` 字段值（兜底使用 `enum.name()`） | —（不可覆盖） |
| `tableName` | `snake_case(modelName)` | `@Model.tableName` |
| `columnName` | `snake_case(fieldName)` | `@Field.columnName` |
| `fieldType` | 由 `TypeInference` 根据 Java 类型推断（如 `String`→`STRING`，枚举→`OPTION`，`List<enum>`→`MULTI_OPTION`，`@Model` POJO→`MANY_TO_ONE`） | `@Field.fieldType = { ... }`（单元素）；**`OPTION` / `MULTI_OPTION` 不能显式书写** |
| 索引 `indexName` | 非唯一索引为 `idx_<table>_<col>...`，唯一索引为 `uk_<table>_<col>...` | `@Index.name` |

### `@Model` ↔ `SysModel`

> 各属性的业务语义：见 [模型元数据](../../features/metadata/model)。

| `@Model` 属性 | 类型 | 默认值 | `SysModel` 列 | 说明 |
|---|---|---|---|---|
| （类的简单名） | — | — | `modelName` | 推断得到，不可覆盖 |
| `labelName` | String | `""` | `labelName` | 空 → i18n key `model.{modelName}.label` |
| `tableName` | String | `""` | `tableName` | 空 → `snake_case(modelName)` |
| `description` | String | `""` | `description` | |
| `displayName` | String[] | `{}` | `displayName` | 列表展示默认字段 |
| `searchName` | String[] | `{}` | `searchName` | 搜索字段默认值 |
| `defaultOrder` | String[] | `{}` | `defaultOrder` | 如 `"createdTime:desc"` |
| `softDelete` | boolean | `false` | `softDelete` | |
| `softDeleteField` | String | `"deleted"` | `softDeleteField` | 仅当 `softDelete = true` 时生效 |
| `activeControl` | boolean | `false` | `activeControl` | 增加 `active` 启用控制列 |
| `timeline` | boolean | `false` | `timeline` | 时效行（见时间线模型） |
| `idStrategy` | `IdStrategy` | `DB_AUTO_ID` | `idStrategy` | |
| `storageType` | `StorageType` | `RDBMS` | `storageType` | |
| `versionLock` | boolean | `false` | `versionLock` | 乐观锁列 |
| `multiTenant` | boolean | `false` | `multiTenant` | 要求类上存在 `tenantId` 字段 |
| `dataSource` | String | `""` | `dataSource` | 空 → 主数据源 |
| `businessKey` | String[] | `{}` | `businessKey` | 支持复合业务键 |
| `partitionField` | String | `""` | `partitionField` | |
| `serviceName` | String | `""` | `serviceName` | 微服务路由键 — 参见 [softa-web/README](../softa-web/README.md#service-to-service-rpc) |
| （扫描器写入） | — | — | `appId` | 始终由扫描器 / Studio 写入 |
| （数据库自动） | — | — | `id` | 主键 |
| （扫描器写入） | — | — | `ownership` | 扫描器写入的行固定为 `PLATFORM_MAINTAINED` |

审计字段（`createdTime` / `createdBy` / `createdId` / `updatedTime` /
`updatedBy` / `updatedId`）来自 `AuditableModel`，**不**需要通过 `@Field`
声明——当类继承 `AuditableModel` 时，`DdlGenerator` 会自动注入这些列。

### `@Field` ↔ `SysField`

> 各属性的业务语义与完整字段类型表：见 [字段元数据](../../features/metadata/field)。

| `@Field` 属性 | 类型 | 默认值 | `SysField` 列 | 说明 |
|---|---|---|---|---|
| （Java 字段名） | — | — | `fieldName` | 推断得到，不可覆盖 |
| （Java 类型） | — | — | `fieldType` | 由 `TypeInference` 推断 |
| `labelName` | String | `""` | `labelName` | 空 → 使用 i18n key |
| `description` | String | `""` | `description` | |
| `fieldType` | `FieldType[]` | `{}` | `fieldType` | 单元素覆盖；**`OPTION` / `MULTI_OPTION` 不能显式书写** |
| `columnName` | String | `""` | `columnName` | 空 → `snake_case(fieldName)` |
| `length` | int | `0` | `length` | `0` → 使用类型默认长度；用于 STRING / DECIMAL 精度 |
| `scale` | int | `0` | `scale` | DECIMAL 小数位 |
| `required` | boolean | `false` | `required` | NOT NULL 约束 |
| `readonly` | boolean | `false` | `readonly` | UI 提示 |
| `translatable` | boolean | `false` | `translatable` | 多语言列 |
| `nonCopyable` | boolean | `false` | `nonCopyable` | 排除在 `copy()` 之外 |
| `unsearchable` | boolean | `false` | `unsearchable` | 排除在默认搜索之外 |
| `computed` | boolean | `false` | `computed` | 需要配合 `expression` |
| `expression` | String | `""` | `expression` | AviatorScript 表达式 |
| `dynamic` | boolean | `false` | `dynamic` | 不进行物理存储 |
| `encrypted` | boolean | `false` | `encrypted` | 静态加密 |
| `maskingType` | `MaskingType[]` | `{}` | `maskingType` | 单元素 |
| `defaultValue` | String | `""` | `defaultValue` | |
| `relatedModel` | String | `""` | `relatedModel` | 空 → 从 POJO 类型推断；当 Java 类型是 `Long` 用于存外键 id 时**必填** |
| `relatedField` | String | `""` | `relatedField` | 空 → `"id"` |
| `joinModel` | String | `""` | `joinModel` | 多对多关联表 |
| `joinLeft` | String | `""` | `joinLeft` | |
| `joinRight` | String | `""` | `joinRight` | |
| `cascadedField` | String | `""` | `cascadedField` | 点号路径，如 `"owner.name"` |
| `filters` | String | `""` | `filters` | 关联的过滤表达式 |
| `widgetType` | `WidgetType[]` | `{}` | `widgetType` | 单元素覆盖 |
| （扫描器写入） | — | — | `modelName` | 来自外层 `@Model` 类 |
| （扫描器写入） | — | — | `optionSetCode` | 当 `fieldType` 为 `OPTION` / `MULTI_OPTION` 时从枚举类型推断 |
| （扫描器写入） | — | — | `appId` / `id` / `ownership` | |
| （外键初始化后回填） | — | — | `modelId` | |
| （不通过 `@Field` 暴露） | — | — | `hidden` | 仅 UI 层标记，由 Studio 设置 |

### `@OptionSet` ↔ `SysOptionSet`

> 运行时行为、缓存机制与 API 返回形态：见 [选项集](../../features/metadata/option)。

| `@OptionSet` 属性 | 类型 | 默认值 | `SysOptionSet` 列 | 说明 |
|---|---|---|---|---|
| （枚举的简单名） | — | — | `optionSetCode` | 推断得到，不可覆盖 |
| `name` | String | `""` | `name` | 显示标签；空 → 使用 i18n key |
| `description` | String | `""` | `description` | |
| （扫描器写入） | — | — | `appId` / `id` / `ownership` | |
| （Studio 切换） | — | — | `deleted` / `optionItems` | 运行时聚合 |

### `@OptionItem` ↔ `SysOptionItem`

> 展示属性（`itemTone`、`itemIcon`）与 API 返回形态：见 [选项集](../../features/metadata/option)。

| `@OptionItem` 属性 | 类型 | 默认值 | `SysOptionItem` 列 | 说明 |
|---|---|---|---|---|
| （枚举上 `@JsonValue` 字段的值） | — | — | `itemCode` | 无 `@JsonValue` 时兜底使用 `enum.name()` |
| （外层枚举的简单名） | — | — | `optionSetCode` | 推断得到 |
| `itemName` | String | `""` | `itemName` | 空 → 兜底使用 `itemCode` |
| `description` | String | `""` | `description` | |
| `sequence` | int | `-1` | `sequence` | `-1` → 使用 `ordinal() + 1` |
| `parentItemCode` | String | `""` | `parentItemCode` | 层级关系 |
| `itemTone` | `OptionItemTone[]` | `{}` | `itemTone` | 单元素 |
| `itemIcon` | `OptionItemIcon[]` | `{}` | `itemIcon` | 单元素 |
| （扫描器写入） | — | — | `appId` / `id` / `ownership` / `optionSetId` | |
| （Studio 切换） | — | — | `active` | |

### `@Index` ↔ `SysModelIndex`

`@Index` 是 `@Repeatable` 的——可以在同一个 `@Model` 类上叠加多次声明。

| `@Index` 属性 | 类型 | 默认值 | `SysModelIndex` 列 | 说明 |
|---|---|---|---|---|
| （外层类） | — | — | `modelName` | 推断得到 |
| `name` | String | `""` | `name` | 显示标题；为空时由字段自动派生 |
| `name`（或自动派生） | — | — | `indexName` | 非唯一索引 `idx_<table>_<col>...`，唯一索引 `uk_<table>_<col>...` |
| `fields` | String[] | 必填 | `indexFields` | **驼峰式的 Java 字段名**，不是列名 |
| `unique` | boolean | `false` | `uniqueIndex` | |
| （扫描器写入） | — | — | `appId` / `id` / `ownership` | |
| （外键初始化后回填） | — | — | `modelId` | |

**注意**：`@Model.businessKey` **不会**自动创建唯一索引。
多租户模型通常需要 `UNIQUE (tenant_id, businessKey...)`，
这种带租户语义的索引无法仅通过 `@Index` 表达——请显式声明：

```java
@Index(fields = {"tenantId", "code"}, unique = true)
```

## 行归属（`Ownership` 枚举）

`sys_model` / `sys_field` / `sys_option_set` / `sys_option_item` /
`sys_model_index` 中的每一行都带有 `ownership` 列
（`io.softa.framework.orm.enums.Ownership`）：

| 取值 | 写入方 | 租户是否可改？ |
|---|---|---|
| `PLATFORM_MAINTAINED` | 扫描器（来自 `@Model` / `@Field` / `@OptionSet` / `@OptionItem` / `@Index`） | ❌ |
| `PLATFORM_DEFAULT` | Studio Open API / DML 种子数据（用于诸如 `Language` 这类无法承载 `@OptionSet` 的框架枚举） | ✅ 可逐行覆盖 |
| `TENANT`（默认） | Studio 界面 / Open API | ✅ |

扫描器的读写都带有 `WHERE ownership = 'PLATFORM_MAINTAINED'` 过滤条件，
因此平台默认值与租户的自定义内容不会被一次注解对齐操作覆盖。

完整的合并规则契约见 `Ownership.java` 的 javadoc。

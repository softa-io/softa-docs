# 模型元数据

> **另见**：若要通过 Java 实体类上的注解声明这些属性，请参阅 [`@Model` 注解](../../backend_dev/model_dev/annotation#model--sysmodel)。

在 Softa 中，元数据存在三种形态：DesignTime Metadata、Runtime Metadata 和 InMemory Metadata。以下是其用场景区分：

(1) **DesignTime Metadata：** 设计时元数据，使用可视化工具编辑、版本化和发布。

(2) **Runtime Metadata：** 系统运行时依赖的元数据，也是业务系统中存储的已发布元数据。

(3) **InMemory Metadata：** 内存中的元数据，主要基于 Runtime Metadata，按应用场景进行属性过滤、计算和结果缓存。

下面先介绍 Runtime Metadata。

## 1. 模型简介

此处的模型指业务系统中的数据模型，亦称数据对象。数据模型是业务系统的核心概念，提供业务数据属性与关联的抽象定义。通过数据模型，系统能更好地存储、检索和处理业务数据。

在 Softa 中，每个模型对应一张存储数据的数据表，通常是关系数据库中的表。但 Softa 也支持将模型数据存储在非关系数据库中。通过配置模型元数据的 StorageType 属性，可按应用场景将模型数据存储在 ElasticSearch 或 OLAP 分析存储中。

## 2. 模型元数据

模型元数据描述并定义数据模型，包括模型的存储、结构、属性、关联、行为及其他扩展信息。

> 模型元数据常见属性见下表：

| 序号 | 模型属性 | 数据类型 | 说明 | 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 1 | label | String | 模型标签 |  | 必填 |
| 2 | modelName | String | 模型技术名 |  | 必填 |
| 3 | renamedFrom | String | 重命名时紧邻的前一个模型名 |  | 单步，无链 |
| 4 | copyable | Boolean | 复制 API 是否接受此模型 | true | `false` ⇒ 复制 API 拒绝 + UI 隐藏 Duplicate |
| 5 | softDelete | Boolean | 启用软删除 | false |  |
| 6 | defaultOrder | String | 默认排序规则 |  |  |
| 7 | displayName | MultiString | 显示名称（字段列表） |  |  |
| 8 | searchName | MultiString | 快速搜索（字段列表） |  |  |
| 9 | tableName | String | 数据库表 |  | 只读 |
| 10 | timeline | Boolean | 是否为 timeline 模型 | false |  |
| 11 | idStrategy | Option | 主键生成策略 | DbAutoID |  |
| 12 | storageType | Option | 存储类型 | RDBMS |  |
| 13 | versionLock | Boolean | 启用乐观锁 | false |  |
| 14 | multiTenant | Boolean | 启用多租户控制 | false |  |
| 15 | dataSource | String | 数据源键 |  | 模型级多数据源 |
| 16 | businessKey | MultiString | 业务键（字段列表） |  |  |
| 17 | partitionField | String | 分区字段技术名 |  |  |
| 18 | description | String | 模型描述 |  |  |
| 19 | modelFields | OneToMany | 模型字段 |  |  |

### 2.1 `label` 模型标签

模型的业务名称，如 `Product Category`。

### 2.2 `modelName` 模型技术名

模型的技术名，使用大驼峰。例如 `ProductCategory`。在生成实体代码的场景中，对应实体类名。

### 2.3, `softDelete` 启用软删除

是否为此模型启用软删除功能。在业务系统中，须将被引用数据模型设为软删除，以避免影响历史数据关联的显示。

当模型的 `softDelete` 属性配置为 `true` 时，系统自动为模型添加 `deleted` 字段（可通过 `softDeleteField` 配置，默认 `"deleted"`）。软删除会将 `deleted=true`，而非物理删除行。默认搜索与关联字段查找会排除软删除行，除非查询显式过滤软删除字段。

### 2.4 `defaultOrder` 默认排序规则

在模型数据分页的场景中，客户端指定排序规则时优先。未指定排序条件时，为在不同场景中保持相对一致的排序，模型定义 `defaultOrder` 字段，表示模型采用的默认排序规则。

例如 `name ASC` 表示按 `name` 字段升序。多字段可有不同排序条件，多个排序条件以逗号分隔，如 `name ASC, amount DESC`。未指定 ASC 或 DESC 时默认 ASC 升序，等价于 `name, amount DESC`。

分页模型数据时的排序优先级：
* (1) 客户端指定的排序条件；
* (2) 模型的默认排序规则；
* (3) 全局默认排序规则 ``id ASC``。

非分页查询不指定默认排序规则。

### 2.5 `displayName` 显示名称

> 配置一个或多个字段技术名。配置多个字段时用逗号分隔。

模型数据的显示名称，用于 One2One 和 Many2One 字段的显示名称，以及在这两种字段类型下搜索时的数据显示名。支持配置多个字段，字段技术名以逗号分隔。

例如，员工模型的显示名称配置为 `name, number` 时，在涉及 One2One、Many2One 字段及搜索员工的场景中，将显示为 `Employee Name / Employee Number`。多字段数据之间使用全局分隔符，示例使用 `/`。

模型数据显示名称的优先级：
* (1) 若模型配置了 `displayName`，优先使用；
* (2) 若模型未配置 `displayName` 但包含 `name` 字段，使用 `name` 字段值作为显示名；
* (3) 若模型既无 `displayName` 也无 `name` 字段，使用 `id` 作为显示名。

### 2.6 `searchName` 搜索名称

> 配置一个或多个字段技术名。配置多个字段时用逗号分隔。

快速搜索字段，支持在单一搜索条件中搜索多个字段。例如快速搜索客户时，支持搜索客户名称、客户编号和联系电话。

### 2.7 `tableName` 表名
只读字段，模型对应的数据库表名，从模型名自动转换，如 `product_category`。模型名变更时表名自动同步。可通过配置全局 DDL 开关禁用表名自动修改，以满足通过其他方式提交 DDL 的场景。

### 2.8 `timeline` Timeline

业务数据版本化管理的配置属性。模型配置 `timeline=true` 时，自动添加三个字段：`sliceId`、`effectiveStartDate` 和 `effectiveEndDate`。业务处理规则概要如下，详见 timeline 设计文档。

* (1) 处理 timeline 模型数据 CRUD 时，解析 `effectiveDate` 参数；
* (2) 支持查询任意时间点的 timeline，并支持修改和插入切片；
* (3) 要检索跨时间段的 timeline 数据，只需在查询中传入 `effectiveStartDate` 或 `effectiveEndDate` 条件参数。

### 2.9 `idStrategy` 主键生成策略

支持三种主键生成策略：
* (1) `DbAutoID`：数据库自增主键 ID，默认策略。
* (2) `DistributedLong`：
    - Long 类型的分布式唯一 ID（64 位）。
    - CosID 库实现的 SnowflakeId。
    - 时间有序，41 位时间戳、10 位机器 ID、12 位序列号。
    - 适用于分布式系统，确保多节点唯一性。
* (3) `DistributedString`：
    - String 类型的分布式唯一 ID
    - CosID 库实现的 SnowflakeId。
    - Base36 编码，结果为 13 字符字符串。
    - 亦可配置为 Base62，结果为 11 字符字符串。
    - 适用于无大规模数据量要求的分布式系统。
* (4) `ExternalId`：外部输入 ID。

### 2.10 `storageType` 存储类型

* (1) `RDBMS`：存储在关系数据库，适用于日常业务数据 CRUD 场景，默认存储类型。
* (2) `ES`：模型数据存储在 ElasticSearch，适用于搜索、日志存储等应用场景。
* (3) `Doris`：OLAP 数据分析场景。

### 2.11 `versionLock` 启用乐观锁

在数据一致性要求高的业务场景中，启用乐观锁有助于避免不同用户同时修改同一数据造成的冲突。

### 2.12 `multiTenant` 多租户控制

启用多租户控制前，须启用全局多租户配置。然后为数据模型启用多租户控制时，模型自动添加 `tenantId` 字段。数据 CRUD 操作时该字段自动赋值，实现租户间数据强制隔离。

### 2.13 `dataSource` 数据源键

在模型级启用多数据源配置时，可可选指定模型的数据源键，指示模型数据存储在哪个数据源。

若未指定数据源键，模型数据存储在默认数据源。详情参阅 [多数据源](../../backend_dev/architecture/datasource)。

### 2.14 `businessKey` 业务键

除模型主键 ID 字段外，可为模型指定业务键以唯一标识模型数据。业务键可为单字段或多字段组合。

在代码层，可使用业务键检索、更新或删除数据。

### 2.15 `partitionField` 分区字段

适用于涉及大数据量关系数据库的场景。指定自动分区规则的字段配置。目前仅支持单个分区字段。

### 2.16 `description` 模型描述

模型的描述信息。

### 2.17 `modelFields` 模型字段

模型字段列表。更多细节见 `Field Metadata`。

## 3. 模型定义

在 Softa 中，模型的通用属性提取为两个基础实体，即 `BaseModel` 和 `TimelineModel`。其中 `TimelineModel` 继承自 `BaseModel`。

### 3.1 `BaseModel`

`BaseModel` 作为所有实体模型的父类，内置 `id` 主键和审计字段，如下：

| 字段名 | 说明 | 备注 |
| --- | --- | --- |
| id | 主键 ID | 支持策略配置 |
| createdId | 创建人 ID | 审计字段 |
| createdTime | 创建时间 | 审计字段 |
| updatedId | 最后更新人 ID | 审计字段 |
| updatedTime | 最后更新时间 | 审计字段 |

普通业务模型继承 `BaseModel`，如下：

```java
public class UserProfile extends BaseModel {
		@Schema(description = "Name")
    private String name;
}
```

### 3.2 `TimelineModel`

所有 timeline 业务模型实体继承 `TimelineModel`。由于 `TimelineModel` 本身扩展 `BaseModel`，timeline 业务模型实体自动拥有 `id`、`createdId`、`createdTime`、`updatedId`、`updatedTime` 等基本属性。此外 timeline 模型还有以下属性：

| 字段名 | 说明 |
| --- | --- |
| sliceId | 切片主键 |
| effectiveStartDate | 生效开始日期 |
| effectiveEndDate | 生效结束日期 |

```java
public abstract class TimelineModel extends BaseModel {
}
```

### 3.3 业务模型定义
具体业务模型继承 `BaseModel` 或 `TimelineModel`，以 UserProfile 为例：

```java
@Data
@Schema(name = "User Profile")
@EqualsAndHashCode(callSuper = true)
public class UserProfile extends BaseModel {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "name")
    private String name;
}
```

在自动生成的实体类中，根据模型配置选择父类，开发者无需手动指定。

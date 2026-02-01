# Model

在 Softa 中，元数据存在三种形态：DesignTime Metadata、Runtime Metadata、InMemory Metadata，以下是它们的应用场景区分：

（1）DesignTime Metadata：设计时的元数据，使用可视化工具进行编辑、版本化管理和发布管理。

（2）Runtime Metadata：系统运行时所依赖的元数据，同时也是已发布的元数据，存储在业务系统中的 Runtime Metadata 中。

（3）InMemory Metadata：内存中的元数据，主要基于 Runtime Metadata 根据应用场景进行属性筛选、计算和结果缓存。

这里先介绍 Runtime Metadata 。

## 1、模型介绍

模型指的是业务系统中的数据模型，也叫数据对象。数据模型是业务系统中的核心概念，是对业务数据的属性及其关系的抽象定义。通过数据模型，系统能够更好地存储、检索和处理业务数据。

在 Softa 中，每个模型对应一张数据表来存储数据，一般是关系型数据库中的数据表。但 Softa 也支持将模型数据存储在非关系型数据库中。通过模型元数据的 StorageType 属性配置，可以根据应用场景，将模型数据存储在 ElasticSearch 或 OLAP 数据分析存储中。

## 2、模型元数据

模型元数据是描述和定义数据模型的数据，也即模型的元信息，包括模型的存储、结构、属性、关系、行为以及其它扩展信息。

> 模型元数据常见属性如下表：
>

| 序号 | 模型属性 | 数据类型 | 描述 | 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 1 | labelName | String | 模型标签名称 |  | 必填 |
| 2 | modelName | String | 模型的技术名称 |  | 必填 |
| 3 | softDelete | Boolean | 启用软删除 | false |  |
| 4 | defaultOrder | String | 默认排序规则 |  |  |
| 5 | displayName | MultiString | 显示名称（字段列表） |  |  |
| 6 | searchName | MultiString | 快捷查询（字段列表） |  |  |
| 7 | tableName | String | 数据库表 |  | 只读 |
| 8 | timeline | Boolean | 是否时间轴模型 | false |  |
| 9 | idStrategy | Option | 主键生成策略 | DbAutoID |  |
| 10 | storageType | Option | 存储类型 | RDBMS |  |
| 11 | versionLock | Boolean | 启用乐观锁 | false |  |
| 12 | multiTenant | Boolean | 多租户控制 | false |  |
| 13 | dataSource | String | 数据源Key |  | 模型级多数据源 |
| 14 | businessKey | MultiString | 业务主键（字段列表） |  |  |
| 15 | partitionField | String | 分区字段技术名称 |  |  |
| 16 | description | String | 模型描述 |  |  |
| 17 | modelFields | OneToMany | 模型字段 |  |  |

### 2.1、`labelName` 模型标签名称

模型的业务名称，如 `产品类别`。

### 2.2、`modelName` 模型技术名称

模型技术名称，模型名使用大驼峰命名。如 `ProductCategory`。在生成实体代码的场景中，对应实体类名。

### 2.3、`softDelete` 启用软删除

是否针对该模型，启用数据软删除功能。在业务系统中，需要将被引用的数据模型设置为软删除，以免影响历史数据的关联显示。

当模型的 `softDelete` 属性被配置为 `true` 时，系统自动给该模型添加 `disabled` 字段，用来表达删除行为实际上是禁用数据。
该模型数据被删除时，通过更新 `disabled=true` 禁用该数据，被禁用的数据，默认不会出现在关系型字段引用时的搜索结果中，除非在查询条件中，主动增加相关查询条件。

注：这里实际上简化了数据软删除和数据禁用两个场景，由于所有被物理删除的数据都会记录在 `ChangeLog` 中，因此将软删除的行为，等同于将数据设置为禁用。

### 2.4、`defaultOrder` 默认排序规则

在分页查询模型数据的场景下，当客户端指定了排序规则时，以客户端指定的排序规则为优先条件。当未指定排序条件时，为了确保在不同场景下，有一个相对一致的排序条件，给模型定义了 defaultOrder 字段，即模型默认采用的排序规则。

如 `name ASC` 表示按照 name 字段值正序排列。支持多个字段使用不同的排序条件，多个排序条件间使用半角逗号间隔，如 `name ASC, amount DESC`，不指定 ASC 或 DESC 排序时，默认采用 ASC 升序排列，即等同于 `name, amount DESC`。

分页查询模型数据时的排序优先级：
* （1）客户端指定的排序条件；

* （2）模型默认排序规则；

* （3）全局默认排序规则 ``id ASC`` 。

非分页查询不指定默认排序规则。

### 2.5、`displayName` 显示名称

> 配置单个或多个字段技术名称，多个字段时技术名称间使用半角逗号间隔。

模型数据的显示名称，应用于 One2One、Many2One 字段的显示名称，及这两种字段下拉搜索时的数据显示名称。支持配置多个字段，字段技术名称间使用半角逗号间隔。

如当员工模型的 displayName 配置为 `name, number` 时， One2One、Many2One 字段和下拉搜索员工的场景中，显示为 `员工姓名 / 员工工号`。多个字段的数据之间，使用全局间隔符隔开，示例为 `/`。

模型数据显示名称的优先级：
* （1）如果模型配置了 displayName，则优先使用 displayName；
* （2）如果模型未配置 displayName，但模型包含 name 字段，则使用 name 字段值作为显示名称。
* （3）如果模型既没有配置 displayName，也不包含 name，则使用 id 作为显示名称。

### 2.6、`searchName` 搜索名称

> 配置单个或多个字段技术名称，多个字段时技术名称间使用半角逗号间隔。

快捷查询字段，支持在单个搜索条件查找多个字段。如在快捷搜索客户时，支持客户名称、客户编号、联系电话搜索。

### 2.7、`tableName` 数据表名
只读字段，模型对应的数据库表名，由模型名自动转换，如 `product_category`。
模型名变化时，默认自动同步修改表名称。可以通过全局 DDL 开关配置关闭自动修改表名，以满足通过其它方式提交 DDL 的场景。

### 2.8、`timeline` 时间轴模型

是否对业务数据进行版本化管理的配置属性，当模型配置 `timeline=true` 时，自动添加 sliceId、effectiveStartDate、effectiveEndDate 三个字段。业务处理规则概要如下，详见时间轴设计文档。

* （1）需要CRUD处理时间轴模型数据时，解析 effectiveDate 参数；

* （2）支持查询时间在任意时间点移动，支持修改切片、插入切片。

* （3）需要获取跨时间段的时间轴数据时，查询参数中传递 effectiveStartDate 或 effectiveEndDate 条件参数即可。

### 2.9、`idStrategy` 主键生成策略

支持3种主键生成策略：
* （1）DbAutoID：数据库自增主键 ID，默认策略。
* （2）ULID：唯一有序ID，26个字符长度（Base32）, 10个字符时间戳 + 16个字符随机数。
* （3）TSIDLong：长整数类型的时间有序ID，SnowflakeID 变种。
* （4）TSIDString：字符串类型的时间有序ID，13个字符长度，SnowflakeID 变种。
* （5）UUID：程序自动生成的标准 UUID。
* （6）ExternalId：外部输入 ID

### 2.10、`storageType` 存储类型

* （1）RDBMS：关系型数据库存储，适合日常业务数据的增删改查场景，默认存储类型

* （2）ES：模型数据存储 ElasticSearch 中，适用于搜索、日志存储等应用场景。

* （3）Doris：OLAP 数据分析场景。

### 2.11、`versionLock` 启用乐观锁

在对数据一致性要求比较高的业务场景中，启用乐观锁，来避免不同用户同时修改同一条数据导致的冲突。

### 2.12、`multiTenant` 多租户控制

启用多租户控制前，需要先全局启用多租户配置。然后，对数据模型启用多租户控制时，自动为该模型增加 tenantId 字段，并在数据增删改查过程中，自动对该字段进行赋值，从而实现租户间数据的强制隔离。

### 2.13、`dataSource` 数据源Key

当启用模型级多数据源配置时，可以选择性指定模型的数据源Key，用于指定模型数据存储在哪个数据源中。

当未指定数据源Key时，模型数据存储在默认数据源中。具体参考 [多数据源](../../develop/datasource)。

### 2.14、`businessKey` 业务主键
除了模型主键 ID 字段外，还可以指定模型的业务主键，用于唯一标识模型数据。业务主键可以是单个字段，也可以是多个字段的组合。

在代码层面，可以根据业务主键查找数据、更新数据和删除数据。

### 2.15、`partitionField` 分区字段

应用于关系型数据库大数据量场景，自动分区规则的字段配置，目前设计中，仅支持设置单个分区字段。

### 2.16、`description` 模型描述

模型的描述信息。

### 2.17、`modelFields` 模型字段

模型的字段列表，详见`字段元数据`。

## 3、模型定义

在 Softa 中，将模型的公共属性抽取到了两个基础实体中，分别是 BaseModel 和 TimelineModel。其中 TimelineModel 又是继承自 BaseModel。

### 3.1、BaseModel 基础模型父类

BaseModel 作为一切实体模型的父类，内置 id 主键和审计字段，说明如下：

| 字段名 | 描述 | 备注 |
| --- | --- | --- |
| id | 主键 ID | 支持策略配置 |
| createdId | 创建人 ID | 审计字段 |
| createdTime | 创建时间 | 审计字段 |
| updatedId | 最近更新人 ID | 审计字段 |
| updatedTime | 最近更新时间 | 审计字段 |

普通业务模型，继承自 BaseModel，如：

```java
public class UserProfile extends BaseModel {
		@Schema(description = "Name")
    private String name;
}
```

### 3.2、TimelineModel 时间轴模型父类

所有的时间轴业务模型实体类继承自 TimelineModel 。由于TimelineModel 继承自 BaseModel，因此时间轴业务模型实体自动具备 id、createdId、createdTime、updatedId、updatedTime 这些基础属性。在次之外，时间轴模型还具备以下属性：

| 字段名 | 描述 |
| --- | --- |
| sliceId | 时间轴切片 ID，也即切片的主键 ID |
| effectiveStartDate | 有效开始时间 |
| effectiveEndDate | 有效结束时间 |

```java
public abstract class TimelineModel extends BaseModel {
}
```

### 3.3、业务模型定义

具体的业务模型继承自 `BaseModel` 或 `TimelineModel` ，如 UserProfile 定义：

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

在自动生成的实体类中，会自动根据模型配置选择父类，不需要开发者手动指定。

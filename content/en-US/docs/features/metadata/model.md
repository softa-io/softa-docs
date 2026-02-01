# Model Metadata

In Softa, metadata exists in three forms: DesignTime Metadata, Runtime Metadata, and InMemory Metadata. Here is the differentiation of their use cases:

(1) **DesignTime Metadata:** Metadata at design time, edited, versioned, and published using visual tools.

(2) **Runtime Metadata:** Metadata that the system relies on during runtime, also the published metadata stored in the business system.

(3) **InMemory Metadata:** Metadata in memory, mainly based on Runtime Metadata for attribute filtering, calculation, and result caching based on application scenarios.

Let's start by introducing Runtime Metadata.

## 1. Model Introduction

The model here refers to the data model in the business system, also known as data object. The data model is a core concept in the business system, providing an abstract definition of the properties and relationships of business data. Through the data model, the system can better store, retrieve, and process business data.

In Softa, each model corresponds to a data table for storing data, usually a data table in a relational database. However, Softa also supports storing model data in non-relational databases. By configuring the StorageType property of model metadata, model data can be stored in ElasticSearch, or OLAP data analysis storage according to application scenarios.

## 2. Model Metadata

Model metadata describes and defines the data model, including the storage, structure, properties, relationships, behaviors, and other extension information of the model.

> Common attributes of model metadata are shown in the table below:

| Number | Model Attribute | Data Type | Description | Default Value | Remarks |
| --- | --- | --- | --- | --- | --- |
| 1 | labelName | String | Model label name |  | Required |
| 2 | modelName | String | Model technical name |  | Required |
| 3 | softDelete | Boolean | Enable soft delete | false |  |
| 4 | defaultOrder | String | Default sorting rule |  |  |
| 5 | displayName | MultiString | Display name (field list) |  |  |
| 6 | searchName | MultiString | Quick search (field list) |  |  |
| 7 | tableName | String | Database table |  | Read-only |
| 8 | timeline | Boolean | Is a timeline model | false |  |
| 9 | idStrategy | Option | Primary key generation strategy | DbAutoID |  |
| 10 | storageType | Option | Storage type | RDBMS |  |
| 11 | versionLock | Boolean | Enable optimistic locking | false |  |
| 12 | multiTenant | Boolean | Enable multi-tenant control | false |  |
| 13 | dataSource | String | Data source key |  | Model-level multi-data-source |
| 14 | businessKey | MultiString | Business Key (Field List) |  |  |
| 15 | partitionField | String | Partition field technical name |  |  |
| 16 | description | String | Model description |  |  |
| 17 | modelFields | OneToMany | Model fields |  |  |

### 2.1 `labelName` Model Label Name

The business name of the model, such as `Product Category`.

### 2.2 `modelName` Model Technical Name

The technical name of the model, using upper camel case. For example, `ProductCategory`. In scenarios where entity code is generated, it corresponds to the entity class name.

### 2.3, `softDelete` Enable Soft Delete

Whether to enable the soft delete function for this model. In business systems, it is necessary to set referenced data models to soft delete to avoid affecting the display of historical data associations.

When the `softDelete` attribute of the model is configured to `true`, the system automatically adds a `disabled` field to the model to express that the deletion behavior is actually disabling the data.
When the model data is deleted, it is disabled by updating `disabled=true`. The disabled data, by default, will not appear in the search results of relational field references unless related query conditions are actively added in the query.

Note: Here, the scenarios of data soft deletion and data disabling are actually simplified. Since all physically deleted data will be recorded in `ChangeLog`, the behavior of soft deletion is equated to setting the data as disabled.

### 2.4 `defaultOrder` Default Sorting Rule

In scenarios where model data is paginated, when the client specifies a sorting rule, it takes precedence. When no sorting conditions are specified, to ensure a relatively consistent sorting condition in different scenarios, the model defines a `defaultOrder` field, which represents the default sorting rule adopted by the model.

For example, `name ASC` means sorting by the `name` field in ascending order. Multiple fields can have different sorting conditions, and multiple sorting conditions are separated by commas, such as `name ASC, amount DESC`. When ASC or DESC sorting is not specified, ASC ascending order is used by default, equivalent to `name, amount DESC`.

Sorting priority when paginating model data:
* (1) Sorting conditions specified by the client;
* (2) Model's default sorting rule;
* (3) Global default sorting rule ``id ASC``.

No default sorting rule is specified for non-paginated queries.

### 2.5 `displayName` Display Name

> Configure one or more field technical names. When configuring multiple fields, separate them with commas.

The display name of model data, used for the display name of One2One and Many2One fields, and the data display name when searching under these two field types. Supports configuring multiple fields, with field technical names separated by commas.

For example, when the display name of the employee model is configured as `name, number`, in scenarios involving One2One, Many2One fields, and searching for employees, it will be displayed as `Employee Name / Employee Number`. The global separator is used between data for multiple fields, and the example uses `/`.

Priority for displaying model data names:
* (1) If the model is configured with `displayName`, use it as a priority;
* (2) If the model is not configured with `displayName` but contains the `name` field, use the `name` field value as the display name;
* (3) If the model has neither `displayName` nor `name` field, use `id` as the display name.

### 2.6 `searchName` Search Name

> Configure one or more field technical names. When configuring multiple fields, separate them with commas.

Quick search fields, supporting multiple fields in a single search condition. For example, when quick searching for customers, it supports searching for customer name, customer number, and contact phone.

### 2.7 `tableName` Table Name
Read-only field, the database table name corresponding to the model, automatically converted from the model name, such as `product_category`. When the model name changes, the table name is automatically synchronized. The automatic modification of table names can be disabled by configuring the global DDL switch to meet scenarios where DDL is submitted through other means.

### 2.8 `timeline` Timeline

Configuration property for versioned management of business data. When the model is configured with `timeline=true`, automatically adds three fields: `sliceId`, `effectiveStartDate`, and `effectiveEndDate`. The business processing rules are outlined as follows, see the timeline design document for details.

* (1) When handling timeline model data CRUD, parse the `effectiveDate` parameter;
* (2) Supports querying the timeline at any point in time, and supports modifying and inserting slices;
* (3) To retrieve timeline data across time periods, simply pass the `effectiveStartDate` or `effectiveEndDate` condition parameters in the query.

### 2.9 `idStrategy` Primary Key Generation Strategy

Supports three primary key generation strategies:
* (1) `DbAutoID`: Database auto-increment primary key ID, the default strategy.
* (2) `ULID`: Unique Lexicographically Sortable Identifier, 128-bit with 48-bit timestamp and 80-bit random value. 26-character string with 10-character timestamp and 16-character random value.
* (3) `TSIDLong`: Numeric TSID, Combined SnowflakeID and ULID, 64-bit with 42-bit timestamp, 10-bit server ID and 12-bit sequence number by default.
* (4) `TSIDString`: 13-character string TSID.
* (5) `UUID`: Programmatically generated standard UUID, with 32-character hexadecimal string.
* (6) `ExternalId`: External input ID.

### 2.10 `storageType` Storage Type

* (1) `RDBMS`: Storage in a relational database, suitable for everyday business data CRUD scenarios, default storage type.
* (2) `ES`: Model data stored in ElasticSearch, suitable for search, log storage, and other application scenarios.
* (3) `Doris`: OLAP data analysis scenario.

### 2.11 `versionLock` Enable Optimistic Locking

In business scenarios where data consistency requirements are high, enabling optimistic locking helps avoid conflicts caused by different users simultaneously modifying the same data.

### 2.12 `multiTenant` Multi-tenant Control

Before enabling multi-tenant control, the global multi-tenant configuration needs to be enabled. Then, when enabling multi-tenant control for data models, the model is automatically added with a `tenantId` field. During data CRUD operations, this field is automatically assigned a value, achieving enforced isolation of data between tenants.

### 2.13 `dataSource` Data Source Key

When enabling multi-data-source configuration at the model level, you can optionally specify the data source key for the model, indicating which data source the model data is stored in.

If the data source key is not specified, the model data will be stored in the default data source. For details, refer to [Multi-Data Source](../../develop/datasource).

### 2.14 `businessKey` Business Key

In addition to the model's primary key ID field, you can specify a business key for the model to uniquely identify model data. The business key can be a single field or a combination of multiple fields.

At the code level, you can use the business key to retrieve, update, or delete data.

### 2.15 `partitionField` Partition Field

This applies to scenarios involving relational databases with large volumes of data. It specifies the field configuration for automatic partitioning rules. Currently, only a single partition field is supported.

### 2.16 `description` Model Description

Description information for the model.

### 2.17 `modelFields` Model Fields

A list of the model's fields. For more details, see `Field Metadata`.

## 3. Model Definition

In Softa, the common properties of models are extracted into two basic entities, namely `BaseModel` and `TimelineModel`. Where `TimelineModel` is inherited from `BaseModel`.

### 3.1 `BaseModel`

`BaseModel` serves as the parent class for all entity models, with built-in `id` primary key and audit fields, as described below:

| Field Name | Description | Remarks |
| --- | --- | --- |
| id | Primary key ID | Supports strategy configuration |
| createdId | Creator ID | Audit field |
| createdTime | Creation time | Audit field |
| updatedId | Last update person ID | Audit field |
| updatedTime | Last update time | Audit field |

Ordinary business models inherit from `BaseModel`, as shown below:

```java
public class UserProfile extends BaseModel {
		@Schema(description = "Name")
    private String name;
}
```

### 3.2 `TimelineModel`

All entities of timeline business models inherit from `TimelineModel`. As `TimelineModel` itself extends `BaseModel`, the timeline business model entities automatically possess basic attributes such as `id`, `createdId`, `createdTime`, `updatedId`, and `updatedTime`. In addition, the timeline model also has the following attributes:

| Field Name | Description |
| --- | --- |
| sliceId | Primary key of the slice |
| effectiveStartDate | Effective start date |
| effectiveEndDate | Effective end date |

```java
public abstract class TimelineModel extends BaseModel {
}
```

### 3.3 Business Model Definitions
Specific business models inherit from either `BaseModel` or `TimelineModel`, as illustrated by the example of UserProfile:

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

In automatically generated entity classes, the parent class is selected based on the model configuration, eliminating the need for developers to specify it manually.

# Field Metadata

> **See also**: To declare these attributes on a Java entity field via annotations, see [`@Field` annotation](../../backend_dev/model_dev/annotation#field--sysfield).

Field metadata is a collection of descriptive information about model fields. It defines the fields used by a model in business scenarios, as well as the type, length, default value, required/readonly constraints, relationships, and more. With this metadata, Softa can handle data responses, processing, and interactions in a consistent way, and can abstract common requirements to ensure data consistency, accuracy, and integrity.

## 1. Field Type Overview

| No. | Type | Type Name | Default Value | Description |
| --- | --- | --- | --- | --- |
| 1 | String | String | "" | Configure the maximum string length via `length`. |
| 2 | Integer | Integer | 0 | Configure the number of integer digits via `length`. |
| 3 | Long | Long | 0L |  |
| 4 | Double | Double | 0.00 | General-purpose decimals (precision loss acceptable). |
| 5 | BigDecimal | BigDecimal | "0" | High-precision decimals (money/currency/exchange rate, etc.). |
| 6 | Boolean | Boolean | false |  |
| 7 | Date | Date |  | Format `yyyy-MM-dd`, e.g. `2026-02-01`. |
| 8 | DateTime | DateTime |  | Format `yyyy-MM-dd HH:mm:ss`, e.g. `2026-02-01 12:15:20`. |
| 9 | Option | Single select |  |  |
| 10 | MultiOption | Multi select | [] |  |
| 11 | MultiString | String list | [] |  |
| 12 | File | Single file |  | Virtual field: upload and bind a file. |
| 13 | MultiFile | Multiple files |  | Virtual field: upload and bind multiple files. |
| 14 | JSON | JSON |  | Stored as a JSON string. |
| 15 | Filters | Filters |  | Stores filter conditions (infix expression). |
| 16 | Orders | Orders |  | Stores multi-field ordering conditions. |
| 17 | OneToOne | One-to-one |  | Configure `relatedModel`. |
| 18 | ManyToOne | Many-to-one |  | Configure `relatedModel`. |
| 19 | OneToMany | One-to-many |  | Virtual field: configure `relatedModel` + `relatedField`. |
| 20 | ManyToMany | Many-to-many |  | Virtual field: configure `relatedModel` + `joinModel` + `joinLeft` + `joinRight`. |

> Notes:
> 1. For OneToOne/ManyToOne/OneToMany/ManyToMany, the foreign keys are **logical** foreign keys, not physical database foreign keys.
> 2. Virtual fields do not exist as columns in the current table. When operating on virtual fields, the framework handles the related processing automatically.

**Field types that need additional explanation:**

### 1.1 `Date`

In code, it is a `LocalDate` object. The display format is `yyyy-MM-dd`, e.g. `2026-02-01`.

### 1.2 `DateTime`

A date-time type accurate to seconds. In code, it is a `LocalDateTime` object. In the database, it is stored as a timestamp. The display format is `yyyy-MM-dd HH:mm:ss`, e.g. `2026-02-01 12:15:20`.

### 1.3 `Option`

A single-select field. You must configure the `optionSetCode` attribute (the option set code). For annotation-declared entities it is derived automatically from the enum type.

When saving a single-select field, the value passed and stored is the option item code.

When fetching a single-select field through the API, the default response is an `OptionReference` object (`itemCode` + `label`, plus optional `itemTone` / `itemIcon`).

For option set configuration and usage, see the [Option Set](option) section.

### 1.4 `MultiOption`

Multi-select fields allow selecting multiple options from the same option set. When saving, you pass a list of option item codes, and the database stores the codes separated by `,`.

When reading a multi-select field through the API, the default response is a list of `OptionReference` objects (`[{itemCode, label, ...}, ...]`).

### 1.5 `MultiString`

Used to store multiple string values in a single field. In code, it is processed as a string list; in the database, values are stored separated by `,`.

### 1.6 `File`

Used to upload and bind a single file. The file is automatically stored in the `FileRecord` model.

### 1.7 `MultiFile`

Used to upload and bind multiple files. Files are automatically stored in the `FileRecord` model.

### 1.8 `JSON`

Typically used only for JSON storage and object conversion. If you need indexing or conditional querying on JSON data, you must handle it manually.

### 1.9 `Filters`

Used only for storing the JSON string of a `Filters` object.

### 1.10 `Orders`

Used only for storing the JSON string of an `Orders` object.

### 1.11 `OneToOne`

A relational field. Configure `relatedModel` and `relatedField`. The selected data is unique. Optionally set `onDelete` for the FK delete strategy when the referenced row is deleted (see [`onDelete`](#224-ondelete)).

### 1.12 `ManyToOne`

A relational field. Configure `relatedModel` and `relatedField`. Optionally set `onDelete` for the FK delete strategy when the referenced row is deleted (see [`onDelete`](#224-ondelete)).

### 1.13 `OneToMany`

In most cases, OneToMany data is created, updated, or deleted on the client side for a single record by calling the Many-side model API.

1. **Full submit**: `[{row1}, {row2}]`. When the field value is `[]` in an update API, all related records are cleared.
2. **Patch submit**, with `PatchType` as the key:

```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": 101, "name": "changed" }],
  "Delete": [102, 103]
}
```

For more details, refer to [API Submit](../../backend_dev/api/apiSubmit.md).

3. **API response**: The return shape of a OneToMany field depends on `QueryParams.fields`, `QueryParams.subQueries`, and `ConvertType`. See the OneToMany section in [API Response](../../backend_dev/api/apiResponse.md).

Note:
- `OneToMany` is a virtual field. It queries and binds data based on the logical foreign key of the related model, and the field itself does not have a physical database column.


### 1.14 `ManyToMany`

1. **Full submit**: `[id1, id2, id3]`. The framework computes the diff and creates or deletes join (middle) table rows accordingly.
2. **Patch submit**, with `PatchType` as the key:

```json
{
  "Add": [1, 2, 3],
  "Remove": [4, 5]
}
```

For more details, refer to [API Submit](../../backend_dev/api/apiSubmit.md).

3. **Cascading search for ManyToMany**: Use case—filter records of the current table by conditions on fields in the join table (e.g. “users who were assigned a given role in a time range”). See the [Query Conditions](../../backend_dev/api/apiQuery.md) section.

4. **API response**: The return shape of a ManyToMany field (`List<ModelReference>` or `List<Row Map>`) is determined by `QueryParams.fields`, `QueryParams.subQueries`, and `ConvertType`. See the ManyToMany section in [API Response](../../backend_dev/api/apiResponse.md).

Note:
- `ManyToMany` is also a virtual field. It queries and binds data based on the logical foreign keys in the JoinModel, and the field itself does not have a physical database column.


## 2. Field Metadata Attributes

| No. | Attribute | Data Type | Description | Notes |
| --- | --- | --- | --- | --- |
| 1 | label | String | Field label |  |
| 2 | modelName | String | Model name |  |
| 3 | fieldName | String | Field name |  |
| 4 | renamedFrom | String | Immediately-prior field name for a rename | Single-step, no chain |
| 5 | fieldType | Option | Field type |  |
| 6 | optionSetCode | String | Option set code | Derived from the enum type for annotated entities |
| 7 | defaultValue | String | Default value |  |
| 8 | length | Integer | Field length |  |
| 9 | scale | Integer | Decimal places |  |
| 10 | required | Boolean | Required, default `false` |  |
| 11 | readonly | Boolean | Readonly, default `false` |  |
| 12 | hidden | Boolean | Hidden, default `false` | UI-only flag set via Studio |
| 13 | copyable | Boolean | Copyable, default `true` | `false` ⇒ value not carried by `copyById` |
| 14 | unsearchable | Boolean | Excluded from default search, default `false` |  |
| 15 | dynamic | Boolean | Dynamic, default `false` |  |
| 16 | translatable | Boolean | Translatable, default `false` |  |
| 17 | encrypted | Boolean | Encrypted, default `false` |  |
| 18 | maskingType | Option | Masking type |  |
| 19 | computed | Boolean | Computed, default `false` |  |
| 20 | expression | String | Computation expression |  |
| 21 | cascadedField | String | Cascaded field | Relationship attribute |
| 22 | relatedModel | String | Related model | Relationship attribute |
| 23 | relatedField | String | Related field | For OneToMany: the Many-side field name; TO_ONE joins on `id` only |
| 24 | relatedFieldType | Option | Physical type of a TO_ONE FK column | System-computed, mirrored from the referenced model's `id` |
| 25 | onDelete | Option | TO_ONE FK delete strategy (`RESTRICT` / `CASCADE` / `SET_NULL`) | Unset = KEEP; see [§2.24](#224-ondelete) |
| 26 | joinModel | String | Join model (ManyToMany) | Middle model |
| 27 | joinLeft | String | Left-side field in join model | Stores the left model FK |
| 28 | joinRight | String | Right-side field in join model | Stores the right model FK |
| 29 | filters | String | Relational field filter conditions | Relationship attribute |
| 30 | widgetType | Option | Preferred UI widget |  |
| 31 | columnName | String | Table column name | Read-only |
| 32 | description | String | Field description |  |

### 2.1 `label`

The label (semantic) name of the field. It is typically displayed as a column header on list pages or as a field label on forms, e.g. `Contact Number`.

### 2.2 `modelName`

The model the field belongs to (technical model name), e.g. `ProductCategory`.

### 2.3 `fieldName`

The technical name of the field (lower camelCase), corresponding to the property name in the entity class, e.g. `unitPrice`.

Before querying, Softa converts field names to underscore naming based on the storage type, e.g. `unit_price`.

### 2.4 `fieldType`

The field type from the built-in type set, including string, numeric, date/time, option set, JSON, and relationship types. See the field types section above for details.

### 2.5 `optionSetCode`

Option sets are suitable for business scenarios where options are relatively stable, the number of options is limited, but extensibility is needed. In Softa, option information is stored in the `OptionSet` model and the `OptionItem` model.

When the field type is `Option` or `MultiOption`, you must configure `optionSetCode`.

### 2.6 `defaultValue`

Default value configuration. When creating a new record, if the field is not assigned, the default value will be used.

Default value assignment logic in Create:

1. If the field already has a value (not `NULL`), Softa uses the current value and does not apply the default value. For text fields, an empty string `""` is considered a value; for numeric fields, `0` is also considered a value.
2. If the field is not assigned, Softa uses `defaultValue` first.
3. If `defaultValue` is not configured, Softa uses the global default for the given field type (see field types above).

### 2.7 `length`

Field length: string character length, integer digit count, and digit count for high-precision numeric types.

### 2.8 `scale`

Decimal places for floating-point and high-precision numeric types. The default is 2.

### 2.9 `required`

Required-field validation. Softa validates required fields in the application layer and does not rely on the database.

When creating or updating data, Softa checks the `required` attribute. This is different from the database `NOT NULL` constraint: a database `NOT NULL` column may have a default value and thus may not be “required” from the application’s perspective. Softa’s `required` is stricter:

- When `required=true`, you must provide a value during creation, and the value cannot be empty (including disallowing empty strings).
- When updating the field, you cannot set it to null/empty.

### 2.10 `readonly`

Whether the client is allowed to update this field. If `readonly=true`, the client/API cannot assign or update the field; only server-side updates are allowed (e.g. computed fields or auto-filled fields). Client-side create/update validates this attribute; attempting to assign a value will cause an error.

Audit fields `createdId`, `createdTime`, `updatedId`, `updatedTime` are maintained automatically and are `readonly=true` by default.

### 2.11 `hidden`

Whether the field is hidden by default on the client. Default is `false`.

### 2.12 `copyable`

Whether the field is copied when duplicating data on the client. Default is `true`. All fields are copyable except the primary key `id`.

### 2.13 `searchable`

Whether the field can be used as a query condition in general search. Default is `true`.

### 2.14 `dynamic`

Whether the field is dynamic. Default is `false`.

When `dynamic=true`, the field value is computed dynamically. Typical cases include dynamic computed fields and dynamic cascaded fields.

At runtime, the system automatically computes the value of a dynamic field, and this field does not have a physical column in the database.

The value of a dynamic field usually represents the latest computed result. When using dynamic computed fields, you should carefully consider whether the scenario is appropriate and the potential impact on client performance.

### 2.15 `translatable`

In multilingual data scenarios, `translatable=true` means the field value is translatable (a multilingual field). Default is `false`.

### 2.16 `encrypted`

Whether the field is encrypted. Softa uses AES256 by default.

### 2.17 `maskingType`

When the field contains sensitive data, configure the masking type (phone number, name, ID number, bank card number, etc.).

When the client fetches data through the API, Softa automatically masks the field value. Masking can replace all or part of the value with `****`.

Masked fields do not affect server-side computed fields or cascaded fields. A computed field can depend on a masked field, and a computed field itself can also be masked.

The client can use the `getUnmaskedField` API to obtain the sensitive value for a specific field; the server records access logs during this process.

- `All`: mask all characters (replace with `****`).
- `Name`: keep the first and last character; if the name has only 2 characters, keep the last character.
- `Email`: keep the first 4 characters.
- `PhoneNumber`: mask the last 4 characters.
- `IdNumber`: keep the first and last 4 characters.
- `CardNumber`: keep the last 4 characters.

### 2.18 `computed`

Whether the field is computed. Computed fields can be configured with an expression and can depend on other fields of the current model.

Currently, for performance reasons, a single expression does not support cross-model field references. If needed, you can read field values across models in Flow orchestration and include them in computations.

- For computed fields with `dynamic=false`, when dependent fields change, Softa automatically triggers recalculation.
- For computed fields with `dynamic=true`, the computed result is not stored. Softa evaluates the expression on read.

### 2.19 `expression`

The computation expression. You can reference other fields of the current model and use arithmetic operations, string functions, date functions, and other common utility functions.

For numeric types, Softa uses high-precision computation to avoid precision loss: it keeps 16 decimal places during calculation and applies **banker’s rounding** at the end. Since the `scale` for numeric fields is typically \(\le 16\), this does not affect the field’s own precision control.

Softa uses **[AviatorScript](https://github.com/killme2008/aviatorscript)** as the expression engine and runs it in a safe sandbox mode.

### 2.20 `cascadedField`

A cascaded field references a field value from a related model via a OneToOne/ManyToOne relationship. The format is dot-separated: the left side is the OneToOne/ManyToOne field name on the current model, and the right side is the field name on the related model, e.g. `productId.productName`.

- For `dynamic=false` cascaded fields, when the dependent OneToOne/ManyToOne field changes, Softa triggers recalculation automatically.
- For `dynamic=true` cascaded fields, the cascaded value is not stored. On read, Softa fetches the latest related value dynamically.

This is a logical cascade, not a database cascade. Only OneToOne/ManyToOne supports cascaded value access.

### 2.21 `relatedModel`

The related model for relationship fields (OneToOne, ManyToOne, OneToMany, ManyToMany).

### 2.22 `relatedField`

- For OneToMany, this is the field name in the related model (Many side) that stores the foreign key of the current model; it must not be empty.
- For OneToOne/ManyToOne, this defaults to the related model’s `id`.

### 2.23 `relatedFieldType`

System-computed physical type of a TO_ONE FK column (`STRING` / `LONG` / …), mirrored from the referenced model’s `id` (and mirrored `length` / `scale`) at reconciliation time. Never declared on `@Field`; used so DDL can render the correct column type while `fieldType` stays the logical `MANY_TO_ONE` / `ONE_TO_ONE`. Null for non-FK fields.

### 2.24 `onDelete`

Delete strategy for a **TO_ONE** foreign key (`ManyToOne` / `OneToOne`): what happens to **referencing** rows when the referenced ("One") row is deleted.

This is an **application-level** policy enforced in `ModelServiceImpl.deleteByIds`. Softa does **not** emit physical database `FOREIGN KEY ... ON DELETE` constraints — relations stay app-level.

| Value | Behavior |
| --- | --- |
| `RESTRICT` | Block the delete if any live (`deleted=false`) referrer exists. |
| `CASCADE` | Delete referrers in the same transaction; each child follows its own soft/hard delete mode. |
| `SET_NULL` | Null the referrer FK; only on a **hard** delete of the One (no-op on soft delete so a restore still resolves). Requires a nullable FK (`required=false`). |
| unset (`null`) | **KEEP** (default) — the framework does nothing to referrers. |

Key rules:

- Declare `onDelete` only on the **TO_ONE back-reference FK** (the child side). It is **not** set on `OneToMany` / `ManyToMany` virtual fields — for "delete parent → delete children", put `CASCADE` on the child's FK.
- This is **not** the same as frontend `cascadedField` (value auto-fill) or UI row-delete callbacks (`onDeleteRow` on relation tables).
- Frontend `<Field>` has no `onDelete` prop; runtimes consume it from metadata when deleting models.

Boot-time guards reject unsafe combinations (for example soft-delete parent cascading to hard-delete children, cyclic `CASCADE`, shared parent to multi-tenant child). Full matrix, batch limits, and annotation mapping: [Delete strategy (`onDelete`)](../../backend_dev/model_dev/annotation#delete-strategy-ondelete) and ADR-0022.

### 2.25 `joinModel`

For ManyToMany, `joinModel` must not be empty. It is the join (middle) model that stores the mapping relationship between the two models.

When querying, Softa first queries the mapping relationships from `joinModel`, then reads the related model data from `relatedModel` to complete the many-to-many query.

Default naming rule: Softa automatically concatenates the left model name + right model name + `Rel`, e.g. `User` + `Role` + `Rel` → `UserRoleRel`.

### 2.26 `joinLeft`

For ManyToMany, the field name in the join model that stores the foreign key of the left model.

Default naming rule: lowercase the first letter of the left model name, then append `Id`, e.g. `User` → `userId`.

### 2.27 `joinRight`

For ManyToMany, the field name in the join model that stores the foreign key of the right model.

Default naming rule: lowercase the first letter of the right model name, then append `Id`, e.g. `Role` → `roleId`.

### 2.28 `filters`

Basic filtering conditions for OneToOne/ManyToOne relationship fields. This is a fixed filter based on business scenarios; it is combined with user search conditions using `AND`.

### 2.29 `columnName`

Read-only attribute: the physical table column name derived from the field name (e.g. `unitPrice` → `unit_price`).

When `fieldName` changes, Softa synchronizes the column name by default. You can disable automatic table column renaming via a global DDL switch to support workflows where DDL is applied by other means.

### 2.30 `description`

The business description of the field.

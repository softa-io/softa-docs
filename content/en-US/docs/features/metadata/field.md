# Field Metadata

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

A single-select field. You must configure the `optionCode` attribute (the option set code).

When saving a single-select field, the value passed and stored is the option item code.

When fetching a single-select field through the API, the default response format is `[itemCode, itemName]` (both the code and name are returned).

For option set configuration and usage, see the [Option Set](option) section.

### 1.4 `MultiOption`

Multi-select fields allow selecting multiple options from the same option set. When saving, you pass a list of option item codes, and the database stores the codes separated by `,`.

When reading a multi-select field through the API, the default response format is `[[itemCode, itemName], ...]`.

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

A relational field. Configure `relatedModel` and `relatedField`. The selected data is unique.

### 1.12 `ManyToOne`

A relational field. Configure `relatedModel` and `relatedField`.

### 1.13 `OneToMany`

In most cases, OneToMany data is `Create/Update/Delete` on the client side for a single record by calling the model API of the Many side.

For batch editing scenarios of OneToMany values:

(1) If the field value is `[]`, no change will be happen.

(2) For `Create/Update/Delete` operations on OneToMany fields, the client sends only the changed rows in the `OneToMany` field.

Each row in this list must include a `_state` flag with one of: `Create | Update | Delete`.

Payload rules:
- Only rows that have changed are included in the field value.
- `_state`: `Create`: New record, no id required. Other business fields are required as usual (e.g. sku, qty).
- `_state`: `Update`: Existing record to be updated, must include id. Only the fields that changed need to be sent; unchanged fields may be omitted.
- `_state`: `Delete`: Existing record to be deleted, must include id. Other business fields can be omitted.
- `_state`: Empty / missing, it means no changes.

```json
{
  "orderItemsChanges": [
    { "_state": "Create", "sku": "C", "qty": 1 },
    { "_state": "Update", "id": 10, "qty": 8 },
    { "_state": "Delete", "id": 12 }
  ]
}
```

(2) The API response of `OneToMany` field is a `List<ModelReference>` object or `List<Row Map>`, according to `QueryParams.fields` and `QueryParams.subQueries`.

For more details, refer to [API Response](../../backend_dev/query/apiResponse.md)

### 1.14 `ManyToMany`

(1) Updating a `ManyToMany` field

In both **Create** and **Update** scenarios, the value passed for a `ManyToMany` field is the **complete list of related IDs** for that field.
The framework will compare this new list with the existing relationships and automatically determine which join records to **create** or **delete**.

For a ManyToMany field `roleIds` (ManyToMany → `User`),
- **Semantics**
  - `roleIds: [1, 2, 3]`
    - Means “after this operation, the `roles` of this user should be exactly `{1, 2, 3}`”.
    - The framework will:
      - Create join records for IDs that are **in the new list but not in the existing list**.
      - Delete join records for IDs that are **in the existing list but not in the new list**.
  - `roleIds: []`
    - Means “clear all attendees” → all existing join records for this field will be deleted.
  - `roleIds: null` or field **omitted**
    - Means “do not change this ManyToMany field” → existing relationships remain unchanged.

```json
{
  "id": 12,
  "roleIds": [1, 2, 3]
}
```

In this case, the framework will automatically compute the diff with the current attendee set and apply the necessary create/delete operations on the join table.

(2) Cascading search for a `ManyToMany` field

Use case: filter records of the current table by conditions on fields in the join table. See the [Query Conditions](../../develop/query) section.

The API response of `ManyToMany` field is a `List<ModelReference>` object or `List<Row Map>`, according to `QueryParams.fields` and `QueryParams.subQueries`.

For more details, refer to [API Response](../../backend_dev/query/apiResponse.md).

## 2. Field Metadata Attributes

| No. | Attribute | Data Type | Description | Notes |
| --- | --- | --- | --- | --- |
| 1 | labelName | String | Field label |  |
| 2 | modelName | String | Model name |  |
| 3 | fieldName | String | Field name |  |
| 4 | fieldType | Option | Field type |  |
| 5 | optionCode | String | Option set code |  |
| 6 | defaultValue | String | Default value |  |
| 7 | length | Integer | Field length |  |
| 8 | scale | Integer | Decimal places |  |
| 9 | required | Boolean | Required, default `false` |  |
| 10 | readonly | Boolean | Readonly, default `false` |  |
| 11 | hidden | Boolean | Hidden, default `false` |  |
| 12 | copyable | Boolean | Copyable, default `true` |  |
| 13 | searchable | Boolean | Searchable, default `true` |  |
| 14 | dynamic | Boolean | Dynamic, default `false` |  |
| 15 | translatable | Boolean | Translatable, default `false` |  |
| 16 | encrypted | Boolean | Encrypted, default `false` |  |
| 17 | maskingType | Option | Masking type |  |
| 18 | computed | Boolean | Computed, default `false` |  |
| 19 | expression | String | Computation expression |  |
| 20 | cascadedField | String | Cascaded field | Relationship attribute |
| 21 | relatedModel | String | Related model | Relationship attribute |
| 22 | relatedField | String | Related field | For OneToMany: the Many-side field name |
| 23 | joinModel | String | Join model (ManyToMany) | Middle model |
| 24 | joinLeft | String | Left-side field in join model | Stores the left model FK |
| 25 | joinRight | String | Right-side field in join model | Stores the right model FK |
| 26 | filters | String | Relational field filter conditions | Relationship attribute |
| 27 | columnName | String | Table column name | Read-only |
| 28 | description | String | Field description |  |

### 2.1 `labelName`

The label (semantic) name of the field. It is typically displayed as a column header on list pages or as a field label on forms, e.g. `Contact Number`.

### 2.2 `modelName`

The model the field belongs to (technical model name), e.g. `ProductCategory`.

### 2.3 `fieldName`

The technical name of the field (lower camelCase), corresponding to the property name in the entity class, e.g. `unitPrice`.

Before querying, Softa converts field names to underscore naming based on the storage type, e.g. `unit_price`.

### 2.4 `fieldType`

The field type from the built-in type set, including string, numeric, date/time, option set, JSON, and relationship types. See the field types section above for details.

### 2.5 `optionCode`

Option sets are suitable for business scenarios where options are relatively stable, the number of options is limited, but extensibility is needed. In Softa, option information is stored in the `OptionSet` model and the `OptionItem` model.

When the field type is `Option` or `MultiOption`, you must configure `optionCode`.

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

Whether the field is dynamic. Default is `false`. The value of a dynamic field is computed at runtime and is not stored in the database.

Typical scenarios for `dynamic=true`: dynamic computed fields and dynamic cascaded fields. Dynamic field values often represent the latest computed result; consider the impact on client performance.

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

### 2.23 `joinModel`

For ManyToMany, `joinModel` must not be empty. It is the join (middle) model that stores the mapping relationship between the two models.

When querying, Softa first queries the mapping relationships from `joinModel`, then reads the related model data from `relatedModel` to complete the many-to-many query.

Default naming rule: Softa automatically concatenates the left model name + right model name + `Rel`, e.g. `User` + `Role` + `Rel` → `UserRoleRel`.

### 2.24 `joinLeft`

For ManyToMany, the field name in the join model that stores the foreign key of the left model.

Default naming rule: lowercase the first letter of the left model name, then append `Id`, e.g. `User` → `userId`.

### 2.25 `joinRight`

For ManyToMany, the field name in the join model that stores the foreign key of the right model.

Default naming rule: lowercase the first letter of the right model name, then append `Id`, e.g. `Role` → `roleId`.

### 2.26 `filters`

Basic filtering conditions for OneToOne/ManyToOne relationship fields. This is a fixed filter based on business scenarios; it is combined with user search conditions using `AND`.

### 2.27 `columnName`

Read-only attribute: the physical table column name derived from the field name (e.g. `unitPrice` → `unit_price`).

When `fieldName` changes, Softa synchronizes the column name by default. You can disable automatic table column renaming via a global DDL switch to support workflows where DDL is applied by other means.

### 2.28 `description`

The business description of the field.

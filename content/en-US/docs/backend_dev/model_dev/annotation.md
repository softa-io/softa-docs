## Metadata Annotations

Softa maintains its `sys_*` catalog tables through **two coexisting paths**:

1. **Annotations (this page)** — code-first. Declare metadata on Java entity
   classes; a boot-time scanner reads the annotations, reconciles them with
   the `sys_*` tables, and applies matching DDL in dev mode. Best for the
   baseline shipped with your codebase — platform / framework models
   versioned alongside the source, gated by code review and CI/CD.
2. **Studio (visual designer)** — config-first. A visual workbench writes
   the same `sys_*` rows through a `WorkItem → Version → Deployment`
   workflow. Best for tenant customizations and business-team-owned
   configuration that need to change without a redeploy. See the
   [Studio User Guide](../../features/studio).

The two paths never clobber each other: every `sys_*` row carries an
[`Ownership`](#row-ownership-ownership-enum) tag, and the annotation
scanner only reads / writes `PLATFORM_MAINTAINED` rows.

> **Requires `metadata-starter`** as a dependency of your app for these
> annotations to take effect. `softa-orm` defines the annotations;
> `metadata-starter` contains the scanner and checker that read them and
> reconcile with `sys_*`. Without `metadata-starter` the annotations exist
> on your classes but no scanner consumes them — `sys_*` rows are never
> written and no DDL is generated.

**Five annotations**, all in `io.softa.framework.orm.annotation`:

| Annotation | Target | `sys_*` table written | Purpose |
|---|---|---|---|
| `@Model` | class | `sys_model` | Describes an entity (table, business key, multi-tenancy, soft delete, etc.) |
| `@Field` | field | `sys_field` | Describes a column (label, type, length, required, relations, etc.) |
| `@OptionSet` | enum class | `sys_option_set` | Marks an enum as a managed option set |
| `@OptionItem` | enum constant | `sys_option_item` | Per-constant display attributes |
| `@Index` | class (`@Repeatable`) | `sys_model_index` | Declares a database index |

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

### Inference rules (no annotation needed)

| Concept | Derived from | Override |
|---|---|---|
| `modelName` | class simple name | — (no override) |
| `fieldName` | Java field name | — (no override) |
| `optionSetCode` | enum class simple name | — (no override) |
| `itemCode` | `@JsonValue` field value (fallback `enum.name()`) | — (no override) |
| `tableName` | `snake_case(modelName)` | `@Model.tableName` |
| `columnName` | `snake_case(fieldName)` | `@Field.columnName` |
| `fieldType` | Java type via `TypeInference` (e.g. `String`→`STRING`, enum→`OPTION`, `List<enum>`→`MULTI_OPTION`, `@Model` POJO→`MANY_TO_ONE`) | `@Field.fieldType = { ... }` (single element); **`OPTION` / `MULTI_OPTION` cannot be written explicitly** |
| index `indexName` | `idx_<table>_<col>...` / `uk_<table>_<col>...` for unique | `@Index.name` |

### `@Model` ↔ `SysModel`

> Business semantics of each attribute: see [Model Metadata](../../features/metadata/model).

| `@Model` attribute | Type | Default | `SysModel` column | Notes |
|---|---|---|---|---|
| (class simple name) | — | — | `modelName` | inferred, no override |
| `labelName` | String | `""` | `labelName` | empty → i18n key `model.{modelName}.label` |
| `tableName` | String | `""` | `tableName` | empty → `snake_case(modelName)` |
| `description` | String | `""` | `description` | |
| `displayName` | String[] | `{}` | `displayName` | list-display defaults |
| `searchName` | String[] | `{}` | `searchName` | search-field defaults |
| `defaultOrder` | String[] | `{}` | `defaultOrder` | e.g. `"createdTime:desc"` |
| `softDelete` | boolean | `false` | `softDelete` | |
| `softDeleteField` | String | `"deleted"` | `softDeleteField` | effective only when `softDelete = true` |
| `activeControl` | boolean | `false` | `activeControl` | adds `active` gate column |
| `timeline` | boolean | `false` | `timeline` | effective-dated rows (see Timeline Model) |
| `idStrategy` | `IdStrategy` | `DB_AUTO_ID` | `idStrategy` | |
| `storageType` | `StorageType` | `RDBMS` | `storageType` | |
| `versionLock` | boolean | `false` | `versionLock` | optimistic-lock column |
| `multiTenant` | boolean | `false` | `multiTenant` | requires a `tenantId` field on the class |
| `dataSource` | String | `""` | `dataSource` | empty → primary datasource |
| `businessKey` | String[] | `{}` | `businessKey` | composite supported |
| `partitionField` | String | `""` | `partitionField` | |
| `serviceName` | String | `""` | `serviceName` | microservice routing key — see [softa-web/README](../softa-web/README.md#service-to-service-rpc) |
| (scanner sets) | — | — | `appId` | always set by scanner / Studio |
| (DB auto) | — | — | `id` | primary key |
| (scanner sets) | — | — | `ownership` | `PLATFORM_MAINTAINED` for scanner writes |

Audit fields (`createdTime` / `createdBy` / `createdId` / `updatedTime` /
`updatedBy` / `updatedId`) come from `AuditableModel` and are **not** declared
via `@Field` — they are auto-injected by `DdlGenerator` when the class
extends `AuditableModel`.

### `@Field` ↔ `SysField`

> Business semantics of each attribute and the full field-type catalog: see [Field Metadata](../../features/metadata/field).

| `@Field` attribute | Type | Default | `SysField` column | Notes |
|---|---|---|---|---|
| (Java field name) | — | — | `fieldName` | inferred, no override |
| (Java type) | — | — | `fieldType` | inferred via `TypeInference` |
| `labelName` | String | `""` | `labelName` | empty → i18n key |
| `description` | String | `""` | `description` | |
| `fieldType` | `FieldType[]` | `{}` | `fieldType` | single-element override; `OPTION`/`MULTI_OPTION` **cannot** be written explicitly |
| `columnName` | String | `""` | `columnName` | empty → `snake_case(fieldName)` |
| `length` | int | `0` | `length` | `0` → type-specific default; STRING / DECIMAL precision |
| `scale` | int | `0` | `scale` | DECIMAL scale |
| `required` | boolean | `false` | `required` | NOT NULL constraint |
| `readonly` | boolean | `false` | `readonly` | UI hint |
| `translatable` | boolean | `false` | `translatable` | i18n-aware column |
| `nonCopyable` | boolean | `false` | `nonCopyable` | excluded from `copy()` |
| `unsearchable` | boolean | `false` | `unsearchable` | excluded from default search |
| `computed` | boolean | `false` | `computed` | requires `expression` |
| `expression` | String | `""` | `expression` | AviatorScript |
| `dynamic` | boolean | `false` | `dynamic` | not physically stored |
| `encrypted` | boolean | `false` | `encrypted` | at-rest encryption |
| `maskingType` | `MaskingType[]` | `{}` | `maskingType` | single element |
| `defaultValue` | String | `""` | `defaultValue` | |
| `relatedModel` | String | `""` | `relatedModel` | empty → inferred from POJO type; **required** when Java type is `Long` storing an FK id |
| `relatedField` | String | `""` | `relatedField` | empty → `"id"` |
| `joinModel` | String | `""` | `joinModel` | M2M join table |
| `joinLeft` | String | `""` | `joinLeft` | |
| `joinRight` | String | `""` | `joinRight` | |
| `cascadedField` | String | `""` | `cascadedField` | dotted path, e.g. `"owner.name"` |
| `filters` | String | `""` | `filters` | filter expression for relations |
| `widgetType` | `WidgetType[]` | `{}` | `widgetType` | single-element override |
| (scanner sets) | — | — | `modelName` | from enclosing `@Model` class |
| (scanner sets) | — | — | `optionSetCode` | derived from enum type when fieldType is `OPTION`/`MULTI_OPTION` |
| (scanner sets) | — | — | `appId` / `id` / `ownership` | |
| (FK fixup post-init) | — | — | `modelId` | |
| (not exposed via `@Field`) | — | — | `hidden` | UI-only flag set via Studio |

### `@OptionSet` ↔ `SysOptionSet`

> Runtime behavior, caching, and API shape: see [Option Sets](../../features/metadata/option).

| `@OptionSet` attribute | Type | Default | `SysOptionSet` column | Notes |
|---|---|---|---|---|
| (enum simple name) | — | — | `optionSetCode` | inferred, no override |
| `name` | String | `""` | `name` | display label; empty → i18n key |
| `description` | String | `""` | `description` | |
| (scanner sets) | — | — | `appId` / `id` / `ownership` | |
| (Studio toggle) | — | — | `deleted` / `optionItems` | runtime aggregation |

### `@OptionItem` ↔ `SysOptionItem`

> Display attributes (`itemTone`, `itemIcon`) and API response shape: see [Option Sets](../../features/metadata/option).

| `@OptionItem` attribute | Type | Default | `SysOptionItem` column | Notes |
|---|---|---|---|---|
| (`@JsonValue` field value on enum) | — | — | `itemCode` | fallback to `enum.name()` when no `@JsonValue` |
| (enclosing enum simple name) | — | — | `optionSetCode` | inferred |
| `itemName` | String | `""` | `itemName` | empty → use `itemCode` as fallback |
| `description` | String | `""` | `description` | |
| `sequence` | int | `-1` | `sequence` | `-1` → use `ordinal() + 1` |
| `parentItemCode` | String | `""` | `parentItemCode` | hierarchy |
| `itemTone` | `OptionItemTone[]` | `{}` | `itemTone` | single element |
| `itemIcon` | `OptionItemIcon[]` | `{}` | `itemIcon` | single element |
| (scanner sets) | — | — | `appId` / `id` / `ownership` / `optionSetId` | |
| (Studio toggle) | — | — | `active` | |

### `@Index` ↔ `SysModelIndex`

`@Index` is `@Repeatable` — stack multiple declarations on one `@Model` class.

| `@Index` attribute | Type | Default | `SysModelIndex` column | Notes |
|---|---|---|---|---|
| (enclosing class) | — | — | `modelName` | inferred |
| `name` | String | `""` | `name` | display title; auto-derived from fields when empty |
| `name` (or auto-derived) | — | — | `indexName` | `idx_<table>_<col>...` / `uk_<table>_<col>...` for unique |
| `fields` | String[] | required | `indexFields` | **camelCase Java field names**, not column names |
| `unique` | boolean | `false` | `uniqueIndex` | |
| (scanner sets) | — | — | `appId` / `id` / `ownership` | |
| (FK fixup post-init) | — | — | `modelId` | |

**Note**: `@Model.businessKey` does **not** auto-create a UNIQUE index.
Multi-tenant models typically want `UNIQUE (tenant_id, businessKey...)`
which has tenant-aware semantics not expressible by `@Index` alone —
declare such indexes explicitly:
```java
@Index(fields = {"tenantId", "code"}, unique = true)
```

## Row ownership (`Ownership` enum)

Every row in `sys_model` / `sys_field` / `sys_option_set` / `sys_option_item`
/ `sys_model_index` carries an `ownership` column
(`io.softa.framework.orm.enums.Ownership`):

| Value | Writer | Tenants may modify? |
|---|---|---|
| `PLATFORM_MAINTAINED` | Scanner (from `@Model` / `@Field` / `@OptionSet` / `@OptionItem` / `@Index`) | ❌ |
| `PLATFORM_DEFAULT` | Studio Open API / DML seed (for framework enums like `Language` that cannot carry `@OptionSet`) | ✅ per-row override |
| `TENANT` (default) | Studio UI / Open API | ✅ |

The scanner reads / writes are filtered with
`WHERE ownership = 'PLATFORM_MAINTAINED'`, so platform defaults and tenant
customizations are never clobbered by an annotation reconcile.

See `Ownership.java` javadoc for the full merge-rule contract.

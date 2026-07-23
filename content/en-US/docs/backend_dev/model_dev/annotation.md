## Metadata Annotations

> **Requires `metadata-starter`** as a dependency of your app for these
> annotations to take effect. `softa-orm` defines the annotations;
> `metadata-starter` contains the scanner and checker that read them and
> reconcile with `sys_*`. Without `metadata-starter` the annotations exist
> on your classes but no scanner consumes them — `sys_*` rows are never
> written and no DDL is generated.

Softa describes models, fields, option sets, option items, and indexes
through Java annotations on the entity classes. A boot-time scanner reads
these annotations, reconciles them with the `sys_*` catalog tables managed
by `metadata-starter`, and (for packages in `scanner-scope`) applies the matching DDL.

**Five annotations** — `@Model` / `@Field` / `@Index` live in
`io.softa.framework.orm.annotation`; `@OptionSet` / `@OptionItem` live in
`io.softa.framework.base.annotation` (so framework-level enums in `softa-base`
can carry them without a module cycle):

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

### Inference rules (no annotation needed)

| Concept | Derived from | Override |
|---|---|---|
| `modelName` | class simple name | — (no override) |
| `fieldName` | Java field name | — (no override) |
| `optionSetCode` | enum class simple name | — (no override) |
| `itemCode` | `@JsonValue` field value (fallback `enum.name()`) | — (no override) |
| `tableName` | `snake_case(modelName)` | `@Model.tableName` |
| `columnName` | `snake_case(fieldName)` | `@Field.columnName` |
| `fieldType` | Java type via `TypeInference` (e.g. `String`→`STRING`, enum→`OPTION`, `List<enum>`→`MULTI_OPTION`, `@Model` POJO→`MANY_TO_ONE`) | `@Field.fieldType = FieldType.X` (single value, no braces); **`OPTION` / `MULTI_OPTION` cannot be written explicitly** |
| index `indexName` | `idx_<table>_<col>...` / `uk_<table>_<col>...` for unique | `@Index.indexName` |

### `@Model` ↔ `SysModel`

| `@Model` attribute | Type | Default | `SysModel` column | Notes |
|---|---|---|---|---|
| (class simple name) | — | — | `modelName` | inferred, no override |
| `label` | String | `""` | `label` | empty → humanized class name (`DeptInfo`→"Dept Info"); i18n translations override by id |
| `renamedFrom` | String | `""` | `renamedFrom` | immediately-prior model name for a rename (single-step, no chain) — see "Renames" below |
| `tableName` | String | `""` | `tableName` | empty → `snake_case(modelName)` |
| `description` | String | `""` | `description` | **≤512 chars**, parse-time enforced (catalog column width); concise user-facing summary — design notes go in Javadoc |
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
| `copyable` | boolean | `true` | `copyable` | `false` ⇒ copy APIs reject the model; UI hides Duplicate |
| `dataSource` | String | `""` | `dataSource` | empty → primary datasource |
| `businessKey` | String[] | `{}` | `businessKey` | composite supported |
| `partitionField` | String | `""` | `partitionField` | |
| (scanner sets) | — | — | `appCode` | always set by scanner / Studio |
| (DB auto) | — | — | `id` | primary key |

Audit fields (`createdTime` / `createdBy` / `createdId` / `updatedTime` /
`updatedBy` / `updatedId`) come from `AuditableModel` and are **not** declared
via `@Field` — they are auto-injected by `DdlGenerator` when the class
extends `AuditableModel`.

### `@Field` ↔ `SysField`

| `@Field` attribute | Type | Default | `SysField` column | Notes |
|---|---|---|---|---|
| (Java field name) | — | — | `fieldName` | inferred, no override |
| (Java type) | — | — | `fieldType` | inferred via `TypeInference` |
| `label` | String | `""` | `label` | empty → humanized field name (`deptId`→"Dept Id"); i18n translations override by id |
| `renamedFrom` | String | `""` | `renamedFrom` | immediately-prior field name for a rename (single-step) — see "Renames" below |
| `description` | String | `""` | `description` | **≤512 chars**, parse-time enforced (catalog column width); concise user-facing summary — design notes go in Javadoc |
| `fieldType` | `FieldType[]` | `{}` | `fieldType` | single value, no braces (e.g. `fieldType = FieldType.MULTI_FILE`); `OPTION`/`MULTI_OPTION` **cannot** be written explicitly |
| `columnName` | String | `""` | `columnName` | empty → `snake_case(fieldName)` |
| `length` | int | `0` | `length` | `0` → type default: STRING/OPTION 64, MULTI_STRING/ORDERS 256, DOUBLE 24 (measurements), BIG_DECIMAL 32 (money); declare explicitly for anything else. MySQL renders `length > 16383` as TEXT |
| `scale` | int | `0` | `scale` | `0` → type default: DOUBLE 2, BIG_DECIMAL 8 (DECIMAL scale) |
| `required` | boolean | `false` | `required` | NOT NULL constraint |
| `readonly` | boolean | `false` | `readonly` | UI hint |
| `translatable` | boolean | `false` | `translatable` | i18n-aware column |
| `copyable` | boolean | `true` | `copyable` | `false` ⇒ value not carried over by `copyById` (business keys, credentials, runtime state) |
| `unsearchable` | boolean | `false` | `unsearchable` | excluded from default search |
| `computed` | boolean | `false` | `computed` | requires `expression` |
| `expression` | String | `""` | `expression` | AviatorScript |
| `dynamic` | boolean | `false` | `dynamic` | not physically stored |
| `encrypted` | boolean | `false` | `encrypted` | at-rest encryption |
| `autoSequence` | boolean | `false` | `auto_sequence` | auto-fill from a sequence on INSERT when blank; STRING only (not `dynamic`/`computed`/id, RDBMS only); pairs with a `sys_sequence` row `"<Model>.<field>"` (missing row = insert fails, fail-closed). `+ readonly` = strict system numbering (caller values rejected); without = caller values trusted (imports). Never carried on copy |
| `maskingType` | `MaskingType[]` | `{}` | `maskingType` | single element |
| `defaultValue` | String | `""` | `defaultValue` | |
| `relatedModel` | `Class<?>` | `Void.class` | `relatedModel` | Class ref (compile-checked), e.g. `Foo.class`; `Void.class` → inferred from POJO type; **required** for `Long` FK. Use `relatedModelName` (String) for cross-module/dynamic models |
| `relatedModelName` | String | `""` | `relatedModel` | String fallback to `relatedModel` (cross-module/dynamic) |
| `relatedField` | String | `""` | `relatedField` | TO_ONE: always `id` — leave empty (a non-id value is rejected at boot; to store a business code make the related model code-as-id). ONE_TO_MANY: names the child FK column |
| `onDelete` | `OnDelete[]` | `{}` | `on_delete` | TO_ONE FK delete strategy: `RESTRICT` / `CASCADE` / `SET_NULL`; `{}`/unset = KEEP (default — do nothing). App-level (no DB FK). See "Delete strategy" below |
| `joinModel` | `Class<?>` | `Void.class` | `joinModel` | M2M join model class; `joinModelName` (String) fallback |
| `joinLeft` | String | `""` | `joinLeft` | |
| `joinRight` | String | `""` | `joinRight` | |
| `cascadedField` | String | `""` | `cascadedField` | dotted path, e.g. `"owner.name"` |
| `filters` | String | `""` | `filters` | filter expression for relations |
| `widgetType` | `WidgetType[]` | `{}` | `widgetType` | single-element override |
| (scanner sets) | — | — | `modelName` | from enclosing `@Model` class |
| (scanner sets) | — | — | `optionSetCode` | derived from enum type when fieldType is `OPTION`/`MULTI_OPTION` |
| (scanner sets) | — | — | `appCode` / `id` | |
| (FK fixup post-init) | — | — | `modelId` | |
| (system-computed) | — | — | `relatedFieldType` | physical type of a TO_ONE FK column, mirrored from the referenced model's `id` (+ mirrored `length`/`scale`) at reconciliation time; never declared on `@Field` |
| (not exposed via `@Field`) | — | — | `hidden` | UI-only flag set via Studio |

**Copy field-selection contract** (applies regardless of the `copyable` flag): `ONE_TO_ONE` FKs are **always excluded** — copying one would make two rows share an exclusively-owned related row, corrupting the 1:1 (or hard-failing on its unique index); dynamic fields (`ONE_TO_MANY` / `MANY_TO_MANY` / computed / cascaded) are excluded because they are not stored columns; `MANY_TO_ONE` **stays copyable** — a shared reference is exactly its semantics. Historical trap: the `nonCopyable` → `copyable` rename was done as a migration (V6), NOT via `renamedFrom`, because the rename inverts the value's meaning — a value-preserving rename would have carried wrong values.

#### Delete strategy (`onDelete`)

On a `MANY_TO_ONE` / `ONE_TO_ONE` FK, `onDelete` declares what happens to the **referencing** rows when
the referenced ("One") row is deleted. Enforced application-level in `ModelServiceImpl.deleteByIds` — no
physical DB `FOREIGN KEY ... ON DELETE` is ever emitted. Why app-level and never a real DB FK: soft
delete is an `UPDATE`, invisible to a DB `ON DELETE` (the FK would simply never fire); a DB cascade
bypasses permissions, change logs, audit stamping, soft-delete conversion and tenant scoping; a DB FK
cannot express "count only `deleted=false` referrers", "block regardless of tenant", or "null only on
hard delete"; and physical FKs clash with the never-auto-DROP DDL governance. Strategies:

- `RESTRICT` — block the delete if any live (`deleted=false`) referrer exists.
- `CASCADE` — delete the referrers in the same transaction (each follows its own soft/hard delete).
  **Rejected at boot** if a soft-delete One would cascade to a hard-delete Many (a recoverable parent
  must not irreversibly delete children — make the Many soft-delete too, or use RESTRICT/SET_NULL).
- `SET_NULL` — null the referrer FK; **only on a hard delete** of the One (no-op on soft delete, so a
  restore still resolves the link). Requires a nullable FK (`required = false`).
- unset (`{}` / `on_delete` NULL) = **KEEP** (default) — the framework does nothing.

**CASCADE soft/hard-delete matrix** — the cascade on each Many follows the *Many's* own delete mode
(not the One's); the one unsafe combination is rejected at boot:

| One (referenced / parent) | Many (referrer / child) | CASCADE result |
|---|---|---|
| soft-delete | soft-delete | Many **soft-deleted** (both recoverable) |
| soft-delete | hard-delete | **rejected at boot** — a recoverable parent must not irreversibly delete children |
| hard-delete | soft-delete | Many **soft-deleted** |
| hard-delete | hard-delete | Many **hard-deleted** |

A `CASCADE` from a **shared (non-multi-tenant) parent to a multi-tenant child** is likewise rejected at
boot — one delete would cascade across all tenants (use RESTRICT).

**Runtime safety** — a `CASCADE` / `SET_NULL` affecting more than `MAX_BATCH_SIZE` referrers *per cascade
level* is rejected: `referrerIds` fetches at most `MAX_BATCH_SIZE + 1` ids in one `LIMIT`-ed query, so an
over-limit delete fails fast **without loading the full set** (bounded memory, no extra `count`). Large
deletes are chunked to `DEFAULT_BATCH_SIZE` to bound the SELECT/DELETE statement + IN-clause size (same
transaction — chunking bounds statement size, not lock duration).

For a OneToMany "delete parent → delete children", put `CASCADE` on the **child's back-reference FK**
(the FK is the single source of truth; `onDelete` is not declared on `ONE_TO_MANY`).

Boot-time guards (fail-fast): `onDelete` is valid only on TO_ONE; `SET_NULL` requires a nullable FK; a
**cyclic / self-referential `CASCADE`** is rejected (delete such hierarchies — org trees, BOM, category
trees — in application code); a **`CASCADE` chain deeper than `MAX_CASCADE_DEPTH` models** is rejected
(bounds recursion; the error names the full chain); and a `CASCADE` from a **soft-delete parent to a
hard-delete child**, or from a **shared parent to a multi-tenant child**, is rejected (see the matrix
above).

A **timeline** target is allowed: the inbound-FK strategy fires on **entity deletion** (`deleteByIds`,
which removes all slices of the logical id — referencing FKs store that logical id, so RESTRICT counts /
CASCADE deletes / SET_NULL nulls by it, no effective-date resolution involved); slice-level
`deleteBySliceId` keeps the entity alive and deliberately does not trigger it.

Field-level overview for product/metadata authors: [`onDelete` in Field metadata](../../features/metadata/field#224-ondelete).

### `@OptionSet` ↔ `SysOptionSet`

| `@OptionSet` attribute | Type | Default | `SysOptionSet` column | Notes |
|---|---|---|---|---|
| (enum simple name) | — | — | `optionSetCode` | inferred, no override |
| `label` | String | `""` | `label` | display label; empty → humanized enum name (`TenantStatus`→"Tenant Status") |
| `renamedFrom` | String | `""` | `renamedFrom` | immediately-prior option-set code for a rename (single-step) |
| `description` | String | `""` | `description` | **≤512 chars**, parse-time enforced (catalog column width); concise user-facing summary — design notes go in Javadoc |
| (scanner sets) | — | — | `appCode` / `id` | |
| (Studio toggle) | — | — | `active` / `optionItems` | runtime aggregation |

### `@OptionItem` ↔ `SysOptionItem`

| `@OptionItem` attribute | Type | Default | `SysOptionItem` column | Notes |
|---|---|---|---|---|
| (`@JsonValue` field value on enum) | — | — | `itemCode` | fallback to `enum.name()` when no `@JsonValue` |
| (enclosing enum simple name) | — | — | `optionSetCode` | inferred |
| `label` | String | `""` | `label` | defaults to humanized constant name (`MULTI_FILE`→"Multi File"); declare explicitly to customize. Omit when it equals the humanized name (and omit the whole `@OptionItem` if nothing else remains) |
| `renamedFrom` | String | `""` | `renamedFrom` | immediately-prior item code for a rename (single-step) |
| `description` | String | `""` | `description` | **≤512 chars**, parse-time enforced (catalog column width); concise user-facing summary — design notes go in Javadoc |
| `sequence` | int | `-1` | `sequence` | `-1` → use `ordinal() + 1` |
| `parentItemCode` | String | `""` | `parentItemCode` | hierarchy |
| `itemTone` | `OptionItemTone[]` | `{}` | `itemTone` | single element |
| `itemIcon` | `OptionItemIcon[]` | `{}` | `itemIcon` | single element |
| (scanner sets) | — | — | `appCode` / `id` / `optionSetId` | |
| (Studio toggle) | — | — | `active` | |

### `@Index` ↔ `SysModelIndex`

`@Index` is `@Repeatable` — stack multiple declarations on one `@Model` class.

| `@Index` attribute | Type | Default | `SysModelIndex` column | Notes |
|---|---|---|---|---|
| (enclosing class) | — | — | `modelName` | inferred |
| `indexName` | String | `""` | `indexName` | empty → auto-derived `idx_<table>_<col>...` / `uk_<table>_<col>...` for unique; index names are **globally unique** (≤ 60 chars, boot-enforced) |
| `fields` | String[] | required | `indexFields` | **camelCase Java field names**, not column names |
| `unique` | boolean | `false` | `uniqueIndex` | |
| `message` | String | `""` | `message` | unique-only: user-facing message shown on a uniqueness violation (has its own i18n key) |
| (scanner sets) | — | — | `appCode` / `id` | |
| (FK fixup post-init) | — | — | `modelId` | |

**Note**: `@Model.businessKey` does **not** auto-create a UNIQUE index.
Multi-tenant models typically want `UNIQUE (tenant_id, businessKey...)`
which has tenant-aware semantics not expressible by `@Index` alone —
declare such indexes explicitly:
```java
@Index(fields = {"tenantId", "code"}, unique = true)
```

## Renames (`renamedFrom`)

The scanner's diff is keyed by `modelName` / `fieldName` / `optionSetCode` /
`itemCode`, so an *undeclared* rename looks like "drop old + add new": the new
column is auto-added, dropping the old one is warn-only — and the data stays
in the orphaned column (**silent data divorce**).

Declare the immediately-prior name instead:

```java
@Model(renamedFrom = "OldCustomer")          // model rename
public class Customer extends AuditableModel {

    @Field(renamedFrom = "customerName")     // field rename
    private String name;
}
```

The `DiffEngine` then pairs the two sides into a single rename modification,
auto-executes `CHANGE COLUMN` (field) / `ALTER TABLE … RENAME TO` (model), and
updates the `sys_*` row in place (id preserved) — data is carried, not
divorced. A model rename cascades onto its fields and indexes, so it shows no
field churn. `@OptionSet` / `@OptionItem` support the same attribute.

Rules and guards:

- `renamedFrom` is a **single** String — the immediately-prior name only
  (single-step, no chain). A skipped-version chain needs a manual migration.
- Declaring a prior name that is still a live field/model, or two siblings
  claiming the same prior name, fails at parse time.
- "Both the new and the prior name already exist" fails fast — resolve the
  half-applied rename manually.
- An `@OptionItem` code rename that also carries business-data UPDATEs still
  needs a hand-written migration.

## `scanner-scope` (which packages the scanner manages)

`scanner-scope` is a list of regex patterns full-matched against each
`@Model` / `@OptionSet` class's **package name**. `"*"` (sole entry) = all
packages; empty / unset = manage nothing. It should **never be non-empty in
production** — in production, Studio / connector publish applies the
app-scoped design catalog instead.

```yaml
# application-dev.yml
system:
  metadata:
    scanner-scope:
      - "*"          # manage every package; on a shared dev DB, narrow to
                     # your own packages, e.g. ["io\\.acme\\.app.*"]
```

| `system.metadata.scanner-scope` | Scanner runs | DDL execution | Drift detection |
|---|---|---|---|
| `["*"]` | Boot-time, eager, all packages | Auto: `CREATE TABLE` / `ADD COLUMN` / `MODIFY COLUMN` / `ADD INDEX`. **Never auto-DROP** | n/a |
| `["io\\.acme\\.foo.*", …]` | Boot-time, in-scope packages only | Same auto-policy, in-scope models only | n/a |
| empty / unset (default, prod) | n/a | n/a | `MetadataAnnotationChecker` runs post-boot on a virtual thread; logs WARN if code-vs-DB drift detected |

On a **shared dev database**, give each developer a narrow scope (their own
packages) so the scanner only reconciles the Java packages they are actively
changing. Scope is per-package, not per-class; app identity is still
`app_code`, and physical table-name collisions remain a database-level
concern.

### DDL auto-execute policy

| Operation | Auto-executed |
|---|---|
| `CREATE TABLE IF NOT EXISTS` | ✅ |
| `ADD COLUMN` | ✅ |
| `MODIFY COLUMN` (type / nullable / length / default) | ✅ |
| `ADD INDEX` | ✅ |
| `DROP TABLE` / `DROP COLUMN` / `DROP INDEX` | ❌ — logs WARN with copy-paste SQL |

Rationale: additive DDL doesn't lose data; `DROP` operations are destructive
and may take minutes on large tables. Even in dev, you should consciously
choose to drop schema.

## Metadata identity (`app_code`)

There is **no ownership tier column** on the `sys_*` catalog. The annotation
lane and the Studio no-code lane reconcile the **same rows, matched by
business key** (`modelName` / `fieldName` / `optionSetCode` / `itemCode`, plus
`renamedFrom`) — a same-key row is updated in place, never duplicated per
channel.

Every runtime declares `system.app-code` in `application.yml` (mandatory when
`metadata-starter` is active; fail-fast at boot). All swept `sys_*` rows carry
`app_code`, stamped **server-side** on every write path (scanner, Studio
envelope, plan/apply) — wire values are never trusted. Signed Studio calls
carry the target `appCode` and the runtime rejects mismatches. Multiple apps
can safely share one database: rows are matched per `app_code`, so shared
databases never cross-link catalogs.

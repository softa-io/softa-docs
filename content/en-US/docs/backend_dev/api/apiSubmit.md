
# Field Submit (Option/File/XToOne)
The formats below apply to create/update APIs (`createOne`, `createList`, `updateOne`, `updateList`, and variants).

## Option / MultiOption
Submit format:
1. `Option` (single): option item code string.
2. `MultiOption` (multiple): option item code list (recommended), or comma-separated string.

Examples:
```json
{
  "status": "Active",
  "tags": ["A", "B", "C"]
}
```

Clear semantics:
1. `Option`: set field to `null` (if field is not required).
2. `MultiOption`: set to `[]`, or `null` (if field is not required).

## File / MultiFile
Submit format:
1. `File` (single): uploaded `fileId`.
2. `MultiFile` (multiple): `fileId` list.

Examples:
```json
{
  "avatar": "1001",
  "attachments": ["2001", "2002", "2003"]
}
```

Clear semantics:
1. `File`: set field to `null` (if field is not required).
2. `MultiFile`: set to `[]`, or `null` (if field is not required).

## ManyToOne / OneToOne
Submit format:
1. Submit related row id directly.
2. Do not submit a nested object (`{id, displayName}`) as input value.

Examples:
```json
{
  "deptId": "3001",
  "ownerId": "4001"
}
```

Clear semantics:
1. Set field to `null` (if field is not required) to unlink relation.

Validation notes:
1. Related ids are formatted according to the related model id type before persistence.
2. If the field is required, setting `null` will be rejected.

## XToMany API Submit

`OneToMany` and `ManyToMany` fields support both full submit and incremental patch submit in create/update APIs
(`createOne`, `createList`, `updateOne`, `updateList`, and `*AndFetch` variants).

The backend distinguishes mode by field value type:
1. `List` -> full submit mode (existing behavior, backend infers add/update/delete by diff)
2. `Object(Map)` -> patch submit mode (execute operations by patch keys directly)

`PatchType` Options:
- OneToMany fields: `Create`、 `Update`、`Delete`；
- ManyToMany fields: `Add`、`Remove`；

### OneToMany Submit
Field value supports:
1. Full submit: `[{row1}, {row2}]`. If the field value is `[]` in update API,, clear the history record.
2. Patch submit, `PatchType` as the key:
```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": 101, "name": "changed" }],
  "Delete": [102, 103]
}
```

Rules:
1. `Create`/`Update` values must be row list (`List<Map>` or object list convertible to map).
2. `Delete` value must be id list.
3. In create main model data scene, only `Create` is allowed; `Update` and `Delete` are rejected.
4. In update main model data scene, `Update`/`Delete` ids must belong to the current parent row.

### ManyToMany Submit
Field value supports:
1. Full submit: `[id1, id2, id3]`. If the field value is `[]` in update API, clear the history record.
2. Patch submit, `PatchType` as the key:
```json
{
  "Add": [1, 2, 3],
  "Remove": [4, 5]
}
```

Rules:
1. `Add` and `Remove` values must be id list (or object list with readable `id` field).
2. In create main model data scene, only `Add` is allowed; `Remove` is rejected.
3. In update main model data scene:
   - `Add` adds only non-existing relationships.
   - `Remove` deletes only existing relationships.

### Compatibility and Validation
1. Full submit mode remains compatible with existing infer logic.
2. Patch keys are case-insensitive and support both enum-style and display-style names:
   - OneToMany: `CREATE/UPDATE/DELETE` or `Create/Update/Delete`
   - ManyToMany: `ADD/REMOVE` or `Add/Remove`
3. Unknown patch key or non-list patch value will fail fast with parameter validation error.

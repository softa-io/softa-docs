# API Response Explore

## ConvertType
`ConvertType` controls how field values are formatted when **reading** data (search/get/copy and fetch APIs). It affects boolean/option fields and relational fields, and it also controls whether the relations are expanded or represented as references.

Notes:
1. `QueryParams` does not expose `convertType`. The web layer sets `ConvertType.REFERENCE` by default. To use other `ConvertType` values, call the service layer with `FlexQuery` directly.
2. Filters and orders follow the same formats as top-level `filters` and `orders` (`Filters` list format and `Orders` list or string format).

## OptionReference
When option values are expanded or returned as references, they use `OptionReference`.

Fields:
- `itemCode`: option item code.
- `itemName`: option item display name.
- `itemColor`: optional color string.

### ModelReference
When relational values are expanded or returned as references, they use `ModelReference`.

Fields:
- `id`: related row id.
- `displayName`: related row display name.

### ConvertType Values
1. `ORIGINAL` - returns the raw database value without formatting. Typical use cases: diagnostics or retrieving original ciphertext before decryption.
2. `TYPE_CAST` (default in `FlexQuery`) - standard conversion based on fieldFype (for example, numeric/string/boolean/json type casting). Computed fields and dynamic cascaded fields are evaluated. Relational fields are not expanded to display values by default.
3. `DISPLAY` - converts Boolean/Option/MultiOption and ManyToOne/OneToOne fields into display values (human-readable strings). OneToMany/ManyToMany default expansion (when no SubQuery is provided) returns display values.
4. `REFERENCE` - converts Option/MultiOption and ManyToOne/OneToOne fields into reference objects (`OptionReference` for option fields and `ModelReference` for relational fields). OneToMany/ManyToMany default expansion (when no SubQuery is provided) returns a list of `ModelReference` objects.

### Defaults and API behavior
1. `FlexQuery` defaults to `TYPE_CAST` if not explicitly set.
2. Web APIs (`/searchList`, `/searchPage`, `/getById`, `/getByIds`, etc.) typically set `ConvertType.REFERENCE` to return references for relational fields.
3. For OneToMany/ManyToMany fields:
   - If a SubQuery is provided, related rows are expanded according to SubQuery fields/filters.
   - If no SubQuery is provided and `convertType` is `DISPLAY` or `REFERENCE`, OneToMany/ManyToMany returns a list of display strings.
   - If no SubQuery is provided and `convertType` is `REFERENCE`, OneToMany/ManyToMany returns a list of `ModelReference` objects.

## Return Values by ConvertType, QueryParams, SubQuery
Unless stated otherwise, the descriptions below refer to service-level `FlexQuery` behavior. Web APIs using `QueryParams` default to `ConvertType.REFERENCE`, so they follow the `REFERENCE` column when no SubQuery is specified.

### Boolean
| ConvertType | Return value |
| --- | --- |
| `ORIGINAL` | Raw stored value (no formatting). |
| `TYPE_CAST` | Boolean `true/false`. |
| `DISPLAY` | Boolean display name from the boolean option set (if configured); otherwise same as `TYPE_CAST`. |
| `REFERENCE` | Boolean `true/false` (no reference object for boolean). |

### Option / MultiOption
| ConvertType | Option (single) | MultiOption |
| --- | --- | --- |
| `ORIGINAL` | Raw stored item code. | Raw stored string (comma-separated). |
| `TYPE_CAST` | Item code string. | `List<String>` of item codes. |
| `DISPLAY` | Item display name. | Comma-joined display names (string). |
| `REFERENCE` | `OptionReference` (`itemCode`, `itemName`, `itemColor`). | `List<OptionReference>`. |

### ManyToOne / OneToOne
1. No SubQuery:
| ConvertType | Return value |
| --- | --- |
| `ORIGINAL` | Raw related id (no expansion). |
| `TYPE_CAST` | Related id (formatted by type). |
| `DISPLAY` | Related display name (string). |
| `REFERENCE` | `ModelReference` (`id`, `displayName`). |

2. With SubQuery:
Return value is always a related **row map** instead of a display name or `ModelReference`. The map is built using the same `convertType` (so nested option/relational fields follow that `convertType`). The returned fields include the related model `id`, all display-name fields, and any fields specified in `SubQuery.fields`.

### OneToMany / ManyToMany
1. Not in `QueryParams.fields` and no SubQuery
For OneToMany/ManyToMany fields, they would not be appear in the response if not specified in `QueryParams.fields` nor in `subQueries`.

2. In `QueryParams.fields`, no SubQuery:
| ConvertType | OneToMany | ManyToMany |
| --- | --- | --- |
| `TYPE_CAST` | `List<Map>` of related model rows (all stored fields). | `List<Map>` of related model rows (all stored fields). |
| `DISPLAY` | `List<Map>` containing `displayName` plus display fields and id (and the related field used for grouping). | `List<String>` of display names. |
| `REFERENCE` | `List<Map>` containing `displayName` plus display fields and id (and the related field used for grouping). | `List<ModelReference>`. |

3. With SubQuery:
1. If `count = true`, return an integer count per parent row. SubQuery `filters` are applied to the count.
2. Otherwise return related rows as `List<Map>`.
3. If `SubQuery.fields` is empty, all stored fields of the related model are returned by default.
4. If `SubQuery.fields` is specified, those fields are returned, and `id` is automatically included. For OneToMany, the related field used for grouping is also present.
5. Nested `subQueries` are applied recursively to the related model.

## Option Sets

> **See also**: To declare option sets and items via Java enum annotations, see [`@OptionSet` / `@OptionItem`](../../backend_dev/model_dev/annotation#optionset--sysoptionset).

Option sets provide a shared, ordered list of selectable values. The web module exposes an API to read option items
and the ORM layer caches them for fast lookup.

### Data Source
Option items are stored in the metadata table `SysOptionItem`. Each item belongs to an `optionSetCode` and has an
`itemCode`, `itemName`, and a `sequence` used for ordering.

### Cache Behavior
At application startup, `OptionManager.init()` loads all `SysOptionItem` rows, ordered by `sequence`, and stores them
in an in-memory cache keyed by `optionSetCode`. Retrieval preserves the original order.

### API Usage
Read option items by option set code:

```
GET /SysOptionSet/getOptionItems/{optionSetCode}
```

Example:
```
GET /SysOptionSet/getOptionItems/OrderStatus
```

Response is a list of `OptionReference` objects.
```json
{
    "data": [
        {
            "itemCode": "Male",
            "itemName": "Male",
            "itemTone": "",
            "itemIcon": ""
        },
        ...
    ]
}
```

### Programmatic Usage
Use `OptionManager` in service code:

```java
List<MetaOptionItem> items = OptionManager.getMetaOptionItems("OrderStatus");
MetaOptionItem pending = OptionManager.getMetaOptionItem("OrderStatus", "PENDING");
String pendingName = OptionManager.getItemNameByCode("OrderStatus", "PENDING");
boolean exists = OptionManager.existsItemCode("OrderStatus", "PENDING");
```

### Localization
`MetaOptionItem.getItemName()` returns a translated name if a translation exists for the current language in context.
If no translation exists, it returns the original `itemName`.

### OptionReference Structure
When option values are expanded or returned as references, they use `OptionReference`.

Fields:
- `itemCode`: option item code.
- `itemName`: option item display name.
- `itemTone`: optional semantic tone (e.g. `success`, `warning`, `error`, `info`, `neutral`).
- `itemIcon`: optional icon code (e.g. `check`, `x`, `ban`, `alert`, `pause`, `info`, `eye`, `loader`, `clock`, `pending`, `undo`, `lock`).

###  API Return by Option / MultiOption fields
Default API return (`REFERENCE`):
1. `Option` -> `OptionReference` object:
```json
{ "itemCode": "Active", "itemName": "Active", "itemTone": "success", "itemIcon": "check" }
```
2. `MultiOption` -> `List<OptionReference>`:
```json
[
  { "itemCode": "A", "itemName": "Tag A", "itemTone": "", "itemIcon": "" },
  { "itemCode": "B", "itemName": "Tag B", "itemTone": "", "itemIcon": "" }
]
```

### Notes
- `OptionManager` throws if `optionSetCode` does not exist in cache. Validate with
  `OptionManager.existsOptionSetCode` when needed.
- Option set data must be present in the database before startup, or the cache will be empty.

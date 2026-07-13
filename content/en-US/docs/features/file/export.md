
## Data Export
File Starter supports three export modes:
1. Export by template fields
  - builds candidate fields from current model metadata
  - defaults selected fields to the currently visible table columns
  - lets the user change fields, file name, and sheet name
  - generates `.xlsx` workbooks for front-end initiated exports
2. Export by file template
    - uses an uploaded Excel template file with `{{ field }}` placeholders
    - extracts variables from the template to determine which fields to query
    - generates `.xlsx` workbooks by rendering the template with data

3. Dynamic export
  - exports without a template by providing fields and filters directly in the request

Built-in export supports three scopes:
- `Selected Rows` uses the current toolbar bulk selection ids
- `Current Page` uses the current page id snapshot, not `pageNumber/pageSize` replay
- `All Filtered Data` reuses current `filters/orders/groupBy/aggFunctions/effectiveDate`

Front-end export is limited to `100000` records for a single request; over-limit scopes are disabled instead of truncated.

### ExportTemplate Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `fileName` | String | `null` | Export file name |
| `sheetName` | String | `null` | Sheet name |
| `modelName` | String | `null` | Model name to export |
| `customFileTemplate` | Boolean | `null` | If true, use file template export mode; otherwise use field template mode |
| `fileId` | Long | `null` | Template file id (required when `customFileTemplate = true`) |
| `filters` | Filters | `null` | Default filters |
| `orders` | Orders | `null` | Default orders |
| `customHandler` | String | `null` | Spring bean name for CustomExportHandler |
| `enableTranspose` | Boolean | `null` | Whether to transpose output (not implemented in starter) |

### ExportTemplateField Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | ExportTemplate id |
| `fieldName` | String | `null` | Model field name (supports cascaded fields like `deptId.name`) |
| `customHeader` | String | `null` | Custom column header |
| `sequence` | Integer | `null` | Field order in export |
| `ignored` | Boolean | `null` | Whether to ignore the field in output |

### Cascaded Field Export
All three export modes support **cascaded field references** using dotted-path syntax (e.g. `deptId.name`, `deptId.companyId.code`).
This allows exporting fields from related models through ManyToOne/OneToOne associations.

**Syntax:** `{field1}.{field2}` or `{field1}.{field2}.{field3}` (up to 4 levels of cascade)

**How it works:**
1. The ORM layer creates dynamic virtual fields for dotted-path references (via `MetaField.createDynamicField`).
2. The field is split into 2 parts: the root ManyToOne/OneToOne field and the remaining path.
3. The related model is queried with the remaining path as expand fields.
4. For 3+ levels, the process recurses: `deptId.companyId.code` → query `Dept` with field `companyId.code` → query `Company` with field `code`.
5. The resolved value is stored in the row map with the full dotted key (e.g. `deptId.companyId.code`).
6. The column header defaults to the **last field's label** (e.g. the label of `code`), unless `customHeader` is set.

**Rules:**
- Maximum cascade depth: **4 levels** (`BaseConstant.CASCADE_LEVEL = 4`).
- Each intermediate field must be **ManyToOne or OneToOne** type.
- The last field must be a **stored field** (not dynamic/computed).
- `ConvertType.DISPLAY` is used, so option fields show the item `label` and relation fields show `displayName`.

**Example — Template export with cascaded fields:**

ExportTemplateField configuration:
```
fieldName: "name"                customHeader: null           sequence: 1
fieldName: "deptId.name"         customHeader: "Department"   sequence: 2
fieldName: "deptId.managerId.name" customHeader: "Dept Manager" sequence: 3
```

**Example — Dynamic export with cascaded fields:**
```bash
curl -X POST 'http://localhost:8080/export/dynamicExport?modelName=Employee' \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["name", "deptId.name", "deptId.managerId.name"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["name", "ASC"]
}
JSON
```

Result Excel columns: `Name | Department | Dept Manager`

### 1. Export By Template Fields
1. Configure ExportTemplate and ExportTemplateField

ExportTemplate key fields:
- `fileName`, `sheetName`, `modelName`
- `filters`, `orders`, `customHandler`

ExportTemplateField key fields:
- `fieldName`, `customHeader`, `sequence`, `ignored`

2. Export by template

Endpoint:
- `POST /export/exportByTemplate?exportTemplateId={id}`

Request body:
- `ExportParams` (fields, filters, orders, agg, groupBy, limit, effectiveDate)

Example:
```bash
curl -X POST http://localhost:8080/export/exportByTemplate?exportTemplateId=2001 \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
JSON
```

### 2. Export By File Template (Upload Template File)
This mode uses an uploaded Excel template file with placeholders like `{{ field }}` or `{{ object.field }}`.
The system extracts variables from the template to decide which fields to query.

To use this mode, set `customFileTemplate = true` and `fileId` to the uploaded template file in ExportTemplate.
The same `exportByTemplate` endpoint is used; the system dispatches to file-template mode automatically based on the `customFileTemplate` flag.

Endpoint:
- `POST /export/exportByTemplate?exportTemplateId={id}`

Example:
```bash
curl -X POST http://localhost:8080/export/exportByTemplate?exportTemplateId=2002 \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200
}
JSON
```

**File template placeholder syntax:**
- `{{ fieldName }}` — replaced with the field value of each row
- `{{ deptId.name }}` — cascaded field reference (resolved by the ORM layer)
- The `{{ }}` syntax is normalized to underlying Fesod `{}` syntax before rendering

### 3. Dynamic Export
Export without a template by providing fields and filters directly.

Endpoint:
- `POST /export/dynamicExport?modelName={model}&fileName={fileName}&sheetName={sheetName}`

Example:
```bash
curl -X POST 'http://localhost:8080/export/dynamicExport?modelName=Product&fileName=Products&sheetName=Sheet1' \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
JSON
```

### 4. Custom Export Handler
You can register a Spring bean implementing `CustomExportHandler` and reference it by name in
`ExportTemplate.customHandler`.

```java
import io.softa.starter.file.excel.export.support.CustomExportHandler;

@Component("productExportHandler")
public class ProductExportHandler implements CustomExportHandler {
    @Override
    public void handleExportData(List<Map<String, Object>> rows) {
        // custom post-processing
    }
}
```

Contract:
- You may update row values in place.
- You should not replace row map objects.
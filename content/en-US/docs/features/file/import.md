## Data Import

File Starter supports two import modes:
1. Import by configured template (ImportTemplate + ImportTemplateField)
  - Import by configured template (ImportTemplate + ImportTemplateField)
  - supports template download
  - submits uploaded files through the configured template

2. Dynamic mapping import (no template, mapping provided in request)
  - Dynamic mapping import (no template, mapping provided in request)
  - parses the uploaded `.xlsx` workbook in the browser
  - auto-maps workbook headers to model fields using metadata
  - lets the user adjust mappings before submit
### ImportTemplate Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | String | `null` | Template name |
| `modelName` | String | `null` | Model name to import |
| `importRule` | ImportRule | `null` | Import rule: CreateOrUpdate / OnlyCreate / OnlyUpdate |
| `uniqueConstraints` | List<String> | `null` | Unique key fields used by CreateOrUpdate |
| `ignoreEmpty` | Boolean | `null` | Ignore empty values when importing |
| `skipException` | Boolean | `null` | Continue when a row fails |
| `customHandler` | String | `null` | Spring bean name for CustomImportHandler |
| `syncImport` | Boolean | `null` | If true, import runs synchronously; otherwise async |
| `includeDescription` | Boolean | `null` | Whether to include description in template output |
| `description` | String | `null` | Description text |
| `importFields` | List<ImportTemplateField> | `null` | Import field list |

### ImportTemplateField Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | ImportTemplate id |
| `fieldName` | String | `null` | Model field name (supports `deptId.code` relation lookup) |
| `customHeader` | String | `null` | Custom Excel header |
| `sequence` | Integer | `null` | Field order in template |
| `required` | Boolean | `null` | Required field |
| `defaultValue` | String | `null` | Default value (supports `{{ expr }}`) |
| `description` | String | `null` | Description text |

### 1. Import By Template (Configured)
1. Configure ImportTemplate and ImportTemplateField

ImportTemplate key fields:
- `name`, `modelName`, `importRule`
- `uniqueConstraints` (for CreateOrUpdate)
- `ignoreEmpty`, `skipException`, `customHandler`, `syncImport`

ImportTemplateField key fields:
- `fieldName`, `customHeader`, `sequence`, `required`, `defaultValue`

Notes:
- Default values in ImportTemplateField support placeholders `{{ expr }}`. Simple variables are resolved from `env`, and expressions are evaluated against `env`.
- If `syncImport = true`, import is executed in-process.
- If `syncImport = false`, an async import message is sent to MQ.

### 1.1 Relation Lookup Import (Cascaded Import)
The `fieldName` in ImportTemplateField (or `importFieldDTOList` in dynamic import) supports **dotted-path relation lookup** via `RelationLookupResolver`. Instead of importing a raw FK id, you can import a human-readable business key of the related model, and the system will reverse-lookup the FK id automatically.

**Syntax:** `{fkField}.{businessKey}` — e.g. `deptId.code`, `deptId.name`

**How it works:**
1. The system detects dotted-path fields whose root is a ManyToOne/OneToOne field.
2. Groups them by root FK field (e.g. `deptId.code` and `deptId.name` form one group).
3. Batch-queries the related model by the business key values to resolve FK ids.
4. Writes back the resolved FK id to the root field (`deptId`) and removes the dotted-path columns.

**Rules:**
- Only **single-level** cascade is supported: `deptId.code` ✅, `deptId.companyId.code` ❌
- A direct FK field (e.g. `deptId`) and a lookup field (e.g. `deptId.code`) **must not coexist** in the same template.
- Multiple lookup fields sharing the same root are combined as a composite business key (e.g. `deptId.code` + `deptId.name` together uniquely identify a Department).
- When all lookup values in a row are empty:
  - If `ignoreEmpty = true`: the FK field is skipped (not written).
  - If `ignoreEmpty = false`: the FK field is explicitly set to `null`.
- When a lookup fails (no matching record found):
  - If `skipException = true`: the row is marked as failed with a reason message.
  - If `skipException = false`: a `ValidationException` is thrown immediately.

**Example — Template-based import:**

ImportTemplateField configuration:
```
fieldName: "deptId.code"    customHeader: "Department Code"    sequence: 3
fieldName: "name"           customHeader: "Employee Name"      sequence: 1
fieldName: "jobTitle"       customHeader: "Job Title"          sequence: 2
```

Excel file:
| Employee Name | Job Title | Department Code |
| --- | --- | --- |
| Alice | Engineer | D001 |
| Bob | Manager | D002 |

The system will look up `Department` by `code = "D001"` / `"D002"`, resolve the `id`, and write it into `deptId`.

**Example — Dynamic import with relation lookup:**
```bash
curl -X POST http://localhost:8080/import/dynamicImport \
  -F file=@/path/to/employees.xlsx \
  -F 'wizard={
    "modelName":"Employee",
    "importRule":"CreateOrUpdate",
    "uniqueConstraints":"employeeCode",
    "importFieldDTOList":[
      {"header":"Employee Name","fieldName":"name","required":true},
      {"header":"Department Code","fieldName":"deptId.code","required":true},
      {"header":"Job Title","fieldName":"jobTitle"}
    ],
    "syncImport":true
  };type=application/json'
```

2. Download the template file (optional)

Endpoint:
- `GET /ImportTemplate/getTemplateFile?id={templateId}`

The generated template uses field labels as headers. Required headers are styled.

3. Import by template

Endpoint:
- `POST /import/importByTemplate`

Parameters:
- `templateId`: ImportTemplate id
- `file`: Excel file
- `env`: JSON string for environment variables

Example:
```bash
curl -X POST http://localhost:8080/import/importByTemplate \
  -F templateId=1001 \
  -F env='{"deptId": 10, "source": "manual"}' \
  -F file=@/path/to/import.xlsx
```

### 2. Dynamic Mapping Import (No Template)
Endpoint:
- `POST /import/dynamicImport`

This endpoint accepts a `multipart/form-data` payload with:
- `file`: uploaded Excel file
- `wizard`: JSON payload for `ImportWizard`

Key fields:
- `modelName`
- `importRule`: `CreateOrUpdate` | `OnlyCreate` | `OnlyUpdate`
- `uniqueConstraints`: comma-separated field names
- `importFieldDTOList`: header-to-field mappings
- `ignoreEmpty`, `skipException`, `customHandler`, `syncImport`

Example:
```bash
curl -X POST http://localhost:8080/import/dynamicImport \
  -F file=@/path/to/import.xlsx \
  -F 'wizard={
    "modelName":"Product",
    "importRule":"CreateOrUpdate",
    "uniqueConstraints":"productCode",
    "importFieldDTOList":[
      {"header":"Product Code","fieldName":"productCode","required":true},
      {"header":"Product Name","fieldName":"productName","required":true},
      {"header":"Price","fieldName":"price"}
    ],
    "syncImport":true
  };type=application/json'
```

### 3. Import Result and Failed Rows
- Import returns `ImportHistory`.
- If any row fails, a “failed data” Excel file is generated and saved, with a `Failed Reason` column.
- Import status can be `PROCESSING`, `SUCCESS`, `FAILURE`, `PARTIAL_FAILURE`.

### 4. Custom Import Handler
You can register a Spring bean implementing `CustomImportHandler` and reference it by name in
`ImportTemplate.customHandler` or `ImportWizard.customHandler`.

```java
import io.softa.starter.file.excel.imports.CustomImportHandler;

@Component("productImportHandler")
public class ProductImportHandler implements CustomImportHandler {
    @Override
    public void handleImportData(List<Map<String, Object>> rows, Map<String, Object> env) {
        // custom preprocessing
    }
}
```

Contract:
- You may update row values in place.
- You may mark a row failed by writing `FileConstant.FAILED_REASON`.
- Do not add, remove, reorder, or replace row objects.

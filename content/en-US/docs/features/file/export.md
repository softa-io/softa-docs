
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
4. Export for re-import (by import template)
  - writes the records into an import template's own workbook, to be edited and imported back through that template; see "5. Export for re-import (by import template)" below

Built-in export supports three scopes:
- `Selected Rows` uses the current toolbar bulk selection ids
- `Current Page` uses the current page id snapshot, not `pageNumber/pageSize` replay
- `All Filtered Data` reuses current `filters/orders/groupBy/aggFunctions/effectiveDate`

Front-end export is limited to `100000` records for a single request; over-limit scopes are disabled instead of truncated.

### ExportTemplate Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `fileName` | String | `null` | Export file name |
| `sheetName` | String | `null` | Sheet name. In file template mode, the template's sheet of this name is filled, and a name the template does not have is refused; when unset, the first visible sheet that has a placeholder |
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

### Checked when saved

An export template is checked against its `modelName` when it is written, by the rules the export applies when it runs — `FieldPaths` in softa-orm, which states what the WHERE builder, the ORDER BY builder and the cascaded read accept:

- `modelName` must be a model of the metadata;
- every field of `filters` must be able to stand in a WHERE: through to-one relations by a join, or a to-many one by a sub-query, ending on a stored field;
- every field of `orders` must be able to stand in an ORDER BY: through to-one relations only, ending on a stored field;
- each column's `fieldName` must be readable: through to-one relations only, up to four levels — what the export resolves its headers and values with.

As for import templates, a field is checked when the write sets it, and moving a template to another model re-checks its filters, orders and the columns the write keeps.

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
6. The column header: a template column's `customHeader` when set; otherwise — and for every column of a dynamic export, which has no `customHeader` — the label of each many-to-one on its path and then the field's: `deptId.name` is `Department › Name`, `employeeId.departmentId.name` is `Employee › Department › Name`. Under the last label alone, the columns of two relations onto one model (a manager's and an HR partner's employee code) would share a header. A one-to-one hop adds nothing: `employeeProfileId.passType` is `Pass Type`, a field of the row's own sub-record. One rule for both modes (`ExportColumnHeaders`); a column that must read otherwise — a fixed outside format's — names its header in `customHeader`.

**Rules:**
- Maximum cascade depth: **4 levels** (`BaseConstant.CASCADE_LEVEL = 4`).
- Each intermediate field must be **ManyToOne or OneToOne** type.
- The last field must be a **stored field** (not dynamic/computed).
- `ConvertType.DISPLAY` is used, so option fields show the item `label` and relation fields show `displayName`.

**Example — Template export with cascaded fields:**

ExportTemplateField configuration:
```
fieldName: "name"                  customHeader: null           sequence: 1
fieldName: "deptId.name"           customHeader: "Department"   sequence: 2
fieldName: "deptId.managerId.name" customHeader: null           sequence: 3
```

Result Excel columns: `Name | Department | Department › Manager › Name`

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

Result Excel columns: `Name | Department › Name | Department › Manager › Name`

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
- Each `{{ field }}` is rewritten to Fesod's list placeholder `{.field}` before rendering, as the rows are filled as a list; text around a placeholder in the same cell is kept (`ID-{{ code }}`)
- A field name is dot-separated words of letters, digits and `_`. **No other brace may appear in the filled sheet**: Fesod reads every `{…}` of it as a placeholder, so `Price {USD}`, a mistyped `{{ dept-name }}`, `{{ .x }}`, `{{ }}` or `\{{ code }}` would vanish from the export without a word, and Fesod's own list syntax written by hand (`{.title}`) would be repeated per record and left empty. The export refuses such a sheet and names the cell. Every `{` or `}` outside a `{{ … }}` placeholder counts, an unclosed one included: a literal brace cannot be written in the filled sheet at all, with `\` or otherwise. Other sheets may contain braces
- **Placeholders go on one data row.** Each record fills a row of its own, starting at that row; the rows below it (totals, signatures, notes) move down rather than being written over. Pushing rows down makes Fesod hold the whole workbook in memory, several times what a plain fill takes: measured with 15 columns, 20,000 rows took about 0.7 GB and 7 s against 0.1 GB and 1 s, and 100,000 rows about 2.7 GB against 0.3 GB, slowing to minutes once the heap ran short, so a template with nothing below its data row is filled the plain, streaming way, and **a template with rows below its data row costs that memory on a large export** — keep those to modest row counts. A placeholder on any other row of the sheet — a title such as `Report for {{ deptId.name }}`, or a record laid out over two rows — is refused with the rows named, because it would be repeated per record or written over
- Only the filled sheet is read and rewritten: its placeholders decide the fields queried, and the other sheets (instructions, lookups) are kept as they are. Without `sheetName`, the filled sheet is the first visible one that has a placeholder, so when an instructions sheet in front quotes the `{{ … }}` syntax itself, set `sheetName`. A hidden sheet is filled only when named in `sheetName`: when only a hidden sheet has placeholders, the export is refused and names it. A filled sheet without any placeholder is refused, as is a file that is not an `.xlsx` workbook (an `.xls`, an empty or a damaged file)
- **Formulas and formatting below the data row do not grow with the records.** The rows are inserted at the data row, so a footer `SUM(A2:A2)` on row 3 still adds up the first record only, and a range that reaches down to the footer row itself (`SUM(A2:A3)`) has its end moved along with the footer — `SUM(A2:A5)` after three records, a reference to its own cell. Conditional formatting and data validation stay on the data row and are not copied to the inserted rows, and a merged cell or a formula cell that is not a placeholder (`=A2*B2`) on the data row is on the first record only. Of what sits below the data row, cell contents and formats move down but pictures (a signature, a seal) and data validation do not: a picture stays anchored where it was and ends up over the inserted records, and a validation stays on its original cells, which now hold a record. Totals over the records belong in the report itself or in a sheet of their own

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

### 5. Export for re-import (by import template)
An import template is the one statement of what an importable sheet of its model looks like: its columns, the key each relation is named by (`departmentId.code`, `jobLevelId.name`), the unique key a row is matched back to its record by, its country and its dropdowns. A dynamic export knows none of that and writes relations by their display names, so its file does not go back in. Exported with the import template, the file is that template's own workbook — the same headers, dropdowns, date formats and instruction sheet as the blank template from Download Template, built by `ImportTemplateWorkbook` — with the records under the header, and it imports back through the same template with no column mapping.

Endpoints (both on the export action; the service also asks for the import of the model, since such a file is for someone who can import it back):
- `POST /export/listImportTemplates?modelName={model}`: the model's own import templates a file can be exported with for the caller, in display order, each with the file's columns (`header`, `required`), the headers a row is matched by (`matchHeaders`), `ignoreEmpty` and `country`. Empty for a caller who cannot both export and import the model.
- `POST /export/exportByImportTemplate?modelName={model}&importTemplateId={id}`: body `ExportParams` (filters, orders, effective date; `fields` is ignored, the columns are the template's). Returns the file; `importTemplateId` on the export history records the template.

Offered only for a template a row can be matched back through:
- `importRule` is `CreateOrUpdate` or `OnlyUpdate`: exported with `OnlyCreate`, each record would be created again;
- a model without effective-dated versions (`timeline`): a file for re-import does not carry versions yet;
- a non-empty `uniqueConstraints` with a column for each of its fields; a relation in the key is covered by a lookup column of it (`companyId` by `companyId.code`);
- no column that names several records (`roleIds.code`): not written yet.

Each column is read so that the cell holds what that column's import takes:
- a dotted column (`departmentId.code`, `employeeProfileId.passType.name`) by its own path, the key it names the relation by;
- a bare to-one column (`currency`) by the related row's id (`currency.id`): the import takes the id there, which for a code-as-id master is its code (`SGD`), not the name a display read gives;
- every other column as an export reads it (`ConvertType.DISPLAY`): an option by its label, a boolean as Yes / No — what the import takes, and what the template's dropdowns list.

The caller's view of the template:
- columns the caller may not write are already out of it (`ImportService.getImportTemplateDTO`), as they are out of the blank template;
- an optional column on a sensitive field the caller can never see (`PermissionService.getHiddenSensitiveFields`) is left out of the file — the import reads a file without an optional column and then does not write that field; a required one makes the template unusable for them.

A template written for a country holds only that country's rows, judged as the import judges a row's country: by the company the row names (its first many-to-one onto the company model, `legalEntityId` on an employee; a company anchor joined at query time through its source path), and on the company model by its own `country`. A model naming no company is not filtered.

The workbook's dropdowns and filter cover the records and `5000` rows more (`OptionDropdownHandler`, `ImportSheetStyleHandler.forTemplate(fields, dataRows)`), as a blank template's cover 5000.

Transition: `ExportHistory.importTemplateId` is a new column. Under a `scanner-scope` that covers `io\.softa\.starter\.file\.entity` it is added at boot; an environment with an empty `scanner-scope` adds it by hand before the new jar starts (`ALTER TABLE export_history ADD COLUMN import_template_id BIGINT NULL`, plus its `sys_field` row the way that deployment adds catalog rows).

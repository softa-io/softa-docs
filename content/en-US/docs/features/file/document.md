## Document Export (Word/PDF)
Document templates are stored in `DocumentTemplate` and rendered as Word or PDF.

### DocumentTemplate Configuration Table
| Field          | Type | Default | Description |
|----------------| --- | --- | --- |
| `modelName`    | String | required | Model name to fetch data |
| `fileName`     | String | required | Output file name |
| `templateType` | DocumentTemplateType | `WORD` | `WORD`, `RICH_TEXT`, or `PDF` |
| `fileId`       | Long | `null` | Template file id (required for WORD type) |
| `htmlTemplate`  | String | `null` | HTML with `{{ }}` placeholders (required for RICH_TEXT type) |
| `convertToPdf` | Boolean | `null` | Convert WORD output to PDF if true |
| `description`  | String | `null` | Description text |

### Template Types and Generation Pipeline

```
templateType = WORD
  1. Extract variables from .docx via poi-tl (skip # and > plugin tags)
  2. Build SubQueries for OneToMany fields (LoopRowTableRenderPolicy)
  3. Fetch data: modelService.getById(modelName, rowId, fields, subQueries, ConvertType.DISPLAY)
  4. Render .docx via poi-tl (WordFileGenerator)
  5. If convertToPdf=true, convert DOCX to PDF via docx4j
  6. Upload to OSS -> return FileInfo

templateType = RICH_TEXT
  1. Extract {{ }} variables from htmlTemplate (HTML) via PlaceholderUtils
  2. Build SubQueries for OneToMany fields
  3. Fetch data: modelService.getById(modelName, rowId, fields, subQueries, ConvertType.DISPLAY)
  4. Convert {{ }} -> ${} and render HTML via FreeMarker (PdfFileGenerator)
  5. Convert HTML to PDF via OpenPDF
  6. Upload to OSS -> return FileInfo
```

### WORD Template Syntax
- Uses `{{ variable }}` placeholder syntax with Spring EL support.
- Use `{{#fieldName}}` for OneToMany fields rendered as looping table rows via `LoopRowTableRenderPolicy`.
- OneToMany fields are auto-detected from model metadata; SubQueries are built automatically to load related data.

### RICH_TEXT Template
- `htmlTemplate` stores HTML with `{{ variable }}` placeholders.
- Placeholders are converted to FreeMarker `${}` syntax before rendering.
- The rendered HTML is converted to PDF via OpenPDF.

### Endpoint
- `GET /DocumentTemplate/generateDocument?templateId={id}&rowId={rowId}`

Example:
```bash
curl -X GET 'http://localhost:8080/DocumentTemplate/generateDocument?templateId=3001&rowId=10001'
```

### Programmatic API
Besides the REST endpoint (which fetches data by `modelName` + `rowId`), you can also call `DocumentTemplateService` directly with a custom data object:

```java
@Autowired
private DocumentTemplateService documentTemplateService;

// Option 1: Generate by rowId (fetches data from the model automatically)
FileInfo fileInfo = documentTemplateService.generateDocument(templateId, rowId);

// Option 2: Generate by custom data object (Map or POJO)
Map<String, Object> data = Map.of(
    "name", "Alice",
    "deptId", "Engineering",
    "orderItems", List.of(
        Map.of("productName", "Widget", "quantity", 10),
        Map.of("productName", "Gadget", "quantity", 5)
    )
);
FileInfo fileInfo = documentTemplateService.generateDocument(templateId, data);
```

The `generateDocument(templateId, data)` overload skips the model data fetch step and renders the template directly with the provided data. This is useful when:
- The data comes from an external source or custom aggregation.
- You want to render a document from a non-model data structure.

## REST APIs (Summary)
- Import
  - `POST /import/importByTemplate`
  - `POST /import/dynamicImport`
  - `GET /ImportTemplate/getTemplateFile`
- Export
  - `POST /export/exportByTemplate` (dispatches to field-template or file-template mode based on `customFileTemplate`)
  - `POST /export/dynamicExport`
- Document
  - `GET /DocumentTemplate/generateDocument`
- Template Listing
  - `POST /ImportTemplate/listByModel`
  - `POST /ExportTemplate/listByModel`

## Examples
Export params (with cascaded fields):
```json
{
  "fields": ["id", "name", "code", "status", "deptId.name", "deptId.managerId.name"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
```

Import field mapping (with relation lookup):
```json
[
  {"header": "Product Code", "fieldName": "productCode", "required": true},
  {"header": "Product Name", "fieldName": "productName", "required": true},
  {"header": "Category Code", "fieldName": "categoryId.code", "required": true},
  {"header": "Price", "fieldName": "price"}
]
```

Import field mapping (direct FK id):
```json
[
  {"header": "Product Code", "fieldName": "productCode", "required": true},
  {"header": "Product Name", "fieldName": "productName", "required": true},
  {"header": "Price", "fieldName": "price"}
]
```

Import env:
```json
{
  "deptId": 10,
  "source": "manual"
}
```
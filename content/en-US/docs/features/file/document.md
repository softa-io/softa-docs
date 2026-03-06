
## Document Export (Word/PDF)
Document templates are stored in `DocumentTemplate` and rendered as Word or PDF.

### DocumentTemplate Configuration Table
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `modelName` | String | `null` | Model name to fetch data |
| `fileName` | String | `null` | Output file name |
| `fileId` | Long | `null` | Template file id (docx) |
| `convertToPdf` | Boolean | `null` | Convert to PDF if true |

DocumentTemplate key fields:
- `modelName`, `fileName`, `fileId`, `convertToPdf`

Template syntax:
- Uses `#{var}` placeholders, supports Spring EL.
- Supports table row loops via `LoopRowTableRenderPolicy`.

Endpoint:
- `GET /DocumentTemplate/generateDocument?templateId={id}&rowId={rowId}`

Example:
```bash
curl -X GET 'http://localhost:8080/DocumentTemplate/generateDocument?templateId=3001&rowId=10001'
```

If `convertToPdf=true`, the generated file is PDF; otherwise Word.

## REST APIs (Summary)
- Import
  - `POST /import/importByTemplate`
  - `POST /import/dynamicImport`
  - `GET /ImportTemplate/getTemplateFile`
- Export
  - `POST /export/exportByTemplate`
  - `POST /export/exportByFileTemplate`
  - `POST /export/dynamicExport`
- Document
  - `GET /DocumentTemplate/generateDocument`
- Template Listing
  - `POST /ImportTemplate/listByModel`
  - `POST /ExportTemplate/listByModel`

## Examples
Export params:
```json
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
```

Import field mapping:
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

## Document Signing
File Starter also provides a lightweight signing flow built on top of `SigningRequest` and `SigningDocument`.

### Signing Model
- `SigningRequest`: signing transaction header, recipient, status, expiration time, and related `SigningDocument` list.
- `SigningDocument`: one signable document under a signing request.

Current implementation stores a compact set of top-level fields on `SigningDocument`:
- business fields: `signingRequestId`, `templateId`, `signSlotCode`, `status`
- generated file fields: `signedImageId`, `signedPdfId`
- signer fields: `signerUserId`, `signerName`, `signedAt`
- audit correlation: `evidenceId`
- full evidence payload: `signatureEvidence` (`JsonNode`)

`signatureEvidence` contains:
- `evidenceId`
- `signSlotCode`
- `clientPayload`
- `resolvedPlacement`
- `resolvedRenderOptions`
- `serverEvidence`
  - `signatureMethod`
  - `signerUserId`, `signerName`
  - `serverSignedAt`
  - `clientIp`, `userAgent`
  - `signatureImageFileId`, `generatedSignedFileId`, `originalTemplateFileId`
  - `originalPdfSha256`, `signatureImageSha256`, `signedPdfSha256`

### Status
`SigningRequestStatus`:
- `Draft`
- `Sent`
- `InProgress`
- `Completed`
- `Cancelled`
- `Expired`

`SigningDocumentStatus`:
- `Pending`
- `InProgress`
- `Completed`

### Sign Endpoint
Endpoint:
- `POST /SigningDocument/sign?id={id}`

Content type:
- `multipart/form-data`

Parts:
- `signatureFile`: handwritten signature image file, usually PNG
- `payload`: JSON payload of `SigningDocumentSignRequest`

Request DTO:
```json
{
  "signSlotCode": "EMPLOYEE_SIGN",
  "placement": {
    "page": 1,
    "x": 120,
    "y": 90,
    "width": 180,
    "height": 64,
    "unit": "PT"
  },
  "evidence": {
    "signatureMethod": "DRAW",
    "clientSignedAt": "2026-03-24T10:15:30+08:00",
    "clientTimeZone": "Asia/Shanghai",
    "consentAccepted": true,
    "consentTextVersion": "v1",
    "signerDisplayName": "Alice",
    "userAgent": "Mozilla/5.0",
    "canvasWidth": 800,
    "canvasHeight": 240
  },
  "renderOptions": {
    "flattenToPdf": true,
    "keepSignatureImage": true,
    "imageScaleMode": "FIT"
  }
}
```

Response DTO:
```json
{
  "signingDocumentId": 9001,
  "status": "Completed",
  "signedFile": {
    "fileId": 701,
    "fileName": "contract_signed_20260324.pdf",
    "fileType": "PDF",
    "url": "https://...",
    "size": 256,
    "checksum": "..."
  },
  "signatureImageFile": {
    "fileId": 700,
    "fileName": "signature.png",
    "fileType": "PNG",
    "url": "https://...",
    "size": 12,
    "checksum": "..."
  },
  "signedAt": "2026-03-24T10:15:32+08:00",
  "evidenceId": "abc123"
}
```

### Signing Rules
The current `sign` flow completes the following steps in one request:
1. Validate current user, recipient, signing request status, and expiration time.
2. Upload the signature image file and persist `signedImageId`.
3. Build the original PDF from `DocumentTemplate`.
4. Resolve signature placement:
   - Prefer `signSlotCode` by locating a PDF form field in the source PDF.
   - Fallback to `placement` if the slot does not exist or the source PDF has no matching field.
5. Stamp the signature image onto the PDF.
6. Upload the signed PDF and persist `signedPdfId`.
7. Persist `signatureEvidence`, `evidenceId`, signer info, and sign timestamp.
8. Update `SigningDocument.status` and refresh `SigningRequest.status`.

### Placement Resolution
- `signSlotCode` is the recommended mode for template-defined sign slots.
- `placement` is the fallback for free positioning.
- Supported placement units:
  - `PT`
  - `PX`
  - `MM`
  - `CM`
  - `IN`

### Current Limitation
The current signing implementation builds the original PDF only from `DocumentTemplate`:
- `DocumentTemplate.fileId` with `PDF` is used directly
- `DocumentTemplate.fileId` with `DOCX` is rendered with empty data and then converted to PDF
- `DocumentTemplate.htmlTemplate` is rendered with empty data and converted to PDF

This means the current implementation is suitable for:
- signing fixed PDF templates
- signing static DOCX or HTML templates without business-row rendering

It does not yet support:
- signing a document that must first be rendered with business row data and then assigned to a `SigningDocument`

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
- Signing
  - `POST /SigningDocument/sign`
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
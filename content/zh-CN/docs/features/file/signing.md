## 文档签名

File Starter 还提供基于 `SigningRequest` 与 `SigningDocument` 的轻量签名流程。

### 签名模型

- `SigningRequest`：签名事务头、收件人、状态、过期时间，以及关联的 `SigningDocument` 列表。
- `SigningDocument`：一次签名请求下的一份待签文档。

当前实现在 `SigningDocument` 上持久化一组顶层字段：

- 业务字段：`signingRequestId`、`templateId`、`signSlotCode`、`status`
- 生成文件字段：`signedImageId`、`signedPdfId`
- 签名人字段：`signerUserId`、`signerName`、`signedAt`
- 审计关联：`evidenceId`
- 完整存证载荷：`signatureEvidence`（`JsonNode`）

`signatureEvidence` 包含：

- `evidenceId`
- `signSlotCode`
- `clientPayload`
- `resolvedPlacement`
- `resolvedRenderOptions`
- `serverEvidence`
  - `signatureMethod`
  - `signerUserId`、`signerName`
  - `serverSignedAt`
  - `clientIp`、`userAgent`
  - `signatureImageFileId`、`generatedSignedFileId`、`originalTemplateFileId`
  - `originalPdfSha256`、`signatureImageSha256`、`signedPdfSha256`

### 状态

`SigningRequestStatus`：

- `Draft`
- `Sent`
- `InProgress`
- `Completed`
- `Cancelled`
- `Expired`

`SigningDocumentStatus`：

- `Pending`
- `InProgress`
- `Completed`

### 签名接口

接口：

- `POST /SigningDocument/sign?id={id}`

Content-Type：

- `multipart/form-data`

表单部分：

- `signatureFile`：手写签名图片文件，通常为 PNG
- `payload`：`SigningDocumentSignRequest` 的 JSON

请求 DTO：

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

响应 DTO：

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

### 签名规则

当前 `sign` 流程在一次请求内完成以下步骤：

1. 校验当前用户、收件人、签名请求状态与过期时间。
2. 上传签名图片并持久化 `signedImageId`。
3. 由 `DocumentTemplate` 构建原始 PDF。
4. 解析签名位置：
   - 优先按 `signSlotCode` 在源 PDF 中定位 PDF 表单域。
   - 若槽位不存在或源 PDF 无匹配域，则回退到 `placement`。
5. 将签名图片压印到 PDF 上。
6. 上传已签 PDF 并持久化 `signedPdfId`。
7. 持久化 `signatureEvidence`、`evidenceId`、签名人信息与签名时间戳。
8. 更新 `SigningDocument.status` 并刷新 `SigningRequest.status`。

### DocumentTemplateSignSlot

`DocumentTemplateSignSlot` 存储文档模板的预定义签槽配置。每个签槽定义一个可放置签名的命名区域。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templateId` | Long | 所属 DocumentTemplate ID |
| `slotName` | String | 签槽展示名称 |
| `slotCode` | String | 签署时用于 `signSlotCode` 的代码 |
| `sequence` | Integer | 签槽顺序 |
| `placement` | JsonNode | 默认位置坐标（page、x、y、width、height、unit） |
| `description` | String | 说明文本 |

可通过 `POST/GET/PUT/DELETE /DocumentTemplateSignSlot` 进行 CRUD。

### 位置解析

- 针对模板定义的签槽，推荐使用 `signSlotCode`。系统会先在源 PDF 中查找匹配的 PDF 表单域；若未找到，再按 code 查询 `DocumentTemplateSignSlot`。
- `placement` 为自由定位时的回退方案。
- 支持的 placement 单位：
  - `PT`
  - `PX`
  - `MM`
  - `CM`
  - `IN`

### 当前限制

当前签名实现仅从 `DocumentTemplate` 构建原始 PDF：

- `DocumentTemplate.fileId` 为 `PDF` 时直接使用
- `DocumentTemplate.fileId` 为 `DOCX` 时以空数据渲染后转为 PDF
- `DocumentTemplate.htmlTemplate` 以空数据渲染后转为 PDF

因此当前实现适用于：

- 签署固定 PDF 模板
- 签署无需业务行数据的静态 DOCX 或 HTML 模板

尚不支持：

- 必须先按业务行数据渲染文档，再关联到 `SigningDocument` 后签署的场景

# File Starter

File Starter provides three core capabilities for developers:
- [Data import](./import)
- [Data export](./export)
- [Document export (Word/PDF)](./document)
- Document signing

This document focuses on developer usage and API-level examples.

## Code Structure

- `excel/export/strategy`: export strategy selection and concrete export implementations
- `excel/export/support`: shared export support components such as data fetch, template resolve, writer, upload, and custom export hooks
- `excel/imports`: import pipeline, handler factory, failure collection, persistence, and custom import hook
- `excel/style`: shared Excel style handlers
- `pdf/`: PDF document generators, Noto font provider, and PDF signing helpers (Word, PDF, signing)
- `word/`: Word document generator


## Dependency
```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>file-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## Requirements
- OSS storage (Minio or other supported providers) for template files and generated files.
- Pulsar is required if you use async import.
- Noto fonts are required for PDF generation (RICH_TEXT templates). Run `sh deploy/install-font.sh` to install.
- Database contains file metadata tables and file-starter tables:
  - Import: ImportTemplate, ImportTemplateField, ImportHistory,
  - Export: ExportTemplate, ExportTemplateField, ExportHistory,
  - Document: DocumentTemplate,
  - Signing: SigningRequest, SigningDocument.


## Configuration
### MQ topics (async import)
```yml
mq:
  topics:
    async-import:
      topic: dev_demo_async_import
      sub: dev_demo_async_import_sub
```

### OSS Configuration
```yml
oss:
  type: minio                            # minio | aliyun. A MinIO client also talks to AWS S3.
  endpoint: http://minio:9000            # the address THIS PROCESS connects to
  presign-endpoint: http://localhost:9000 # the address the BROWSER resolves; blank falls back to endpoint
  access-key: minioadmin
  secret-key: minioadmin
  bucket-name: dev-demo
  region:                                # blank falls back to us-east-1; REQUIRED when pointing at AWS S3
  sub-dir:                               # optional prefix inside the bucket
  url-expire-seconds:                    # pre-signed URL lifetime; blank falls back to 300
```

The bucket is never created for you — the client uploads straight to it, so a missing bucket surfaces as a `NoSuchBucket` failure on the first upload. Create it as a deployment prerequisite.

#### `endpoint` vs `presign-endpoint`

A pre-signed URL is fetched by the **browser**, so it must carry a host the browser can resolve — which is not always the address the server connects over. A server reaching MinIO at the docker-network hostname `http://minio:9000`, or Aliyun OSS at an ECS-internal `oss-<region>-internal.aliyuncs.com`, would hand the client a URL pointing at that private address; the download then fails in the browser with nothing in the server log.

The host is part of the SigV4 canonical request (`X-Amz-SignedHeaders=host`), so the URL **cannot be rewritten after signing** without invalidating the signature — it has to be signed against the public address from the start. That is what `presign-endpoint` is for: `endpoint` is used to connect, `presign-endpoint` to sign. Leave it blank whenever `endpoint` is already publicly reachable (AWS S3, a public Aliyun endpoint), which is the common case.

### Storage Policy
- General path: `modelName/uuid/fileName`
- Multi-tenancy path: `tenantId/modelName/uuid/fileName`

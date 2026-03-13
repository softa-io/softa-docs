# File Starter

File Starter provides three core capabilities for developers:
- [Data import](./import)
- [Data export](./export)
- [Document export (Word/PDF)](./document)

This document focuses on developer usage and API-level examples.

## Code Structure
The Excel module is organized by responsibility:

- `excel/export/strategy`: export strategy selection and concrete export implementations
- `excel/export/support`: shared export support components such as data fetch, template resolve, writer, upload, and custom export hooks
- `excel/imports`: import pipeline, handler factory, failure collection, persistence, and custom import hook
- `excel/style`: shared Excel style handlers

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
- Database contains file metadata tables and file-starter tables:
  ImportTemplate, ImportTemplateField, ImportHistory,
  ExportTemplate, ExportTemplateField, ExportHistory,
  DocumentTemplate.

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
  type: minio
  endpoint: http://minio:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket: dev-demo
```

### Storage Policy
- General path: `modelName/uuid/fileName`
- Multi-tenancy path: `tenantId/modelName/uuid/fileName`

# 文件处理 File Starter

File Starter 为开发者提供三大核心能力：

- 数据导入
- 数据导出
- 文档导出（Word / PDF）

本文主要从开发视角介绍能力边界和 API 使用方式，并作为导入/导出/文档导出三篇子文档的总览。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>file-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 前置条件

- 需要对象存储（Minio 或其它受支持的 OSS）用于存放模板文件和生成文件。
- 如需使用**异步导入**，需要接入 Pulsar。
- 数据库中需要存在与文件能力相关的元数据表：
  - 导入：`ImportTemplate`、`ImportTemplateField`、`ImportHistory`
  - 导出：`ExportTemplate`、`ExportTemplateField`、`ExportHistory`
  - 文档：`DocumentTemplate`

## 配置示例

### MQ 主题（异步导入）

```yml
mq:
  topics:
    async-import:
      topic: dev_demo_async_import
      sub: dev_demo_async_import_sub
```

### OSS 配置

```yml
oss:
  type: minio
  endpoint: http://minio:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket: dev-demo
```

### 存储路径策略

- 普通场景：`modelName/TSID/fileName`
- 多租户场景：`tenantId/modelName/TSID/fileName`

其中 `TSID` 为全局唯一 ID，用于避免文件名冲突。


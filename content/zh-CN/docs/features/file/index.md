# File Starter

File Starter 为开发者提供四项核心能力：

- [数据导入](./import)
- [数据导出](./export)
- [文档导出（Word/PDF）](./document)
- [文档签名](./signing)

本文侧重开发者用法与 API 级示例。

## 代码结构

- `excel/export/strategy`：导出策略选择与具体导出实现
- `excel/export/support`：导出共享支撑组件，如数据获取、模板解析、写出、上传与自定义导出钩子
- `excel/imports`：导入流水线、处理器工厂、失败收集、持久化与自定义导入钩子
- `excel/style`：共享的 Excel 样式处理器
- `file/`：文档文件生成器与 PDF 签名辅助能力（Word、PDF、签名）

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
- 使用异步导入时需接入 Pulsar。
- 数据库中需包含文件元数据表及 file-starter 表：
  - 导入：`ImportTemplate`、`ImportTemplateField`、`ImportHistory`
  - 导出：`ExportTemplate`、`ExportTemplateField`、`ExportHistory`
  - 文档：`DocumentTemplate`
  - 签名：`SigningRequest`、`SigningDocument`

## 配置

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

- 普通路径：`modelName/uuid/fileName`
- 多租户路径：`tenantId/modelName/uuid/fileName`

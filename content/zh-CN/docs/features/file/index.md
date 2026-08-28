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
- `pdf/`：PDF 文档生成、Noto 字体提供，以及 PDF 签名相关辅助能力（Word、PDF、签名）
- `word/`：Word 文档生成

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
- PDF 生成（RICH_TEXT 文档模板）需要 Noto 字体。本地可执行 `sh deploy/install-font.sh` 安装。
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
  type: minio                            # minio | aliyun。MinIO 客户端同样可以对接 AWS S3
  endpoint: http://minio:9000            # 服务端连接用的地址
  presign-endpoint: http://localhost:9000 # 浏览器解析用的地址；留空则回落 endpoint
  access-key: minioadmin
  secret-key: minioadmin
  bucket-name: dev-demo
  region:                                # 留空回落 us-east-1；指向 AWS S3 时必填
  sub-dir:                               # 可选，桶内再套一层前缀
  url-expire-seconds:                    # 预签名 URL 有效期；留空回落 300 秒
```

桶不会被自动创建 —— 客户端直接向桶上传，桶不存在时表现为第一次上传抛 `NoSuchBucket`。建桶属于部署的前置步骤。

#### `endpoint` 与 `presign-endpoint`

预签名 URL 是交给**浏览器**去取的，因此它携带的 host 必须是浏览器能解析的地址，而这未必是服务端连接用的那个。服务端通过容器网络 hostname `http://minio:9000` 连 MinIO、或通过 ECS 内网端点 `oss-<region>-internal.aliyuncs.com` 连阿里云 OSS 时，交给前端的链接会指向这些内网地址，下载在浏览器侧失败，服务端日志里什么都看不到。

host 参与 SigV4 签名（`X-Amz-SignedHeaders=host`），所以**签完再改域名会让签名失效** —— 必须一开始就按对外地址签。`presign-endpoint` 正是为此而设：`endpoint` 负责连接，`presign-endpoint` 负责签名。`endpoint` 本身已是公网地址时（AWS S3、公网阿里云端点）留空即可，这也是多数情况。

### 存储路径策略

- 普通路径：`modelName/uuid/fileName`
- 多租户路径：`tenantId/modelName/uuid/fileName`

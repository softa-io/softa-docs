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
  url-expire-seconds:                    # 打开文件地址时现签的存储短链接有效期；留空回落 300 秒
```

桶不会被自动创建 —— 客户端直接向桶上传，桶不存在时表现为第一次上传抛 `NoSuchBucket`。建桶属于部署的前置步骤。

`url-expire-seconds` 只管打开文件地址时现签的那条存储短链接，不是 `FileInfo.url` 的有效期（见[文件地址与钥匙](#文件地址与钥匙)）。以前这一项不生效，总是 300 秒。

#### `endpoint` 与 `presign-endpoint`

预签名 URL（打开文件地址时 302 跳去的存储短链接）是交给**浏览器**去取的，因此它携带的 host 必须是浏览器能解析的地址，而这未必是服务端连接用的那个。服务端通过容器网络 hostname `http://minio:9000` 连 MinIO、或通过 ECS 内网端点 `oss-<region>-internal.aliyuncs.com` 连阿里云 OSS 时，交给前端的链接会指向这些内网地址，下载在浏览器侧失败，服务端日志里什么都看不到。

host 参与 SigV4 签名（`X-Amz-SignedHeaders=host`），所以**签完再改域名会让签名失效** —— 必须一开始就按对外地址签。`presign-endpoint` 正是为此而设：`endpoint` 负责连接，`presign-endpoint` 负责签名。`endpoint` 本身已是公网地址时（AWS S3、公网阿里云端点）留空即可，这也是多数情况。

### 存储路径策略

- 普通路径：`modelName/uuid/fileName`
- 多租户路径：`tenantId/modelName/uuid/fileName`

### 文件钥匙

`FileInfo.url` 里的钥匙用这个密钥签名（见[文件地址与钥匙](#文件地址与钥匙)）：

```yml
file:
  open-key-secret: ${FILE_OPEN_KEY_SECRET:}   # 必填；至少 32 字节的随机串；所有实例相同
```

- 留空时启动失败。生成办法：`openssl rand -base64 48`。
- 所有实例必须用同一个值，滚动发布时的新旧容器也一样，否则互相不认对方签的钥匙。
- 换密钥会让已经发出的钥匙全部失效，刷新页面即可拿到新的。

应用要在 `permission.authenticated-bypass-patterns` 里放开 `/file/open/**`：权限拦截器从这个路径认不出模型，原因和 `/file/uploadFileTo*` 相同。放开的是接口，不是数据：钥匙由打开接口自己校验。`/openapi/**` 本来就是公开路径，不用配。

## 文件地址与钥匙

`FileInfo.url`（读 File / MultiFile 字段、上传文件、生成文件时返回）不是存储的预签名链接，而是一个带钥匙的同源相对地址，在把数据返回给前端的那一刻生成。按这次请求有没有登录用户分两种：

| 请求 | `FileInfo.url` | 谁能打开 | 有效期 |
|---|---|---|---|
| 有登录用户 | `<context-path>/file/open/<钥匙>` | 只有签发给的那个账号，要带着这个账号的会话 | 30–31 天 |
| 没有登录用户：`/openapi/**` 下的公开页、定时任务、没人触发的流程 | `<context-path>/openapi/file/<钥匙>` | 不绑人，拿到地址的都能打开 | 1 小时 |

- **钥匙**：`<fileId>.<exp>.<签名>`，例如 `1987654321098765432.1797206400.G4CHYJkdKbgZABYFb9A1mw`。签名是 HMAC-SHA256 取前 128 位，base64url 编码。账号不写进钥匙：校验时用当前会话的账号重算签名，只有本人算得出同样的结果。服务端什么都不存，也不用 Redis。
- **有效期**：用户钥匙的 exp 是签发当天的 UTC 零点加 31 天，所以同一个文件的地址一天之内不变，每把钥匙能用 30–31 天。
- **地址**：相对地址，前缀是 `server.servlet.context-path`；浏览器按同源请求打开它，带上会话。
- **打开**：接口校验钥匙，然后 302 跳到这一刻现签的存储短链接（有效期 `oss.url-expire-seconds`，默认 300 秒），响应带 `Cache-Control: no-store`。默认在浏览器里显示；地址后加 `?download=1` 则以附件形式下载，带上文件名。生成文件、导出和导入结果的地址自带 `?download=1`。
- **出错**：回一行纯文本而不是 JSON，因为地址是被 img、iframe、新标签页直接打开的。403：钥匙签发给了别的账号（或被改动过）；404：钥匙格式不对，或文件不存在；410：已过期；401：打开 `/file/open/` 地址时没有可用的会话（没登录或会话已失效）。其他接口没有会话时仍是 HTTP 200 加 JSON，钥匙地址单独回 401，免得下载把那段 JSON 存成文件。

### 什么时候打不开

钥匙只在已经鉴权的读取里发出，打开时不再查业务记录的权限。已经发出的用户钥匙：

| 情况 | 结果 |
|---|---|
| 地址转给了别人 | 别人打不开 |
| 离职、冻结 | 登录一失效就打不开 |
| 账号改绑给另一个人（Unbind & Re-invite） | 前一个人的会话全部收回，他手里的钥匙打不开；接手的人用的是同一个账号，本来就能看这些文件 |
| 账号还在，记录权限被收回；附件从记录上删掉 | 最多还能打开 31 天（以前是 5 分钟）。删附件只解除关联，存储里的文件还在 |
| 页面一直开着不刷新 | 30 天后打不开，刷新即恢复 |
| 更换签名密钥 | 全部失效，刷新即恢复 |

### 后台代码只用 fileId

缓存、数据库、流程变量、邮件里只放 fileId；地址在把数据返回给前端的那一刻生成。`FileInfo.url` 只给发起这次请求的前端用，后台代码不读它，按用途直接用 fileId：

| 要做什么 | 怎么做 |
|---|---|
| 读文件内容：解析、导入、合并、转存 | `fileService.downloadStream(fileId)` |
| 作为邮件附件发出 | 按 fileId 传，发送时按 fileId 读出内容；流程里用发送邮件节点的 `attachments`，见[生成文件与邮件附件](../flow/automation#生成文件与邮件附件) |
| 交给按地址拉文件的外部系统（OCR、AI 识图、第三方电子签等） | 调用时按 fileId 现签一条存储短链接，用完即弃，不存下来 |
| 让人以后再打开（邮件、短信、站内信的正文） | 不放文件地址：作为附件发出，或者放记录页面的链接，收件人登录后读记录，拿到自己的钥匙 |

后台签出的地址也不要存下来或发出去：没有登录用户时（定时任务、没人触发的流程）签的是不绑人的钥匙，谁拿到都能打开，1 小时后失效；用户触发的流程签的是触发人的钥匙，只有他在自己的浏览器里能打开；而且地址是相对的，离开浏览器本来就用不了。

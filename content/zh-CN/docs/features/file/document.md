
## 文档导出（Word/PDF）

文档模板存储在 `DocumentTemplate` 中，可渲染为 Word 或 PDF。

### DocumentTemplate 配置表

| 字段          | 类型 | 默认值 | 说明 |
|----------------| --- | --- | --- |
| `modelName`    | String | 必填 | 用于拉取数据的模型名 |
| `fileName`     | String | 必填 | 输出文件名 |
| `templateType` | DocumentTemplateType | `WORD` | `WORD`、`RICH_TEXT` 或 `PDF` |
| `fileId`       | Long | `null` | 模板文件 id（WORD 类型必填） |
| `htmlTemplate`  | String | `null` | 带 `{{ }}` 占位符的 HTML（RICH_TEXT 类型必填） |
| `convertToPdf` | Boolean | `null` | 为 true 时将 WORD 输出转为 PDF |
| `description`  | String | `null` | 说明文本 |

### 模板类型与生成流水线

```
templateType = WORD
  1. 通过 poi-tl 从 .docx 提取变量（跳过 # 和 > 插件标签）
  2. 为 OneToMany 字段构建 SubQueries（LoopRowTableRenderPolicy）
  3. 拉取数据：modelService.getById(modelName, rowId, fields, subQueries, ConvertType.DISPLAY)
  4. 通过 poi-tl 渲染 .docx（WordFileGenerator）
  5. 若 convertToPdf=true，通过 docx4j 将 DOCX 转为 PDF
  6. 上传至 OSS -> 返回 FileInfo

templateType = RICH_TEXT
  1. 通过 PlaceholderUtils 从 htmlTemplate（HTML）提取 {{ }} 变量
  2. 为 OneToMany 字段构建 SubQueries
  3. 拉取数据：modelService.getById(modelName, rowId, fields, subQueries, ConvertType.DISPLAY)
  4. 通过 Pebble 将 {{ }} 渲染为最终 HTML
  5. 通过 OpenPDF 将 HTML 转为 PDF
  6. 上传至 OSS -> 返回 FileInfo
```

### WORD 模板语法

- 使用 `{{ variable }}` 占位符语法。
- 对通过 `LoopRowTableRenderPolicy` 以循环表格行渲染的 OneToMany 字段，使用 `{{#fieldName}}`。
- OneToMany 字段由模型元数据自动识别；SubQueries 会自动构建以加载关联数据。

### RICH_TEXT 模板

- `htmlTemplate` 存储带 `{{ variable }}` 占位符的 HTML。
- 占位符通过 Pebble 渲染为最终 HTML。
- 渲染后的 HTML 通过 OpenPDF 转为 PDF。

### 接口

- `GET /DocumentTemplate/generateDocument?templateId={id}&rowId={rowId}`

示例：

```bash
curl -X GET 'http://localhost:8080/DocumentTemplate/generateDocument?templateId=3001&rowId=10001'
```

### 编程式 API

除 REST 接口（按 `modelName` + `rowId` 拉取数据）外，也可以直接向 `DocumentTemplateService` 传入自定义数据对象调用：

```java
@Autowired
private DocumentTemplateService documentTemplateService;

// 方式 1：按 rowId 生成（自动从模型拉取数据）
FileInfo fileInfo = documentTemplateService.generateDocument(templateId, rowId);

// 方式 2：按自定义数据对象生成（Map 或 POJO）
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

`generateDocument(templateId, data)` 重载会跳过模型数据拉取步骤，直接使用所给数据渲染模板。适用于：

- 数据来自外部来源或自定义聚合
- 需要基于非模型数据结构渲染文档

## REST API 汇总

- 导入
  - `POST /import/importByTemplate`
  - `POST /import/dynamicImport`
  - `GET /ImportTemplate/getTemplateFile`
- 导出
  - `POST /export/exportByTemplate`（根据 `customFileTemplate` 分发至字段模板或文件模板模式）
  - `POST /export/dynamicExport`
- 文档
  - `GET /DocumentTemplate/generateDocument`
- 模板列表
  - `POST /ImportTemplate/listByModel`
  - `POST /ExportTemplate/listByModel`

## 示例

导出参数（含级联字段）：

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

导入字段映射（含关联反查）：

```json
[
  {"header": "Product Code", "fieldName": "productCode", "required": true},
  {"header": "Product Name", "fieldName": "productName", "required": true},
  {"header": "Category Code", "fieldName": "categoryId.code", "required": true},
  {"header": "Price", "fieldName": "price"}
]
```

导入字段映射（直接外键 id）：

```json
[
  {"header": "Product Code", "fieldName": "productCode", "required": true},
  {"header": "Product Name", "fieldName": "productName", "required": true},
  {"header": "Price", "fieldName": "price"}
]
```

导入环境：

```json
{
  "deptId": 10,
  "source": "manual"
}
```

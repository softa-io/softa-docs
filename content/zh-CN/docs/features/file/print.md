# 文件打印（文档导出）

File Starter 支持基于模板的文档导出，可生成 Word 或 PDF 文件。文档模板存储在 `DocumentTemplate` 表中。

## DocumentTemplate 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelName` | String | `null` | 用于查询数据的模型名 |
| `fileName` | String | `null` | 导出文件名 |
| `fileId` | Long | `null` | 模板文件 ID（docx） |
| `convertToPdf` | Boolean | `null` | 是否转换为 PDF，true 则输出 PDF，否则输出 Word |

DocumentTemplate 关键字段：

- `modelName`、`fileName`、`fileId`、`convertToPdf`

## 模板语法

- 使用 `#{var}` 占位符，支持 Spring EL 表达式。
- 支持通过 `LoopRowTableRenderPolicy` 对表格行进行循环渲染。

## 生成功能接口

接口：

- `GET /DocumentTemplate/generateDocument?templateId={id}&rowId={rowId}`

示例：

```bash
curl -X GET 'http://localhost:8080/DocumentTemplate/generateDocument?templateId=3001&rowId=10001'
```

当 `convertToPdf = true` 时，输出 PDF 文件；否则输出 Word 文件。

## REST API 汇总

- 导入
  - `POST /import/importByTemplate`
  - `POST /import/dynamicImport`
  - `GET /ImportTemplate/getTemplateFile`
- 导出
  - `POST /export/exportByTemplate`
  - `POST /export/exportByFileTemplate`
  - `POST /export/dynamicExport`
- 文档
  - `GET /DocumentTemplate/generateDocument`
- 模板查询
  - `POST /ImportTemplate/listByModel`
  - `POST /ExportTemplate/listByModel`

## 示例

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

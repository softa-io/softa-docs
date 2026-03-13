# 数据导出

File Starter 支持三种数据导出模式：

- 基于字段模板导出
- 基于文件模板导出
- 动态导出（无模板）

## ExportTemplate 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fileName` | String | `null` | 导出文件名 |
| `sheetName` | String | `null` | 工作表名称 |
| `modelName` | String | `null` | 要导出的模型名 |
| `fileId` | Long | `null` | 模板文件 ID（用于文件模板导出） |
| `filters` | Filters | `null` | 默认筛选条件 |
| `orders` | Orders | `null` | 默认排序规则 |
| `customHandler` | String | `null` | 自定义导出处理器 Bean 名（`CustomExportHandler`） |
| `enableTranspose` | Boolean | `null` | 是否转置输出（当前 Starter 未实现） |

## ExportTemplateField 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | 所属 ExportTemplate 的 ID |
| `fieldName` | String | `null` | 模型字段名 |
| `customHeader` | String | `null` | 自定义列头 |
| `sequence` | Integer | `null` | 在导出中的字段顺序 |
| `ignored` | Boolean | `null` | 是否在导出时忽略该字段 |

## 一、基于字段模板导出

### 1. 配置 ExportTemplate 和 ExportTemplateField

ExportTemplate 关键字段：

- `fileName`、`sheetName`、`modelName`
- `filters`、`orders`、`customHandler`

ExportTemplateField 关键字段：

- `fieldName`、`customHeader`、`sequence`、`ignored`

### 2. 按模板导出

接口：

- `POST /export/exportByTemplate?exportTemplateId={id}`

请求体：

- `ExportParams` 对象（包含 fields、filters、orders、agg、groupBy、limit、effectiveDate 等）

示例：

```bash
curl -X POST http://localhost:8080/export/exportByTemplate?exportTemplateId=2001 \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
JSON
```

## 二、基于文件模板导出（上传 Excel 模板）

此模式使用预先上传的 Excel 模板文件，通过占位符（如 `{field}` 或 `{object.field}`）来决定导出的字段和渲染位置。系统会从模板中解析变量，并据此构建查询字段列表。

接口：

- `POST /export/exportByFileTemplate?exportTemplateId={id}`

示例：

```bash
curl -X POST http://localhost:8080/export/exportByFileTemplate?exportTemplateId=2002 \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
JSON
```

## 三、动态导出

无需创建 ExportTemplate，直接在请求中指定字段和过滤条件。

接口：

- `POST /export/dynamicExport?modelName={model}&fileName={fileName}&sheetName={sheetName}`

示例：

```bash
curl -X POST 'http://localhost:8080/export/dynamicExport?modelName=Product&fileName=Products&sheetName=Sheet1' \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["id", "name", "code", "status"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200,
  "groupBy": [],
  "effectiveDate": "2026-03-03"
}
JSON
```

## 四、自定义导出处理器

你可以实现 `CustomExportHandler` 接口，并在 `ExportTemplate.customHandler` 中通过 Bean 名引用：

```java
import io.softa.starter.file.excel.export.support.CustomExportHandler;

@Component("productExportHandler")
public class ProductExportHandler implements CustomExportHandler {
    @Override
    public void handleExportData(List<Map<String, Object>> rows) {
        // 自定义后处理逻辑
    }
}
```

约定：

- 可以原地修改每一行的值。
- 不要替换行对应的 `Map` 对象本身。

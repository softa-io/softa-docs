
## 导出

内置导出支持三个范围：
- `Selected Rows`：使用当前工具栏批量选择的 ids
- `Current Page`：使用当前页的 id 快照，而不是重新回放 `pageNumber/pageSize`
- `All Filtered Data`：复用当前的 `filters/orders/groupBy/aggFunctions/effectiveDate`

前端单次导出最多支持 `100000` 条记录；超出限制的范围会被禁用，而不会截断导出。

对话框标签页：
- `By Template`
  - 从当前模型元数据构建候选字段
  - 默认选中当前表格可见列
  - 允许用户修改字段、文件名和工作表名
  - 为前端发起的导出生成 `.xlsx` 工作簿

- `Dynamic Export`
  - 使用所选字段导出数据

- `My Export History`
  - 加载当前模型的 `ExportHistory`
  - 已存在的文件可以通过点击链接下载

### ExportTemplate 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fileName` | String | `null` | 导出文件名 |
| `sheetName` | String | `null` | 工作表名 |
| `modelName` | String | `null` | 要导出的模型名 |
| `fileId` | Long | `null` | 模板文件 id（文件模板导出时使用） |
| `filters` | Filters | `null` | 默认过滤条件 |
| `orders` | Orders | `null` | 默认排序条件 |
| `customHandler` | String | `null` | `CustomExportHandler` 对应的 Spring bean 名称 |
| `enableTranspose` | Boolean | `null` | 是否转置输出（starter 中尚未实现） |

### ExportTemplateField 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | `ExportTemplate` id |
| `fieldName` | String | `null` | 模型字段名 |
| `customHeader` | String | `null` | 自定义列表头 |
| `sequence` | Integer | `null` | 导出字段顺序 |
| `ignored` | Boolean | `null` | 是否在输出中忽略该字段 |

### 1. 按模板字段导出
1. 配置 `ExportTemplate` 和 `ExportTemplateField`

`ExportTemplate` 关键字段：
- `fileName`、`sheetName`、`modelName`
- `filters`、`orders`、`customHandler`

`ExportTemplateField` 关键字段：
- `fieldName`、`customHeader`、`sequence`、`ignored`

2. 按模板导出

接口：
- `POST /export/exportByTemplate?exportTemplateId={id}`

请求体：
- `ExportParams`（fields、filters、orders、agg、groupBy、limit、effectiveDate）

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

### 2. 按文件模板导出（上传模板文件）
此模式使用已上传的 Excel 模板文件，模板中可以包含 `{field}` 或 `{object.field}` 这样的占位符。
系统会从模板中提取变量，以决定需要查询哪些字段。

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

### 3. 动态导出
无需模板，直接提供字段和过滤条件进行导出。

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

### 4. 自定义导出处理器
你可以注册一个实现了 `CustomExportHandler` 的 Spring bean，并在
`ExportTemplate.customHandler` 中通过名称引用它。

```java
import io.softa.starter.file.excel.export.support.CustomExportHandler;

@Component("productExportHandler")
public class ProductExportHandler implements CustomExportHandler {
    @Override
    public void handleExportData(List<Map<String, Object>> rows) {
        // custom post-processing
    }
}
```

约定：
- 可以原地修改行值
- 不应替换行 map 对象本身

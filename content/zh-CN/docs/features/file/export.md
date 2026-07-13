
## 数据导出
File Starter 支持三种导出模式：
1. 按模板字段导出
  - 从当前模型元数据构建候选字段
  - 默认选中字段为当前可见表格列
  - 允许用户更改字段、文件名和工作表名
  - 为前端发起的导出生成 `.xlsx` 工作簿
2. 按文件模板导出
    - 使用带 `{{ field }}` 占位符的上传 Excel 模板文件
    - 从模板提取变量以确定要查询的字段
    - 用数据渲染模板生成 `.xlsx` 工作簿

3. 动态导出
  - 通过在请求中直接提供字段和 filters 进行无模板导出

内置导出支持三种范围：
- `Selected Rows` 使用当前工具栏批量选中的 id
- `Current Page` 使用当前页 id 快照，而非 `pageNumber/pageSize` 重放
- `All Filtered Data` 复用当前 `filters/orders/groupBy/aggFunctions/effectiveDate`

前端导出单次请求限制为 `100000` 条记录；超限范围会被禁用而非截断。

### ExportTemplate 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fileName` | String | `null` | 导出文件名 |
| `sheetName` | String | `null` | 工作表名 |
| `modelName` | String | `null` | 要导出的模型名 |
| `customFileTemplate` | Boolean | `null` | 为 true 时使用文件模板导出模式；否则使用字段模板模式 |
| `fileId` | Long | `null` | 模板文件 id（`customFileTemplate = true` 时必填） |
| `filters` | Filters | `null` | 默认 filters |
| `orders` | Orders | `null` | 默认 orders |
| `customHandler` | String | `null` | CustomExportHandler 的 Spring bean 名称 |
| `enableTranspose` | Boolean | `null` | 是否转置输出（starter 中未实现） |

### ExportTemplateField 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | ExportTemplate id |
| `fieldName` | String | `null` | 模型字段名（支持级联字段如 `deptId.name`） |
| `customHeader` | String | `null` | 自定义列标题 |
| `sequence` | Integer | `null` | 导出中的字段顺序 |
| `ignored` | Boolean | `null` | 是否在输出中忽略该字段 |

### 级联字段导出
三种导出模式均支持使用点分路径语法的**级联字段引用**（如 `deptId.name`、`deptId.companyId.code`）。
这允许通过 ManyToOne/OneToOne 关联导出关联模型的字段。

**语法：** `{field1}.{field2}` 或 `{field1}.{field2}.{field3}`（最多 4 级级联）

**工作原理：**
1. ORM 层为点分路径引用创建动态虚拟字段（通过 `MetaField.createDynamicField`）。
2. 字段拆分为 2 部分：根 ManyToOne/OneToOne 字段和剩余路径。
3. 使用剩余路径作为展开字段查询关联模型。
4. 对于 3+ 级，过程递归：`deptId.companyId.code` → 查询 `Dept`，字段为 `companyId.code` → 查询 `Company`，字段为 `code`。
5. 解析后的值以完整点分键（如 `deptId.companyId.code`）存入行映射。
6. 列标题默认为**最后一个字段的 label**（如 `code` 的 label），除非设置了 `customHeader`。

**规则：**
- 最大级联深度：**4 级**（`BaseConstant.CASCADE_LEVEL = 4`）。
- 每个中间字段必须是 **ManyToOne 或 OneToOne** 类型。
- 最后一个字段必须是**存储字段**（非 dynamic/computed）。
- 使用 `ConvertType.DISPLAY`，因此选项字段显示条目 `label`，关联字段显示 `displayName`。

**示例 — 带级联字段的模板导出：**

ExportTemplateField 配置：
```
fieldName: "name"                customHeader: null           sequence: 1
fieldName: "deptId.name"         customHeader: "Department"   sequence: 2
fieldName: "deptId.managerId.name" customHeader: "Dept Manager" sequence: 3
```

**示例 — 带级联字段的动态导出：**
```bash
curl -X POST 'http://localhost:8080/export/dynamicExport?modelName=Employee' \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "fields": ["name", "deptId.name", "deptId.managerId.name"],
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["name", "ASC"]
}
JSON
```

结果 Excel 列：`Name | Department | Dept Manager`

### 1. 按模板字段导出
1. 配置 ExportTemplate 和 ExportTemplateField

ExportTemplate 关键字段：
- `fileName`、`sheetName`、`modelName`
- `filters`、`orders`、`customHandler`

ExportTemplateField 关键字段：
- `fieldName`、`customHeader`、`sequence`、`ignored`

2. 按模板导出

端点：
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
此模式使用带 `{{ field }}` 或 `{{ object.field }}` 等占位符的上传 Excel 模板文件。
系统从模板提取变量以决定查询哪些字段。

使用此模式时，在 ExportTemplate 中设置 `customFileTemplate = true` 并将 `fileId` 指向上传的模板文件。
使用同一 `exportByTemplate` 端点；系统根据 `customFileTemplate` 标志自动分派到文件模板模式。

端点：
- `POST /export/exportByTemplate?exportTemplateId={id}`

示例：
```bash
curl -X POST http://localhost:8080/export/exportByTemplate?exportTemplateId=2002 \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "filters": ["status", "=", "ACTIVE"],
  "orders": ["createdTime", "DESC"],
  "limit": 200
}
JSON
```

**文件模板占位符语法：**
- `{{ fieldName }}` — 替换为每行的字段值
- `{{ deptId.name }}` — 级联字段引用（由 ORM 层解析）
- `{{ }}` 语法在渲染前规范化为底层 Fesod `{}` 语法

### 3. 动态导出
通过直接提供字段和 filters 进行无模板导出。

端点：
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
可注册实现 `CustomExportHandler` 的 Spring bean，并在 `ExportTemplate.customHandler` 中按名称引用。

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
- 可原地更新行值。
- 不应替换行映射对象。

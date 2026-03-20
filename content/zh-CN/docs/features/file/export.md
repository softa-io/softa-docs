
## 数据导出

File Starter 支持三种导出模式：

1. **按模板字段导出**
   - 从当前模型元数据构建候选字段
   - 默认选中当前表格可见列
   - 允许用户修改字段、文件名与工作表名
   - 为前端发起的导出生成 `.xlsx` 工作簿

2. **按文件模板导出**
   - 使用已上传的 Excel 模板文件，内含 `{{ field }}` 占位符
   - 从模板中提取变量以决定要查询的字段
   - 用数据渲染模板并生成 `.xlsx` 工作簿

3. **动态导出**
   - 无模板，在请求中直接提供字段与过滤条件

内置导出支持三个范围：

- `Selected Rows`：使用当前工具栏批量选择的 ids
- `Current Page`：使用当前页的 id 快照，而不是重新回放 `pageNumber/pageSize`
- `All Filtered Data`：复用当前的 `filters/orders/groupBy/aggFunctions/effectiveDate`

前端单次导出最多 `100000` 条记录；超出限制的范围会被禁用，而不会截断。

### ExportTemplate 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fileName` | String | `null` | 导出文件名 |
| `sheetName` | String | `null` | 工作表名 |
| `modelName` | String | `null` | 要导出的模型名 |
| `customFileTemplate` | Boolean | `null` | 为 true 时使用文件模板导出；否则使用字段模板模式 |
| `fileId` | Long | `null` | 模板文件 id（`customFileTemplate = true` 时必填） |
| `filters` | Filters | `null` | 默认过滤条件 |
| `orders` | Orders | `null` | 默认排序条件 |
| `customHandler` | String | `null` | `CustomExportHandler` 对应的 Spring bean 名称 |
| `enableTranspose` | Boolean | `null` | 是否转置输出（starter 中尚未实现） |

### ExportTemplateField 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | `ExportTemplate` id |
| `fieldName` | String | `null` | 模型字段名（支持 `deptId.name` 等级联字段） |
| `customHeader` | String | `null` | 自定义列标题 |
| `sequence` | Integer | `null` | 导出字段顺序 |
| `ignored` | Boolean | `null` | 是否在输出中忽略该字段 |

### 级联字段导出

三种导出模式均支持使用点路径语法的**级联字段引用**（如 `deptId.name`、`deptId.companyId.code`），可通过 `ManyToOne`/`OneToOne` 关联导出关联模型字段。

**语法：** `{field1}.{field2}` 或 `{field1}.{field2}.{field3}`（最多 **4** 层级联）

**工作机制：**

1. ORM 为点路径引用创建动态虚拟字段（通过 `MetaField.createDynamicField`）。
2. 字段被拆成两部分：根 `ManyToOne`/`OneToOne` 字段与剩余路径。
3. 以剩余路径作为 expand 字段查询关联模型。
4. 3 层及以上时递归：`deptId.companyId.code` → 查询 `Dept` 的字段 `companyId.code` → 查询 `Company` 的字段 `code`。
5. 解析结果以完整点路径 key 存入行 map（如 `deptId.companyId.code`）。
6. 列标题默认取**最末字段**的标签（如 `code` 的标签），除非设置了 `customHeader`。

**规则：**

- 最大级联深度：**4 层**（`BaseConstant.CASCADE_LEVEL = 4`）。
- 每一层中间字段须为 **ManyToOne 或 OneToOne**。
- 最末字段须为**持久化字段**（非动态/计算字段）。
- 使用 `ConvertType.DISPLAY`，选项字段显示 `itemName`，关联字段显示 `displayName`。

**示例 — 模板导出（级联字段）：**

`ExportTemplateField` 配置：

```
fieldName: "name"                customHeader: null           sequence: 1
fieldName: "deptId.name"         customHeader: "Department"   sequence: 2
fieldName: "deptId.managerId.name" customHeader: "Dept Manager" sequence: 3
```

**示例 — 动态导出（级联字段）：**

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

1. 配置 `ExportTemplate` 与 `ExportTemplateField`

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

此模式使用已上传的 Excel 模板，占位符形如 `{{ field }}` 或 `{{ object.field }}`。系统从模板提取变量以决定要查询的字段。

使用时在 `ExportTemplate` 中设置 `customFileTemplate = true`，并将 `fileId` 指向上传的模板文件。仍调用同一 `exportByTemplate` 接口；系统根据 `customFileTemplate` 自动分发到文件模板模式。

接口：

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

- `{{ fieldName }}` — 替换为每行该字段的值
- `{{ deptId.name }}` — 级联字段引用（由 ORM 解析）
- 渲染前会将 `{{ }}` 规范化为底层 Fesod 的 `{}` 语法

### 3. 动态导出

无模板，在请求中直接提供字段与过滤条件。

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

可注册实现了 `CustomExportHandler` 的 Spring bean，并在 `ExportTemplate.customHandler` 中按名称引用。

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

- 可以原地修改行值。
- 不应替换行 map 对象本身。


## 数据导入

File Starter 支持两种导入模式：

1. **按已配置模板导入**（`ImportTemplate` + `ImportTemplateField`）
   - 支持下载模板
   - 通过所选模板提交上传文件

2. **动态映射导入**（无模板，在请求中提供映射）
   - 在浏览器中解析上传的 `.xlsx` 工作簿
   - 基于元数据自动将工作簿表头映射到模型字段
   - 允许用户在提交前调整映射关系

### ImportTemplate 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | String | `null` | 模板名称 |
| `modelName` | String | `null` | 要导入的模型名 |
| `importRule` | ImportRule | `null` | 导入规则：CreateOrUpdate / OnlyCreate / OnlyUpdate |
| `uniqueConstraints` | List<String> | `null` | `CreateOrUpdate` 使用的唯一键字段 |
| `ignoreEmpty` | Boolean | `null` | 导入时是否忽略空值 |
| `skipException` | Boolean | `null` | 某一行失败时是否继续 |
| `customHandler` | String | `null` | `CustomImportHandler` 对应的 Spring bean 名称 |
| `syncImport` | Boolean | `null` | 为 `true` 时同步导入，否则异步导入 |
| `includeDescription` | Boolean | `null` | 是否在模板输出中包含说明 |
| `description` | String | `null` | 说明文本 |
| `importFields` | List<ImportTemplateField> | `null` | 导入字段列表 |

### ImportTemplateField 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | `ImportTemplate` id |
| `fieldName` | String | `null` | 模型字段名（支持 `deptId.code` 等关联反查） |
| `customHeader` | String | `null` | 自定义 Excel 表头 |
| `sequence` | Integer | `null` | 模板中的字段顺序 |
| `required` | Boolean | `null` | 是否必填 |
| `defaultValue` | String | `null` | 默认值（支持 `{{ expr }}`） |
| `description` | String | `null` | 说明文本 |

### 1. 按模板导入（已配置）

1. 配置 `ImportTemplate` 和 `ImportTemplateField`

`ImportTemplate` 关键字段：

- `name`、`modelName`、`importRule`
- `uniqueConstraints`（用于 `CreateOrUpdate`）
- `ignoreEmpty`、`skipException`、`customHandler`、`syncImport`

`ImportTemplateField` 关键字段：

- `fieldName`、`customHeader`、`sequence`、`required`、`defaultValue`

说明：

- `ImportTemplateField` 的默认值支持占位符 `{{ expr }}`：简单变量从 `env` 解析，表达式在 `env` 上下文中求值。
- 若 `syncImport = true`，导入在当前进程内执行。
- 若 `syncImport = false`，会向 MQ 发送异步导入消息。

### 1.1 关联反查导入（级联导入）

`ImportTemplateField` 中的 `fieldName`（或动态导入中的 `importFieldDTOList`）支持通过 `RelationLookupResolver` 使用**点路径关联反查**。无需导入原始外键 id，可导入关联模型的可读业务键，系统会自动反查并写入外键 id。

**语法：** `{外键字段}.{业务键}` — 例如 `deptId.code`、`deptId.name`

**工作机制：**

1. 系统识别根为 `ManyToOne`/`OneToOne` 的点路径字段。
2. 按根外键字段分组（例如 `deptId.code` 与 `deptId.name` 同属 `deptId` 一组）。
3. 按业务键值批量查询关联模型以解析外键 id。
4. 将解析到的外键 id 写回根字段（`deptId`），并移除点路径列。

**规则：**

- 仅支持**单层**级联：`deptId.code` ✅，`deptId.companyId.code` ❌
- 同一模板中，直接外键字段（如 `deptId`）与反查字段（如 `deptId.code`）**不能同时存在**
- 多个反查字段共享同一根时，组合为复合业务键（例如 `deptId.code` + `deptId.name` 共同唯一确定一条 Department）
- 当一行中所有反查值为空时：
  - 若 `ignoreEmpty = true`：跳过该外键字段（不写入）
  - 若 `ignoreEmpty = false`：明确将外键字段置为 `null`
- 当反查失败（无匹配记录）时：
  - 若 `skipException = true`：该行标记失败并附带原因
  - 若 `skipException = false`：立即抛出 `ValidationException`

**示例 — 按模板导入：**

`ImportTemplateField` 配置：

```
fieldName: "deptId.code"    customHeader: "Department Code"    sequence: 3
fieldName: "name"           customHeader: "Employee Name"      sequence: 1
fieldName: "jobTitle"       customHeader: "Job Title"          sequence: 2
```

Excel：

| Employee Name | Job Title | Department Code |
| --- | --- | --- |
| Alice | Engineer | D001 |
| Bob | Manager | D002 |

系统将按 `code = "D001"` / `"D002"` 查找 `Department`，解析 `id` 并写入 `deptId`。

**示例 — 动态导入（含关联反查）：**

```bash
curl -X POST http://localhost:8080/import/dynamicImport \
  -F file=@/path/to/employees.xlsx \
  -F 'wizard={
    "modelName":"Employee",
    "importRule":"CreateOrUpdate",
    "uniqueConstraints":"employeeCode",
    "importFieldDTOList":[
      {"header":"Employee Name","fieldName":"name","required":true},
      {"header":"Department Code","fieldName":"deptId.code","required":true},
      {"header":"Job Title","fieldName":"jobTitle"}
    ],
    "syncImport":true
  };type=application/json'
```

2. 下载模板文件（可选）

接口：

- `GET /ImportTemplate/getTemplateFile?id={templateId}`

生成的模板使用字段标签作为表头，必填列带样式。

3. 按模板导入

接口：

- `POST /import/importByTemplate`

参数：

- `templateId`：`ImportTemplate` id
- `file`：Excel 文件
- `env`：环境变量 JSON 字符串

示例：

```bash
curl -X POST http://localhost:8080/import/importByTemplate \
  -F templateId=1001 \
  -F env='{"deptId": 10, "source": "manual"}' \
  -F file=@/path/to/import.xlsx
```

### 2. 动态映射导入（无模板）

接口：

- `POST /import/dynamicImport`

该接口接受 `multipart/form-data`，包含：

- `file`：上传的 Excel 文件
- `wizard`：`ImportWizard` 的 JSON payload

关键字段：

- `modelName`
- `importRule`：`CreateOrUpdate` | `OnlyCreate` | `OnlyUpdate`
- `uniqueConstraints`：逗号分隔的字段名
- `importFieldDTOList`：表头到字段的映射列表
- `ignoreEmpty`、`skipException`、`customHandler`、`syncImport`

示例：

```bash
curl -X POST http://localhost:8080/import/dynamicImport \
  -F file=@/path/to/import.xlsx \
  -F 'wizard={
    "modelName":"Product",
    "importRule":"CreateOrUpdate",
    "uniqueConstraints":"productCode",
    "importFieldDTOList":[
      {"header":"Product Code","fieldName":"productCode","required":true},
      {"header":"Product Name","fieldName":"productName","required":true},
      {"header":"Price","fieldName":"price"}
    ],
    "syncImport":true
  };type=application/json'
```

### 3. 导入结果与失败行

- 导入返回 `ImportHistory`。
- 若任意一行失败，会生成并保存「失败数据」Excel，其中包含 `Failed Reason` 列。
- 导入状态可为 `PROCESSING`、`SUCCESS`、`FAILURE`、`PARTIAL_FAILURE`。

### 4. 自定义导入处理器

可注册实现了 `CustomImportHandler` 的 Spring bean，并在 `ImportTemplate.customHandler` 或 `ImportWizard.customHandler` 中按名称引用。

```java
import io.softa.starter.file.excel.imports.CustomImportHandler;

@Component("productImportHandler")
public class ProductImportHandler implements CustomImportHandler {
    @Override
    public void handleImportData(List<Map<String, Object>> rows, Map<String, Object> env) {
        // custom preprocessing
    }
}
```

约定：

- 可以原地修改行值。
- 可通过写入 `FileConstant.FAILED_REASON` 将某一行标记为失败。
- 不要新增、删除、重排或替换行对象。

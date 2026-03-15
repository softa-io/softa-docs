
## 导入

对话框标签页：
- `By Template`
  - 按已配置模板导入（`ImportTemplate` + `ImportTemplateField`）
  - 支持下载模板
  - 通过所选模板提交上传文件

- `Dynamic Import`
  - 动态映射导入（无需模板，在请求中提供映射）
  - 在浏览器中解析上传的 `.xlsx` 工作簿
  - 基于元数据自动把工作簿表头映射到模型字段
  - 允许用户在提交前调整映射关系

- `My Import History`
  - 加载当前用户在当前模型下的导入历史
  - 原始文件 / 失败文件可以通过点击链接下载

### ImportTemplate 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | String | `null` | 模板名称 |
| `modelName` | String | `null` | 要导入的模型名 |
| `importRule` | ImportRule | `null` | 导入规则：CreateOrUpdate / OnlyCreate / OnlyUpdate |
| `uniqueConstraints` | List<String> | `null` | `CreateOrUpdate` 使用的唯一键字段 |
| `ignoreEmpty` | Boolean | `null` | 导入时忽略空值 |
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
| `fieldName` | String | `null` | 模型字段名 |
| `customHeader` | String | `null` | 自定义 Excel 表头 |
| `sequence` | Integer | `null` | 模板中的字段顺序 |
| `required` | Boolean | `null` | 是否必填 |
| `defaultValue` | String | `null` | 默认值（支持 `#{var}`） |
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
- `ImportTemplateField` 的默认值支持 `#{var}` 变量。变量来自 `env`。
- 如果 `syncImport = true`，导入会在当前进程内执行。
- 如果 `syncImport = false`，会向 MQ 发送异步导入消息。

2. 下载模板文件（可选）

接口：
- `GET /ImportTemplate/getTemplateFile?id={templateId}`

生成的模板会使用字段标签作为表头，必填表头会带样式标识。

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
- 导入返回 `ImportHistory`
- 如果任意一行失败，系统会生成并保存一个“失败数据”Excel 文件，其中包含 `Failed Reason` 列
- 导入状态可能为 `PROCESSING`、`SUCCESS`、`FAILURE`、`PARTIAL_FAILURE`

### 4. 自定义导入处理器
你可以注册一个实现了 `CustomImportHandler` 的 Spring bean，并在
`ImportTemplate.customHandler` 或 `ImportWizard.customHandler` 中通过名称引用它。

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
- 可以原地修改行值
- 可以通过写入 `Failed Reason` 将某一行标记为失败
- 不要新增、删除、重排或替换行对象

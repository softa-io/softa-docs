# 数据导入

File Starter 支持两种数据导入模式：

- 基于配置模板的导入（`ImportTemplate + ImportTemplateField`）
- 无模板的动态映射导入（请求中直接提供表头到字段的映射关系）

## ImportTemplate 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | String | `null` | 导入模板名称 |
| `modelName` | String | `null` | 要导入的模型名 |
| `importRule` | ImportRule | `null` | 导入规则：CreateOrUpdate / OnlyCreate / OnlyUpdate |
| `uniqueConstraints` | List<String> | `null` | 在 CreateOrUpdate 模式下用于查找唯一记录的字段集合 |
| `ignoreEmpty` | Boolean | `null` | 是否在导入时忽略空值 |
| `skipException` | Boolean | `null` | 行数据出错时是否继续后续行 |
| `customHandler` | String | `null` | 自定义导入处理器的 Spring Bean 名（`CustomImportHandler`） |
| `syncImport` | Boolean | `null` | 为 true 时同步导入，否则异步导入 |
| `includeDescription` | Boolean | `null` | 导出模板时是否包含字段描述 |
| `description` | String | `null` | 模板说明 |
| `importFields` | List<ImportTemplateField> | `null` | 导入字段列表 |

## ImportTemplateField 配置表

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `templateId` | Long | `null` | 所属 ImportTemplate 的 ID |
| `fieldName` | String | `null` | 模型字段名 |
| `customHeader` | String | `null` | 自定义 Excel 表头 |
| `sequence` | Integer | `null` | 在模板中的字段顺序 |
| `required` | Boolean | `null` | 是否必填字段 |
| `defaultValue` | String | `null` | 默认值（支持 `#{var}` 占位） |
| `description` | String | `null` | 字段说明 |

## 一、基于模板的导入

### 1. 配置 ImportTemplate 和 ImportTemplateField

ImportTemplate 关键字段：

- `name`、`modelName`、`importRule`
- `uniqueConstraints`（用于 CreateOrUpdate）
- `ignoreEmpty`、`skipException`、`customHandler`、`syncImport`

ImportTemplateField 关键字段：

- `fieldName`、`customHeader`、`sequence`、`required`、`defaultValue`

注意：

- ImportTemplateField 中的 `defaultValue` 支持变量 `#{var}`，变量值从 `env` 参数中解析。
- 当 `syncImport = true` 时，导入逻辑在当前进程内同步执行。
- 当 `syncImport = false` 时，会向 MQ 发送异步导入消息，由异步消费者执行导入。

### 2. 下载导入模板（可选）

接口：

- `GET /ImportTemplate/getTemplateFile?id={templateId}`

生成的模板文件会使用字段标签作为表头；必填字段的表头会以样式高亮。

### 3. 通过模板导入

接口：

- `POST /import/importByTemplate`

请求参数：

- `templateId`：ImportTemplate 的 ID
- `file`：Excel 文件
- `env`：环境变量的 JSON 字符串

示例：

```bash
curl -X POST http://localhost:8080/import/importByTemplate \
  -F templateId=1001 \
  -F env='{"deptId": 10, "source": "manual"}' \
  -F file=@/path/to/import.xlsx
```

## 二、动态映射导入（无模板）

接口：

- `POST /import/dynamicImport`

该接口接收 `multipart/form-data` 请求，主体字段使用 `ImportWizard` 对象。

关键字段：

- `modelName`：要导入的模型名
- `file`：Excel 文件
- `importRule`：`CreateOrUpdate` / `OnlyCreate` / `OnlyUpdate`
- `uniqueConstraints`：逗号分隔的唯一约束字段列表
- `importFieldStr`：表头到字段映射的 JSON 字符串
- `ignoreEmpty`、`skipException`、`customHandler`、`syncImport`

示例：

```bash
curl -X POST http://localhost:8080/import/dynamicImport \
  -F modelName=Product \
  -F importRule=CreateOrUpdate \
  -F uniqueConstraints=productCode \
  -F importFieldStr='[{"header":"Product Code","fieldName":"productCode","required":true},{"header":"Product Name","fieldName":"productName","required":true},{"header":"Price","fieldName":"price"}]' \
  -F syncImport=true \
  -F file=@/path/to/import.xlsx
```

## 三、导入结果与失败行

- 接口返回 `ImportHistory` 记录。
- 如果存在失败行，会生成一份“失败数据” Excel 文件并保存，附加一列 `Failed Reason`（失败原因）。
- 导入状态可能为：`PROCESSING`、`SUCCESS`、`FAILURE`、`PARTIAL_FAILURE`。

## 四、自定义导入处理器

你可以实现 `CustomImportHandler` 接口，并在 `ImportTemplate.customHandler` 或 `ImportWizard.customHandler` 中通过 Bean 名引用：

```java
@Component("productImportHandler")
public class ProductImportHandler implements CustomImportHandler {
    @Override
    public void handleImportData(List<Map<String, Object>> rows, Map<String, Object> env) {
        // 自定义预处理逻辑
    }
}
```

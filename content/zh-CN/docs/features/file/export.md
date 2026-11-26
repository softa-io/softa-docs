
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
4. 按导入模板导出（用于导回）
  - 把记录写进某个导入模板自己的工作簿，改完用同一个模板导回，见下文「5. 按导入模板导出（用于导回）」

内置导出支持三种范围：
- `Selected Rows` 使用当前工具栏批量选中的 id
- `Current Page` 使用当前页 id 快照，而非 `pageNumber/pageSize` 重放
- `All Filtered Data` 复用当前 `filters/orders/groupBy/aggFunctions/effectiveDate`

前端导出单次请求限制为 `100000` 条记录；超限范围会被禁用而非截断。

### ExportTemplate 配置表
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fileName` | String | `null` | 导出文件名 |
| `sheetName` | String | `null` | 工作表名。文件模板模式下填模板里同名的工作表，模板里没有这个名字时报错；未设置时，填第一张有占位符、没隐藏的工作表 |
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

### 保存时检查

导出模板在写入时按它的 `modelName` 检查，用的是导出运行时的规则——softa-orm 的 `FieldPaths`，它说明 WHERE、ORDER BY 和级联读取各自接受什么：

- `modelName` 必须是元数据里的模型；
- `filters` 里的每个字段必须能放进 WHERE：经多对一 / 一对一关联连表，或经一对多 / 多对多关联走子查询，最后落在存储字段上；
- `orders` 里的每个字段必须能放进 ORDER BY：只能经多对一 / 一对一关联，最后落在存储字段上；
- 每一列的 `fieldName` 必须能读取：只能经多对一 / 一对一关联，最多四层——导出解析列标题和取值用的就是这条规则。

和导入模板一样，字段在写入设置它时检查；模板改用另一个模型时，会重新检查 filters、orders 和这次写入保留下来的列。

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
6. 列标题：模板列设了 `customHeader` 就用它；没设时——以及动态导出的每一列，动态导出没有 `customHeader`——以路径上每个多对一关联的 label 加字段的 label 作标题：`deptId.name` 是 `Department › Name`，`employeeId.departmentId.name` 是 `Employee › Department › Name`。只用最后一个字段的 label，指向同一模型的两个关联（经理的工号和 HRBP 的工号）就会同名。一对一这一跳不加：`employeeProfileId.passType` 就是 `Pass Type`，那是本行自己子记录的字段。两种导出用同一条规则（`ExportColumnHeaders`）；某列必须另起名字（例如对外的固定格式）时，在 `customHeader` 里写明。

**规则：**
- 最大级联深度：**4 级**（`BaseConstant.CASCADE_LEVEL = 4`）。
- 每个中间字段必须是 **ManyToOne 或 OneToOne** 类型。
- 最后一个字段必须是**存储字段**（非 dynamic/computed）。
- 使用 `ConvertType.DISPLAY`，因此选项字段显示条目 `label`，关联字段显示 `displayName`。

**示例 — 带级联字段的模板导出：**

ExportTemplateField 配置：
```
fieldName: "name"                  customHeader: null           sequence: 1
fieldName: "deptId.name"           customHeader: "Department"   sequence: 2
fieldName: "deptId.managerId.name" customHeader: null           sequence: 3
```

结果 Excel 列：`Name | Department | Department › Manager › Name`

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

结果 Excel 列：`Name | Department › Name | Department › Manager › Name`

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
- 渲染前每个 `{{ field }}` 会改写成 Fesod 的列表占位符 `{.field}`，因为数据按列表逐行填入；同一格里占位符前后的文字照常保留（如 `ID-{{ code }}`）
- 字段名是用点隔开的字母、数字、`_`。**要填的表里不能有其他花括号**：Fesod 会把表里每个 `{…}` 都当占位符，`Price {USD}`、写错的 `{{ dept-name }}`、`{{ .x }}`、`{{ }}`、`\{{ code }}` 都会从导出里悄悄消失，手写的 Fesod 列表写法（`{.title}`）会按记录重复成空行。导出遇到这种表直接报错并指出是哪一格。`{{ … }}` 占位符以外的 `{`、`}` 一律算，没闭合的也算：要填的表里写不了原样显示的花括号，用 `\` 也不行。其他表里可以有花括号
- **占位符只能放在一行数据行里。** 每条记录从这一行起各占一行，下面的行（合计、签名、备注）整体下移，不会被覆盖。把下面的行往下推，需要 Fesod 把整个工作簿放进内存，内存和耗时是普通填充的数倍：15 列实测，2 万行约 0.7 GB、7 秒，普通填充约 0.1 GB、1 秒；10 万行约 2.7 GB 对 0.3 GB，堆不够时会拖到几分钟，所以数据行下面什么都没有的模板按普通的流式方式填充；**数据行下面有内容的模板，导出大量数据时会占用较多内存**，这类模板请控制导出的行数。同一张表其他行也有占位符时——比如标题 `Report for {{ deptId.name }}`，或一条记录分两行写——导出报错并指出是哪几行，因为它们会按记录重复或互相覆盖
- 只读取和改写要填的那张表：查询哪些字段由它的占位符决定，其他表（说明、对照表）原样保留。没配 `sheetName` 时填第一张有占位符、没隐藏的表，所以前面的说明页里如果写了 `{{ … }}` 示例，要配上 `sheetName`。隐藏的表只有在 `sheetName` 里点名时才填：只有隐藏表带占位符时报错并指出是哪张。要填的表一个占位符都没有、或文件不是 `.xlsx`（`.xls`、空文件、坏文件）时报错
- **数据行下面的公式和格式不会随记录扩展。** 记录是在数据行处插入的，所以第 3 行页脚的 `SUM(A2:A2)` 仍只合计第一条；范围一直写到页脚这一行的（`SUM(A2:A3)`），范围终点会跟着页脚下移，三条记录后变成 `SUM(A2:A5)`，引用到它自己。条件格式和数据验证只留在数据行、不会带到插入的行，数据行上的合并格、不是占位符的公式格（如 `=A2*B2`）也只有第一条记录有。数据行下面的内容里，单元格的值和格式会下移，但图片（签名、公章）和数据验证不会：图片锚点留在原位置，会压在插入的记录上；数据验证留在原来的格子上，那里现在是某一条记录。对记录的合计请放在报表本身或单独的表里

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

### 5. 按导入模板导出（用于导回）
导入模板是「这个模型一张能导入的表长什么样」的唯一说明：有哪些列，每个关联按哪个键认（`departmentId.code`、`jobLevelId.name`），一行按哪个唯一键找回原记录，国家，下拉。动态导出不知道这些，关联写的是显示名，所以导出的文件导不回去。按导入模板导出时，文件就是这个模板自己的工作簿（与「下载模板」给出的空白模板同一套表头、下拉、日期格式和说明页，由 `ImportTemplateWorkbook` 生成），只是表头下面带上了记录，改完用同一个模板导回，不需要重新映射列。

端点（都挂在导出权限下；服务里还要求调用人有该模型的导入权限——这样的文件是给能导回的人用的）：
- `POST /export/listImportTemplates?modelName={model}`：该模型自己的、调用人能用来导出的导入模板，按显示顺序返回；每个带上文件的列（`header`、`required`）、匹配原记录用的列表头（`matchHeaders`）、`ignoreEmpty` 和 `country`。调用人不能同时导出和导入该模型时返回空列表。
- `POST /export/exportByImportTemplate?modelName={model}&importTemplateId={id}`：请求体为 `ExportParams`（filters、orders、生效日期；`fields` 不用，列以模板为准），返回文件；导出历史的 `importTemplateId` 记下所用的导入模板。

只有能把行匹配回原记录的模板可用：
- `importRule` 是 `CreateOrUpdate` 或 `OnlyUpdate`：用 `OnlyCreate` 导出，导回时每条记录都会再新建一次；
- 模型没有生效日期版本（`timeline`）：用于导回的文件暂不带版本；
- `uniqueConstraints` 不为空，且每个字段都有列；唯一键里的关联字段由它的反查列覆盖（`companyId` 由 `companyId.code` 覆盖）；
- 没有指向多条记录的列（`roleIds.code`），暂不支持。

每列按导入这一列的读法来读，单元格里写的就是导入要的值：
- 点路径列（`departmentId.code`、`employeeProfileId.passType.name`）按原路径读，即这个关联用来认记录的键；
- 裸的多对一列（`currency`）读关联记录的 id（`currency.id`）：导入在这一列要的是 id，编码即主键的主数据就是它的编码（`SGD`），而不是按显示值读出的名称；
- 其余列按导出的显示值读（`ConvertType.DISPLAY`）：选项写标签，布尔写 Yes / No，导入都认，模板的下拉列的也是标签。

按调用人能看到的模板来写：
- 调用人不能写的列本来就不在模板里（`ImportService.getImportTemplateDTO`），空白模板也没有这些列；
- 调用人永远看不到的敏感字段（`PermissionService.getHiddenSensitiveFields`）：非必填列从文件里去掉——导入只缺非必填列时照常导入，也就不会写这个字段；必填列则这个模板对他不可用。

为某个国家写的模板只导出该国的行，判断方式与导入判断一行所属国家相同：看这一行指向的公司（第一个指向公司模型的多对一字段，员工上是 `legalEntityId`；查询时才连接的公司锚点字段按它的来源路径），公司模型本身看它自己的 `country`。没有指向公司的模型不过滤。

工作簿里的下拉和筛选覆盖所有记录再加 `5000` 行（`OptionDropdownHandler`、`ImportSheetStyleHandler.forTemplate(fields, dataRows)`），与空白模板覆盖 5000 行一致。

变更说明：`ExportHistory.importTemplateId` 是新列。`scanner-scope` 覆盖 `io\.softa\.starter\.file\.entity` 的环境启动时自动加列；`scanner-scope` 为空的环境要在新 jar 启动前手工加列（`ALTER TABLE export_history ADD COLUMN import_template_id BIGINT NULL`，`sys_field` 行按该环境添加目录行的方式补上）。

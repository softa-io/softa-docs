# Studio Starter

## 概览
Studio Starter 提供元数据设计时 IDE，支持可视化模型设计、代码生成、
版本控制与多环境部署。它管理 Softa 元数据驱动应用从设计到生产
部署的完整生命周期。

主要能力：
- **模型设计器**：设计模型、字段、选项集、视图、导航、校验规则（Validations）、Onchange 规则、索引（Indexes）以及生成映射/模板
- **代码生成器**：通过 Pebble 模板从模型生成模板化代码文件，优先使用数据库内模板与字段类型映射，并回退到类路径下 `templates/code/` 的模板
- **DDL 生成器**：从模型定义与合并后的变更集通过 Pebble 模板生成 DDL（CREATE TABLE、ALTER TABLE、DROP TABLE、索引），优先使用数据库内 SQL 模板与数据库类型映射
- **DDL 预览**：在 WorkItem、Version、部署各阶段预览 DDL SQL，便于复制到数据库客户端
- **版本控制**：基于 WorkItem 的变更跟踪，与 ES 变更日志集成，以及版本封版/解封与冻结
- **部署**：从 Version 直接部署到环境，按 `sealedTime` 自动合并已发布版本，生成 DDL 并跟踪执行；新环境会合并截至目标版本的所有已发布版本
- **多环境部署**：通过签名的远程通道部署到 Dev/Test/UAT/Prod
- **漂移检测与运行时导入**：按环境将设计时快照与线上运行时对比，并可选地以运行时状态覆盖设计时元数据——既覆盖首次播种（设计时为空、运行时已有数据），也覆盖带外 SQL 变更后的漂移修复

## 模板引擎

Studio Starter 将 [Pebble](https://pebbletemplates.io/)（v4.1.1）作为 Java 代码生成与 SQL DDL 生成
的模板引擎。Pebble 使用 `{{ var }}` / `{% if %}` 语法，与全项目
`{{ }}` 占位符约定一致。

### 模板文件
| 目录 | 模板 | 用途 |
| --- | --- | --- |
| `templates/code/` | `entity/{{modelName}}.java.peb`、`service/{{modelName}}Service.java.peb`、`service/impl/{{modelName}}ServiceImpl.java.peb`、`controller/{{modelName}}Controller.java.peb` | 代码生成回退模板。未配置 `DesignCodeTemplate` 时，会扫描所有 `templates/code/**/*.peb`；相对目录作为默认输出子目录，`.peb` 前最后一段路径作为渲染出的输出文件名 |
| `templates/sql/mysql/` | `CreateTable.peb`、`AlterTable.peb`、`DropTable.peb`、`AlterIndex.peb` | MySQL DDL 回退模板 |
| `templates/sql/postgresql/` | `CreateTable.peb`、`AlterTable.peb`、`DropTable.peb`、`AlterIndex.peb` | PostgreSQL DDL 回退模板 |

### 代码模板规则
- 数据库模式：按 `codeLang` 加载 `DesignCodeTemplate` 并按 `sequence` 排序，渲染为 `ModelCodeDTO.files` 列表。
- `DesignCodeTemplate.subDirectory` 为 Pebble 模板。`null`、空白、仅空白、`.`、`./` 和 `/` 均视为 zip 根目录。会规范化前导 `./`、前导 `/`、尾 `/`、重复 `/` 与 `\`。
- `DesignCodeTemplate.fileName` 为 Pebble 模板，直接作为输出文件名。须自行包含所需后缀，例如 `{{modelName}}Service.java`；当前实现**不会**自动拼接 `DesignCodeLang.fileExtension`。
- `DesignCodeTemplate.fileName` 渲染后不可为空，且不能包含目录分隔符。目录结构**只能**通过 `subDirectory` 表达。
- 仅当数据库中未配置任何代码模板语言时启用回退模式。此时会渲染 `templates/code/**/*.peb` 下每个类路径模板。
- 回退模式下，输出文件名来自回退模板路径本身。例如 `templates/code/service/{{modelName}}Service.java.peb` 会生成 `service/SysModelService.java`。
- 单文件下载使用渲染后的文件名，zip 下载使用渲染后的相对路径。`downloadAllZip` 会在各语言包前加 `<codeLang>/` 前缀。

### 核心类
| 类 | 说明 |
| --- | --- |
| `TemplateEngine` | Pebble 引擎包装——单例 `PebbleEngine`、带缓存、无自动转义 |
| `CodeGenerator` | 从 `DesignModel` 生成代码文件，优先 `DesignCodeTemplate` + `DesignFieldCodeMapping`；预览/下载可针对单一语言或打包所有已配置语言 |
| `DdlDialectRegistry` | 按 `DatabaseType` 解析当前 Pebble DDL 渲染器 |
| `MySqlDdlDialect` / `PostgreSqlDdlDialect` | DDL 生成器，优先 `DesignSqlTemplate` + `DesignFieldDbMapping`，并回退到类路径 SQL 模板 |
| `DesignGenerationMetadataResolver` | 集中解析数据库内模板/映射/默认值，并优雅回退 |
| `DdlContextBuilder` | 从 `DesignModel`、`DesignField`、`DesignModelIndex` 构建适合模板的 DDL 上下文对象 |
| `VersionDdl` / `VersionDdlImpl` | 将 `List<ModelChangesDTO>` 转为 `DdlTemplateContext`，再渲染合并后的 DDL 字符串（表 + 索引） |

### 代码生成输出
- `ModelCodeDTO` 在一种语言下将单个模型的生成文件归组。
- `ModelCodeDTO.files` 是 `ModelCodeFileDTO` 的列表，而非固定的 entity/service/controller 字段。
- `ModelCodeFileDTO` 包含 `templateId`、`templateName`、`sequence`、`subDirectory`、`fileName`、`relativePath` 和 `content`。
- `downloadCode` 根据 `previewCode` 返回的已渲染 `relativePath` 定位文件。

### DDL 模板上下文

SQL 模板不直接读取原始 `DesignModel` / `DesignField` / `DesignModelIndex` 实体。
`VersionDdlImpl` 会先将合并后的行变更转为适合模板的 DTO，使模板作者
只需关注 SQL 语法，而不必处理 diff 逻辑。

顶层上下文：
- `DdlTemplateContext.createdModels`
- `DdlTemplateContext.deletedModels`
- `DdlTemplateContext.updatedModels`

按模型上下文（`ModelDdlCtx`）：
- 基础元数据：`modelName`、`labelName`、`description`、`tableName`、`oldTableName`、`pkColumn`
- 表变更标志：`renamed`、`tableCommentChanged`、`tableCommentText`
- 字段组：`createdFields`、`deletedFields`、`updatedFields`、`renamedFields`
- 索引组：`createdIndexes`、`deletedIndexes`、`updatedIndexes`、`renamedIndexes`
- 渲染标志：`hasTableChanges`、`hasFieldChanges`、`hasIndexChanges`、`hasAlterTableChanges`

按字段上下文（`FieldDdlCtx`）：
- 标识：`fieldName`、`columnName`、`oldColumnName`、`renamed`
- 显示/注释：`labelName`、`description`、`commentText`
- 类型/默认值：`fieldType`、`dbType`、`length`、`scale`、`required`、`autoIncrement`、`defaultValue`

按索引上下文（`IndexDdlCtx`）：
- 标识：`indexName`、`oldIndexName`、`renamed`
- 定义：`columns`、`unique`

当前 MySQL 模板行为：
- `CreateTable.peb` 用 `model.createdFields` 渲染单个新建模型
- `DropTable.peb` 用 `model.tableName` 渲染单个删除模型
- `AlterTable.peb` 处理表重命名、表注释变更，以及字段的 `create/delete/update/rename`
- `AlterIndex.peb` 处理索引的 `create/delete/update/rename`
- 字符串字面量（描述、注释）通过 Pebble 过滤器 `| sqlLiteral` 转义，防止单引号问题
- 字段重命名渲染为 `DROP COLUMN oldColumnName` + `ADD COLUMN columnName ...`
- 索引重命名渲染为 `DROP INDEX oldIndexName` + `ADD INDEX indexName ...`
- 纯删除的索引也会生成 SQL
- 新建表上的索引来自 `DesignModelIndex.createdRows`

该结构与元数据术语（`Model`、`Field`、`Index`）有意对齐，使同一套
Pebble SQL 模板可存于数据库中并按应用定制，降低心智负担。

## 依赖
```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>studio-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 要求
- **metadata-starter**：提供运行时元数据模型管理与升级 API。
- **es-starter**：提供 Elasticsearch 变更日志存储，用于版本控制中的变更跟踪。
- 数据库需包含 Studio 元数据表（见下文数据模型）。

## 远程部署配置
- `DesignAppEnv.upgradeEndpoint` 必须指向目标运行时的基 URL。Studio 会自动追加 `/upgrade/upgradeMetadata` 与 `/upgrade/exportRuntimeMetadata`。
- Studio 应用需配置 `system.public-access-url`。远程部署将运行时回调节点推导为 `<system.public-access-url>/DesignDeployment/callback`；未配置则请求发出前即失败。
- 首次远程部署前调用 `POST /DesignAppEnv/issueKey?id=`，将返回的公钥粘贴到配对运行时的 `system.runtime-public-key`。仅当该属性非空时，运行时才会注册元数据签名校验过滤器。
- Studio → 运行时的出站 HTTP 使用 Resilience4j 客户端名 `studio-remote`；运行时 → Studio 的回调使用 `metadata-callback`。若未为这两个实例显式编写 YAML，仍适用注册表默认行为。

最简示例：
```yaml
# studio
system:
  public-access-url: https://studio.example.com

resilience4j:
  retry:
    instances:
      studio-remote:
        max-attempts: 3
  circuitbreaker:
    instances:
      studio-remote:
        sliding-window-size: 20
```

```yaml
# 目标 runtime
system:
  runtime-public-key: <粘贴签发公钥>
```

## 数据模型

### 核心设计模型
| 实体 | 说明 |
| --- | --- |
| `DesignPortfolio` | 应用所属的项目集/项目分组 |
| `DesignApp` | 应用定义（名称、代码、databaseType、packageName）。`packageName` 直接传入代码模板上下文 |
| `DesignModel` | 模型定义（字段、索引、tableName、storageType 等） |
| `DesignField` | 字段定义（fieldType、length、scale、relatedModel 等） |
| `DesignFieldDbMapping` | 字段类型到数据库类型的映射 |
| `DesignFieldTypeDefault` | 各字段类型的默认元数据值 |
| `DesignFieldCodeMapping` | 各字段类型在各语言下的属性类型映射 |
| `DesignSqlTemplate` | 按数据库类型管理在数据库中的 Pebble SQL 模板 |
| `DesignCodeTemplate` | 按语言管理在数据库中的 Pebble 代码模板，可配置 `sequence`、`subDirectory`、`fileName` 和 `templateContent` |
| `DesignModelIndex` | 模型索引定义 |
| `DesignView` | 视图定义 |
| `DesignNavigation` | 导航定义 |
| `DesignOptionSet` | 选项集定义 |
| `DesignOptionItem` | 选项项定义 |

### 版本控制与部署模型
| 实体 | 说明 |
| --- | --- |
| `DesignAppEnv` | 应用环境（Dev/Test/UAT/Prod），保存环境配置与部署游标如 `currentVersionId`；不保存完整元数据快照 |
| `DesignAppEnvSnapshot` | 每次部署所期望的完整运行时元数据 JSON 快照。每部署一行，以 `(appId, envId, deploymentId)` 唯一标识 |
| `DesignAppEnvDrift` | 某环境下最新快照与线上运行时的缓存漂移，每 `(appId, envId)` 一行——在部署后或按需刷新 |
| `DesignWorkItem` | 变更工作项——通过 ES 的 correlationId 限定一组设计变更；`versionId` 关联到 Version，`closedTime` 在部署时关闭时记录 |
| `DesignAppVersion` | 版本壳——聚合 WorkItem 变更；`versionType` 区分 `Normal` 与 `Hotfix`，已发布顺序由 `status + sealedTime` 决定 |
| `DesignDeployment` | 不可变部署记录——合并 sealedTime 发布区间内容，含 DDL 与执行结果 |
| `DesignDeploymentVersion` | 审计记录：将一次部署与其合并过的各个版本关联 |

环境快照关系：
- `DesignAppEnv` 是环境状态记录，持有部署进度（`currentVersionId`）与升级配置。
- `DesignAppEnvSnapshot` 保存完整期望的运行时元数据状态。每次成功部署写入独立一行，以 `(appId, envId, deploymentId)` 唯一标识——**最新一行（id 最大）**作为漂移比较的有效快照。
- 部署提交后，下一份快照异步构建为 `previous_snapshot + mergedChanges` 并 upsert，对事件重放具有幂等写语义。
- `importFromRuntime` / `applyDrift` 在用运行时覆盖设计时后也会写入快照行。合成用 `DesignAppVersion` 的 id 复用为 `deploymentId` 槽位（通过 CosID 全局唯一），故可与部署快照并存且不冲突。

### 当前运行时同步范围
当前版本控制与部署流水线将下列设计时模型升级至运行时元数据：
- `DesignModel` -> `SysModel`
- `DesignModelTrans` -> `SysModelTrans`
- `DesignField` -> `SysField`
- `DesignFieldTrans` -> `SysFieldTrans`
- `DesignModelIndex` -> `SysModelIndex`
- `DesignOptionSet` -> `SysOptionSet`
- `DesignOptionSetTrans` -> `SysOptionSetTrans`
- `DesignOptionItem` -> `SysOptionItem`
- `DesignOptionItemTrans` -> `SysOptionItemTrans`
- `DesignView` -> `SysView`
- `DesignNavigation` -> `SysNavigation`

仅运行时的伴生模型仍不在部署流中。例如 `SysViewDefault` 仍是用户级运行时态，而非设计时元数据。

运行时导出（`/upgrade/exportRuntimeMetadata`）按应用范围：Studio 传入环境的 `appId`，主模型按 `appId` 列过滤，翻译类模型通过父行关联；单运行时托管多应用时，不会将兄弟应用数据泄漏到漂移比较或导入中。

## DDL 存储设计

**Version** 只存变更数据（`versionedContent` = `List<ModelChangesDTO>` 的 JSON），**不**存 DDL。
DDL 始终由变更数据经 `VersionDdlImpl -> DdlTemplateContext -> Pebble 模板` 即时生成。
这样设计可保证：
- DDL 始终反映最新模板版本（模板可独立升级）
- 无需在存储的 DDL 与模板之间做一致性维护
- 即时生成计算成本可忽略
- Version 层 DDL 为中间态（部署会合并多个 Version 后再执行）

**Deployment** 存预渲染的 DDL 字符串（`mergedDdlTable`、`mergedDdlIndex`）作为最终
部署产物。即实际对目标库执行的 DDL。
部署是一条自包含、不可变记录，含合并内容、DDL 与执行结果。

部署页 DDL 的推荐呈现：
- 在部署详情页使用一个 `DDL` 标签页
- 在同一标签内分两段展示 `mergedDdlTable` 与 `mergedDdlIndex`，不要压平成一个字段
- 提供 `全部复制`、`复制表 DDL`、`复制索引 DDL`
- `全部复制` 应连接 `mergedDdlTable + mergedDdlIndex`
- 某段内容为空时隐藏该段

## 工作流

### 设计时工作流
1. 创建 **Portfolio** 与 **App**
2. 设计 **Model**、**Field**、**OptionSet**、**View**、**Navigation** 等
3. 为模型预览 DDL 与生成文件

### 版本控制工作流
1. 创建 **WorkItem** 并标为 `IN_PROGRESS`
2. 进行设计变更（对模型、字段等 CRUD——变更通过 WorkItem 的 correlationId 记入 ES）
3. 完成 WorkItem → `doneWorkItem`
4. 创建 **Version**（DRAFT），`versionType = Normal | Hotfix` → 加入已完成的 WorkItem → `sealVersion`
   - 封版会聚合 WorkItem 变更、计算 diffHash，并进入 SEALED
   - 若尚未部署，`unsealVersion` 可将 SEALED 版本恢复为 DRAFT
5. 部署已发布版本
6. 部署成功后，所涉 `DONE` 的 WorkItem 标为 `CLOSED` 并记录 `closedTime`
7. 生产部署后 `freezeVersion`（不可变）

说明：
- 当前实现中**没有** `readyWorkItem` 或 `startWorkItem` 接口。

### 部署工作流
1. **增量部署**：`POST /DesignAppVersion/deployToEnv`
   - 请求体：`{ "versionId": ..., "envId": ... }`
   - 在 `(env.currentVersionId, targetVersion]` 内按 `sealedTime` 选取已发布版本
   - 通过 `VersionMerger` 合并版本内容，生成 DDL
   - 创建自包含的 Deployment 记录，含合并内容与 DDL
   - 将签名后的升级包派发到目标运行时，在运行时报告成功后推进 `env.currentVersionId`
   - 部署事务提交后，异步重建或更新该环境的 `DesignAppEnvSnapshot`
   - PROD 部署成功后自动冻结版本
   - 新环境（无 `currentVersionId`）会合并到目标版本为止的所有已发布版本
2. **重试**：`POST /DesignDeployment/retry?id=`
3. **取消卡住的部署**：`POST /DesignDeployment/cancel?id=`
   - 仅对 `PENDING` / `DEPLOYING` 有效
   - 将记录标为 `ROLLED_BACK` 并释放环境互斥
   - **不会**回滚已可能应用到运行时的 DDL 或数据变更

说明：
- 每次部署端到端均为异步——`deployToEnv` 在记录持久化后即返回部署 id，完成由目标运行时在 `POST /DesignDeployment/callback` 的 webhook 上报。
- `DesignDeploymentStatus` 含 `ROLLED_BACK`，但当前**没有**自动回滚——`cancelDeployment` 仅将记录标为已回滚并释放环境互斥，以便后续部署可继续。

## 关键 API

### 模型设计
| 端点 | 说明 |
| --- | --- |
| `GET /DesignModel/previewDDL?id=` | 预览某模型的 CREATE TABLE DDL |
| `GET /DesignModel/previewCode?id=&codeLang=` | 预览某种语言的生成文件，含已渲染相对路径。仅当恰好只有一种语言包时 `codeLang` 可省略 |
| `GET /DesignModel/previewAllCode?id=` | 预览某模型所有已生成语言包 |
| `GET /DesignModel/downloadCode?id=&codeLang=&relativePath=` | 按已渲染的相对路径下载单文件。`relativePath` 须来自 `previewCode` |
| `GET /DesignModel/downloadZip?id=&codeLang=` | 以 ZIP 下载某一语言包。仅当恰好只有一种语言包时 `codeLang` 可省略 |
| `GET /DesignModel/downloadAllZip?id=` | 在一个 ZIP 中下载所有语言包，按 `<codeLang>/` 分组 |

### WorkItem 生命周期
| 端点 | 说明 |
| --- | --- |
| `POST /DesignWorkItem/doneWorkItem?id=` | 完成——结束变更跟踪 |
| `GET /DesignWorkItem/previewChanges?id=` | 预览已累积的元数据变更 |
| `GET /DesignWorkItem/previewDDL?id=` | 从 WorkItem 变更预览 DDL SQL（可复制到数据库客户端） |
| `POST /DesignWorkItem/addToVersion` | 将已 DONE 的 WorkItem 加入 DRAFT Version。体：`{ "workItemId": ..., "versionId": ... }` |
| `POST /DesignWorkItem/removeFromVersion?id=` | 从当前 DRAFT Version 中移除某 WorkItem |
| `POST /DesignWorkItem/cancelWorkItem?id=` | 取消工作项。不得仍属于某个 Version —— 请先调用 `removeFromVersion` |
| `POST /DesignWorkItem/deferWorkItem?id=` | 延期工作项 |
| `POST /DesignWorkItem/reopenWorkItem?id=` | 重新打开已完成/已取消/已延期的工作项。不得仍属于某个 Version —— 请先调用 `removeFromVersion` |

### Version 生命周期
| 端点 | 说明 |
| --- | --- |
| `POST /DesignAppVersion/createOne` | 创建新版本（DRAFT，`versionType` 为 `Normal` 或 `Hotfix`，默认 `Normal`） |
| `POST /DesignAppVersion/deployToEnv` | 将 `SEALED` 或 `FROZEN` 版本部署到某环境。体：`{ "versionId": ..., "envId": ... }` |
| `GET /DesignAppVersion/previewVersion?id=` | 预览合并后的版本内容 |
| `GET /DesignAppVersion/previewDDL?id=` | 从版本内容预览 DDL SQL（可复制到数据库客户端） |
| `POST /DesignAppVersion/sealVersion?id=` | 封版（DRAFT → SEALED） |
| `POST /DesignAppVersion/unsealVersion?id=` | 解封（SEALED → DRAFT，若未部署） |
| `POST /DesignAppVersion/freezeVersion?id=` | 冻结（SEALED → FROZEN） |

### 部署
| 端点 | 说明 |
| --- | --- |
| `POST /DesignDeployment/retry?id=` | 用相同参数新建 Deployment 以重试失败部署 |
| `POST /DesignDeployment/cancel?id=` | 取消卡住的部署（PENDING/DEPLOYING）并释放环境互斥。无自动回滚——已应用的运行时变更保持 |
| `POST /DesignDeployment/callback` | Webhook——异步升级结束后由运行时 POST 上报 SUCCESS/FAILURE。头 `X-Softa-Callback-Token` 须与待处理部署一致 |

### 环境
| 端点                                            | 说明 |
|-------------------------------------------------| --- |
| `GET /DesignAppEnv/compareDesignWithRuntime?id=` | 读取 `DesignAppEnvSnapshot` 与线上运行时元数据之间的缓存漂移 |
| `POST /DesignAppEnv/refreshDrift?id=` | 启动异步漂移重算；通过 `compareDesignWithRuntime` 轮询结果 |
| `POST /DesignAppEnv/applyDrift?id=` | 用已缓存的运行时漂移覆盖设计时元数据（useCached=true —— 操作者接受当前漂移报告为新的真相） |
| `POST /DesignAppEnv/importFromRuntime?id=` | 对线上运行时刷新漂移，再用结果覆盖设计时（useCached=false —— 从已有运行时做首次拉取） |
| `POST /DesignAppEnv/issueKey?id=` | 签发/轮换用于 Studio → 运行时请求签名的 Ed25519 密钥对。返回新公钥 —— 操作者粘贴到配对运行时的 `system.runtime-public-key`。每个运行时只与一个环境配对，故轮换是原子 yml 替换，而非多密钥宽限期 |

`applyDrift` 与 `importFromRuntime` 共用一个带 `useCached` 布尔参数的服务方法。它们会取得该环境的部署互斥（与部署并发：每环境同时只能一个操作），创建名为 `imported-from-runtime-<ISO>` 的 FROZEN `DesignAppVersion`，将 `env.currentVersionId` 推进到该版本，以合成版本 id 为键写入导入后快照，并清除漂移缓存。漂移为空时无操作。

### 应用与 Portfolio 状态
| 端点 | 说明 |
| --- | --- |
| `POST /DesignApp/activate?id=` | 激活应用 |
| `POST /DesignApp/enterMaintenance?id=` | 应用进入维护模式 |
| `POST /DesignApp/deprecate?id=` | 弃用应用 |
| `POST /DesignPortfolio/activate?id=` | 激活 Portfolio |
| `POST /DesignPortfolio/archive?id=` | 归档 Portfolio |

## 行级合并（model + rowId）
整个流水线在 **model + rowId** 粒度跟踪与合并变更：

### WorkItem → Version（封版）
`VersionControlImpl` 按 `correlationId IN (workItemIds)` 查询 ES 变更日志，按 `rowId` 分组，
将同一 row 的多条变更合并为单条 `RowChangeDTO`。
若在同一组 WorkItem 中某行先创建后删除，则相互抵消（净变更为无）。

### Version → Deployment（部署）
`VersionMerger` 使用 `modelName → (rowId → RowChangeDTO)` 映射合并多个 Version 内容。
当同一行在多个 Version 中被修改时，状态机折叠变更：

| V1 操作 | V2 操作 | 净结果 |
| --- | --- | --- |
| CREATE | UPDATE | CREATE（以 V2 数据为准） |
| CREATE | DELETE | 取消（无净变更） |
| UPDATE | UPDATE | UPDATE（合并 before/after） |
| UPDATE | DELETE | DELETE（V1 的 dataBeforeChange） |
| DELETE | CREATE | UPDATE（再创建） |

这样可确保跨多个 WorkItem 与 Version 多次修改的**同一行**在部署中只表现为
**一次净变更**——无重复或冗余操作。

部署从应用已发布流中选取要合并的版本：
- 仅 `SEALED` 与 `FROZEN` 参与
- 版本按 `sealedTime ASC` 排序
- 合并区间为 `(env.currentVersionId, targetVersion]`
- `targetVersion` 自身须为 `SEALED` 或 `FROZEN`

## 当前不足

### 最高优先级待办
1. **补齐部署契约缺口**
   - `DesignDeploymentStatus` 含 `ROLLED_BACK`，但无自动回滚服务——`cancelDeployment` 仅为环境解锁以便下次重试。
2. **清理保留或未完全接线的环境/配置字段**
   - `DesignAppEnv.protectedEnv`、`active`、`autoUpgrade` 当前未在部署流中强制生效。

### 其他说明
- `DesignView.defaultView` 目前仅为设计时标志。运行时个人默认视图由 `SysViewDefault` 管理。
- `DesignOptionSet.optionItems` 在实体上存在，但当前 starter 依赖独立 `DesignOptionItem` 记录，而非自动填充该集合。
- 部分元数据字段在 `studio-starter` 之外被消费，主要由 `softa-orm` 与 `metadata-starter`。例如 `displayName`、`searchName`、`activeControl`、`multiTenant`、`versionLock`、`relatedField`、`joinLeft`、`joinRight`、`cascadedField`、`translatable`、`encrypted` 和 `maskingType` 在运行时确实会生效。

## 状态枚举

### DesignAppStatus
`Active` / `Maintenance` / `Deprecated`
- `Active → Maintenance`：`enterMaintenance`
- `Active → Deprecated`：`deprecate`
- `Maintenance → Active`：`activate`

### DesignPortfolioStatus
`Active` / `Archived`
- `Active → Archived`：`archive`
- `Archived → Active`：`activate`

### DesignAppEnvStatus
`Stable` / `Deploying`
- 通过条件更新在 `envStatus` 上 compare-and-set 实现每环境部署互斥
- `Stable → Deploying`：部署开始时占用
- `Deploying → Stable`：部署结束（成功、失败或取消）时释放

### DesignAppVersionStatus
`DRAFT` ⇄ `SEALED` → `FROZEN`
- `DRAFT → SEALED`：`sealVersion` —— 聚合 WorkItem 变更，计算 diffHash
- `SEALED → DRAFT`：`unsealVersion` —— 仅当尚未部署（无 Deployment 引用）
- `SEALED → FROZEN`：`freezeVersion` —— 生产部署后，不可变

### DesignAppVersionType
`Normal` / `Hotfix`
- `Normal`：计划发版
- `Hotfix`：紧急修补版本

### DesignWorkItemStatus
`IN_PROGRESS` → `DONE` → `CLOSED`
- `IN_PROGRESS -> DONE`：`doneWorkItem`
- `IN_PROGRESS / DONE / DEFERRED -> CANCELLED`：`cancelWorkItem` —— 要求 `versionId == null`（未绑定任何 Version）
- `IN_PROGRESS -> DEFERRED`：`deferWorkItem`
- `DONE / CANCELLED / DEFERRED -> IN_PROGRESS`：`reopenWorkItem` —— 要求 `versionId == null`（未绑定任何 Version）
- `DONE -> CLOSED`：某次部署成功结束时自动设置

### DesignDeploymentStatus
`PENDING` → `DEPLOYING` → `SUCCESS` / `FAILURE` / `ROLLED_BACK`

### DesignDriftCheckStatus
`Success` / `Failure`
- `Success`：漂移检查完成 —— `driftContent` 反映实际运行时状态
- `Failure`：漂移检查失败（如远程环境不可达）——保留先前漂移内容不变

### DesignAppEnvType
`DEV`、`TEST`、`UAT`、`PROD`

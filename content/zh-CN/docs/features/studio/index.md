# Studio Starter

## 概述

Studio Starter 提供元数据设计时 IDE，支持可视化模型设计、代码生成、版本控制与多环境部署，覆盖 Softa 元数据驱动应用从设计到生产部署的全生命周期。

主要能力：

- **模型设计器**：设计模型、字段、选项集、视图、导航、校验、OnChange 规则、索引，以及生成映射/模板
- **代码生成器**：通过 Pebble 模板从模型生成模板驱动代码文件；优先使用库表中的模板与字段类型映射，否则回退到类路径下 `templates/code/` 中的模板
- **DDL 生成器**：通过 Pebble 模板从模型定义与合并后的变更集生成 DDL（CREATE TABLE、ALTER TABLE、DROP TABLE、索引）；优先使用库表中的 SQL 模板与库类型映射
- **DDL 预览**：在工作项、版本、部署各阶段预览 DDL SQL，便于复制到数据库客户端执行
- **版本控制**：基于工作项的变更追踪，集成 ES 变更日志；支持版本封存/解封与冻结
- **部署**：版本直达环境部署，按 `sealedTime` 自动合并已发布版本，生成 DDL 并记录执行；新环境会合并截至目标版本的全部已发布版本
- **多环境部署**：支持部署到 Dev/Test/UAT/Prod，支持本地或远程升级

## 模板引擎

Studio Starter 使用 [Pebble](https://pebbletemplates.io/)（v4.1.1）作为 Java 代码与 SQL DDL 的模板引擎。Pebble 采用 `{{ var }}` / `{% if %}` 语法，与项目统一的 `{{ }}` 占位符约定一致。

### 模板文件

| 目录 | 模板 | 用途 |
| --- | --- | --- |
| `templates/code/` | `entity/{{modelName}}.java.peb`、`service/{{modelName}}Service.java.peb`、`service/impl/{{modelName}}ServiceImpl.java.peb`、`controller/{{modelName}}Controller.java.peb` | 代码生成回退模板。未配置 `DesignCodeTemplate` 时，会扫描全部 `templates/code/**/*.peb`；相对目录作为默认输出子目录，`.peb` 前最后一段路径作为渲染后的输出文件名 |
| `templates/sql/mysql/` | `CreateTable.peb`、`AlterTable.peb`、`DropTable.peb`、`AlterIndex.peb` | MySQL DDL 回退模板 |

### 代码模板规则

- 数据库模式：按 `codeLang` 加载 `DesignCodeTemplate` 并按 `sequence` 排序，渲染到 `ModelCodeDTO.files` 列表。
- `DesignCodeTemplate.subDirectory` 为 Pebble 模板。`null`、空串、仅空白、`.`、`./`、`/` 均视为 zip 根目录；开头的 `./`、`/`、结尾的 `/`、重复的 `/` 以及 `\` 会被规范化。
- `DesignCodeTemplate.fileName` 为 Pebble 模板，直接作为输出文件名，须自行包含期望后缀（如 `{{modelName}}Service.java`）；当前实现不会自动追加 `DesignCodeLang.fileExtension`。
- 渲染后的 `DesignCodeTemplate.fileName` 不能为空，且不能包含目录分隔符；目录结构只能通过 `subDirectory` 表达。
- 仅当数据库中未配置任何代码模板语言时启用回退模式；此时会渲染类路径下所有 `templates/code/**/*.peb`。
- 回退模式下，输出文件名来自回退模板路径本身。例如 `templates/code/service/{{modelName}}Service.java.peb` 会生成 `service/SysModelService.java`。
- 单文件下载使用渲染后的文件名，zip 下载使用渲染后的相对路径。`downloadAllZip` 会为每种语言包加上 `<codeLang>/` 前缀。

### 核心类

| 类 | 说明 |
| --- | --- |
| `TemplateEngine` | Pebble 引擎封装 — 单例 `PebbleEngine`，带缓存，无自动转义 |
| `CodeGenerator` | 从 `DesignModel` 生成代码文件，优先 `DesignCodeTemplate` + `DesignFieldCodeMapping`；预览/下载可指定单一语言或打包全部已配置语言 |
| `MySQLDDL` | DDL 生成器，优先 `DesignSqlTemplate` + `DesignFieldDbMapping`，否则回退到类路径 SQL 模板 |
| `DesignGenerationMetadataResolver` | 库表模板/映射/默认值的统一解析，带优雅回退 |
| `DdlContextBuilder` | 从 `DesignModel`、`DesignField`、`DesignModelIndex` 构建便于模板使用的 DDL 上下文对象 |
| `VersionDdl` / `VersionDdlImpl` | 将 `List<ModelChangesDTO>` 转为 `DdlTemplateContext`，再渲染合并后的 DDL 字符串（表 + 索引） |

### 代码生成输出

- `ModelCodeDTO` 将某一模型在某一语言下生成的文件归为一组。
- `ModelCodeDTO.files` 为 `ModelCodeFileDTO` 列表，而非固定的 entity/service/controller 字段。
- `ModelCodeFileDTO` 包含 `templateId`、`templateName`、`sequence`、`subDirectory`、`fileName`、`relativePath`、`content`。
- `downloadCode` 根据 `previewCode` 返回的渲染后 `relativePath` 定位文件。

### DDL 模板上下文

SQL 模板不直接读取原始 `DesignModel` / `DesignField` / `DesignModelIndex` 实体。`VersionDdlImpl` 会先将合并后的行变更转为便于模板使用的 DTO，模板作者只需关注 SQL 语法而非 diff 逻辑。

顶层上下文：

- `DdlTemplateContext.createdModels`
- `DdlTemplateContext.deletedModels`
- `DdlTemplateContext.updatedModels`

按模型上下文（`ModelDdlCtx`）：

- 基础元数据：`modelName`、`labelName`、`description`、`tableName`、`oldTableName`、`pkColumn`
- 表变更标记：`renamed`、`tableCommentChanged`、`tableCommentText`
- 字段分组：`createdFields`、`deletedFields`、`updatedFields`、`renamedFields`
- 索引分组：`createdIndexes`、`deletedIndexes`、`updatedIndexes`、`renamedIndexes`
- 渲染标记：`hasTableChanges`、`hasFieldChanges`、`hasIndexChanges`、`hasAlterTableChanges`

按字段上下文（`FieldDdlCtx`）：

- 标识：`fieldName`、`columnName`、`oldColumnName`、`renamed`
- 显示/注释：`labelName`、`description`、`commentText`
- 类型/默认值：`fieldType`、`dbType`、`length`、`scale`、`required`、`autoIncrement`、`defaultValue`

按索引上下文（`IndexDdlCtx`）：

- 标识：`indexName`、`oldIndexName`、`renamed`
- 定义：`columns`、`unique`

当前 MySQL 模板行为：

- `CreateTable.peb` 为单个新建模型渲染，使用 `model.createdFields`
- `DropTable.peb` 为单个删除模型渲染，使用 `model.tableName`
- `AlterTable.peb` 处理表重命名、表注释变更，以及字段的创建/删除/更新/重命名
- `AlterIndex.peb` 处理索引的创建/删除/更新/重命名
- 字段重命名渲染为 `DROP COLUMN oldColumnName` + `ADD COLUMN columnName ...`
- 索引重命名渲染为 `DROP INDEX oldIndexName` + `ADD INDEX indexName ...`
- 纯删除索引也会生成 SQL
- 新建表上的索引来自 `DesignModelIndex.createdRows`

该结构有意与元数据术语（`Model`、`Field`、`Index`）对齐，使同一套 Pebble SQL 模板可存于库中并按应用定制，降低心智负担。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>studio-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## 运行要求

- **metadata-starter**：提供运行时元数据模型管理与升级 API。
- **es-starter**：提供 Elasticsearch 变更日志存储，用于版本控制变更追踪。
- 数据库需包含 Studio 元数据表（见下文数据模型）。

## 数据模型

### 核心设计模型

| 实体 | 说明 |
| --- | --- |
| `DesignPortfolio` | 项目组合 / 应用分组 |
| `DesignApp` | 应用定义（名称、编码、databaseType、packageName）。`packageName` 会直接传入代码模板上下文 |
| `DesignModel` | 模型定义（字段、索引、tableName、storageType 等） |
| `DesignField` | 字段定义（fieldType、length、scale、relatedModel 等） |
| `DesignFieldDbMapping` | 字段类型到数据库类型的映射 |
| `DesignFieldTypeDefault` | 各字段类型的默认元数据 |
| `DesignFieldCodeMapping` | 各字段类型在各语言下的属性类型映射 |
| `DesignSqlTemplate` | 按数据库类型管理的 Pebble SQL 模板 |
| `DesignCodeTemplate` | 按语言管理的 Pebble 代码模板，可配置 `sequence`、`subDirectory`、`fileName`、`templateContent` |
| `DesignModelIndex` | 模型索引定义 |
| `DesignModelValidation` | 模型校验规则 |
| `DesignModelOnchange` | 模型 OnChange 事件规则 |
| `DesignView` | 视图定义 |
| `DesignNavigation` | 导航定义 |
| `DesignOptionSet` | 选项集定义 |
| `DesignOptionItem` | 选项项定义 |
| `DesignConfig` | 配置管理 |

### 版本控制与部署模型

| 实体 | 说明 |
| --- | --- |
| `DesignAppEnv` | 应用环境（Dev/Test/UAT/Prod），记录 `currentVersionId` |
| `DesignWorkItem` | 变更工作项 — 通过 ES 的 correlationId 界定一次设计变更；`versionId` 外键关联所属版本 |
| `DesignAppVersion` | 版本壳 — 聚合工作项变更；`versionType` 区分 `Normal` 与 `Hotfix`，发布顺序由 `status + sealedTime` 决定 |
| `DesignDeployment` | 不可变部署记录 — 包含 sealedTime 区间内合并的内容、DDL 与执行结果 |
| `DesignDeploymentVersion` | 审计记录，关联一次部署与其合并的版本 |

### 当前同步到运行时的范围

当前版本控制与发布管道仅将下列设计时模型升级到运行时元数据：

- `DesignModel` → `SysModel`
- `DesignModelTrans` → `SysModelTrans`
- `DesignField` → `SysField`
- `DesignFieldTrans` → `SysFieldTrans`
- `DesignModelIndex` → `SysModelIndex`
- `DesignOptionSet` → `SysOptionSet`
- `DesignOptionSetTrans` → `SysOptionSetTrans`
- `DesignOptionItem` → `SysOptionItem`
- `DesignOptionItemTrans` → `SysOptionItemTrans`

下列设计时实体在 `studio-starter` 中已有 CRUD，但**未纳入发布管道**：

- `DesignView`
- `DesignNavigation`
- `DesignConfig`
- `DesignModelValidation`
- `DesignModelOnchange`

## DDL 存储设计

**版本（Version）** 仅存储变更数据（`versionedContent` = `List<ModelChangesDTO>` 的 JSON），**不**存储 DDL。DDL 始终由变更数据即时生成：`VersionDdlImpl` → `DdlTemplateContext` → Pebble 模板。

这样设计的好处：

- DDL 反映最新模板版本（模板可独立升级）
- 无需在存储的 DDL 与模板之间维护一致性
- 即时生成计算成本极低
- 版本级 DDL 为中间态（部署会合并多个版本后再执行）

**部署（Deployment）** 将预渲染的 DDL 字符串（`mergedDdlTable`、`mergedDdlIndex`）作为最终发布产物保存，即在目标库上实际执行的 DDL。部署记录自包含、不可变，包含合并内容、DDL 与执行结果。

## 工作流

### 设计时工作流

1. 创建 **Portfolio** 与 **App**
2. 设计 **模型**、**字段**、**选项集**、**视图**、**导航** 等
3. 为模型预览 DDL 与生成文件

### 版本控制工作流

1. 创建 **WorkItem**，标记为 `IN_PROGRESS`
2. 可选：通过 `readyWorkItem` 将工作项标记为 **READY**
3. 进行设计变更（模型、字段等 CRUD — 变更按工作项 correlationId 写入 ES）
4. 完成工作项 → `doneWorkItem`
   - 可选：`mergeToLatestVersion` 将工作项快速并入应用级最新 **DRAFT** 版本
   - 若无 DRAFT 版本，系统会自动创建一个 `Normal` 类型版本
5. 创建 **版本**（DRAFT），`versionType = Normal | Hotfix` → 加入已完成的工作项 → `sealVersion`
   - 封存会聚合工作项变更、计算 diffHash，状态变为 SEALED
   - 若尚未部署，可通过 `unsealVersion` 将 SEALED 版本退回 DRAFT
6. 生产部署后执行 `freezeVersion`（不可再改）

说明：

- 当前 API 提供 `readyWorkItem`；代码中**没有** `startWorkItem` 接口。
- 实体上定义了 `DesignWorkItem.startTime`，但当前实现**不会**写入该字段。

### 部署工作流

1. **增量部署**：`POST /DesignDeployment/deployToEnv?envId=&targetVersionId=`
   - 按 `sealedTime` 选取区间 `(env.currentVersionId, targetVersion]` 内的已发布版本
   - 通过 `VersionMerger` 合并版本内容并生成 DDL
   - 创建自包含的部署记录（合并内容 + DDL）
   - 执行部署（本地或远程）并更新 `env.currentVersionId`
   - 生产部署成功后自动冻结相关版本
   - 新环境（无 `currentVersionId`）会合并截至目标版本的全部已发布版本
2. **重试**：`POST /DesignDeployment/retry`

说明：

- `DesignDeploymentStatus` 含 `ROLLED_BACK`，但 `studio-starter` 中**尚无**回滚 API 或回滚实现。
- `DesignAppEnv.asyncUpgrade` 当前仍会**同步**执行。

## 主要 API

### 模型设计

| 接口 | 说明 |
| --- | --- |
| `GET /DesignModel/previewDDL?id=` | 预览模型的 CREATE TABLE DDL |
| `GET /DesignModel/previewCode?id=&codeLang=` | 预览某一语言生成的代码文件（含渲染后的相对路径）。仅当只有一种语言包时 `codeLang` 可省略 |
| `GET /DesignModel/previewAllCode?id=` | 预览该模型全部语言包的生成结果 |
| `GET /DesignModel/downloadCode?id=&codeLang=&relativePath=` | 按渲染后的相对路径下载单个生成文件。`relativePath` 须来自 `previewCode` |
| `GET /DesignModel/downloadZip?id=&codeLang=` | 下载某一语言包 zip。仅当只有一种语言包时 `codeLang` 可省略 |
| `GET /DesignModel/downloadAllZip?id=` | 下载包含全部语言包的 zip，按 `<codeLang>/` 分组 |

### 工作项生命周期

| 接口 | 说明 |
| --- | --- |
| `POST /DesignWorkItem/readyWorkItem?id=` | 将工作项从 `IN_PROGRESS` 标为 `READY` |
| `POST /DesignWorkItem/doneWorkItem?id=` | 完成工作项 — 结束变更追踪 |
| `GET /DesignWorkItem/previewChanges?id=` | 预览累积的元数据变更 |
| `GET /DesignWorkItem/previewDDL?id=` | 根据工作项变更预览 DDL SQL（可复制到数据库客户端） |
| `POST /DesignWorkItem/mergeToLatestVersion?id=` | 将已完成的工作项并入应用级最新 DRAFT 版本（若无则自动创建） |
| `POST /DesignWorkItem/cancelWorkItem?id=` | 取消工作项 |
| `POST /DesignWorkItem/deferWorkItem?id=` | 暂缓工作项 |
| `POST /DesignWorkItem/reopenWorkItem?id=` | 重新打开已完成/已取消/已暂缓的工作项 |

### 版本生命周期

| 接口 | 说明 |
| --- | --- |
| `POST /DesignAppVersion/createOne` | 创建新版本（DRAFT，`versionType` 为 `Normal` 或 `Hotfix`，默认 `Normal`） |
| `POST /DesignAppVersion/addWorkItem?versionId=&workItemId=` | 向版本添加已完成的工作项 |
| `POST /DesignAppVersion/removeWorkItem?versionId=&workItemId=` | 从版本移除工作项 |
| `GET /DesignAppVersion/previewVersion?id=` | 预览合并后的版本内容 |
| `GET /DesignAppVersion/previewDDL?id=` | 根据版本内容预览 DDL SQL（可复制到数据库客户端） |
| `POST /DesignAppVersion/sealVersion?id=` | 封存版本（DRAFT → SEALED） |
| `POST /DesignAppVersion/unsealVersion?id=` | 解封版本（SEALED → DRAFT，且未部署） |
| `POST /DesignAppVersion/freezeVersion?id=` | 冻结版本（SEALED → FROZEN） |

### 部署

| 接口 | 说明 |
| --- | --- |
| `POST /DesignDeployment/deployToEnv?envId=&targetVersionId=` | 将版本部署到某环境 |
| `POST /DesignDeployment/retry?deploymentId=` | 重试失败的部署 |
| `GET /DesignDeployment/previewDeployment?deploymentId=` | 预览部署内容与 DDL |
| `GET /DesignDeployment/previewDDL?deploymentId=` | 预览部署的 DDL SQL（可复制到数据库客户端） |

### 环境

| 接口 | 说明 |
| --- | --- |
| `POST /DesignAppEnv/previewBetweenEnv?sourceEnvId=&targetEnvId=` | 预览两环境之间的差异 |

## 行级合并（model + rowId）

整条链路在 **模型 + rowId** 粒度追踪与合并变更。

### 工作项 → 版本（封存）

`VersionControlImpl` 按 `correlationId IN (workItemIds)` 查询 ES 变更日志，按 `rowId` 分组，将同一行的多条日志合并为一条 `RowChangeDTO`。同一工作项集合内既创建又删除的行会相互抵消（净效果为无变更）。

### 版本 → 部署（发布）

`VersionMerger` 使用 `modelName → (rowId → RowChangeDTO)` 映射合并多个版本内容。同一行跨多个版本变更时，由状态机折叠：

| V1 操作 | V2 操作 | 净结果 |
| --- | --- | --- |
| CREATE | UPDATE | CREATE（采用 V2 数据） |
| CREATE | DELETE | 抵消（无净变更） |
| UPDATE | UPDATE | UPDATE（合并 before/after） |
| UPDATE | DELETE | DELETE（V1 的 dataBeforeChange） |
| DELETE | CREATE | UPDATE（再创建） |

这样可保证跨工作项与版本多次修改的同一记录在部署中只体现为**一条净变更**，避免重复或冗余操作。

部署从应用已发布流中选取要合并的版本：

- 仅 `SEALED` 与 `FROZEN` 版本参与
- 版本按 `sealedTime ASC` 排序
- 合并区间为 `(env.currentVersionId, targetVersion]`
- `targetVersion` 本身须为 `SEALED` 或 `FROZEN`

## 当前缺口

### 最高优先级补齐项

1. **将 `DesignView` / `DesignNavigation` / `DesignConfig` 纳入发布管道**
   - 这些实体已有设计时 CRUD，运行时侧也已存在对应模型，但未加入 `VERSION_CONTROL_MODELS`。这是当前最大的功能缺口：设计变更无法随环境晋升。
2. **为 `DesignModelValidation` 与 `DesignModelOnchange` 提供运行时支持**
   - 二者目前仅存于设计侧；若无运行时模型与执行器，其字段不会影响应用行为。
3. **理顺工作项激活模型**
   - README 曾描述 `startWorkItem`，实现侧暴露的是 `readyWorkItem`，且未填充 `DesignWorkItem.startTime`。API 命名、流程语义与持久化时间戳应对齐。
4. **闭合部署契约缺口**
   - README 曾提及回滚，且 `DesignDeploymentStatus` 含 `ROLLED_BACK`，但尚无回滚接口/实现。`DesignAppEnv.asyncUpgrade` 也仍为同步执行。
5. **清理预留或未接线的环境/配置字段**
   - `DesignAppEnv.protectedEnv`、`active`、`clientId`、`autoUpgrade` 在部署流程中尚未强制生效。`DesignConfig` 也未暴露运行时 `SysConfig` 上已有的 `active` 标志。

### 其他说明

- `DesignView.defaultView` 目前仅为设计时标记；运行时个人默认视图由 `SysViewDefault` 管理。
- 实体上存在 `DesignOptionSet.optionItems`，但当前 starter 依赖独立的 `DesignOptionItem` 记录，不会自动灌入该集合。
- 部分元数据字段由 `studio-starter` 之外消费，主要在 `softa-orm` 与 `metadata-starter`。例如 `displayName`、`searchName`、`activeControl`、`multiTenant`、`versionLock`、`relatedField`、`joinLeft`、`joinRight`、`cascadedField`、`translatable`、`encrypted`、`maskingType` 会在运行时生效。

## 状态枚举

### DesignAppVersionStatus

`DRAFT` ⇄ `SEALED` → `FROZEN`

- `DRAFT → SEALED`：`sealVersion` — 聚合工作项变更，计算 diffHash
- `SEALED → DRAFT`：`unsealVersion` — 仅当未部署（无部署引用）
- `SEALED → FROZEN`：`freezeVersion` — 生产部署后冻结，不可再改

### DesignAppVersionType

`Normal` / `Hotfix`

- `Normal`：计划发布版本
- `Hotfix`：紧急补丁版本

### DesignWorkItemStatus

`IN_PROGRESS` → `READY` → `DONE`

- `IN_PROGRESS` → `READY`：`readyWorkItem`
- `IN_PROGRESS` / `READY` → `DONE`：`doneWorkItem`
- `IN_PROGRESS` / `READY` / `DEFERRED` → `CANCELLED`：`cancelWorkItem`
- `IN_PROGRESS` → `DEFERRED`：`deferWorkItem`
- `DONE` / `CANCELLED` / `DEFERRED` → `IN_PROGRESS`：`reopenWorkItem`

### DesignDeploymentStatus

`PENDING` → `DEPLOYING` → `SUCCESS` / `FAILURE` / `ROLLED_BACK`

### DesignAppEnvType

`DEV`、`TEST`、`UAT`、`PROD`

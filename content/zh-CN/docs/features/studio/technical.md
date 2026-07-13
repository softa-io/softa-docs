# Studio Starter

## 概览

Studio Starter 是 Softa 的元数据控制平面：设计时 IDE 加跨环境治理引擎。它让运维人员设计每环境元数据、预览生成的 DDL、将期望元数据状态发布到目标运行时、将运行时状态导入或反向工程回 Studio、在环境间合并设计，以及从先前活动快照恢复。它不生成业务代码——运行时由注解/扫描器驱动，无需生成的每实体代码。

当前实现形态：

- 每个 `DesignAppEnv` 拥有完整的 env 范围设计集。环境的实时 `design_*` 行即期望状态；当前代码中无 WorkItem、Version 或 Deployment 模型。
- `DesignActivity` 是发布、导入、反向和合并等操作的审计记录。每次成功的活动捕获操作后设计的 `DesignSnapshot`，供日后恢复。
- 发布基于期望状态：Studio 将环境设计行与目标连接器 diff，为结构变更渲染 DDL，将行变更投影为 `MetadataChangeSet`，并由连接器应用结果。
- 连接器目标为 `SOFTA`（签名运行时升级 API）和 `JDBC`（原始数据库 DDL 执行与物理 schema 反向）。

## 模板引擎

Studio 使用 Pebble（`{{ var }}` / `{% if %}`）作为通过 DDL 方言层解析的 SQL DDL 模板。无业务代码生成器：运行时由注解/扫描器驱动，无需生成的每实体代码，业务代码编写预期由 AI 根据元数据辅助，而非从固定模板渲染。

### DDL 渲染

DDL 渲染与 metadata-starter 的注解 DDL 基础设施共享。目录仅存储**逻辑**类型（`fieldType` + `length`/`scale`）；物理列类型永不存储——它是连接器投影，在渲染时按目标方言解析。

- `MetadataChangeDdlRenderer` 将行级元数据变更转换为 `DdlTemplateContext`。
- `ConnectorFactory` 通过 `DdlDialectFactory` 为目标环境选择 `DdlDialect`。
- `SOFTA` 连接器使用内置解析器，与启动时注解扫描器匹配。
- `JDBC` 连接器通过 `DesignDdlMetadataResolver` 适配 `DesignDdlTemplateResolver`，使 `DesignFieldDbMapping` 和 `DesignSqlTemplate` 可自定义外部数据库 DDL 而不成为全局 DDL bean。
- Classpath 回退 SQL 模板在 metadata-starter 中，不在 studio-starter 中。

渲染的 DDL 由 `DdlSqlSplitter` 拆分为每条语句的 payload，它将语句边界解析委托给 metadata-starter 的 `SqlStatements` 词法分析器，因此注释和引号 SQL 字面量内的分号是安全的。

对于新创建的模型，索引创建应在方言的 create-model 渲染路径中有单一所有者。不同数据库可实现不同所有者：MySQL 可在 `CREATE TABLE` 中内联索引，PostgreSQL 从 create 模板发出独立的 `CREATE INDEX` 语句。

## 当前运行时同步覆盖范围

期望状态发布、漂移、导入和环境间合并路径当前清扫以下 env 范围设计模型：

| 设计模型 | 运行时模型 |
| --- | --- |
| `DesignModel` | `SysModel` |
| `DesignField` | `SysField` |
| `DesignModelIndex` | `SysModelIndex` |
| `DesignOptionSet` | `SysOptionSet` |
| `DesignOptionItem` | `SysOptionItem` |

被清扫表的拓扑——设计实体 ↔ `MetaTable`、业务键属性、父/FK 链接、重命名桥接列、校验和属性及 FK 安全应用/删除顺序——在 `DesignAggregate` 描述符枚举（`release/dto`）中单源维护；differ、merger、importer、cloner、env-delete 级联和 DTO 分组均从中派生。

以下设计模型存在，但不在当前期望状态清扫中：`DesignModelTrans`、`DesignFieldTrans`、`DesignOptionSetTrans`、`DesignOptionItemTrans`、`DesignView` 和 `DesignNavigation`。在将这些模型加入 `DesignAggregate` 描述符及新表固有需要的部件（`DesignRows`、`MetaTable`、连接器读/应用路径、校验和与测试；merge/import 从描述符派生）之前，视为明确的实现缺口。

## 依赖

```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>studio-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

运行时模块依赖：

- `metadata-starter`：运行时元数据实体、DDL 方言、校验和与升级 DTO。这是本模块唯一的 Softa starter 依赖。

## 环境配置

`DesignAppEnv` 选择 Studio 如何与目标通信：

- `connectorType = SOFTA` 通过签名 HTTP 升级 API 对接 Softa 运行时。需要 `upgradeEndpoint`、`databaseType` 和签发的密钥对。
- `connectorType = JDBC` 对接原始 JDBC 数据库。需要 `jdbcUrl`、凭证和 `databaseType`。应用仅为 DDL，因为原始数据库无 `sys_*` 元数据行。
- `autoExecuteDDL` 由 SOFTA 连接器遵守。为 false 时，Studio 仍发布元数据行变更但不发送 DDL；DBA 在带外运行记录的 DDL。

SOFTA 环境的密钥设置：

1. 调用 `POST /DesignAppEnv/issueKey?id=<envId>`。
2. 将返回的公钥放入目标运行时的 `system.metadata.public-key`。
3. 仅将 Studio 生成的私钥保存在 `DesignAppEnv.privateKey`——ORM 静态加密存储，search 不返回，`copyById` 不携带。

## 核心数据模型

### 设计元数据

| 实体 | 用途 |
| --- | --- |
| `DesignModel` | 模型/表定义、app/env 范围、业务键、存储标志 |
| `DesignField` | 字段/列定义与关联元数据 |
| `DesignModelIndex` | 模型索引定义 |
| `DesignOptionSet` | 选项集根 |
| `DesignOptionItem` | 选项集条目 |
| `DesignView` | 设计时视图定义，尚未被发布清扫 |
| `DesignNavigation` | 设计时导航定义，尚未被发布清扫 |
| `Design*Trans` | 设计时翻译行，尚未被发布清扫 |

### DDL 模板元数据

| 实体 | 用途 |
| --- | --- |
| `DesignFieldDbMapping` | 设计支持的 DDL 方言的字段类型到数据库类型映射 |
| `DesignSqlTemplate` | 按数据库类型管理的数据库 SQL 模板覆盖 |
| `DesignFieldDomain` | 通过 `DesignField.applyDomain` 应用的可复用一次性字段模板 |

### 发布与审计

| 实体 | 用途 |
| --- | --- |
| `DesignApp` | 应用身份、编码、包名与生命周期状态 |
| `DesignAppEnv` | 目标环境与连接器配置；拥有 env 范围设计 |
| `DesignActivity` | 发布/导入/反向/合并/取消/恢复相关工作的审计记录 |
| `DesignSnapshot` | 成功活动后捕获的完整环境设计快照 |

## 主要工作流

### 设计与预览

1. 创建 `DesignApp`。
2. 创建一个或多个 `DesignAppEnv` 行。
3. 若需要，从现有环境播种新环境、从 Softa 运行时导入或反向 JDBC schema。
4. 编辑 env 范围的 `DesignModel`、`DesignField`、`DesignModelIndex`、`DesignOptionSet` 和 `DesignOptionItem` 行。
5. 使用 `GET /DesignModel/previewDDL` 预览生成的 DDL。

### 发布

1. `POST /DesignAppEnv/publish?id=<envId>`。
2. 环境互斥从 `STABLE` 转为 `DEPLOYING`。
3. Studio 通过校验和门控 diff 计算期望状态变更。
4. Studio 渲染 DDL 和行变更。
5. 连接器应用变更集：
   - `SOFTA`：签名元数据升级 API，可选带 DDL。
   - `JDBC`：对外部数据库执行 DDL；忽略行变更。
6. Studio 写入 `DesignActivity`，成功时写入 `DesignSnapshot`。
7. 环境返回 `STABLE`。

发布仅为向前滚动。取消卡住的活动释放互斥，但不撤销已应用的运行时 DDL 或元数据。

### 漂移、导入与反向

- `compareDesignWithRuntime` 计算面向运维的实时设计对运行时漂移信封。
- `previewRuntimeDrift` 将运行时与最新成功发布快照比较。
- `applyDrift` 用环境当前运行时状态覆盖设计时元数据——同时服务漂移修复和从现有运行时首次导入。
- `seedFromSource` 将完整环境设计克隆到空目标环境。
- `merge` 将某一环境的设计收敛到另一环境的设计，针对选定聚合根或整个被清扫目录。Merge 为**单向覆盖**（源 → 目标，无三方合并）：仅存在于目标侧的编辑会被覆盖；恢复方式是还原合并前活动快照。

对于 JDBC 目标，物理反向当前读取表和列。索引反向仍延后，因此对已有匹配索引的数据库进行增量 JDBC 发布可能重新发出索引 DDL。

### 恢复

`POST /DesignActivity/restore?id=<activityId>` 从成功活动的快照恢复环境设计，然后发布该恢复的设计以收敛运行时。任何捕获快照的成功活动均可恢复——发布、合并、导入和反向均对其操作后设计做快照。

## 关键 API

### 模型设计

| 端点 | 说明 |
| --- | --- |
| `GET /DesignModel/previewDDL?id=` | 预览当前模型及其索引的 DDL |
| `POST /DesignField/applyDomain` | 将 `DesignFieldDomain` 作为一次性模板复制到字段 |

### 环境

| 端点 | 说明 |
| --- | --- |
| `GET /DesignAppEnv/compareDesignWithRuntime?id=` | 实时设计对运行时漂移信封 |
| `GET /DesignAppEnv/previewRuntimeDrift?id=` | 自上次发布快照起的运行时漂移 |
| `POST /DesignAppEnv/issueKey?id=` | 签发或轮换 SOFTA 连接器签名密钥对 |
| `POST /DesignAppEnv/applyDrift?id=` | 用环境运行时状态覆盖设计（漂移修复 / 首次导入） |
| `POST /DesignAppEnv/seedFromSource?id=&sourceId=` | 从另一环境克隆空环境 |
| `POST /DesignAppEnv/publish?id=` | 将环境设计发布到其运行时 |
| `POST /DesignAppEnv/merge?id=&sourceId=` | 将源环境设计合并到目标环境设计 |

### 活动

| 端点 | 说明 |
| --- | --- |
| `POST /DesignActivity/retry?id=` | 通过对同一环境再次发布重试失败的发布 |
| `POST /DesignActivity/cancel?id=` | 取消卡住的运行中活动并释放环境互斥 |
| `POST /DesignActivity/restore?id=` | 从活动快照恢复设计，然后发布 |
| `GET /DesignActivity/changeReport?id=` | 读取活动的聚合变更报告 |

### 应用状态

| 端点 | 说明 |
| --- | --- |
| `POST /DesignApp/activate?id=` | 激活应用 |
| `POST /DesignApp/enterMaintenance?id=` | 将应用置于维护模式 |
| `POST /DesignApp/deprecate?id=` | 弃用应用 |

## 状态枚举

### `DesignAppStatus`

`Active` / `Maintenance` / `Deprecated`

### `DesignAppEnvStatus`

`Stable` / `Deploying` / `Importing` / `Merging`

环境状态为每环境互斥。发布、导入、反向和合并通过环境 `version`（`versionLock`）上的原子乐观 compare-and-set 获取：单次受保护的 `UPDATE` 将 `Stable` 翻转为忙碌状态，竞争失败表现为「忙碌——稍后重试」拒绝，完成或取消时状态释放回 `Stable`。

### `DesignActivityStatus`

`Running` / `Success` / `Failure` / `Canceled`

Studio 操作在当前实现中为同步。无 `Pending` 状态，无自动回滚状态。

### `DesignActivityKind`

`Publish` / `Import` / `Reverse` / `Merge`

### `ConnectorType`

`Softa` / `JDBC`

### `DesignAppEnvType`

`DEV` / `TEST` / `UAT` / `PROD`

## 当前缺口

- 期望状态同步当前仅覆盖上述五个被清扫元模型。翻译行、视图和导航仅为设计时，直至扩展清扫模型。
- JDBC 反向尚未读取物理索引、选项集、注释或非标准约束。
- `DesignAppEnv.protectedEnv` 在环境删除时强制执行（受保护环境拒绝删除），但尚未被 publish/merge 查阅；`active` 在默认设计写入目标环境时遵守；部分连接器策略字段尚未被每个操作强制执行。
- 运行时恢复实现为从先前设计快照向前滚动发布；非数据库回滚。

## AI agent 指引

通过 Open API 集成 Studio 的运维人员，以及编辑 Java 元数据的框架贡献者，可使用 softa 源仓库 `docs/ai/` 下维护的 AI 提示指南（`studio-no-code.md`、`framework/annotation-lane.md`）。

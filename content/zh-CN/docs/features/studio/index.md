# Studio 模块用户指南

本指南面向使用 Studio 配置业务应用的开发者。说明如何创建应用、设计各环境元数据、预览 DDL、发布到运行时、比较漂移、在环境间合并设计，以及从 Studio 前端审计操作。

## 1. Studio 是什么

Studio 是元数据驱动应用的设计时 IDE。每个**环境**拥有完整的设计工作区（模型、字段、索引、选项集、视图、导航）。发布将该设计收敛到环境的运行时。没有独立的版本或部署流水线——环境的实时设计**就是**你发布的内容。

Studio 核心工作包括：

- 管理应用（Apps）。
- 在应用下设计模型、字段、索引、选项集、视图和导航（后端按 env 限定范围）。
- 配置字段域、数据库类型映射和 SQL 模板。
- 将环境绑定到 Softa 运行时或原始 JDBC 目标，签发签名密钥，并将设计发布到运行时。
- 比较设计时元数据与运行时元数据，应用漂移，为空环境播种，并在环境间合并设计。
- 审查不可变审计轨迹（`DesignActivity`），必要时从快照恢复。

## 2. 关键概念

| 概念 | 说明 |
| --- | --- |
| App | 元数据应用。进入应用后，左侧导航限定于该应用，显示其模型、环境、活动及相关设计页面。 |
| Env | 部署环境（DEV、TEST、UAT、PROD、…）。每个环境拥有独立设计工作区并连接一个运行时（Softa 或 JDBC）。 |
| Design workspace | 按 `envId` 键控的每环境 `DesignModel`、`DesignField`、`DesignOptionSet` 等行集合。 |
| Publish | 将环境当前设计收敛到其运行时（`POST /DesignAppEnv/publish`）。记录为 kind 为 `Publish` 的 `DesignActivity`。 |
| Snapshot | 操作后对环境设计的捕获。链接自 `DesignActivity.snapshotId`，供 `restore` 使用。 |
| Activity | 针对环境的 Publish / Import / Reverse / Merge 操作的不可变审计记录。 |
| Drift | 设计时元数据与运行时元数据的差异。按需计算——无缓存漂移行。 |
| Field domain | 可复用字段属性模板（`DesignFieldDomain`），通过 `applyDomain` 一次性应用于字段。 |

## 3. 菜单结构

Studio 可从左侧导航的 `Studio` 模块进入。

### Apps

- `Apps`：管理应用定义（名称、编码、类型、所有者、状态、包名）。

### App Metadata

这些页面依赖当前选中的应用：

- `Models`：设计业务模型、字段和索引。
- `Option Sets`：维护选项集和选项条目。
- `Views`：配置模型视图、结构、过滤和排序。
- `Navigations`：配置运行时导航结构和页面入口。

### Release

- `Environments`：为每个环境配置运行时连接器、签名密钥、漂移、发布、播种和合并。
- `Activities`：发布 / 导入 / 反向 / 合并运行的审计轨迹，含变更集和快照。

### Generation

平台级生成规则（不限于单个应用）：

- `Field Domains`：可复用字段类型 + 组件 + 默认模板。
- `Field DB Mapping`：按数据库将字段类型映射到数据库列类型。
- `SQL Templates`：按数据库类型的 SQL DDL 生成模板。

## 4. 推荐工作流

### 4.1 创建应用

1. 进入 `Studio / Apps` 并创建应用。
2. 维护 `appName`、`appCode`、`appType`、`ownerId` 和 `status`。
3. 在工作区选择器中选择应用以进入应用范围的设计页面。

应用状态：

- `Active`：应用处于积极维护中。
- `Maintenance`：维护中；可从详情页重新激活。
- `Deprecated`：不再维护。

### 4.2 配置环境

打开当前应用的 `Environments` 页面，创建 DEV、TEST、UAT、PROD 或其他环境。

重要字段：

- `envType`：环境类型（DEV / TEST / UAT / PROD）。
- `envStatus`：互斥状态（`Stable`、`Deploying`、`Importing`、`Merging`）。UI 中只读——发布 / 导入 / 合并时获取。
- `sequence`：看板和表格视图中的显示顺序。
- `active`：环境是否启用。
- `protectedEnv`：为 true 时环境拒绝删除。
- `databaseType`：DDL 渲染的目标数据库风格。
- `connectorType`：`Softa`（签名升级 API）或 `JDBC`（原始连接）。
- `upgradeEndpoint`：Softa 运行时的基础 URL（`connectorType = Softa` 时必填）。
- `jdbcUrl` / `jdbcUsername` / `jdbcPassword`：JDBC 连接（`connectorType = JDBC` 时）。
- `publicKey`：由 `Issue Key` 签发，并在目标运行时配置为 `system.metadata.public-key`。
- `autoExecuteDDL`：发布是否自动执行渲染的 DDL（取决于连接器）。

首次向 Softa 运行时发布前的推荐流程：

1. 在环境详情页点击 `Issue Key`。
2. 在运行时配置返回的公钥。
3. 确认 Studio 与运行时升级端点之间的网络可达性。
4. 在环境工作区下设计元数据，然后点击 `Publish`。

要从现有环境引导空环境：使用 `Seed from Environment`（幂等——目标已有设计行时跳过）。

### 4.3 设计模型

在当前应用下打开 `Models` 以创建或编辑业务模型。

模型详情页有三个标签：

- `Model Info`：模型名、label、表名、app/env 范围、显示/搜索字段、默认排序、ID 策略、存储、软删除、多租户、timeline、版本锁及相关设置。
- `Fields`：模型字段（含关联、域、on-delete 策略、数据保护）。
- `Indexes`：模型索引。

重要字段配置：

- `fieldName` / `columnName`：逻辑名与物理名。
- `fieldType` / `optionSetCode` / `length` / `scale` / `defaultValue`：类型与约束。
- `domainId`：一次性域模板应用的来源（非实时绑定）。
- `relatedModel` / `relatedField` / `onDelete` / `relatedFieldType`：关联配置（`relatedFieldType` 为系统计算、只读）。
- `renamedFrom`：声明重命名后的紧邻前一个名称（只读）。
- `widgetType`、校验、加密和脱敏字段：显示与访问行为。

模型详情工具栏提供 `Preview DDL` 以预览此模型的表和索引 SQL。

### 4.4 配置选项集、视图和导航

选项集用于类枚举值，视图用于模型呈现，导航用于运行时菜单结构。在发布清扫模型扩展包含它们之前，这些仅为设计时。

### 4.5 将设计发布到运行时

在环境详情页：

1. 通过 `Runtime Drift` 面板或 `View Drift Report` 审查漂移。
2. 点击 `Publish` 将环境设计收敛到其运行时。
3. 在 `Activities` 上跟踪操作（kind `Publish`，状态 `Running` → `Success` / `Failure`）。

发布开始前环境互斥必须为 `Stable`。针对同一环境的并发操作会被拒绝。

### 4.6 处理设计时与运行时漂移

环境详情页顶部显示 `Runtime Drift` 面板。漂移由 `GET /DesignAppEnv/compareDesignWithRuntime` 按需计算——点击 **Check now** 刷新。

工具栏操作：

- `View Drift Report`：打开详细的模型 / 字段 / 索引级 diff 对话框。
- `Apply Drift`：用当前运行时状态覆盖设计工作区（漂移修复或从现有运行时首次导入）。
- `Seed from Environment`：将源环境的完整设计克隆到空目标环境。
- `Merge from Environment`：以覆盖方式将目标环境设计从源环境收敛（运行时不受影响，直至下次发布）。
- `Issue Key`：为 Softa 连接器签名生成或轮换 Ed25519 密钥对。

使用指引：

- 接入已有运行时元数据的系统时，打开漂移报告、审查后运行 `Apply Drift`。
- 新建环境需匹配现有环境设计时，使用 `Seed from Environment`。
- 在环境间提升设计而不触及运行时时，使用 `Merge from Environment`，就绪后分别发布各环境。
- `Apply Drift` 和 merge/seed 都会重写设计时元数据。运行破坏性操作前确认真相来源。

### 4.7 审查与恢复活动

在当前应用下打开 `Activities`：

- 列表按 id 降序显示操作（kind、status、env、source env、时间戳）。
- 详情页显示变更集 JSON、渲染的 DDL 详情（仅发布）、错误消息和链接的快照 id。
- `Retry Publish`：对失败的发布活动重新发布环境。
- `Cancel`：释放卡住的 `Running` 发布和环境互斥（无自动运行时回滚）。
- `Restore`：向前滚动——从活动的快照恢复设计，然后发布以收敛运行时。

## 5. 生成配置

DDL 生成基于 Pebble SQL 模板和字段数据库映射。

### Field Domains

命名、可复用模板（`fieldType`、`widgetType`、`length`、`scale`、`defaultValue`）。通过后端 `POST /DesignField/applyDomain` API 应用于字段（一次性复制——非实时绑定）。

### SQL Templates

按 `databaseType` 加载，用于生成 CREATE TABLE、ALTER TABLE、索引和 DROP TABLE SQL。

### Field DB Mapping

决定每种字段类型生成哪种数据库列类型。

调整这些配置后，模型 DDL 预览将反映新生成规则。

## 6. 发布前检查清单

发布到生产前，确认：

- 所有变更属于正确的应用和环境工作区。
- 模型 / 选项集变更已通过漂移报告或同行评审审查。
- 目标环境 `connectorType`、端点和凭证正确。
- 首次发布或密钥轮换后，运行时携带最新公钥。
- 启用 `autoExecuteDDL` 时已审查发布活动中的渲染 DDL。
- 知晓若 merge 或 apply drift 出错如何从快照 `Restore`。

## 7. 常见问题

### 为什么看不到 Workbench、Versions 或 Deployments？

Studio 2.0 移除了 WorkItem → Version → Deployment 流水线。设计按 env 限定范围；发布 + 活动 + 快照取代版本化部署。

### 为什么移除了 Refresh Drift？

漂移按需计算。使用漂移面板上的 **Check now** 或漂移报告对话框内的 **Refresh**，而非单独的缓存刷新 RPC。

### Apply Drift 与 Seed from Environment 有何区别？

`Apply Drift` 读取环境的实时运行时并将差异反演到设计工作区。`Seed from Environment` 将另一环境的设计行克隆到空目标环境（不接触运行时）。

### 活动上的 Cancel 是数据库回滚吗？

不是。Cancel 释放卡住的环境互斥并将活动标记为已取消。已应用的运行时变更保持应用。

### 何时使用 Merge vs Publish？

`Merge` 仅改变环境间的设计元数据。`Publish` 将环境设计推送到其运行时。典型提升：merge DEV → TEST 设计，审查，然后 publish TEST。

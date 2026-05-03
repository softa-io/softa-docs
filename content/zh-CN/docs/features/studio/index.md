# Studio 模块使用指南

本文面向使用 Studio 配置业务应用的开发人员。它说明在前端 Studio 中如何创建应用、设计元数据、管理变更、预览代码和 DDL、发布版本以及处理运行环境差异。

## 1. Studio 是什么

Studio 是元数据驱动应用的设计时工作台，用于把业务对象、字段、视图、导航、选项集等配置成可发布的应用元数据，并通过版本和环境流程发布到目标运行系统。

Studio 的核心工作包括：

- 管理 Portfolio 和 App。
- 在 App 下设计模型、字段、索引、选项集、视图和导航。
- 配置字段类型默认值、数据库类型映射、代码类型映射、代码模板和 SQL 模板。
- 通过 WorkItem 追踪一组可发布的设计变更。
- 将完成的 WorkItem 加入版本，封版后部署到 Dev、Test、UAT、Prod 等环境。
- 预览模型、WorkItem、Version 和 Deployment 维度的变更、代码和 DDL。
- 对比设计态元数据和运行态元数据，并在需要时从运行态导入或接受运行态差异。

## 2. 关键概念

| 概念 | 说明 |
| --- | --- |
| Portfolio | 项目或产品线分组，用来归类多个 App。 |
| App | 一个元数据应用。进入 App 后，左侧菜单会围绕当前 App 展示 Workbench、模型、版本、环境和部署记录。 |
| WorkItem | 一次业务变更的工作单元。需要发布的模型、选项集、视图和导航变更应放在一个进行中的 WorkItem 下完成。 |
| Version | 一个应用版本，聚合多个已完成的 WorkItem。Draft 版本可以继续调整，Sealed/Frozen 版本可以部署。 |
| Env | 应用运行环境，例如 DEV、TEST、UAT、PROD。部署时只会展示当前 App 下启用的环境。 |
| Deployment | 一次实际部署记录，包含合并后的变更内容、表结构 DDL、索引 DDL、执行状态和错误信息。 |
| Drift | 设计态和运行态之间的差异。用于发现运行环境中被手工改动或首次接入已有运行系统的情况。 |

## 3. 菜单结构

Studio 入口在左侧导航的 `Studio` 模块下。

### Portfolio & Apps

- `Apps`：管理应用定义。应用详情页可以维护应用名称、编码、类型、所属 Portfolio、负责人、状态、数据库类型和包名。
- `Portfolios`：管理 Portfolio。可将 Portfolio 设为 Active 或 Archived。

### App Design

这些页面依赖当前选中的 App：

- `Workbench`：当前 App 的变更工作台。用于创建和管理 WorkItem，并从 WorkItem 进入元数据设计页面。
- `Environments`：配置当前 App 的运行环境、部署地址、密钥和环境差异检查。
- `Versions`：创建版本、封版、解封、冻结和发起部署。
- `Deployments`：查看部署记录、部署 DDL、部署状态、错误信息，以及失败后的重试或卡住后的取消。

### App Metadata

这些页面也依赖当前 App：

- `Models`：设计业务模型、字段、索引、表名、存储策略和运行特性。
- `Option Sets`：维护选项集和选项项。
- `Views`：配置模型视图、结构、默认过滤和排序。
- `Navigations`：配置运行时导航结构和页面入口。

### Generation

这些是生成规则配置，通常由平台开发人员或资深业务开发人员维护：

- `Field DB Mapping`：配置字段类型到数据库列类型的映射。
- `Field Code Mapping`：配置字段类型到代码属性类型的映射。
- `Field Type Defaults`：配置字段类型默认值、长度和精度。
- `Code Templates`：配置代码生成模板。
- `SQL Templates`：配置 SQL DDL 生成模板。

## 4. 推荐工作流

### 4.1 创建 Portfolio 和 App

1. 进入 `Studio / Portfolios`，创建 Portfolio。
2. 进入 `Studio / Apps`，创建 App。
3. 在 App 详情页维护：
   - `appName`：应用名称。
   - `appCode`：应用编码。
   - `portfolioId`：所属 Portfolio。
   - `databaseType`：目标数据库类型。
   - `packageName`：代码生成时使用的基础包名。
4. 在 App 卡片上点击 `Design App`，进入该 App 的 Workbench。

App 状态说明：

- `Active`：正常维护。
- `Maintenance`：维护中，可从详情页重新 Activate。
- `Deprecated`：已废弃。

### 4.2 配置环境

进入当前 App 的 `Environments` 页面，创建 DEV、TEST、UAT 或 PROD 环境。

重要字段：

- `envType`：环境类型。
- `sequence`：环境排序。
- `active`：是否启用。部署弹窗只展示启用的环境。
- `upgradeEndpoint`：目标运行系统的基础地址。后端会自动拼接运行时元数据升级和导出接口。
- `publicKey`：由 `Issue Key` 生成，用于配置到目标运行系统。
- `currentVersionId`：当前环境已经部署到的版本，由部署流程维护。

首次远程部署前，推荐流程是：

1. 在环境详情页点击 `Issue Key`。
2. 将返回或写入的 public key 配置到对应运行系统的 `system.runtime-public-key`。
3. 确认运行系统可以访问 Studio 后端的部署回调地址。
4. 再从 Version 发起部署。

注意：`protectedEnv` 和 `autoUpgrade` 目前是配置字段，但当前部署流程不会强制执行保护或自动升级策略。涉及生产环境时仍应以团队发布规范为准。

### 4.3 创建 WorkItem 并开始设计

进入当前 App 的 `Workbench`：

1. 创建 WorkItem，填写名称和描述。
2. 保持 WorkItem 处于 `InProgress`。
3. 在 WorkItem 详情页的 `Related Metadata` 区域进入：
   - `Models`
   - `Option Sets`
   - `Views`
   - `Navigations`
4. 在这些入口下完成需要发布的设计变更。

推荐所有需要进入发布流程的元数据变更都从 WorkItem 详情页进入。这样当前路由会携带 `workItemId`，前端会把它作为变更追踪上下文，后端才能按 WorkItem 聚合变更。

Workbench 常用动作：

- `Done`：完成 WorkItem，停止继续累积变更。
- `Add to Version`：把 WorkItem 加入一个 Draft 版本。
- `Remove from Version`：从当前 Draft 版本移除。
- `Cancel`：取消 WorkItem。
- `Defer`：延期 WorkItem。
- `Reopen`：重新打开已取消或延期的 WorkItem。
- `Preview Changes`：按模型查看本 WorkItem 的创建、更新、删除记录。
- `Preview DDL`：预览本 WorkItem 会产生的 DDL。

### 4.4 设计模型

进入 WorkItem 下的 `Models`，创建或编辑业务模型。

模型详情包含三个页签：

- `Model Info`：维护模型名称、显示名、表名、应用、描述、显示字段、搜索字段、默认排序、ID 策略、存储类型、数据源、服务名、软删除、多租户、时间线、版本锁等。
- `Fields`：维护模型字段。
- `Indexes`：维护模型索引。

字段配置重点：

- `fieldName`：代码和元数据字段名。
- `columnName`：数据库列名。
- `fieldType`：字段类型。
- `optionSetCode`：选项字段关联的选项集编码。
- `length` / `scale` / `defaultValue`：长度、精度和默认值。
- `relatedModel` / `relatedField` / `joinModel` / `joinLeft` / `joinRight`：关系字段配置。
- `filters`：关系字段过滤条件。
- `widgetType`：前端控件类型。
- `required` / `readonly` / `hidden`：校验和展示行为。
- `translatable` / `encrypted` / `maskingType`：翻译、加密和脱敏能力。

模型详情页提供：

- `Preview DDL`：预览该模型建表和索引 DDL。
- `Preview Code`：预览该模型生成的代码。弹窗中可以按语言切换、查看文件树、复制代码、下载当前文件、下载当前语言 ZIP 或下载全部语言 ZIP。

### 4.5 配置选项集、视图和导航

`Option Sets` 用于配置枚举类业务值：

- 选项集维护 `name`、`optionSetCode`、`appId` 和描述。
- 选项项维护 `itemCode`、`itemName`、`sequence`、`parentItemCode`、`itemTone`、`itemIcon`、`active` 和描述。

`Views` 用于配置模型视图：

- 维护视图名称、编码、模型、类型、排序。
- 在配置区维护 `structure`、`defaultFilter` 和 `defaultOrder`。
- 可设置 `navId`、`publicView` 和 `defaultView`。

`Navigations` 用于配置运行时导航：

- 维护导航名称、编码、类型、关联模型、父级导航、描述和过滤条件。

### 4.6 预览变更和 DDL

Studio 支持多个阶段的预览：

- 模型详情页：预览单个模型的建表 DDL 和生成代码。
- WorkItem 详情页：预览该 WorkItem 累积的元数据变更和 DDL。
- Version 详情页：预览版本聚合后的元数据变更和 DDL。
- Deployment 详情页：查看本次部署实际保存的 `mergedDdlTable` 和 `mergedDdlIndex`。

如果是上线前检查，应优先看 Version 和 Deployment 维度。模型维度适合开发中快速检查单个模型，WorkItem 维度适合检查一个需求内的变更是否完整。

### 4.7 创建版本、封版和部署

进入当前 App 的 `Versions`：

1. 创建 Version，选择 `versionType`：
   - `Normal`：常规版本。
   - `Hotfix`：紧急修复版本。
2. 回到 Workbench，将已完成的 WorkItem 通过 `Add to Version` 加入该 Draft 版本。
3. 在 Version 详情页点击 `Preview Changes` 和 `Preview DDL` 做发布前检查。
4. 点击 `Seal Version`。封版后，后端会聚合 WorkItem 变更并计算 `diffHash`。
5. 如封版后发现问题，且版本尚未部署，可以点击 `Unseal Version` 回到 Draft。
6. 对已封版或已冻结版本点击 `Deploy to Env`，选择启用的目标环境并确认部署。

版本状态说明：

- `Draft`：草稿，可加入或移除 WorkItem。
- `Sealed`：已封版，可部署；未部署前可解封。
- `Frozen`：已冻结，不应继续修改。

部署是异步流程。发起部署后，前端会创建 Deployment 记录；真正完成状态由目标运行系统回调 Studio 后更新。

### 4.8 查看部署记录

进入当前 App 的 `Deployments`：

- 列表按创建时间倒序展示部署记录。
- 详情页 `General` 页签显示源版本、目标版本、目标环境、部署状态、操作人和耗时。
- `Content` 页签显示合并后的元数据内容、表 DDL 和索引 DDL。
- `Version List` 页签显示本次部署合并进来的版本。
- `Error` 页签显示失败原因。

部署状态为 `Failure` 时，可以点击 `Retry` 重新发起。状态为 `Pending` 或 `Deploying` 且确认已经卡住时，可以点击 `Cancel` 释放环境部署锁。

重要限制：`Cancel` 不会自动回滚目标运行库中已经执行过的 DDL 或数据变更，只会把部署记录标记为取消并释放环境锁。

### 4.9 处理设计态和运行态差异

进入环境详情页，可以查看 `Runtime Drift` 面板。

常用动作：

- `Compare (cached)`：查看当前缓存的设计态和运行态差异。
- `Refresh Drift`：异步重新拉取运行态元数据并计算差异。面板会轮询刷新状态。
- `Apply Drift`：接受当前缓存差异，用运行态内容覆盖设计态元数据。
- `Import from Runtime`：重新从运行态拉取元数据，并用当前运行态内容覆盖设计态元数据。

使用建议：

- 首次接入一个已经有运行态元数据的系统时，使用 `Import from Runtime` 更合适。
- 运行环境被临时手工修复后，如果决定把运行态作为新的设计基准，先 `Refresh Drift`，确认差异，再 `Apply Drift`。
- `Apply Drift` 和 `Import from Runtime` 都会改写设计态元数据，执行前必须确认目标环境就是要接受的事实来源。

## 5. 生成配置说明

代码和 DDL 生成基于 Pebble 模板，模板变量使用 `{{ var }}` 形式。

### Code Templates

代码模板按 `codeLang` 和 `sequence` 加载。每条模板可以配置：

- `subDirectory`：输出子目录，可使用 Pebble 表达式。
- `fileName`：输出文件名，可使用 Pebble 表达式，必须包含期望的后缀，例如 `{{modelName}}Service.java`。
- `templateContent`：模板内容。

如果数据库中没有配置代码模板，后端会使用内置 classpath 模板作为兜底。

### SQL Templates

SQL 模板按 `databaseType` 加载，用于生成建表、改表、索引和删表 SQL。模板作者主要面对的是模型、字段、索引的差异上下文，不需要自己读取原始实体并计算 diff。

### Mapping 和 Defaults

- `Field DB Mapping` 决定字段类型生成什么数据库列类型。
- `Field Code Mapping` 决定字段类型生成什么代码属性类型。
- `Field Type Defaults` 决定字段类型默认长度、精度和默认值。

调整这些配置后，模型的代码预览和 DDL 预览会反映新的生成规则。

## 6. 上线前检查清单

发布前建议逐项确认：

- 变更是否都在正确的 App 下完成。
- 需要发布的模型、选项集、视图和导航变更是否都来自正确的 WorkItem。
- WorkItem 的 `Preview Changes` 中是否只包含本次需求变更。
- WorkItem 的 `Preview DDL` 是否符合预期。
- Version 是否包含所有需要发布的 WorkItem，且没有误加入其他 WorkItem。
- Version 的 `Preview Changes` 和 `Preview DDL` 是否通过评审。
- 目标 Env 是否启用，`upgradeEndpoint` 是否正确。
- 首次部署或密钥轮换后，目标运行系统是否已配置最新 public key。
- 生产环境部署前，Deployment 里的表 DDL 和索引 DDL 是否已经确认。
- 失败重试或取消前，是否确认目标运行系统的实际执行状态。

## 7. 常见问题

### 为什么 WorkItem 里看不到我刚改的元数据？

需要确认修改是否是在 WorkItem 详情页的 `Related Metadata` 入口下完成。只有当前路由带有 `workItemId` 时，前端才会把 WorkItem 作为变更追踪上下文传给后端。

### 为什么 Deploy to Env 弹窗没有目标环境？

部署弹窗只展示当前 App 下 `active = true` 的环境。请检查环境是否属于当前 App，并且是否已启用。

### Compare (cached) 和 Refresh Drift 有什么区别？

`Compare (cached)` 只读取上一次计算好的差异。`Refresh Drift` 会请求后端异步重新对比设计态快照和运行态元数据。

### Apply Drift 和 Import from Runtime 应该怎么选？

如果已经刷新并审阅过差异，决定接受缓存的运行态差异，使用 `Apply Drift`。如果是首次从已有运行系统初始化设计态，或希望先重新拉取运行态再覆盖设计态，使用 `Import from Runtime`。

### Cancel Deployment 是回滚吗？

不是。Cancel 只释放卡住的环境部署锁并标记部署记录，不会自动撤销目标运行系统中已经执行的 DDL 或数据变更。

### 什么时候看 Model DDL，什么时候看 Version 或 Deployment DDL？

模型 DDL 用于开发中检查单个模型。发布前应看 Version DDL。部署后应看 Deployment 详情中的 `mergedDdlTable` 和 `mergedDdlIndex`，这是本次部署保存下来的最终执行产物。

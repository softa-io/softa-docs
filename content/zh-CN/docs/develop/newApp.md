# 创建新应用

创建一个新应用之前，先了解一下框架组件和 starters 组件。
## 1 框架组件介绍
Softa 的框架采用分层设计，内核由 `base`、`orm`、`web` 三个模块构成，为上层的通用模块（starters） 和业务模块提供强大的技术支持。

### 1.1 `base` 基础核心模块
基础组件，提供应用的基本功能和配置。
- 静态常量、基础工具类和枚举对象
- `i18n` 后端代码中的消息多语言
- 线程变量 `Context`
- 多租户配置类
- 自定义异常类

### 1.2 `orm` 对象关系映射模块
元数据驱动的对象关系映射，提供数据库访问的统一抽象层。
- 实现实体对象与数据库表的映射，支持关系型字段、级联字段、计算型字段等特性。
- 基于元数据的访问接口：`ModelService`
- 基于专业代码的领域模型访问接口：`EntityService`
- 支持动态查询条件，`FlexQuery`，其中 `Filters` 支持灵活过滤条件。
- 支持多种数据库，MySQL、PostgreSQL、Oracle 等
- 支持多租户逻辑隔离
- 支持数据库读写分离
- 支持动态多数据源
- 支持数据加密和脱敏
- 数据模型、行级别和列级别鉴权接口

### 1.3 `web` Web 应用支持模块
提供 Web 应用开发的基础功能
- 实现 RESTful API 的支持
- 集成 Swagger OpenAPI 文档工具
- 封装请求响应
- 全局异常处理机制
- `Context` 拦截器接口
- 缓存、Token和工具类服务

## 2 通用组件 starters 介绍
### 2.1 `metadata-starter` 元数据管理模块
- 提供模型、字段、选项集、视图等元数据的定义和管理
- 元数据的版本升级
- 支持加载预定义的 Excel、CSV、JSON 数据数据

### 2.2 `es-starter` ElasticSearch 集成模块
封装 ES 的交互能力：
- 提供基于元数据和 `Filters` 的通用索引查询能力
- 变更日志的持久化存储和查询，包括变更前数据、变更后数据、变更人、`TraceId` 等信息。

### 2.3 `file-starter` 文件管理模块
提供基于 OSS 的文件上传、下载、存储功能。
- 支持多种存储方式：阿里云 OSS、MinIO
- 静态导入：基于可配置的导入模板和 Excel 文件导入模型数据
- 动态导入：基于动态导入参数和 Excel 文件导入模型数据
- 静态导出：基于 Excel 文件模板，导出模型数据到 Excel 文件
- 动态导出：基于可配置的数据导出模板，导出模型数据到 Excel 文件
- 生成 Word 文件：基于 Word 模板和模型数据，生成 Word 文件
- 生成 PDF 文件：基于 Word 模板和模型数据，生成 PDF 文件
- 文件导入导出和文件生成的审计记录

### 2.4 `flow-starter` 工作流引擎模块
提供基于事件驱动的业务流程定义和执行。
- 支持自动化流程、定时任务流程、表单流、校验流、`Onchange` 事件流和 AI Agent 流程。
- 支持的节点类型包括：新增数据、修改数据、删除数据、查询数据、数据计算、决策网关、生成报表、查询 AI、发送消息、校验数据、WebHook、异步任务和子流程。
- 事件驱动机制，支持的事件类型：新增数据、修改数据、删除数据、按钮事件、`Onchange` 事件、API 事件、定时任务事件和子流程触发事件。
- 支持同步流、异步流
- 支持流程的版本化管理

### 2.5 `designer-starter` 设计器模块
提供元数据的版本化管理和多环境发布功能。
- 集中管理业务应用、系统环境和元数据之间的版本关系
- 支持环境间合并元数据，如将元数据在 `Dev`、`Test`、`UAT`、`Prod` 环境之间进行合并
- 支持将元数据发布到目标环境
- 支持基于版本生成 DDL 语句，包含版本内所有发生变更的模型数据结构和索引。
- 支持基于模型元数据生成 Entity、Service、ServiceImpl、Controller 代码文件
- 支持基于模型元数据生成 SQL 脚本，包括数据表 DDL 和索引 DDL。
- 支持不同数据库类型的 DDL 个性化配置。
- 实现低代码开发能力

### 2.6 `ai-starter` AI 能力集成模块
提供 AI 集成和交互相关能力：
- 抽象 AI 模型和 AI 机器人，支持自定义机器人
- 提供 AI 适配器抽象接口，及 `OpenAI` 集成实现
- 支持 `SSE` 聊天式交互响应
- 支持用户对 AI 响应进行评价
- 自动统计会话消耗的 Token

### 2.7 `cron-starter` 定时任务管理模块
提供定时任务的定义和调度能力：
- 定时任务调度逻辑可配置，包括表达式、执行次数、优先级等
- 统计记录定时任务执行日志和耗时统计
- 支持 Leader 选举和集群部署

## 3 创建一个新应用
通过组合不同的 starter，可以快速创建一个功能丰富的新应用，只需要在 `pom.xml` 文件中添加相应的依赖即可。如以下内容为`demo-app`的依赖项，它依赖了元数据模块、ES 模块和文件处理模块。
```xml
    <artifactId>demo-app</artifactId>
    <description>Demo application</description>

    <dependencies>
        <dependency>
            <groupId>io.softa</groupId>
            <artifactId>metadata-starter</artifactId>
            <version>${project.version}</version>
        </dependency>

        <dependency>
            <groupId>io.softa</groupId>
            <artifactId>es-starter</artifactId>
            <version>${project.version}</version>
        </dependency>

        <dependency>
            <groupId>io.softa</groupId>
            <artifactId>file-starter</artifactId>
            <version>${project.version}</version>
        </dependency>
    </dependencies>
```
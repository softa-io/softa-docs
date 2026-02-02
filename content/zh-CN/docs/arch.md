# 技术架构

## 一、架构设计
![架构设计](/image/system-arch.png)

该架构以**Softa 应用开发平台（Application Development Platform）**为核心，采用自上而下的分层模型。

最上层为业务应用（Business Apps），如 CoreHR、Payroll、Talent、Workforce、Expenses 等，直接承载业务场景与用户功能。

中间是平台能力层，由两部分组成：

**Platform Services**：提供 IAM、Workflow、Messaging、Metadata、AI、Integration、Audit、File、Data Quality、Cron 等通用服务，为各业务应用提供统一的基础能力；

**Metadata Framework**：包含 Base、ORM、Web 等元数据与开发框架，支持模型驱动与快速应用构建。

最底层为基础设施层（Infra），包括 RDBMS、OSS、Index、MQ、Cache 等技术组件，为平台提供存储、消息与缓存支撑。

整体形成**业务应用 → 平台服务 → 元数据框架 → 基础设施**的四层结构，实现业务与技术能力解耦，支持应用的快速构建与持续扩展。

---
## 二、数据架构
![数据架构](/image/data-arch.png)

数据架构采用 **“治理驱动 + 领域访问 + 多模存储”** 的设计模型，以元数据为核心枢纽，将数据来源、领域服务与物理存储进行解耦。
整体结构由四个纵向维度与三个横向层次共同组成：

- 纵向维度：Data Sources → Data Access → Data Domains → Data Storage
- 横向核心：Metadata & Governance → Domain APIs → Data Domains → Storage

该模型的核心思想是：
**所有数据访问必须经过领域接口，所有行为必须受元数据治理约束，底层存储对上层透明。**

### 2.1 核心层次解析

#### (1) Metadata & Governance（元数据与治理层）

位于架构的中枢位置，承担对全局数据的描述与管控职责：

- **Data Schema**：统一的数据模型与结构定义
- **Lineage**：数据血缘与流转路径
- **Ownership**：数据责任归属
- **Audit Metadata**：审计与合规信息

该层不直接存储业务数据，而是**控制“数据如何被理解、如何被使用、由谁负责”**。

#### (2) Domain APIs（领域访问层）

所有对数据的读写都必须通过 Domain APIs 完成：

- 统一的领域服务入口
- 屏蔽底层多种存储差异
- 承载业务规则与访问控制
- 与治理层紧密协同

它是**数据治理与业务系统之间的唯一桥梁**。

#### (3) Data Domains（数据域）

数据按照职责被划分为三类：

- **Business Data**：业务过程数据
- **Master & Reference Data**：主数据与基础字典
- **System Data**：系统运行与配置数据

这种划分保证不同类型数据拥有独立生命周期与治理策略。

#### (4) Data Storage（多模存储）

底层采用多种存储组合：

- **RDBMS**：结构化事务数据
- **Index**：检索与分析加速
- **OSS**：非结构化对象

对上层完全透明，由 Domain APIs 统一路由。

### 2.2 消费与接入侧

- **Client App**：前端应用
- **Integrations**：外部系统对接
- **Domain Services**：领域业务服务

所有消费者都遵循：
**Data Sources → Domain APIs → Governance → Storage** 的受控路径。

### 2.3 架构特征

- 治理先于访问
- 领域接口唯一化
- 存储多模可插拔
- 数据可追溯可审计
- 职责边界清晰

## 三、技术组件
### 前端组件
* React
...

### 后端组件
* Java 25 LTS
* SpringBoot 4.0.2
* Redis
* ElasticSearch
...

# Creating a New Application

Before creating a new application, it’s essential to understand the framework components and starter modules.

## 1 Framework Components Overview

Softa adopts a layered design for its framework. The core consists of three modules: `base`, `orm`, and `web`, providing robust technical support for higher-level general-purpose modules (starters) and business modules.

### 1.1 `base` Core Module
The foundational component that provides basic functionalities and configurations for applications:
- Static constants, utility classes, and enumeration objects.
- i18n support for multilingual messages in backend code.
- Thread variables through the `Context` mechanism.
- Multi-tenant configuration classes.
- Custom exception classes.

### 1.2 `orm` Object-Relational Mapping Module
A metadata-driven ORM providing a unified abstraction layer for database access:
- Maps entity objects to database tables, supporting relational fields, cascading fields, computed fields, etc.
- Metadata-based access interface: `ModelService`.
- Domain model access interface for specialized code: `EntityService`.
- Supports dynamic query conditions via `FlexQuery`, with flexible filters.
- Compatible with multiple databases: MySQL, PostgreSQL, Oracle, etc.
- Enables multi-tenant logical isolation.
- Provides database read-write separation.
- Supports dynamic multi-datasource configurations.
- Offers data encryption and masking.
- Implements data model, row-level, and column-level authorization interfaces.

### 1.3 `web` Web Application Support Module
Provides essential features for web application development:
- RESTful API implementation support.
- Integration with Swagger OpenAPI documentation tools.
- Encapsulation of request and response handling.
- Global exception handling mechanisms.
- `Context` interceptor interfaces.
- Services for caching, tokens, and utility tools.

## 2 Common Component Starters Overview

### 2.1 `metadata-starter` Metadata Management Module
- Enables the definition and management of metadata such as models, fields, option sets, and views.
- Supports metadata version upgrades.
- Allows loading of predefined data from Excel, CSV, or JSON files.

### 2.2 `es-starter` ElasticSearch Integration Module
Provides encapsulated ES interaction capabilities:
- Generalized index query capabilities based on metadata and filters.
- Persistent storage and query capabilities for change logs, including details such as before/after data, user changes, and `TraceId`.

### 2.3 `file-starter` File Management Module
Offers file upload, download, and storage capabilities based on OSS:
- Supports multiple storage options: Alibaba Cloud OSS, MinIO.
- Static import: Imports model data using configurable templates and Excel files.
- Dynamic import: Imports model data based on dynamic parameters and Excel files.
- Static export: Exports model data to Excel files using predefined templates.
- Dynamic export: Exports model data to Excel using configurable export templates.
- Word file generation: Creates Word files using templates and model data.
- PDF file generation: Creates PDF files based on Word templates and model data.
- Provides audit records for file import/export and file generation activities.

### 2.4 `flow-starter` Workflow Engine Module
Supports event-driven business process definition and execution:
- Automates processes such as scheduled tasks, form flows, validation flows, `Onchange` event flows, and AI agent flows.
- Node types supported include: add data, modify data, delete data, query data, calculate data, decision gateway, generate reports, query AI, send messages, validate data, WebHook, asynchronous tasks, and subprocesses.
- Event-driven mechanism supporting events like add data, modify data, delete data, button actions, `Onchange` events, API calls, scheduled tasks, and subprocess triggers.
- Supports synchronous and asynchronous flows.
- Version management for workflows.

### 2.5 `designer-starter` Designer Module
Provides versioned management of metadata and multi-environment publishing features:
- Centralized management of relationships between business applications, system environments, and metadata versions.
- Supports merging metadata across environments, such as Dev, Test, UAT, and Prod.
- Publishes metadata to target environments.
- Generates DDL scripts based on metadata versions, covering all model data structure and index changes.
- Generates `Entity`, `Service`, `ServiceImpl`, and `Controller` code files from metadata.
- Generates SQL scripts based on model metadata, including table and index DDL.
- Allows database-specific DDL configurations.
- Implements low-code development capabilities.

### 2.6 `ai-starter` AI Integration Module
Provides capabilities for AI integration and interaction:
- Abstracts AI models and bots with support for custom bots.
- Offers an adapter abstraction interface for AI, along with OpenAI integration.
- Supports SSE-based interactive chat responses.
- Allows users to rate AI responses.
- Automatically tracks session token usage.

### 2.7 `cron-starter` Scheduled Task Management Module
Provides the ability to define and schedule tasks:
- Configurable scheduling logic, including expressions, execution count, priority, etc.
- Logs execution details and time statistics for tasks.
- Supports leader election and cluster deployments.

## 3 Creating a New Application

By combining different starters, you can quickly create a feature-rich application. Simply add the required dependencies in the `pom.xml` file. Below is an example for the `demo-app` that depends on the metadata, ES, and file handling modules:

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
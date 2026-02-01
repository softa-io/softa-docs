# Design Principles

## I. Metadata Driven

In Softa, metadata includes three categories: model metadata, UI metadata, and configuration metadata.

1. Model Metadata

This includes the metadata of the model itself and the metadata of its fields, as well as the dependencies between models declared through relational fields.

For more details, refer to the [Model Metadata](features/metadata/model) and [Field Metadata](features/metadata/field) sections.

2. UI Metadata

UI metadata defines the data for user interface elements, including metadata for menus and navigation, as well as schema data that defines page layouts, controls, styles, and interaction behaviors. This data is used for dynamically building and managing the frontend presentation of applications.

The definition and parsing process of UI metadata relies on `model metadata`. For more details, refer to [UI Metadata](features/metadata/ui).

3. Configuration Metadata

Configuration metadata is relatively broad and refers to application configuration data based on `model metadata`. This data is highly versatile and, depending on the application scenario, is divided into the following categories:

(1) Flow Configuration Metadata

Flow configuration metadata includes the trigger conditions of flows, execution conditions of nodes and actions, execution parameters of actions, etc. These elements define how data flows and is processed within the flow.

For more details, refer to [Flow](features/flow).

(2) Data Integration Metadata

This defines the descriptive information for achieving data integration between systems, including interface connection information, authentication information, data structures, data formats, data transformation rules, and data mapping relationships. Through data integration metadata, the integration center can automate system interface calls to push and pull data, achieving data integration between upstream and downstream business systems.

For more details, refer to [Data Integration](features/integration).

(3) Permission Configuration Metadata

Permission configuration metadata refers to the structured information used in enterprise systems to define and manage user permissions. It includes elements such as users, roles, attributes, permissions, permission sets, resources, and their relationships. Based on permission metadata, users can be authorized and authenticated to ensure that only authorized users can access specific resources or perform specific operations.

By configuring permission metadata, permission strategies can be flexibly adjusted to meet different business needs and achieve complex fine-grained permission control, such as controlling data access at the row and column levels based on different attribute conditions. This is particularly important in medium to large enterprise systems, enhancing the system's security, flexibility, and maintainability.

For more details, refer to [Permission Control](security/access).

(4) Import/Export Metadata

This defines the structured information for importing and exporting Excel/CSV files, including customizable import/export templates. These templates allow flexible settings for which fields to import or export, data formats, validation rules, and how to handle erroneous data. Import/export metadata helps simplify the data exchange process, improving data processing accuracy and efficiency, and meeting data exchange needs in different business scenarios, enhancing system flexibility and maintainability.

(5) Report Configuration Metadata

In Softa, reports are categorized into data reports, file reports, and visual reports. The definition of each report type requires metadata to define the structured information of the report, including report layout, data sources, field information, filter conditions, sorting rules, grouping strategies, and display styles. Report metadata allows flexible design and generation of various reports to meet different business needs, enhancing report maintainability and scalability.

Additionally, during the development of Softa Pro-code, the underlying metadata engine is still relied upon.

## II. Configuration Over Code Implementation

In enterprise applications, personalized requirements are inevitable, but Softa strives to meet these needs through configuration. The design principle of prioritizing configuration allows for quick adaptation to changing business requirements, significantly improving system maintainability, scalability, and overall efficiency.

Softa is metadata-driven and encapsulates general system capabilities, allowing most business needs to be met through configuration. This includes not only model metadata and UI metadata, but also the configuration management of Flow metadata, data integration metadata, permission metadata, import/export metadata, and report metadata.

By leveraging these configurable metadata, the system can flexibly adjust business processes, data integration methods, permission control, data exchange, and report generation without modifying the code. This approach significantly shortens the development cycle, reduces maintenance costs, and enhances system adaptability.

## III. Configurable Data Migration

In enterprise business systems, it is common to deploy multiple environments, such as development, testing, UAT, and production environments. To ensure the consistency and accuracy of configuration data, the system must be capable of migrating configuration data between different environments. For example, when there is a requirement change or configuration change, users can configure and verify in the UAT environment, then migrate these configuration data to the production environment, rather than reconfiguring them in the production environment.

Configuration data migration can effectively avoid errors or omissions in configuration, ensuring uniform configuration across different environments and improving the efficiency and reliability of configuration management.

## IV. Data Change Traceability

The goal of data change traceability is to ensure that all data changes in a business system can be recorded and tracked. This aims to enhance system transparency and security, support auditing and compliance requirements, and enable quick identification and resolution of issues when they arise.

Softa achieves data change traceability through data change logs and user behavior analysis. Change logs record detailed information for each data modification, such as the content before and after the change, the time of change, the person who made the change, and the traceID (used to track all data changes resulting from a single user operation). This ensures that there is a reliable reference for troubleshooting and data auditing. User behavior analysis records and analyzes user actions within the system, helping to identify abnormal activities and optimize the user experience.

By tracing data changes, enterprises can ensure data integrity and accuracy, thereby enhancing the overall reliability and maintainability of the system.

## V. Monitoring Operational Status

A system needs to have the capability to monitor its operational status in real-time to ensure healthy operation and efficient maintenance. This capability encompasses both technical monitoring and business monitoring:

1. Technical Monitoring

    This focuses primarily on the underlying operational status of the system. By recording interface request logs, system operation logs, integrating request trace tracking, and exception tracking, the system can automatically notify developers when issues arise and assist them in quickly identifying the root causes of problems.

2. Business Monitoring

    This focuses on the execution progress and status of business processes, ensuring that each business step operates as expected. By monitoring key business indicators (such as order processing status, process efficiency, etc.), enterprises can promptly detect and address business anomalies, thereby improving operational efficiency.

## VI. Engine-First Implementation

An engine is a specialized software component or service designed to efficiently execute predefined logic and rules for specific tasks. The design principle of `engine-first implementation` emphasizes using various specialized engines to handle complex business processing tasks, enhancing system flexibility and scalability.

Softa incorporates specialized components such as a computation engine, process engine, rules engine, reporting engine, and template engine to encapsulate complex business logic and computational tasks.

1. Computation Engine

    Focuses on improving computational efficiency and ensuring the accuracy of computation results. It covers scenarios like high-precision numerical calculations and business logic expression evaluations.

2. Process Engine

    Focuses on efficiently managing and executing business processes. This includes automated business flows and workflows, where automated business flows can be further divided into event-triggered flows and scheduled task flows, and workflows include business processes like manual approvals.

3. Rules Engine

    Handles business rules and decision logic, enhancing the flexibility and maintainability of business logic through dynamic configuration and rule execution.

4. Reporting Engine

    Focuses on generating various business reports based on configuration rules. This includes online data reports, visual reports, and file reports for download and data exchange.

5. Template Engine

    Dynamically generates relevant documents by configuring display styles and data content in templates, such as email templates, message templates, web page templates, PDF templates, Word templates, Excel templates, and more.

## VII. User Experience First

The design principle of `User Experience First` emphasizes focusing on the needs and satisfaction of the end-user during the design and development of business systems, while also creating business value. This principle aims to provide an excellent user experience by enhancing user interaction, improving system usability, and continuously refining the system to ensure it is not only powerful but also comfortable and efficient for users.

Specific applications of the user experience first principle include the following key points:

1. Enhancing Search Box Capabilities with Integrated AI Interactive Search

    By incorporating intelligent recommendation results and innovative automatic field matching, users can experience more convenient and efficient search functionalities.

2. Compatibility with Simplicity and Flexibility

   Flexibility often leads to complexity. Softa strives to hide complexity within the system's underlying layers, offering simplified and professional versions of various configuration options. The system design enhances the builder experience, ensuring it meets the needs of simple operations while providing flexible configuration and expansion capabilities.

3. Continuous Evaluation and Analysis

   User behavior analysis helps understand how users interact with the system and identify their pain points, leading to data-driven optimization.

4. Continuous Iterative Improvement

   Constantly optimizing and updating system functions based on user feedback ensures the system can continuously adapt to changing user needs, improving user satisfaction and loyalty.

## VIII. Abstraction-First Design

The design principle of `Abstraction-First Design` emphasizes enhancing system flexibility, maintainability, and elegance by encapsulating and abstracting common methods and components. This principle leverages classic design methods such as object-oriented design, design patterns, SOLID principles, DRY principles, and modular design to establish robust abstractions and layered structures. Developers can easily add new features or modify existing ones without disrupting the overall system structure and stability, avoiding hard coding and code duplication, while improving code readability and development efficiency. This also enhances the overall stability and scalability of the system.

In the long run, `Abstraction-First Design` better supports efficient system expansion and innovation, providing a solid foundation for the continuous evolution of the system. This helps meet the ever-changing business requirements and technological advancements.

## IX. Sustainable Upgrade

The design principle of `Sustainable Upgrade` aims to address the challenges and pain points in system upgrade and maintenance. These pain points include the complexity of the upgrade process, business interruption risks, system compatibility issues, and data migration problems. To tackle these challenges, the `Sustainable Upgrade` design principle proposes a series of key strategies:

1. Standardized Metadata Structure

   By standardizing the metadata structure, the definitions of metadata and business configurations in the system can be made independent of code implementation. This ensures consistency and compatibility during the upgrade process, reducing potential data migration issues and compatibility conflicts, and enabling sustainable evolution of the system framework.

2. Composable Modular Services

   By dividing the general capabilities of the system into multiple independent starter modules, various starter modules can be combined to form a new service, creating composable modular services. These modules and services can be developed, tested, and deployed independently.

   The modular design of the system supports flexible expansion and iteration of technical components, reducing the complexity and risk of system upgrades. This allows the system to better adapt to the ever-changing business requirements and organizational scale.

## X. Supporting Legacy System Refactoring

This design principle focuses on addressing the numerous challenges modern enterprises face when maintaining and upgrading legacy systems. These legacy systems often contain a substantial amount of custom-developed business code and have accumulated extensive business data over time. Such systems typically have high maintenance costs, low scalability, and complex technical debt. To resolve these issues, the following methods and strategies are proposed:

1. Database Reverse Engineering (Re-Model)

   Through database reverse engineering, extract metadata information from the data tables of legacy systems, generating corresponding business model metadata and business data interfaces. This aids developers in understanding and analyzing the database structure of legacy systems, providing a crucial data foundation for refactoring.

2. Code Logic Reverse Engineering (Re-Implement)

   Code logic reverse engineering involves the metadata transformation of code logic. Using AI agents to analyze the source code of legacy systems, complete the business model metadata, and convert relevant code logic into configuration metadata such as Flow, Report, Import/Export, and Data Integration. Technical consultants then calibrate, test, and validate this.

3. Pro-Code Migration and Conversion

   For Pro-Code application scenarios, AI agents analyze the code logic of legacy systems, combine the reverse-engineered business model metadata, and generate metadata-driven Pro-Code, leveraging the advantages of the metadata-driven framework.

4. Supporting Mainstream Relational Databases

   Different applications in various enterprises might use different database systems, such as MySQL, PostgreSQL, Oracle, and SQL Server. Under the `Supporting Legacy System Refactoring` design principle, the framework must be compatible with mainstream relational databases, allowing flexible selection and connection of different database engines during refactoring.

   By encapsulating different database dialects, Softa supports the selection of the appropriate database engine based on the actual needs of the enterprise. This ensures that the new system can seamlessly access and operate data in the existing databases, facilitating more efficient data migration and conversion while enhancing system flexibility and adaptability.

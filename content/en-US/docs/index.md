## 1. Introduction to Softa
Softa is currently an open-source application development framework focused on creating enterprise-level applications. It encapsulates common requirements and features in the application development process. Following the principles of **Build in public, build in community**, Softa evolves based on transparent collaboration within user and technical communities. Simultaneously, it encourages users to contribute in diverse ways, aiming to collectively build an open-source ecosystem.

Softa is positioned to provide a comprehensive open-source solution for medium to large-scale enterprise business systems, addressing the shortcomings of existing open-source software in this domain. In the future, more business applications will be built on Softa, expanding its scope beyond a development framework.

## 2. Design Objectives

### 1. Focus on Efficiency and Productivity
Softa emphasizes enhancing the efficiency of business system development, user operation efficiency, and data productivity. It ensures users can accomplish tasks more efficiently through automated workflows, simplified user operations, and intuitive, fast, and seamless user experiences. AI designed elements are employed to provide a user-friendly experience. To address integration requirements between enterprise applications, configurable integration capabilities are provided to enhance integration delivery efficiency.

### 2. Security and Privacy Protection
Security is a core value of Softa. Throughout the entire development process, it adopts best security practices and technical measures, including fine-grained permission control, encryption of sensitive data, on-demand data desensitization in interfaces, user security policies, and change log auditing. This ensures that data is secure and reliable during access, transmission, and storage processes. Additionally, Softa emphasizes the importance of user personal privacy data, adhering to the GDPR (General Data Protection Regulation) to build user trust.

### 3. Flexibility and Scalability
Flexibility and scalability are crucial technical indicators in complex business application systems. Softa adopts a modular design, allowing independent maintenance and operation of system components, facilitating easy extension and upgrade. During feature development, industry best practices are incorporated through rational abstraction design, enhancing the system's configurability to meet specific requirements of different industries and enterprises of varying scales, thus increasing flexibility. An excellent technical architecture should support efficient business innovation, requirement changes, and reduce the probability of bugs.

## 3. Key Features
### 1. Metadata-Driven
Metadata is the underlying core data of Softa, and all CRUD operations require validation and processing through metadata. The scope of metadata includes model metadata, field metadata, interface metadata, and other technical configuration data. In complex business systems, version control of metadata is necessary, supporting migration and release between multiple environments (e.g., testing, UAT, pre-production, production).

### 2. Flow
Business systems rely on processes, and Softa uses the term Flow to represent generalized process scenarios. The built-in Flow in Softa provides automation of processing flows, business approval flows, scheduled task flows, and integrates AI capabilities and interactions within the processes.

### 3. OpenAPI
Softa provides standard OpenAPI interfaces with clear documentation. In the era of AI prevalence, the API design style aims to be **AI understandable API**, allowing assembly of complex query conditions based on semantic logic. Developers can easily identify services, business models, target methods, parameter types, and return values from API requests. Simultaneously, considering API independence and traceability, it meets monitoring requirements such as performance analysis and behavior analysis.

### 4. Security Controls
Softa places a strong emphasis on security. In terms of permission control, it employs the ABAC (Attribute-Based Access Control) mechanism for fine-grained control, allowing control down to the row-level and column-level (field-level), meeting the data access scope control needs based on complex business attribute conditions in medium to large enterprises. In field metadata, it allows on-demand configuration of sensitive data encryption, desensitization rules for sensitive data, and uses strong encryption algorithms. In terms of security policies, session expiration policies, password complexity, and other security rules can be configured as needed.

### 5. Data Integration
In modern enterprises, multiple information tools are often in use, and data integration is a common challenge and task for business systems. To avoid the pain points of custom development for data integration, Softa integrates data integration as a built-in capability, efficiently achieving system-to-system data integration through configurable means. It supports orchestration of internal and external interfaces, as well as common integration authentication mechanisms, providing a convenient and controllable data integration experience for enterprises.

### 6. Timeline Model
The timeline model is an effective solution for version control of business data in scenarios where tracking changes to business events is needed. Softa provides configurable capabilities for the timeline model, supporting date-based queries of valid data, insertion of timeline slices, updating and correcting historical slice data, providing robust support for version management of enterprise business data.

### 7. Multilingual Support
Multilingual support in Softa includes frontend multilingualism (user interface multilingualism), backend multilingualism (backend prompts, error messages, etc.), and business data multilingualism. Frontend and backend multilingualism are standard features, supporting the extension of new language types. When extending multilingual functionality, ensure consistency in the three types of language coding. This feature aims to provide users with broader language support, enhancing the system's internationalization capability.

### 8. Multiple Databases
As an enterprise-level application development framework, Softa is not bound to proprietary relational databases. By abstracting database dialects, Softa aims to support mainstream relational databases such as PostgreSQL, MySQL, etc., gradually expanding to support more databases based on project requirements. However, this rule does not affect Softa's use of other types of databases, such as ElasticSearch, Redis, in specific scenarios. This flexibility ensures the universality and adaptability of Softa, meeting the needs of different database environments.

### 9. Multi-Tenancy
Conventional multi-tenancy has various sharing modes. The isolation-first tenant model is supported through well-designed deployment architectures. To accommodate scenarios where Softa provides SaaS services with shared schemas for multi-tenancy, Softa provides a configuration switch to enable multi-tenancy. It's essential to note that this scenario is only applicable to standardized SaaS situations.

## 4. Conclusion
Softa will continue to maintain high transparency, actively listen to user feedback, and strive for continuous improvement and enhancement, aiming to become a reliable choice in the field of medium to large-scale enterprise-level applications. Looking forward to the continuous evolution and growth of Softa in next years.

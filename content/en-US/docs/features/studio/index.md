# Studio Module User Guide

This guide is for developers who use Studio to configure business applications. It explains how to create apps, design metadata, manage changes, preview code and DDL, release versions, and handle runtime environment drift from the Studio frontend.

## 1. What Studio Is

Studio is the design-time workbench for metadata-driven applications. It turns business objects, fields, views, navigations, option sets, and related configuration into publishable application metadata, then releases that metadata to target runtime systems through version and environment workflows.

Core Studio work includes:

- Managing Portfolios and Apps.
- Designing models, fields, indexes, option sets, views, and navigations under an App.
- Configuring field type defaults, database type mappings, code type mappings, code templates, and SQL templates.
- Tracking a publishable set of design changes through a WorkItem.
- Adding completed WorkItems to a Version, sealing the Version, and deploying it to Dev, Test, UAT, Prod, or other environments.
- Previewing changes, generated code, and DDL at the Model, WorkItem, Version, and Deployment levels.
- Comparing design-time metadata with runtime metadata, then importing runtime state or accepting runtime drift when needed.

## 2. Key Concepts

| Concept | Description |
| --- | --- |
| Portfolio | A project or product-line grouping used to organize multiple Apps. |
| App | A metadata application. After entering an App, the left navigation is scoped to that App and shows its Workbench, models, versions, environments, and deployments. |
| WorkItem | A unit of business change. Model, option set, view, and navigation changes that need to be released should be made under an in-progress WorkItem. |
| Version | An application version that aggregates completed WorkItems. Draft versions can still be adjusted. Sealed or Frozen versions can be deployed. |
| Env | A runtime environment such as DEV, TEST, UAT, or PROD. Deployment only shows enabled environments under the current App. |
| Deployment | One actual deployment record, including merged change content, table DDL, index DDL, execution status, and errors. |
| Drift | The difference between design-time and runtime metadata. It is used to detect manual runtime changes or to onboard an existing runtime system for the first time. |

## 3. Menu Structure

Studio is available from the `Studio` module in the left navigation.

### Portfolio & Apps

- `Apps`: Manage application definitions. The App detail page lets you maintain the app name, code, type, Portfolio, owner, status, database type, and package name.
- `Portfolios`: Manage Portfolios. A Portfolio can be set to Active or Archived.

### App Design

These pages depend on the currently selected App:

- `Workbench`: The change workbench for the current App. Use it to create and manage WorkItems, then enter metadata design pages from a WorkItem.
- `Environments`: Configure runtime environments, deployment endpoints, keys, and runtime drift checks for the current App.
- `Versions`: Create versions, seal, unseal, freeze, and start deployments.
- `Deployments`: View deployment records, deployment DDL, deployment status, errors, retry failed deployments, and cancel stuck deployments.

### App Metadata

These pages also depend on the current App:

- `Models`: Design business models, fields, indexes, table names, storage strategy, and runtime features.
- `Option Sets`: Maintain option sets and option items.
- `Views`: Configure model views, structure, default filters, and default ordering.
- `Navigations`: Configure runtime navigation structure and page entry points.

### Generation

These generation rule pages are usually maintained by platform developers or senior business developers:

- `Field DB Mapping`: Map field types to database column types.
- `Field Code Mapping`: Map field types to code property types.
- `Field Type Defaults`: Configure default values, lengths, and scales for field types.
- `Code Templates`: Configure code generation templates.
- `SQL Templates`: Configure SQL DDL generation templates.

## 4. Recommended Workflow

### 4.1 Create a Portfolio and App

1. Go to `Studio / Portfolios` and create a Portfolio.
2. Go to `Studio / Apps` and create an App.
3. Maintain the following fields on the App detail page:
   - `appName`: Application name.
   - `appCode`: Application code.
   - `portfolioId`: The owning Portfolio.
   - `databaseType`: Target database type.
   - `packageName`: Base package name used for code generation.
4. Click `Design App` on the App card to enter that App's Workbench.

App status:

- `Active`: The App is actively maintained.
- `Maintenance`: The App is under maintenance and can be activated again from the detail page.
- `Deprecated`: The App is deprecated.

### 4.2 Configure Environments

Open the current App's `Environments` page and create DEV, TEST, UAT, PROD, or other environments.

Important fields:

- `envType`: Environment type.
- `sequence`: Environment ordering.
- `active`: Whether the environment is enabled. The deployment dialog only shows enabled environments.
- `upgradeEndpoint`: Base URL of the target runtime system. The backend automatically appends the runtime metadata upgrade and export endpoints.
- `publicKey`: Generated by `Issue Key` and configured in the target runtime system.
- `currentVersionId`: The version currently deployed to this environment. It is maintained by the deployment workflow.

Recommended flow before the first remote deployment:

1. Click `Issue Key` on the environment detail page.
2. Configure the returned or stored public key in the corresponding runtime system as `system.runtime-public-key`.
3. Confirm that the runtime system can reach the Studio backend deployment callback URL.
4. Start deployment from a Version.

Note: `protectedEnv` and `autoUpgrade` are currently configuration fields, but the current deployment workflow does not enforce environment protection or automatic upgrade behavior. For production environments, follow your team's release governance.

### 4.3 Create a WorkItem and Start Designing

Open the current App's `Workbench`:

1. Create a WorkItem and fill in its name and description.
2. Keep the WorkItem in `InProgress` status.
3. From the WorkItem detail page, use the `Related Metadata` area to enter:
   - `Models`
   - `Option Sets`
   - `Views`
   - `Navigations`
4. Make the design changes that need to be released from those entry points.

All metadata changes that need to enter the release workflow should be made from the WorkItem detail page. This route carries the `workItemId`, and the frontend uses it as the change-tracking context so the backend can aggregate changes by WorkItem.

Common Workbench actions:

- `Done`: Complete the WorkItem and stop accumulating changes.
- `Add to Version`: Add the WorkItem to a Draft version.
- `Remove from Version`: Remove the WorkItem from its current Draft version.
- `Cancel`: Cancel the WorkItem.
- `Defer`: Defer the WorkItem.
- `Reopen`: Reopen a cancelled or deferred WorkItem.
- `Preview Changes`: View created, updated, and deleted records in this WorkItem, grouped by model.
- `Preview DDL`: Preview the DDL generated by this WorkItem.

### 4.4 Design Models

Open `Models` under a WorkItem to create or edit business models.

The model detail page has three tabs:

- `Model Info`: Maintain model name, label, table name, App, description, display field, search field, default order, ID strategy, storage type, data source, service name, soft delete, multi-tenancy, timeline, version lock, and related settings.
- `Fields`: Maintain model fields.
- `Indexes`: Maintain model indexes.

Important field configuration:

- `fieldName`: Field name used by code and metadata.
- `columnName`: Database column name.
- `fieldType`: Field type.
- `optionSetCode`: Option set code for option fields.
- `length` / `scale` / `defaultValue`: Length, scale, and default value.
- `relatedModel` / `relatedField` / `joinModel` / `joinLeft` / `joinRight`: Relation field configuration.
- `filters`: Filter conditions for relation fields.
- `widgetType`: Frontend widget type.
- `required` / `readonly` / `hidden`: Validation and display behavior.
- `translatable` / `encrypted` / `maskingType`: Translation, encryption, and masking behavior.

The model detail page provides:

- `Preview DDL`: Preview the table and index DDL for this model.
- `Preview Code`: Preview generated code for this model. In the dialog, you can switch languages, browse the file tree, copy code, download the current file, download a ZIP for the selected language, or download one ZIP containing all languages.

### 4.5 Configure Option Sets, Views, and Navigations

`Option Sets` are used for enum-like business values:

- The option set maintains `name`, `optionSetCode`, `appId`, and description.
- Option items maintain `itemCode`, `itemName`, `sequence`, `parentItemCode`, `itemColor`, `active`, and description.

`Views` configure model views:

- Maintain the view name, code, model, type, and sequence.
- Maintain `structure`, `defaultFilter`, and `defaultOrder` in the configuration area.
- Optionally set `navId`, `publicView`, and `defaultView`.

`Navigations` configure runtime navigation:

- Maintain the navigation name, code, type, related model, parent navigation, description, and filter conditions.

### 4.6 Preview Changes and DDL

Studio supports preview at multiple stages:

- Model detail page: Preview DDL and generated code for a single model.
- WorkItem detail page: Preview accumulated metadata changes and DDL for the WorkItem.
- Version detail page: Preview aggregated metadata changes and DDL for the Version.
- Deployment detail page: View the actual `mergedDdlTable` and `mergedDdlIndex` saved by this deployment.

Before go-live checks, prefer the Version and Deployment levels. The Model level is useful for quick checks while developing a single model, and the WorkItem level is useful for checking whether a specific requirement's changes are complete.

### 4.7 Create Versions, Seal, and Deploy

Open the current App's `Versions` page:

1. Create a Version and select `versionType`:
   - `Normal`: Regular release version.
   - `Hotfix`: Emergency patch version.
2. Return to Workbench and add completed WorkItems to the Draft version by using `Add to Version`.
3. On the Version detail page, click `Preview Changes` and `Preview DDL` for pre-release review.
4. Click `Seal Version`. After sealing, the backend aggregates WorkItem changes and computes `diffHash`.
5. If an issue is found after sealing and the Version has not been deployed, click `Unseal Version` to return it to Draft.
6. For a sealed or frozen Version, click `Deploy to Env`, select an enabled target environment, and confirm deployment.

Version status:

- `Draft`: Draft. WorkItems can be added or removed.
- `Sealed`: Sealed. It can be deployed and can be unsealed before deployment.
- `Frozen`: Frozen. It should no longer be modified.

Deployment is asynchronous. After deployment is initiated, the frontend creates a Deployment record. The final completion status is updated later when the target runtime system calls back to Studio.

### 4.8 View Deployment Records

Open the current App's `Deployments` page:

- The list shows deployment records in descending creation time.
- The `General` tab on the detail page shows source version, target version, target environment, deployment status, operator, and duration.
- The `Content` tab shows merged metadata content, table DDL, and index DDL.
- The `Version List` tab shows the versions merged into this deployment.
- The `Error` tab shows the failure reason.

When deployment status is `Failure`, click `Retry` to dispatch it again. When status is `Pending` or `Deploying` and the deployment is confirmed to be stuck, click `Cancel` to release the environment deployment lock.

Important limitation: `Cancel` does not automatically roll back DDL or data changes that have already been executed in the target runtime database. It only marks the deployment record as cancelled and releases the environment lock.

### 4.9 Handle Design-Time and Runtime Drift

Open the environment detail page to view the `Runtime Drift` panel.

Common actions:

- `Compare (cached)`: View the currently cached drift between design-time and runtime metadata.
- `Refresh Drift`: Asynchronously fetch runtime metadata again and recompute drift. The panel polls for status updates.
- `Apply Drift`: Accept the currently cached drift and overwrite design-time metadata with runtime content.
- `Import from Runtime`: Fetch runtime metadata again and overwrite design-time metadata with the current runtime content.

Usage guidance:

- When onboarding a system that already has runtime metadata, use `Import from Runtime`.
- If the runtime environment was manually fixed and you decide that runtime state should become the new design baseline, run `Refresh Drift`, review the drift, then run `Apply Drift`.
- Both `Apply Drift` and `Import from Runtime` rewrite design-time metadata. Before running either action, confirm that the target environment is the intended source of truth.

## 5. Generation Configuration

Code and DDL generation is based on Pebble templates. Template variables use the `{{ var }}` syntax.

### Code Templates

Code templates are loaded by `codeLang` and `sequence`. Each template can configure:

- `subDirectory`: Output subdirectory. Pebble expressions are supported.
- `fileName`: Output file name. Pebble expressions are supported, and the file name must include the expected suffix, such as `{{modelName}}Service.java`.
- `templateContent`: Template content.

If no code templates are configured in the database, the backend uses built-in classpath templates as a fallback.

### SQL Templates

SQL templates are loaded by `databaseType` and are used to generate CREATE TABLE, ALTER TABLE, index, and DROP TABLE SQL. Template authors mainly work with the model, field, and index diff context, so they do not need to read raw entities or calculate diffs manually.

### Mapping and Defaults

- `Field DB Mapping` determines which database column type is generated for each field type.
- `Field Code Mapping` determines which code property type is generated for each field type.
- `Field Type Defaults` determines the default length, scale, and default value for each field type.

After these configurations are adjusted, model code preview and DDL preview will reflect the new generation rules.

## 6. Pre-Release Checklist

Before release, confirm the following:

- All changes were made under the correct App.
- Model, option set, view, and navigation changes that need to be released all come from the correct WorkItem.
- The WorkItem's `Preview Changes` contains only changes for this requirement.
- The WorkItem's `Preview DDL` matches expectations.
- The Version contains all required WorkItems and does not include unrelated WorkItems.
- The Version's `Preview Changes` and `Preview DDL` have passed review.
- The target Env is enabled, and `upgradeEndpoint` is correct.
- After first deployment or key rotation, the target runtime system is configured with the latest public key.
- Before production deployment, the table DDL and index DDL in the Deployment have been reviewed.
- Before retrying or cancelling a failed deployment, the actual execution state of the target runtime system has been confirmed.

## 7. FAQ

### Why can't I see the metadata I just changed in the WorkItem?

Confirm that the change was made from the `Related Metadata` entry point on the WorkItem detail page. Only when the current route carries `workItemId` can the frontend send the WorkItem as the change-tracking context to the backend.

### Why does the Deploy to Env dialog show no target environments?

The deployment dialog only shows environments under the current App where `active = true`. Check whether the environment belongs to the current App and whether it is enabled.

### What is the difference between Compare (cached) and Refresh Drift?

`Compare (cached)` only reads the last computed drift. `Refresh Drift` asks the backend to asynchronously compare the design-time snapshot with runtime metadata again.

### How should I choose between Apply Drift and Import from Runtime?

Use `Apply Drift` when drift has already been refreshed and reviewed, and you decide to accept the cached runtime drift. Use `Import from Runtime` when initializing design-time metadata from an existing runtime system for the first time, or when you want to fetch runtime metadata again before overwriting design-time metadata.

### Is Cancel Deployment a rollback?

No. Cancel only releases a stuck environment deployment lock and marks the deployment record. It does not automatically undo DDL or data changes that have already been executed in the target runtime system.

### When should I view Model DDL versus Version or Deployment DDL?

Use Model DDL during development to inspect a single model. Before release, review Version DDL. After deployment, review `mergedDdlTable` and `mergedDdlIndex` on the Deployment detail page, because those are the final deployment artifacts saved for that deployment.

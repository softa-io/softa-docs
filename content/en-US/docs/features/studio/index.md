# Studio Module User Guide

This guide is for developers who use Studio to configure business applications. It explains how to create apps, design per-environment metadata, preview DDL, publish to runtimes, compare drift, merge designs between environments, and audit operations from the Studio frontend.

## 1. What Studio Is

Studio is the design-time IDE for metadata-driven applications. Each **environment** owns a full design workspace (models, fields, indexes, option sets, views, navigations). Publishing converges that design to the env's runtime. There is no separate version or deployment pipeline — the env's live design **is** the content you publish.

Core Studio work includes:

- Managing Apps.
- Designing models, fields, indexes, option sets, views, and navigations under an App (scoped by env on the backend).
- Configuring field domains, database type mappings, and SQL templates.
- Binding environments to Softa runtimes or raw JDBC targets, issuing signing keys, and publishing design to runtime.
- Comparing design-time metadata with runtime metadata, applying drift, seeding empty envs, and merging designs between envs.
- Reviewing the immutable audit trail (`DesignActivity`) and restoring from snapshots when needed.

## 2. Key Concepts

| Concept | Description |
| --- | --- |
| App | A metadata application. After entering an App, the left navigation is scoped to that App and shows its models, environments, activities, and related design pages. |
| Env | A deployment environment (DEV, TEST, UAT, PROD, …). Each env owns its own design workspace and connects to one runtime (Softa or JDBC). |
| Design workspace | The per-env set of `DesignModel`, `DesignField`, `DesignOptionSet`, etc. rows keyed by `envId`. |
| Publish | Converge the env's current design to its runtime (`POST /DesignAppEnv/publish`). Recorded as a `DesignActivity` of kind `Publish`. |
| Snapshot | A post-operation capture of the env's design. Linked from `DesignActivity.snapshotId` and used by `restore`. |
| Activity | Immutable audit record for Publish / Import / Reverse / Merge operations against an env. |
| Drift | Difference between design-time metadata and runtime metadata. Computed on demand — there is no cached drift row. |
| Field domain | Reusable field attribute template (`DesignFieldDomain`) applied once to a field via `applyDomain`. |

## 3. Menu Structure

Studio is available from the `Studio` module in the left navigation.

### Apps

- `Apps`: Manage application definitions (name, code, type, owner, status, package name).

### App Metadata

These pages depend on the currently selected App:

- `Models`: Design business models, fields, and indexes.
- `Option Sets`: Maintain option sets and option items.
- `Views`: Configure model views, structure, filters, and ordering.
- `Navigations`: Configure runtime navigation structure and page entry points.

### Release

- `Environments`: Configure runtime connectors, signing keys, drift, publish, seed, and merge for each env.
- `Activities`: Audit trail of publish / import / reverse / merge runs with change sets and snapshots.

### Generation

Platform-level generation rules (not scoped to a single App):

- `Field Domains`: Reusable field type + widget + default templates.
- `Field DB Mapping`: Map field types to database column types per database.
- `SQL Templates`: SQL DDL generation templates per database type.

## 4. Recommended Workflow

### 4.1 Create an App

1. Go to `Studio / Apps` and create an App.
2. Maintain `appName`, `appCode`, `appType`, `ownerId`, and `status`.
3. Select the App in the workspace picker to enter App-scoped design pages.

App status:

- `Active`: The App is actively maintained.
- `Maintenance`: Under maintenance; can be re-activated from the detail page.
- `Deprecated`: No longer maintained.

### 4.2 Configure Environments

Open the current App's `Environments` page and create DEV, TEST, UAT, PROD, or other environments.

Important fields:

- `envType`: Environment type (DEV / TEST / UAT / PROD).
- `envStatus`: Mutex status (`Stable`, `Deploying`, `Importing`, `Merging`). Read-only in the UI — publish / import / merge acquire it.
- `sequence`: Display ordering on the board and table views.
- `active`: Whether the environment is enabled.
- `protectedEnv`: When true, the env refuses deletion.
- `databaseType`: Target database flavor for DDL rendering.
- `connectorType`: `Softa` (signed upgrade API) or `JDBC` (raw connection).
- `upgradeEndpoint`: Base URL of the Softa runtime (required when `connectorType = Softa`).
- `jdbcUrl` / `jdbcUsername` / `jdbcPassword`: JDBC connection (when `connectorType = JDBC`).
- `publicKey`: Issued by `Issue Key` and configured in the target runtime as `system.metadata.public-key`.
- `autoExecuteDDL`: Whether publish should execute rendered DDL automatically (connector-dependent).

Recommended flow before the first publish to a Softa runtime:

1. Click `Issue Key` on the environment detail page.
2. Configure the returned public key in the runtime.
3. Confirm network reachability between Studio and the runtime upgrade endpoint.
4. Design metadata under the env's workspace, then click `Publish`.

To bootstrap an empty env from an existing one: use `Seed from Environment` (idempotent — skipped when the target already owns design rows).

### 4.3 Design Models

Open `Models` under the current App to create or edit business models.

The model detail page has three tabs:

- `Model Info`: Model name, label, table name, app/env scope, display/search fields, default order, ID strategy, storage, soft delete, multi-tenancy, timeline, version lock, and related settings.
- `Fields`: Model fields (including relations, domains, on-delete strategy, data protection).
- `Indexes`: Model indexes.

Important field configuration:

- `fieldName` / `columnName`: Logical and physical names.
- `fieldType` / `optionSetCode` / `length` / `scale` / `defaultValue`: Type and constraints.
- `domainId`: Provenance of a one-time domain template apply (not a live binding).
- `relatedModel` / `relatedField` / `onDelete` / `relatedFieldType`: Relation configuration (`relatedFieldType` is system-computed, read-only).
- `renamedFrom`: Immediately prior name after a declared rename (read-only).
- `widgetType`, validation, encryption, and masking fields: Display and access behavior.

The model detail toolbar provides `Preview DDL` for table and index SQL of this model.

### 4.4 Configure Option Sets, Views, and Navigations

Option sets for enum-like values, views for model presentation, navigations for runtime menu structure. These are design-time only until the publish sweep model expands to include them.

### 4.5 Publish Design to Runtime

On the environment detail page:

1. Review drift via the `Runtime Drift` panel or `View Drift Report`.
2. Click `Publish` to converge the env's design to its runtime.
3. Track the operation on `Activities` (kind `Publish`, status `Running` → `Success` / `Failure`).

The env mutex must be `Stable` before publish starts. Concurrent operations against the same env are refused.

### 4.6 Handle Design-Time and Runtime Drift

The environment detail page shows a `Runtime Drift` panel at the top. Drift is computed on demand by `GET /DesignAppEnv/compareDesignWithRuntime` — click **Check now** to refresh.

Toolbar actions:

- `View Drift Report`: Open the detailed model / field / index level diff dialog.
- `Apply Drift`: Overwrite the design workspace with the current runtime state (drift repair or first-time import from an existing runtime).
- `Seed from Environment`: Clone a source env's full design into an empty target env.
- `Merge from Environment`: Overwrite-style converge of the target env's design from a source env (runtime unaffected until the next publish).
- `Issue Key`: Generate or rotate the Ed25519 keypair for Softa connector signing.

Usage guidance:

- When onboarding a system that already has runtime metadata, open the drift report, review, then run `Apply Drift`.
- When standing up a new env that should match an existing env's design, use `Seed from Environment`.
- When promoting design between envs without touching runtimes yet, use `Merge from Environment`, then publish each env separately when ready.
- Both `Apply Drift` and merge/seed rewrite design-time metadata. Confirm the source of truth before running destructive actions.

### 4.7 Review and Restore Activities

Open `Activities` under the current App:

- The list shows operations in descending id order (kind, status, env, source env, timestamps).
- The detail page shows the change set JSON, rendered DDL detail (publish only), error message, and linked snapshot id.
- `Retry Publish`: Re-publish the env for a failed publish activity.
- `Cancel`: Release a stuck `Running` publish and the env mutex (no automatic runtime rollback).
- `Restore`: Roll forward — restore design from the activity's snapshot, then publish to converge the runtime.

## 5. Generation Configuration

DDL generation is based on Pebble SQL templates and field DB mappings.

### Field Domains

Named, reusable templates (`fieldType`, `widgetType`, `length`, `scale`, `defaultValue`). Apply to a field through the backend `POST /DesignField/applyDomain` API (one-time copy — not a live binding).

### SQL Templates

Loaded by `databaseType` and used to generate CREATE TABLE, ALTER TABLE, index, and DROP TABLE SQL.

### Field DB Mapping

Determines which database column type is generated for each field type.

After these configurations are adjusted, model DDL preview will reflect the new generation rules.

## 6. Pre-Release Checklist

Before publishing to production, confirm:

- All changes belong to the correct App and env workspace.
- Model / option set changes have been reviewed via drift report or peer review.
- Target env `connectorType`, endpoints, and credentials are correct.
- After first publish or key rotation, the runtime carries the latest public key.
- Rendered DDL from publish activities has been reviewed when `autoExecuteDDL` is enabled.
- You know how to `Restore` from a snapshot if a merge or apply drift went wrong.

## 7. FAQ

### Why don't I see Workbench, Versions, or Deployments?

Studio 2.0 removed the WorkItem → Version → Deployment pipeline. Design is env-scoped; publish + activities + snapshots replace versioned deployments.

### Why was Refresh Drift removed?

Drift is computed on demand. Use **Check now** on the drift panel or **Refresh** inside the drift report dialog instead of a separate cache refresh RPC.

### What is the difference between Apply Drift and Seed from Environment?

`Apply Drift` reads the env's live runtime and inverts differences onto the design workspace. `Seed from Environment` clones another env's design rows into an empty target env (no runtime contact).

### Is Cancel on an activity a database rollback?

No. Cancel releases a stuck env mutex and marks the activity canceled. Runtime changes already applied stay applied.

### When should I use Merge vs Publish?

`Merge` only changes design metadata between envs. `Publish` pushes an env's design to its runtime. Typical promotion: merge DEV → TEST design, review, then publish TEST.

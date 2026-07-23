# Flow Editor

Framework-layer visual editor and viewer for softa flow-starter definitions, built on `@xyflow/react` v12. It renders the design-time graph (`DesignFlowDefinition`), drives the full draft lifecycle (autosave with optimistic locking, validation diagnostics, publish/versioning, debug runs), and exposes a read-only canvas for instance monitoring. The authoritative backend contract is the flow-starter frontend editor API (`softa/starters/flow-starter/docs/frontend-editor-api.md`); this component implements it verbatim.

## Quick start

```tsx
// Editor page (always the SSR-safe lazy entry — xyflow measures the DOM):
import { FlowDesignerLazy } from "@/components/flow/flow-designer-lazy";

<FlowDesignerLazy designId={designId} toolbarExtra={<BackButton />} />

// Read-only render of a published snapshot with a run-state overlay:
import { FlowViewer, useInstanceOverlay } from "@/components/flow";

const { overlay, trace } = useInstanceOverlay(instanceId);
<FlowViewer definition={bundleDetail.design!} overlay={overlay} />
```

## Public API

| Export | Purpose |
| --- | --- |
| `FlowDesigner` / `FlowDesignerLazy` | Self-contained designer: palette, canvas, property panel, toolbar, autosave, 470 conflict dialog, validation diagnostics, publish dialog, version history, debug runs. `FlowDesignerProps = { designId, readOnly?, toolbarExtra?, className? }`. Always mount the lazy entry from Next.js pages. |
| `FlowViewer` | Read-only canvas: `{ definition, overlay?, onNodeClick?, fitView?, className? }`. Render history/instances from the bundle's `?include=design` snapshot — the compiled graph drops `width`/`height`/`data`/`label` and cannot repaint faithfully. |
| `useInstanceOverlay(instanceId, { intervalMs?, enabled? })` | The runtime polling loop: overlay refetch (default 2.5s) plus incremental trace accumulation via `sinceSequence`; both stop automatically on terminal instance status. |
| `registerConfigControl(type, component)` | App-level extension seam for the property-panel control registry (see below). |
| `FlowPickerModelsProvider` / `DEFAULT_PICKER_MODELS` | Overrides the models behind `userPicker`/`deptPicker`/`rolePicker`/`positionPicker` (defaults: `UserAccount`/`DeptInfo`/`EmpRole`/`PositionInfo`), keeping the package model-agnostic. |
| `toReactFlow` / `fromReactFlow` | The pure adapter between backend `FlowGraphDocument` and xyflow state (see mapping rules). |
| `@/components/flow/types` | Full TS mirror of the backend DTO surface (wire enums are PascalCase string unions). |

## Backend contract mapping

Backend nodes carry `label`/`config`/`width`/`height` as top-level fields; xyflow keeps custom payload in `node.data`. `toReactFlow` hoists them into `data` on load, `fromReactFlow` extracts them back on save; everything else in `node.data` / `graph.metadata` / `definition.metadata` is compiler-ignored passthrough and survives the round trip untouched. Edge `conditionExpression` (conditions live on EDGES, AviatorScript `{{ expr }}`) maps to `edge.data.conditionExpression`. Node/edge ids are frontend-generated stable strings (`approval_k3x9q2` / `edge_p0m2aa`) — the server never mints or rewrites them. Rendered `measured` dimensions are persisted so historical snapshots repaint fully. Positions/viewport round to 2 decimals to kill float drag noise.

## Save / version / publish semantics

Structural changes bump a mutation counter (dirty = counter > savedCounter — no deep diffs); autosave debounces 2s, is single-flight with a watermark re-queue, and flushes on tab hide/unload. Every successful save adopts the returned draft `version` (optimistic lock). A 470 opens a blocking conflict dialog: Reload (adopt remote, drop local) or Overwrite (re-save local over the remote version) — no three-way merge. Publishing flush-saves, validates (errors block, warnings advise), then `POST /{id}/publish`; publish bumps the draft version, so the draft is reloaded afterwards. The History sheet lists bundles; Activate switches the runtime revision without touching the draft, Restore overwrites the draft canvas with a snapshot.

## Validation diagnostics

Three layers per the contract: local (RHF required/min, descriptor-port connection rules, local cycle detection) → debounced 2s server validation of the in-memory document → mandatory all-green gate before publish. `CompileDiagnostic`s anchor to nodes (count badge), edges (red stroke), or panel fields; the bottom diagnostics drawer clicks through to select and center the anchor. Contract behavior worth knowing: while structural errors exist the server suppresses semantic checks — fix structure first, then semantic diagnostics appear.

## Property panel & control registry

The panel is descriptor-driven: `GET /flow/nodeDescriptors` supplies `configSchema` per node type (deployment-dependent — never hardcoded), rendered through a control registry keyed by the contract's control-type vocabulary: `string number boolean enum expression keyValueMap fieldMapping filters orders model variableRef userPicker deptPicker rolePicker positionPicker flowPicker nodeId approverSource approvalTimeout fieldPermissionMap`. `depends` gives strict-equality conditional visibility (hidden fields keep their values); `sourceField` feeds model-driven controls (`fieldMapping`/`filters`/`orders` read the sibling model). `filters`/`orders` reuse the framework `FilterBuilder`/`OrderBuilder` via a synthesized `MetaField`. `approverSource` recurses into the registry for its per-source nested fields; switching the source type resets the object. Unknown control types render a visible non-crashing fallback. Expression controls use CodeMirror with variable autocompletion from `GET /{id}/availableVariables` plus a debounced `GET /toolkit/validateExpression` syntax check.

## Debug runs & overlays

Debug Run compiles the last SAVED draft and executes it for real — NOT a sandbox: records are written, mail/SMS is sent, approval tasks reach real inboxes (the dialog warns accordingly). While a session is open the canvas locks read-only, nodes paint their run state (Completed / WaitingApproval / WaitingTimer / WaitingAsync / Failed), and the incremental trace streams below the canvas. The same overlay contexts power `FlowViewer`, so monitor pages get identical painting for free.

## Undo / redo

Graph-only snapshot history (cap 50): node/edge add/remove/move, connects, label/config/edge edits, and auto-layout are undoable via toolbar or Cmd/Ctrl+Z (Shift for redo); flow-level settings (name, trigger, flags) are deliberately excluded. History resets on load/reload/restore.

## Theming & density

`styles/flow-theme.css` maps xyflow's `--xy-*` variables onto the project palette (only theme variables, no literal colors — dark mode flips automatically). Node/edge/panel visuals use density tokens (`--ds-*`/`--ui-*`); category accents map to `chart-*` palette slots.

## Known limitations

`availableVariables` reads the last saved draft, so new upstream variables appear in autocompletion after one autosave tick. `HumanTask`/`ForEach` are palette-absent until the backend implements them (descriptor-driven). Undo covers the graph only. No collaborative editing — 470 offers reload/overwrite, not merge. Form bindings (`definition.forms`) are carried through saves but have no editor UI yet (no backend form system).

## Testing

Pure logic is unit-tested in `tests/flow-*.test.ts`: graph adapter round-trips, id generation, connection rules (ports + cycles), configSchema→zod, dagre coordinate conversion, and diagnostics normalization. Interactive flows are covered by the flow module's Playwright smokes.

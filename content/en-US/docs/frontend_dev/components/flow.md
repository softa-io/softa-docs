# Flow Editor

Framework-layer visual editor and viewer for softa flow-starter definitions, built on `@xyflow/react` v12. It renders the design-time graph (`DesignFlowDefinition`), drives the full draft lifecycle (autosave with optimistic locking, validation diagnostics, publish/versioning, debug runs), and exposes a read-only canvas for instance monitoring. The authoritative backend contract is the flow-starter frontend editor API (`softa/starters/flow-starter/docs/frontend-editor-api.md`); this component implements it verbatim.

## Quick start

```tsx
// Editor page (always the SSR-safe lazy entry — xyflow measures the DOM):
import { FlowDesignerLazy } from "@/components/flow/flow-designer-lazy";

<FlowDesignerLazy flowId={flowId} toolbarExtra={<BackButton />} />

// Read-only render of a published snapshot with a run-state overlay:
import { FlowViewer, useInstanceOverlay } from "@/components/flow";

const { overlay, trace } = useInstanceOverlay(instanceId);
<FlowViewer definition={bundleDetail.design!} overlay={overlay} />
```

## Public API

| Export | Purpose |
| --- | --- |
| `FlowDesigner` / `FlowDesignerLazy` | Self-contained designer: palette, canvas, property panel, toolbar, autosave, 470 conflict dialog, validation diagnostics, publish dialog, version history, debug runs. `FlowDesignerProps = { flowId, readOnly?, toolbarExtra?, className? }`. Always mount the lazy entry from Next.js pages. |
| `FlowViewer` | Read-only canvas: `{ definition, overlay?, onNodeClick?, fitView?, className? }`. Render history/instances from the bundle's `?include=design` snapshot — the compiled graph drops `width`/`height`/`data`/`label` and cannot repaint faithfully. |
| `useInstanceOverlay(instanceId, { intervalMs?, enabled? })` | The runtime polling loop: overlay refetch (default 2.5s) plus incremental trace accumulation via `sinceSequence`; both stop automatically on terminal instance status. |
| `registerConfigControl(type, component)` | App-level extension seam for the property-panel control registry (see below). |
| `FlowPickerModelsProvider` / `DEFAULT_PICKER_MODELS` | Overrides the models behind `userPicker`/`deptPicker`/`rolePicker`/`positionPicker` (defaults: `UserAccount`/`DeptInfo`/`EmpRole`/`PositionInfo`), keeping the package model-agnostic. |
| `toReactFlow` / `fromReactFlow` | The pure adapter between backend `FlowGraphDocument` and xyflow state (see mapping rules). |
| `@/components/flow/types` | Full TS mirror of the backend DTO surface (wire enums are PascalCase string unions). |

## Backend contract mapping

Backend nodes carry `label`/`config`/`width`/`height` as top-level fields; xyflow keeps custom payload in `node.data`. `toReactFlow` hoists them into `data` on load, `fromReactFlow` extracts them back on save; everything else in `node.data` / `graph.metadata` / `definition.metadata` is compiler-ignored passthrough and survives the round trip untouched. Conditions live on EDGES, one of two kinds: `condition` (a rule, the platform Filters JSON) and `conditionExpression` (AviatorScript); each maps to the same key in `edge.data`, and an empty one is dropped on save. Node/edge ids are frontend-generated stable strings (`approval_k3x9q2` / `edge_p0m2aa`) — the server never mints or rewrites them. Rendered `measured` dimensions are persisted so historical snapshots repaint fully. Positions/viewport round to 2 decimals to kill float drag noise.

## Save / version / publish semantics

Structural changes bump a mutation counter (dirty = counter > savedCounter — no deep diffs); autosave debounces 2s, is single-flight with a watermark re-queue, and flushes on tab hide/unload. Every successful save adopts the returned draft `version` (optimistic lock). A 470 opens a blocking conflict dialog: Reload (adopt remote, drop local) or Overwrite (re-save local over the remote version) — no three-way merge. Publishing flush-saves, validates (errors block, warnings advise), then `POST /{id}/publish`; publish bumps the draft version, so the draft is reloaded afterwards. The History sheet lists bundles; Activate switches the runtime revision without touching the draft, Restore overwrites the draft canvas with a snapshot.

## Validation diagnostics

Three layers per the contract: local (RHF required/min, descriptor-port connection rules, local cycle detection — a connection they refuse is not drawn, and releasing it over the refused handle toasts the reason) → debounced 2s server validation of the in-memory document → mandatory all-green gate before publish. `CompileDiagnostic`s anchor to nodes (a ring — red for an error, amber for a warning, outranked by the selection ring — plus a count badge), edges (the stroke in the same tones), or panel fields; the bottom diagnostics drawer clicks through to select and center the anchor. The server validation runs 2s after an edit, so an untouched draft shows its diagnostics once edited or on Validate. A node the Start cannot reach is an error (`UNREACHABLE_NODE`): it would never run, and a parallel join it feeds would wait for it forever — the draft still saves, only publishing is blocked. Contract behavior worth knowing: while structural errors exist the server suppresses semantic checks — fix structure first, then semantic diagnostics appear.

## Inserting nodes

Hovering or selecting a connection shows a + at its middle (beside its chip when it has one); it opens the node types that can go into a connection — the palette's groups without the Start and End (`canvas/palette/node-type-picker.tsx`) — and inserts the one picked (`insertNodeOnEdge`). The connection keeps its id, label and condition and now ends at the new node, because a condition belongs to the branch leaving the source and a gateway's routing config names its outgoing edges by id; a fresh, unconditioned edge carries on to the old target (`lib/node-insertion.ts` `splitEdge`). The node takes the column of the branch it joins — the target's under a split, the source's above a merge — with a rank gap on each side; when the target sits too close, it and everything downstream of it move down and nothing else does (`placeInsertedNode`). A palette node dropped on a connection is inserted the same way, the connection highlighted while the drag is over it. A connection dragged from an output and released on empty canvas opens the same menu, End included, and creates the picked node there, already connected, its input at the release point (`addConnectedNode`); an output that takes no more connections says why instead. Each is one undo step and selects the new node. The + and the drop highlight come from `store/canvas-editing-context.tsx`, which only the editable canvas supplies, so the read-only viewer shows neither.

## Property panel & control registry

The panel is descriptor-driven: `GET /flow/nodeDescriptors` supplies `configSchema` per node type (deployment-dependent — never hardcoded), rendered through a control registry keyed by the contract's control-type vocabulary: `string number boolean enum expression keyValueMap fieldMapping filters orders model variableRef userPicker deptPicker rolePicker positionPicker flowPicker nodeId approverSource approvalTimeout fieldPermissionMap`. `depends` gives strict-equality conditional visibility (hidden fields keep their values); `sourceField` feeds model-driven controls (`fieldMapping`/`filters`/`orders` read the sibling model). `filters`/`orders` reuse the framework `FilterBuilder`/`OrderBuilder` via a synthesized `MetaField`. `approverSource` recurses into the registry for its per-source nested fields; switching the source type resets the object. Unknown control types render a visible non-crashing fallback. Expression controls use CodeMirror with variable autocompletion from `GET /{id}/availableVariables` plus a debounced `GET /toolkit/validateExpression` syntax check.

A connection's form edits its label and its condition, as a **Rule** or an **Expression**. A rule is built with the framework's `FilterBuilder` over the model of the record the flow starts on (a Submit / Entity Change / Field Change trigger), offered only the record fields the backend lists for the edge (`Trigger` variables of `availableVariables?nodeId=<source>&afterNode=true`, to-many relations left out); the backend judges it like a field condition. An expression is the CodeMirror editor with the variables the edge sees, the source node's own outputs included. An edge holds one kind: switching with a condition in place asks first, then clears it. On the canvas a rule reads in the model's terms — field labels, option labels, record names — through the list filter's preview, and in its stored terms until the metadata arrives.

With nothing selected on the canvas the panel shows Flow Settings: the scenario, read-only, and the settings that scenario takes (`lib/scenario-rules.ts`, mirroring the backend compile rules — a setting outside the scenario is neither shown nor saved). An approval flow sets its CC there (`panel/cc-rules-editor.tsx`): each rule's timing — on submit, approved, rejected — and its recipients, named people (`userPicker`) or found by a rule (the Approval descriptor's own `approverSource` control, so every source a step offers is offered here); approval nodes carry no CC of their own. The rows live in a local form, commit to the editor state as they change, and remount on every (re)load (`loadGeneration`).

## Debug runs & overlays

Debug Run compiles the last SAVED draft and executes it for real — NOT a sandbox: records are written, mail/SMS is sent, approval tasks reach real inboxes (the dialog warns accordingly). While a session is open the canvas locks read-only, nodes paint their run state (Completed / WaitingApproval / WaitingTimer / WaitingAsync / Failed), and the incremental trace streams below the canvas. The same overlay contexts power `FlowViewer`, so monitor pages get identical painting for free.

## Undo / redo

Graph-only snapshot history (cap 50): node/edge add/remove/move, inserts, connects, label/config/edge edits, and auto-layout are undoable via toolbar or Cmd/Ctrl+Z (Shift for redo); flow-level settings (name, trigger, flags) are deliberately excluded. A config commit that changes nothing — the panel's form re-committing as a node opens in it — is no edit: it takes no step and leaves the draft clean. History resets on load/reload/restore.

## Theming & density

`styles/flow-theme.css` maps xyflow's `--xy-*` variables onto the project palette (only theme variables, no literal colors — dark mode flips automatically). Node/edge/panel visuals use density tokens (`--ds-*`/`--ui-*`); category accents map to `chart-*` palette slots. Every edge ends in an arrowhead that `FlowEdge` draws as its own marker rather than through xyflow's `markerEnd`, whose markers are one fixed color shared by all edges; the theme colors it with its line — default, diagnostic (the edge overrides `--xy-edge-stroke`), selected or focused.

## Known limitations

`availableVariables` reads the last saved draft, so new upstream variables appear in autocompletion after one autosave tick. `HumanTask`/`ForEach` are palette-absent until the backend implements them (descriptor-driven). Undo covers the graph only. No collaborative editing — 470 offers reload/overwrite, not merge. Form bindings (`definition.forms`) are carried through saves but have no editor UI yet (no backend form system).

## Testing

Pure logic is unit-tested in `tests/flow-*.test.ts`: graph adapter round-trips, id generation, connection rules (ports + cycles), node insertion (edge split, placement), configSchema→zod, dagre coordinate conversion, and diagnostics normalization. Interactive flows are covered by the flow module's Playwright smokes.

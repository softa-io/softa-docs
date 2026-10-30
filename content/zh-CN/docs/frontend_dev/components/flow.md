# Flow Editor

面向 softa flow-starter 流程定义的框架层可视化编辑器与查看器，基于 `@xyflow/react` v12 构建。它渲染设计态图（`DesignFlowDefinition`），驱动完整的草稿生命周期（带乐观锁的自动保存、校验诊断、发布/版本化、调试运行），并为实例监控提供只读画布。权威后端契约是 flow-starter 前端编辑器 API（`softa/starters/flow-starter/docs/frontend-editor-api.md`）；本组件逐条实现该契约。

## 快速开始

```tsx
// Editor page (always the SSR-safe lazy entry — xyflow measures the DOM):
import { FlowDesignerLazy } from "@/components/flow/flow-designer-lazy";

<FlowDesignerLazy flowId={flowId} toolbarExtra={<BackButton />} />

// Read-only render of a published snapshot with a run-state overlay:
import { FlowViewer, useInstanceOverlay } from "@/components/flow";

const { overlay, trace } = useInstanceOverlay(instanceId);
<FlowViewer definition={bundleDetail.design!} overlay={overlay} />
```

## 公共 API

| 导出 | 用途 |
| --- | --- |
| `FlowDesigner` / `FlowDesignerLazy` | 自包含的设计器：组件面板、画布、属性面板、工具栏、自动保存、470 冲突对话框、校验诊断、发布对话框、版本历史、调试运行。`FlowDesignerProps = { flowId, readOnly?, toolbarExtra?, className? }`。在 Next.js 页面中始终挂载 lazy 入口。 |
| `FlowViewer` | 只读画布：`{ definition, overlay?, onNodeClick?, fitView?, className? }`。渲染历史/实例时使用 bundle 的 `?include=design` 快照——编译后的图会丢弃 `width`/`height`/`data`/`label`，无法忠实重绘。 |
| `useInstanceOverlay(instanceId, { intervalMs?, enabled? })` | 运行时轮询循环：overlay 刷新（默认 2.5s）加经 `sinceSequence` 的增量 trace 累积；实例进入终态后二者自动停止。 |
| `registerConfigControl(type, component)` | 属性面板控件注册表的应用级扩展缝（见下文）。 |
| `FlowPickerModelsProvider` / `DEFAULT_PICKER_MODELS` | 覆写 `userPicker`/`deptPicker`/`rolePicker`/`positionPicker` 背后的模型（默认 `UserAccount`/`DeptInfo`/`EmpRole`/`PositionInfo`），保持组件包与模型解耦。 |
| `toReactFlow` / `fromReactFlow` | 后端 `FlowGraphDocument` 与 xyflow 状态之间的纯函数适配器（映射规则见下文）。 |
| `@/components/flow/types` | 后端 DTO 面的完整 TS 镜像（wire 枚举为 PascalCase 字符串联合）。 |

## 后端契约映射

后端节点把 `label`/`config`/`width`/`height` 作为顶层字段携带；xyflow 把自定义载荷放在 `node.data`。`toReactFlow` 在加载时把它们提升进 `data`，`fromReactFlow` 在保存时提取回去；`node.data` / `graph.metadata` / `definition.metadata` 中的其余内容是编译器忽略的透传数据，往返过程原样保留。条件挂在**边**上，分两种：`condition`（规则，平台 Filters JSON）和 `conditionExpression`（AviatorScript），各自映射到 `edge.data` 的同名键，空的那种在保存时丢弃。节点/边 id 由前端生成且稳定（`approval_k3x9q2` / `edge_p0m2aa`）——服务端从不铸造或改写它们。渲染出的 `measured` 尺寸会持久化，历史快照可完整重绘。位置/视口保留两位小数，消除拖拽的浮点噪声。

## 保存 / 版本 / 发布语义

结构性变更递增一个 mutation 计数器（脏 = 计数 > 已保存计数——没有深度 diff）；自动保存 2s 防抖、单飞加水位重排队，并在标签页隐藏/卸载时冲刷。每次成功保存都采纳返回的草稿 `version`（乐观锁）。470 打开阻塞式冲突对话框：Reload（采纳远端、丢弃本地）或 Overwrite（用本地覆盖远端版本）——不做三方合并。发布先冲刷保存、再校验（错误阻断、警告提示），然后 `POST /{id}/publish`；发布会递增草稿版本，因此发布后重新加载草稿。History 抽屉列出 bundle；Activate 切换运行时修订而不动草稿，Restore 用快照覆盖草稿画布。

## 校验诊断

按契约分三层：本地（RHF required/min、描述符端口连接规则、本地环检测——规则拒绝的连线不会画出，在被拒的连接点上松手时以提示说明原因）→ 2s 防抖的服务端内存文档校验 → 发布前强制全绿门。`CompileDiagnostic` 锚定到节点（外圈描边——错误为红色、警告为琥珀色，选中时让位于选中环——外加计数徽标）、边（描边用同样的颜色）或面板字段；底部诊断抽屉可点击穿透以选中并居中锚点。服务端校验在编辑后 2s 运行，因此未改动过的草稿要在编辑后或点 Validate 时才显示诊断。从开始节点走不到的节点是错误（`UNREACHABLE_NODE`）：它永远不会执行，而它连到的并行汇合会一直等它——草稿照常保存，只是不能发布。值得了解的契约行为：存在结构性错误时服务端抑制语义检查——先修结构，语义诊断随后出现。

## 插入节点

悬停或选中一条连线时，其中点（有标签时在标签旁）出现 +；点开列出能放进连线的节点类型——与节点面板相同的分组，但不含开始和结束节点（`canvas/palette/node-type-picker.tsx`）——所选类型插入这条连线（`insertNodeOnEdge`）。原连线保留其 id、标签和条件，改为指向新节点，因为条件属于从源节点出发的那条分支，而网关的路由配置按 id 引用其出边；另有一条不带条件的新连线接到原目标（`lib/node-insertion.ts` `splitEdge`）。新节点进入它所属分支的那一列——分叉下方对齐目标，汇合上方对齐源节点——上下各留一个层间距；目标离得太近时，目标及其下游整体下移，其他节点不动（`placeInsertedNode`）。从节点面板拖到连线上的节点按同样方式插入，拖动经过时该连线高亮。从节点出口拖出连线、在空白处松手，会弹出同一份类型列表（含结束节点），在松手处创建所选节点并连好线，其入口正好落在松手的位置（`addConnectedNode`）；出口已满时改为提示原因。每种插入都只占一步撤销，并选中新节点。+ 和拖放高亮来自 `store/canvas-editing-context.tsx`，只有可编辑画布提供它，所以只读视图两者都不显示。

## 属性面板与控件注册表

面板由描述符驱动：`GET /flow/nodeDescriptors` 按节点类型提供 `configSchema`（随部署而变——绝不硬编码），经由按契约控件类型词汇表键控的注册表渲染：`string number boolean enum expression keyValueMap fieldMapping filters orders model variableRef userPicker deptPicker rolePicker positionPicker flowPicker nodeId approverSource approvalTimeout fieldPermissionMap`。`depends` 提供严格相等的条件可见性（隐藏字段保留值）；`sourceField` 为模型驱动控件供数（`fieldMapping`/`filters`/`orders` 读取同级 model）。`filters`/`orders` 经合成的 `MetaField` 复用框架 `FilterBuilder`/`OrderBuilder`。`approverSource` 对各来源的嵌套字段递归走注册表；切换来源类型会重置对象。未知控件类型渲染可见的非崩溃兜底。表达式控件使用 CodeMirror，变量自动补全来自 `GET /{id}/availableVariables`，并有防抖的 `GET /toolkit/validateExpression` 语法检查。

连线的表单编辑其标签和条件，条件以**规则**或**表达式**两种方式之一给出。规则用框架 `FilterBuilder` 构建，作用于流程所基于记录的模型（Submit / Entity Change / Field Change 触发器），只提供后端为这条连线列出的记录字段（`availableVariables?nodeId=<源节点>&afterNode=true` 中的 `Trigger` 变量，不含一对多/多对多）；后端按字段条件的方式判定它。表达式用 CodeMirror 编辑器，变量包含源节点自身的输出。一条连线只能有一种条件：已有条件时切换会先确认，再清空它。画布上的规则以模型的说法显示——字段标签、选项标签、记录名称——与列表筛选的预览一致，元数据到达前以存储形式显示。

画布上什么都不选时，面板显示流程设置：只读的场景，以及该场景接受的设置（`lib/scenario-rules.ts`，与后端编译规则一致——场景之外的设置既不显示也不保存）。审批流在这里配置抄送（`panel/cc-rules-editor.tsx`）：每条规则选时机——提交时、通过后、驳回后——和接收人，指定的人（`userPicker`）或按规则查找（Approval 描述符自己的 `approverSource` 控件，步骤能用的来源这里都能用）；审批节点本身没有抄送配置。规则行保存在局部表单里，变化即提交到编辑器状态，并在每次（重新）加载时按 `loadGeneration` 重新挂载。

## 调试运行与覆盖层

Debug Run 编译**最后一次保存**的草稿并真实执行——不是沙箱：会写入记录、发送邮件/短信、审批任务进入真实收件箱（对话框有相应警示）。会话期间画布锁定只读，节点绘制运行状态（Completed / WaitingApproval / WaitingTimer / WaitingAsync / Failed），增量 trace 在画布下方流式展示。同一套 overlay 上下文也驱动 `FlowViewer`，监控页面免费获得一致的状态绘制。

## 撤销 / 重做

仅图形的快照历史（上限 50）：节点/边的增删移、插入、连线、label/config/边编辑与自动布局都可经工具栏或 Cmd/Ctrl+Z（Shift 重做）撤销；流程级设置（名称、触发器、开关）刻意排除。没有改变任何内容的配置提交——节点在面板中打开时表单的重新提交——不算编辑：不占撤销步骤，也不让草稿变脏。加载/重载/恢复时历史重置。

## 主题与密度

`styles/flow-theme.css` 把 xyflow 的 `--xy-*` 变量映射到项目调色板（只用主题变量、无字面颜色——暗色模式自动翻转）。节点/边/面板视觉使用密度 token（`--ds-*`/`--ui-*`）；类别强调色映射到 `chart-*` 调色板槽位。每条连线末端都有箭头：由 `FlowEdge` 自己绘制 marker，而不用 xyflow 的 `markerEnd`（其 marker 是所有连线共用的固定颜色）；主题让箭头与所在连线同色——默认、诊断（该边覆盖 `--xy-edge-stroke`）、选中或聚焦。

## 已知限制

`availableVariables` 读取最后保存的草稿，因此新的上游变量在一次自动保存后才出现在补全中。`HumanTask`/`ForEach` 在后端实现前不在面板中（描述符驱动）。撤销只覆盖图形。无协同编辑——470 提供 reload/overwrite 而非合并。表单绑定（`definition.forms`）随保存透传但尚无编辑 UI（后端暂无表单系统）。

## 测试

纯逻辑由 `tests/flow-*.test.ts` 单元测试覆盖：图适配器往返、id 生成、连接规则（端口 + 环）、节点插入（拆分连线、定位）、configSchema→zod、dagre 坐标转换、诊断归一化。交互流程由 flow 模块的 Playwright smoke 覆盖。

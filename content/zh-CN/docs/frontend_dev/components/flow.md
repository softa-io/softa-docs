# Flow Editor

面向 softa flow-starter 流程定义的框架层可视化编辑器与查看器，基于 `@xyflow/react` v12 构建。它渲染设计态图（`DesignFlowDefinition`），驱动完整的草稿生命周期（带乐观锁的自动保存、校验诊断、发布/版本化、试运行），并为实例监控提供只读画布。权威后端契约是 Flow 文档的[接口与数据](../../features/flow/api)（设计 API、节点描述符契约、前端图兼容性）；本组件逐条实现该契约。

## 快速开始

```tsx
// Editor page (always the SSR-safe lazy entry — xyflow measures the DOM):
import { FlowDesignerLazy } from "@/components/flow/flow-designer-lazy";

<FlowDesignerLazy flowId={flowId} toolbarStart={<BackButton />} />

// Read-only render of a published snapshot with a run-state overlay:
import { FlowViewer, useInstanceOverlay } from "@/components/flow";

const { overlay, trace } = useInstanceOverlay(instanceId);
<FlowViewer definition={bundleDetail.design!} overlay={overlay} />
```

## 公共 API

| 导出 | 用途 |
| --- | --- |
| `FlowDesigner` / `FlowDesignerLazy` | 自包含的设计器：组件面板、画布、属性面板、工具栏、自动保存、470 冲突对话框、校验诊断、发布对话框、版本历史、试运行。`FlowDesignerProps = { flowId, readOnly?, toolbarStart?, requestFormView?, className? }`（`toolbarStart`：放在流程名前面的页面控件，例如返回按钮；`requestFormView(modelName)`：审批流测试运行要填的表单，见下文「试运行与覆盖层」）。在 Next.js 页面中始终挂载 lazy 入口。 |
| `FlowViewer` | 只读画布：`{ definition, overlay?, onNodeClick?, fitView?, className? }`。渲染历史时使用 bundle 的 `?include=design` 快照，渲染实例时使用 `GET /flow/instances/{instanceId}/design`（经实例读取的同一份快照）——编译后的图会丢弃 `width`/`height`/`data`/`label`，无法忠实重绘。它自带 xyflow store（自己的 `ReactFlowProvider`），因此可以放在设计器内部（版本预览就是如此）而不影响设计器的画布。节点图标来自 `GET /flow/nodeDescriptors`，任何实例都不放行这个读取：显示画布的页面要在自己的某个权限里授予 `FLOW_CANVAS_READS`（`flow-endpoints.ts`）。漏掉时画布照样画出，但所有节点都用兜底图标，被拒的读取还会弹出全局的无权限提示。 |
| `FlowInstanceDiagram` / `FlowInstanceDiagramLazy` | 只凭实例 id 渲染的只读画布：实例所运行的设计（`GET /flow/instances/{instanceId}/design`）叠加 overlay，读一次，之后由右上角的刷新按钮再读——不轮询：审批只在有人操作时才变化。实例拒绝调用方时，就地显示「You don't have access to this approval's diagram」，不弹提示。用于在监控页之外展示实例（单据的审批面板）；lazy 入口让 xyflow 在渲染前不进入页面。两个读取都经实例放行：提交人、任务持有人，以及权限覆盖该实例（单据审批则覆盖该单据）的其他人；参与人对 bundle 本身没有权限。单据的审批面板只在调用方能打开的审批上（审批历史里的 `viewable`）给出 Flow 按钮：之前某次提交的审批人看得到正在进行的那次，但打不开它。 |
| `useInstanceOverlay(instanceId, { enabled?, meta? })` | 实例的运行状态 overlay 和 trace：读一次，调用 `refresh()` 时再读——等人处理的实例只在有人操作时才变化，所以不轮询。trace 经 `sinceSequence` 增量累积：每次从上次的位置接着取，读取进行中时调用的刷新排在它后面执行。`meta` 随这两个读取一起发出：自己解释拒绝的页面（实例详情页的「无权访问」）传 `suppressErrorToast: [403]`，免得每个读取再各弹一次提示；请传稳定的对象（模块常量），换一个新对象会重新拉取 trace。 |
| `TraceList` | 实例的 trace 列表，按时间先后排列，有新事件时滚到最新一条：`{ trace, nodeLabels?, className? }`。每个事件显示时间、按 `FlowTraceEventType` 选项集标签显示的事件类型（选项集加载前按类型名拆词显示）、发生的步骤——按 `nodeLabels`（设计里各节点的标签，以节点 id 为键，实例页会传入）显示标签，没有标签的节点显示 id——以及完整的消息；`FlowFailed` 事件标红。 |
| `registerConfigControl(type, component)` | 属性面板控件注册表的应用级扩展缝（见下文）。 |
| `FlowPickerModelsProvider` / `DEFAULT_PICKER_MODELS` | 覆写 `rolePicker`/`positionPicker` 背后的模型（默认 `Role`/`JobPosition`），保持组件包与模型解耦。`userPicker`/`deptPicker` 没有可覆写的模型：它们经共用的 `PeoplePicker`/`DepartmentPicker`（`src/components/directory/`）从 flow-starter 的目录（`/flow/directory/**`，由用到选择框的页面在自己的权限里授予，见 `src/components/directory/directory-endpoints.ts`）中选取。 |
| `toReactFlow` / `fromReactFlow` | 后端 `FlowGraphDocument` 与 xyflow 状态之间的纯函数适配器（映射规则见下文）。 |
| `@/components/flow/types` | 后端 DTO 面的完整 TS 镜像（wire 枚举为 PascalCase 字符串联合）。 |

## 后端契约映射

后端节点把 `label`/`config`/`width`/`height` 作为顶层字段携带；xyflow 把自定义载荷放在 `node.data`。`toReactFlow` 在加载时把它们提升进 `data`，`fromReactFlow` 在保存时提取回去；`node.data` / `graph.metadata` / `definition.metadata` 中的其余内容是编译器忽略的透传数据，往返过程原样保留。条件挂在**边**上，分两种：`condition`（规则，平台 Filters JSON）和 `conditionExpression`（AviatorScript），各自映射到 `edge.data` 的同名键，空的那种在保存时丢弃。节点/边 id 由前端生成且稳定（`approval_k3x9q2` / `edge_p0m2aa`）——服务端从不铸造或改写它们。渲染出的 `measured` 尺寸会持久化，历史快照可完整重绘；加载时这份尺寸只用于节点的首次绘制（`initialWidth`/`initialHeight`）——若当作 xyflow 的 `width`/`height`，节点会被固定在保存时的尺寸，改名后也变不成自己的尺寸。这份尺寸也说明位置是在画布上定的：没有任何节点带尺寸的图从未在画布上保存过——种子数据、经 API 写入的设计、新流程的开始节点——其位置无人选定，打开时按工具栏「Auto layout」的方式排好并适配视图（`hooks/use-auto-arrange.ts`）。排布要用节点渲染出的尺寸，所以节点全部量出尺寸后排一次，尺寸再变时（描述符到达后节点会变大小）重排。在设计器里它只影响显示，持续到第一次编辑并随那次编辑一起保存；单纯打开流程不保存任何东西。在画布上保存过的图保留原位置，不论整齐与否；不整齐的用一次「Auto layout」整理。`FlowViewer` 同样处理，历史预览与实例图和设计器所见一致。位置/视口保留两位小数，消除拖拽的浮点噪声。

## 保存 / 版本 / 发布语义

结构性变更递增一个 mutation 计数器（脏 = 计数 > 已保存计数——没有深度 diff）；自动保存 2s 防抖、单飞加水位重排队，并在标签页隐藏/卸载时冲刷。每次成功保存都采纳返回的草稿 `version`（乐观锁）。470 打开阻塞式冲突对话框：Reload（采纳远端、丢弃本地）或 Overwrite（用本地覆盖远端版本）——不做三方合并。发布先冲刷保存、再校验（错误阻断、警告提示），然后 `POST /{id}/publish`；发布会递增草稿版本，因此发布后重新加载草稿。发布被拒（400）时，带编译诊断的落到画布诊断里；不带诊断的——拒绝原因不在画布上，例如另一个流程会接管同样的单据——在对话框里显示服务端的原因，替换原先的「Validation passed」。History 抽屉列出 bundle——每个以 `bundleId` 为键（bundle 摘要没有 `id`），以 `publishedAt` 标日期，以 `active` 标出生效修订，并显示 `changeDescription`；Activate（`POST /flow/bundles/{bundleId}/activate`）切换运行时修订而不动草稿，Restore（`POST /{id}/restore?bundleId=`）用快照覆盖草稿画布，View 打开该修订的 `?include=design` 快照。发布按钮旁的下拉菜单停用或启用流程（`canvas/toolbar/flow-enablement-menu.tsx`，停用前确认），工具栏随之显示「Disabled」徽章；启停与发布、生效修订互不影响，状态从 `GET /{id}/status` 的 `enabled` 进入编辑器状态。启停也会递增草稿版本，所以菜单和发布一样：先冲刷未保存的编辑（保存失败就不启停），启停后重新加载草稿，下一次自动保存不会撞上版本冲突。停用确认说明：还有未走完的实例，或被启用中的流程当子流程调用的流程不能停用；服务端的拒绝原因由全局错误提示显示一次。流程列表也有「状态」列（Disabled / Not published / Enabled）和停用、启用行操作；点击一行就在设计器里打开该流程（需有「Open Designer」权限），没有单独的打开按钮。

## 工具栏

工具栏（`canvas/toolbar/flow-toolbar.tsx`）开头一段和下方的节点面板同宽（`lib/designer-layout.ts` 的 `PALETTE_WIDTH_CLASS`，节点面板也用它），所以它的右边框接着节点面板的边框——这是工具栏里唯一的竖线，其余各组之间靠间距分开。这一段放页面通过 `toolbarStart` 放的控件（编辑页的返回箭头）和流程名（只读的标题，超出这一段时显示省略号，悬停提示显示全名；点击它会打开流程设置并聚焦 Name 字段——名称在那里和其他流程级设置一起编辑，缺名称这类流程级诊断点开也落在那里）。画布上方依次是发布状态徽标、保存状态（只显示「Saved」，不带草稿版本号：那是乐观锁的计数，每保存一次加 1，和已发布的「v3」并排时会被当成流程的另一个版本），然后是撤销、重做和 Auto layout；最右边是流程的生命周期操作：History 和 Test run（仅审批流），然后是 Settings，和前两个一样是普通按钮（面板标题会说明当前显示的是流程设置），位置就在它所切换的面板上方；最后是 Publish，与它的启停菜单合成一个拆分按钮。场景不在工具栏上显示：它在新建流程时选定、之后不变，流程设置的面板标题下和流程列表里都有。没有 Save 按钮：编辑后 2s 自动保存，有东西要保存时（有未保存的改动，或上次保存失败），点保存状态本身就立即保存。也没有 Validate 按钮：流程每次加载（打开或重新加载）时和每次编辑后 2s 自动校验，结果显示在画布下方的诊断栏里，没有问题时显示「No issues」。

## 校验诊断

按契约分三层：本地（RHF required/min、描述符端口连接规则、本地环检测——规则拒绝的连线不会画出，在被拒的连接点上松手时以提示说明原因）→ 2s 防抖的服务端内存文档校验 → 发布前强制全绿门。`CompileDiagnostic` 锚定到节点（外圈描边——错误为红色、警告为琥珀色，选中时让位于选中环——外加计数徽标）、边（描边用同样的颜色）或面板字段——关于连线的诊断同时标出连线和它出发的节点，触发器的诊断标在编辑触发器的开始节点上。底部诊断抽屉完整显示每条信息，并按用户能看懂的方式写明位置（`Step Direct Manager · Approvers`、`Connection Manager → HR`、`Trigger · Start`、`Flow settings`；错误码和 id 放在悬停提示里），点一行就选中并居中它的锚点——有连线的先选连线、打开连线表单；流程级的打开流程设置。在需要做决定时如果有错误，抽屉自动展开：加载流程（每次加载先校验一次：打开，以及发布、启停、恢复版本、冲突重载之后的重新加载）、发布——发布对话框直接列出阻塞的错误，点一条就关掉对话框并定位过去，编译拒绝发布时也展开抽屉；编辑过程中 2s 的服务端校验只把标题行标红。流程校验过一次之后，这一栏就一直显示在画布下方——没有问题时显示「No issues」——所以校验不需要按钮（诊断上下文的 `checked` 区分还没校验过的流程和没有问题的流程）。属性面板不再重复这些诊断——抽屉列出全部信息，画布标出节点或连线——只有步骤里针对配置字段（`config.<path>`）的错误显示在那个字段上，直到下一次校验。从开始节点走不到的节点是错误（`UNREACHABLE_NODE`）：它永远不会执行，而它连到的并行汇合会一直等它——草稿照常保存，只是不能发布。没有名称的节点同样是错误（`MISSING_NODE_LABEL`）：名称就是用户在审批中心和审计记录里看到的步骤名。面板里的 Label 字段标为必填；清空后提示 "Label is required." 且不提交——节点保留原来的名称；加载进来就没有名称的节点同样显示这条提示。新建节点默认用节点类型名作名称。服务端按用户看到的样子称呼诊断对象：节点用名称，连线用它的名称，没有时写作 `起点 → 终点`；原始的节点 / 连线 id 仍在每行的悬停提示里，用来区分同名节点。值得了解的契约行为：存在结构性错误时服务端抑制语义检查——先修结构，语义诊断随后出现。

## 插入节点

悬停或选中一条连线时，其中点（有标签时在标签旁）出现 +；点开列出能放进连线的节点类型——与节点面板相同的分组，但不含开始和结束节点（`canvas/palette/node-type-picker.tsx`）——所选类型插入这条连线（`insertNodeOnEdge`）。原连线保留其 id、标签和条件，改为指向新节点，因为条件属于从源节点出发的那条分支，而网关的路由配置按 id 引用其出边；另有一条不带条件的新连线接到原目标（`lib/node-insertion.ts` `splitEdge`）。新节点进入它所属分支的那一列——分叉下方对齐目标，汇合上方对齐源节点——上下各留一个层间距；目标离得太近时，目标及其下游整体下移，其他节点不动（`placeInsertedNode`）。从节点面板拖到连线上的节点按同样方式插入，拖动经过时该连线高亮。从节点出口拖出连线、在空白处松手，会弹出同一份类型列表（含结束节点），在松手处创建所选节点并连好线，其入口正好落在松手的位置（`addConnectedNode`）；出口已满时改为提示原因。每种插入都只占一步撤销，并选中新节点。+ 和拖放高亮来自 `store/canvas-editing-context.tsx`，只有可编辑画布提供它，所以只读视图两者都不显示。

## 删除节点

悬停或选中一个节点时，其左上角（与诊断计数相对）出现 ×，点击删除该节点及其连线，与选中后按 Delete / Backspace 相同。两者都经过 `onBeforeDelete`（`canvas/flow-canvas.tsx`），它保留开始节点：开始节点带着触发器，所以没有 ×。一次删除只占一步撤销，连线一并恢复。与连线上的 + 一样，× 来自 `store/canvas-editing-context.tsx`（`deleteNode`），只有可编辑画布提供它，所以只读视图和试运行锁定的画布都不显示。

## 属性面板与控件注册表

字段的含义或作用放在标签后的帮助图标里（`panel/field-help.tsx`——`FieldHelp`，标签连同帮助用 `FieldLabelRow`，`ConfigFieldShell` 接受 `help`），悬停或键盘聚焦时显示，与模型表单的字段说明一致，而不是写在字段下方——在 320px 宽的面板里，那些说明比字段本身还占地方：流程设置、触发器的各字段、条件按写法给出的说明、`enum` 的 `hintBy` 和 `optionDescriptions`、字段权限。图标放在标签旁边而不是标签里面，控件的无障碍名称仍只是标签。代替控件出现的文字留在原处：「Select a model first」、默认连线的「Other」、子流程触发器的说明。

面板由描述符驱动：`GET /flow/nodeDescriptors` 按节点类型提供 `configSchema`（随部署而变——绝不硬编码），经由按契约控件类型词汇表键控的注册表渲染：`string number boolean enum expression template cron stringList json keyValueMap fieldMapping filters orders model variableRef userPicker deptPicker rolePicker positionPicker recordPicker flowPicker nodeId approverSources fieldPermissionMap`。`depends` 提供严格相等的条件可见性（隐藏字段保留值）；`number` 留空时显示其 `default` 为「<值> (default)」；`enum` 未设值时显示其 `default` 为「<标签> (default)」，在帮助图标里用 `optionDescriptions` 说明所选（或默认）值的作用，`approverSources` 的每组隐藏标了 `deprecated` 的来源，除非配置里已经是它，`hintBy` 按另一个字段的值补充这份帮助（审批步骤的「If nobody is found」按唯一一组审批人的来源说明何时生效；有几组时说的是所有组都没找到人才生效）；`sourceField` 为模型驱动控件供数（`fieldMapping`/`filters`/`orders` 读取同级 model）。`filters`/`orders` 经合成的 `MetaField` 复用框架 `FilterBuilder`/`OrderBuilder`；数据节点的 `filters` 按节点模型做查询，所以也像列表筛选一样展开模型的多对一、一对一关联下一层（带 `cascade` 的 `ModelFieldSourceProvider`）。`approverSources` 是审批步骤由谁审批（`controls/approval-controls.tsx` 的 `ApproverSourcesControl`）：一组或几组，各组找到的人合在一起，审批模式按合起来的名单计数，Approvers 标签的帮助里说明这一点。每组一个下拉，按描述符给的顺序列出来源——第一项「Specific people」（`Users`，其 `userIds` 是用户选择器），然后是组织里的（上级、部门负责人、部门 HRBP）、按群体的（角色、岗位、部门成员），没有从流程变量里取人的——各来源的嵌套字段递归走注册表（路径如 `approverSources.1.userIds`）；切换来源会把这一组重置成只有类型。「Add approvers」加一组，默认第一项；有几组时每组的下拉叫「Approvers, group N」，旁边有删除按钮，删到只剩一组为止。新建步骤默认一组 Specific people（Approval 描述符的 `defaultConfig`）。抄送规则的接收人是一组（`ApproverSourceControl`），用同样的来源。审批步骤上只对部分步骤生效的设置带 `appliesWhen`，字段列表（`lib/config-zod.ts` 的 `isFieldVisible` / `fieldApplies`）按各组审批人判断，不适用就不显示（后端同样忽略）：`severalApprovers`（审批模式及其人数、百分比：有几组，或唯一一组指定了几个人、或其来源没标 `findsOne`），`approversFoundByRule`（「If nobody is found」及其角色：有一组的来源有类型、又不是指定人员）。来源选项上的 `names`（指定人员放在哪个字段，`userIds`）和 `findsOne`（最多找到一个人：上级、部门负责人、部门 HRBP）都由描述符给出，前端不写死来源类型。未知控件类型渲染可见的非崩溃兜底。表达式控件使用 CodeMirror，变量自动补全来自 `GET /{id}/availableVariables`，并有防抖的 `GET /toolkit/validateExpression` 语法检查。Cron 触发器的 Schedule 用 `panel/cron-input.tsx`，即共用的 cron 编辑器（`CronEditor`，见[字段组件](../fields/widgets#croneditor)）：一个按钮写出调度的含义，点开面板选常用调度（每隔几分钟、每小时、每天、每个工作日、每周、每月）、逐个字段设置或直接输入表达式，写出的都是秒位只有一个值的 Quartz 表达式——一个流程只有一种 cron 写法（调度器的 Quartz 格式），流程每分钟最多运行一次。它调用 `GET /flow/cron/preview`，按发布时的标准判断表达式（调度器的规则，加上每分钟最多一次），给出拒绝的原因，或它的文字含义和在服务器时区里接下来的几次运行；被拒绝时 Apply 不可点。`template` 控件（`controls/template-control.tsx`）编辑运行时插值的文字：{x} 菜单把节点可见的变量以 `{{ name }}` 插到光标处，发布会拒绝的问题——未闭合、为空、无法编译的占位符——就显示在下方。表达式和模板都带「Try it」（`controls/try-it.tsx`）：为它读到的每个变量填一个示例值（能按 JSON 解析的按 JSON），经 `POST /flow/expressions/preview` 给出结果及类型或无法运行的原因。`stringList` 用标签输入（`panel/tag-input.tsx`）；`json` 失焦时解析存储，解析不了的留在框里并提示；`recordPicker` 按 schema 的 `model` 选记录；`flowPicker`（子流程节点的目标）只列子流程节点能调用的流程——启用中、生效修订版带 Subflow 触发器的自动化流程（`GET /flow/designs?subflowTargets=true`），选不到会让子流程在运行时失败的流程；`model` 和各记录选择器（`rolePicker`/`positionPicker`/`recordPicker`）的候选每次读 20 条，滚到列表底部再读下一页，最多 200 条，之后提示输入以缩小范围；`keyValueMap` 按 `valueType` 用表达式或模板编辑值，各行保存在本地，所以新加的一行在写下键之前也一直显示。这几种映射控件里，同一个键写在两行时只保存前一行，后一行标出「Already listed above」，不会悄悄覆盖前一行。`fieldPermissionMap`（审批节点的字段权限）的字段从流程单据模型的字段里选（模型由触发器决定），已经列过的字段不再出现在下拉里；不从单据启动的流程仍手填字段名。新加的一行默认 Readonly，不会存下没有权限的行；旧草稿里没选权限的行在面板里提示，校验和发布时报错。记录选择器用选取时记下的名称显示已选的值，没有就按值去查（`searchName`，条件 `[valueField ?? "id", "IN", 已选值]`），所以搜索词变了或面板重新打开，已选的人也不会变成 id；`userPicker` 和 `deptPicker` 是共用的目录选择器（`src/components/directory/` 的 `PeoplePicker` / `DepartmentPicker`），列表滚到底时再多显示 20 条、最多 200 条，设计器的「Open Designer」权限带着它们的读取，已保存的值同样按值去查（`GET /flow/directory/people/all/by-ids` / `GET /flow/directory/departments/by-ids`）——用户选择器（步骤或抄送规则的指定人员）搜整个通讯录（`everyone`，`GET /flow/directory/people/all`）：能登录并办理的人，名字旁边显示工号、部门和职位，以及没有员工档案的账号（租户管理员，提示为「Account」）；已保存但不再能办理的人仍显示名称并标为 inactive，校验时给出警告；部门选择器显示每个部门的编码和上级部门。

连线的表单编辑其标签和条件，条件以**规则**或**表达式**两种方式之一给出（`panel/condition-editor.tsx`，数据变化触发器的条件用的也是它）。规则用框架 `FilterBuilder` 构建，作用于流程所基于记录的模型（Submit / Entity Change 触发器），只提供后端为这条连线列出的记录字段（`availableVariables?nodeId=<源节点>&afterNode=true` 中的 `Trigger` 变量，不含一对多/多对多），以及经记录的关联往下最多两层、后端为每个关联列出的字段（变量上的 `ruleFields`：`employeeId.departmentId` 显示为 Employee › Department，`employeeId.departmentId.costCentreId` 显示为 Employee › Department › Cost Centre）——`ruleFieldNames(variables, throughRelations)` 把它们变成构建器的 `allowedFields`，其中的路径只展开对应的关联，第二层的关联在第一层里面展开；后端按字段条件的方式判定规则。路径的值由引擎在流程启动时从关联记录读取——审批流在提交时，审批人改单后再读一次——与记录自身的值一起保存，所以每条路由都按当时的值判断。连线的规则和审批流触发器的条件能经关联读取（`ConditionEditor` 的 `throughRelations`）；数据变化触发器的条件在任何运行开始之前按这次变化本身判断，只读变化记录自身的字段。构建器弹窗的标题下面写明是哪一种（Filters 控件的 `dialogDescription`）。表达式用 CodeMirror 编辑器，变量包含源节点自身的输出。一条连线只能有一种条件：已有条件时切换会先确认，再清空它。多数条件是规则，所以条件编辑器显示规则构建器，表达式放在「Condition」标签行末尾一个不显眼的切换按钮后面（「Use expression」，切回是「Use rule」）：以表达式存储的条件打开时就是表达式；流程不基于记录时没有规则可切，只显示表达式；只读时不显示切换。条件的帮助说明随源节点而变：从包容网关出发时，条件成立的连线都会走，不带条件的连线是默认连线——只有其他连线的条件都不成立时才走，每个网关最多一条；从其他节点出发时，按顺序走第一条条件成立的连线，不带条件的连线是默认连线，每个节点最多一条。这类节点按顺序判断条件连线（`priority`，1 最先；没设的排在后面，按画线先后；默认连线最后——`lib/edge-priority.ts`，与引擎的顺序一致）：有两条以上连线时，画布在每条连线的标签前显示它的位置（「1」「2」…，默认连线显示「Other」；包容网关会走所有条件成立的连线，所以不显示位置，但默认连线仍显示「Other」；一个节点有不止一条不带条件的连线时，这些连线改为在虚线框里显示「Add condition」，因为除了一条以外都需要条件。由 `edgeOrderLabels` 算出、经 `store/edge-order-context.tsx` 提供给编辑器和只读视图，从不写进连线的 `data`），表单显示「Tried n of m」和上移、下移按钮（`moveEdge`，会把该节点的条件连线从 1 重新编号）。默认连线的 `priority` 不保存。在可编辑画布上，连线的标签就是条件的入口：鼠标移上去显示手型光标和描边，点击会选中这条连线、打开它的表单——React 会把标签所在 portal 里的点击冒泡到 xyflow 的连线上，所以标签不需要自己的点击处理。从并行分叉出发的连线没有条件：并行分叉会走所有出线、不读条件，所以表单用一句说明代替条件编辑器，标签也不显示位置。画布上的规则以模型的说法显示——字段标签、路径按各段标签（`Department › Cost Centre`）、选项标签、记录名称——与列表筛选的预览一致，元数据到达前以存储形式显示。

画布上什么都不选时面板显示流程设置，点工具栏的 Settings 也一样——它在右边，就在所切换的面板上方。流程设置包括：必填的名称（和节点的 Label 一样，清空时提示 "Name is required." 且不提交），以及该场景接受的设置（`lib/scenario-rules.ts`，与后端编译规则一致——场景之外的设置既不显示也不保存）。场景在新建时定下、之后不能改，所以不是表单里的字段：它写在面板标题下方（如「Flow settings / Approval」，和节点面板标题下写节点类型一样），场景的一句话说明放在标题区的说明行（审批流的是 "Approves a submitted record and writes the outcome back to it: its steps are people and routes."）。节点面板按场景由后端过滤（`GET /flow/nodeDescriptors?scenario=`），所以审批流的节点面板只有人和路由的节点：开始、结束、审批和网关。审批流的设置按涉及的人分三组，每组一个带标题的 `section`：Submitter（May withdraw；May urge；Urge interval (hours)，`urgeIntervalHours`，和提醒时间一样按小时填）、Approvers（May return to the submitter；Remind after (hours)；When the submitter is an approver，`selfApproval`，只管提交人；When an approver approved an earlier step，`approverDedup`——`Global` 自动通过，`Contiguous` 只在紧挨的上一步审过时自动通过，`None` 再问一次）、Notifications（Send email notifications；CC）。自动化流程的两项设置（Synchronous execution、Rollback on failure，即 `sync` / `rollbackOnFail`）跟在名称后面，不分组。开关按标签命名。触发方式在开始节点上配置（`panel/trigger-editor.tsx`），开始节点卡片显示触发摘要（如「Submit · ExpenseClaim」）；还没有触发器的流程打开时选中开始节点，已有触发器的打开时显示流程设置。审批流的开始节点只读显示「Submitted for approval: <单据>」——单据在新建时选定，之后不能改——下面是可编辑的提交条件（与数据变化触发器同一个编辑器：按单据审批会路由的字段、或经关联下一层的字段写规则，或写表达式）；同一单据的多个审批流靠这个条件区分：提交的记录交给条件成立的那个流程，有多个成立时不能提交；字段的帮助说明，条件留空，这个流程就是单据的默认审批流，审批其他流程的条件都不成立的记录。带条件时开始节点卡片显示「· conditional」。自动化流程可以在它接受的触发方式之间切换：数据变化触发器在触发器里选模型，之后可以改；定时、API、子流程触发器不带模型——切到它们时去掉模型。改模型会清空该触发器自己的规则条件，连线上的规则在发布时按新模型重新检查。数据变化触发器的条件与连线同一个编辑器、同两种写法，读的是流程级的变量（不带 `nodeId` 的 `availableVariables`：记录字段与 `_triggerType` 等）；定时触发器的调度用同一个 cron 编辑器（`CronInput`）编辑和预览。新建对话框（`app/flow/flow-design/components/new-flow-dialog.tsx`）只提供 Approval 和 Automation 两种场景：审批流选单据（`GET /flow/approvalModels`，列出所有可审批的单据，已有审批流的显示「— has N approval flow(s)」），自动化流程选触发方式，数据变化触发器再选模型；建好之后只有场景和审批流的单据不能改。审批流也可以复制：副本是未发布的草稿，单据和条件都和原流程一样，复制对话框和提示都会提醒发布前先改条件。审批流在流程设置里配置抄送（`panel/cc-rules-editor.tsx`）：每条规则选时机——提交时、通过后、驳回后——和接收人（`recipientSource`，一组人），与审批步骤每组审批人用同一个下拉——来源取自 Approval 描述符自己的 `approverSources`，步骤能用的来源这里都能用，新加的规则默认第一项 Specific people；同一时机抄送几组人就加几条规则；审批节点本身没有抄送配置。规则行保存在局部表单里，变化即提交到编辑器状态，并在每次（重新）加载时按 `loadGeneration` 重新挂载。

## 试运行与覆盖层

Test run 只有审批流有（流程的触发器是 `Submit` 时工具栏才显示这个按钮）：推演提交一张申请在草稿下会怎样，从不真正运行——不启动、不保存、不发送任何东西。

- **对话框**（`test-run/test-run-dialog.tsx`）：先选提交人（「Submitted by」，目录的 `PeoplePicker` 加 `everyone`，默认当前用户），再填申请，表单来自 `FlowDesignerProps.requestFormView(modelName)`——HCM 页面传入审批中心该单据的视图并去掉其中的块（`testRunRequestView`）；没有视图时只按员工提交。表单是无 schema 的创建模式 `DialogForm`：没有必填字段，只需填流程会读的字段；员工留空就是提交人本人。
- **Preview**：先保存画布，再把表单的保存载荷发到 `POST /flow/designs/{id}/preview`；草稿编译不过时关闭对话框并列出诊断，和 Publish 一样。
- **结果**（`FlowDesignPreview`）：画布锁定只读并标出路线（`test-run/test-run-marks.ts`，经 `store/test-run-context.tsx`）。经过的节点带标记和外框——经过、等审批人、运行时才知道、在此停止；审批步骤在名称下写等谁审批或为何自动通过；不在路线上的节点和连线变淡。画布下方（原诊断栏的位置）用审批页同一张 `ApprovalPreviewCard` 列出步骤，提交人写名字而不是「you」；流程的提交条件不选中这张申请时先给出提示。画布上方的横条写明提交人，有 Change request（重新打开对话框，保留上次填的内容）和 Exit test run。

运行状态 overlay 属于 `FlowViewer`，用于实例页面：节点按 `store/overlay-context.tsx` 绘制运行状态（Completed / WaitingApproval / WaitingAsync / Failed）。

## 撤销 / 重做

仅图形的快照历史（上限 50）：节点/边的增删移、插入、连线、label/config/边编辑与自动布局都可经工具栏或 Cmd/Ctrl+Z（Shift 重做）撤销；流程级设置（名称、触发器、开关）刻意排除。没有改变任何内容的配置提交——节点在面板中打开时表单的重新提交——不算编辑：不占撤销步骤，也不让草稿变脏。无人排布的图打开时的布局同样不占步骤。加载/重载/恢复时历史重置。

## 主题与密度

`styles/flow-theme.css` 把 xyflow 的 `--xy-*` 变量映射到项目调色板（只用主题变量、无字面颜色——暗色模式自动翻转）。节点/边/面板视觉使用密度 token（`--ds-*`/`--ui-*`）；类别强调色映射到 `chart-*` 调色板槽位。每个节点都按固定宽度绘制，与标签无关（`lib/node-size.ts`：240px，结束节点 160px）：画布存的是节点左上角，按文字定宽的节点改名时会向右变宽，把连接点拉离连线；放不下的文字截断显示，完整内容在悬停提示里。开始和结束节点是圆角胶囊，各有自己的实心圆底——开始是绿色加播放图标，结束是灰色加停止图标——按端口区分，而不是按两者共同的 Control 类别（`lib/category-styles.ts` 的 `nodeStyle`、`lib/icon-registry.tsx` 的 `NodeIcon`），所以画布卡片、面板标题、节点面板和类型选择器显示一致；其他节点用所属类别的色调和描述符给的图标。图标表覆盖内置描述符发出的全部图标名；不认识的（自定义执行器的）显示为拼图图标。每条连线末端都有箭头：由 `FlowEdge` 自己绘制 marker，而不用 xyflow 的 `markerEnd`（其 marker 是所有连线共用的固定颜色）；主题让箭头与所在连线同色——默认、诊断（该边覆盖 `--xy-edge-stroke`）、选中或聚焦。

## 已知限制

`availableVariables` 读取最后保存的草稿，因此新的上游变量在一次自动保存后才出现在补全中。撤销只覆盖图形。无协同编辑——470 提供 reload/overwrite 而非合并。

## 测试

纯逻辑由 `tests/flow-*.test.ts` 单元测试覆盖：图适配器往返、id 生成、连接规则（端口 + 环）、节点插入（拆分连线、定位）、configSchema→zod、dagre 坐标转换、区分无人排布的图与在画布上保存过的图、诊断归一化。交互流程由 flow 模块的 Playwright smoke 覆盖。

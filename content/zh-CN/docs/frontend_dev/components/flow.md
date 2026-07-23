# Flow Editor

面向 softa flow-starter 流程定义的框架层可视化编辑器与查看器，基于 `@xyflow/react` v12 构建。它渲染设计态图（`DesignFlowDefinition`），驱动完整的草稿生命周期（带乐观锁的自动保存、校验诊断、发布/版本化、调试运行），并为实例监控提供只读画布。权威后端契约是 flow-starter 前端编辑器 API（`softa/starters/flow-starter/docs/frontend-editor-api.md`）；本组件逐条实现该契约。

## 快速开始

```tsx
// Editor page (always the SSR-safe lazy entry — xyflow measures the DOM):
import { FlowDesignerLazy } from "@/components/flow/flow-designer-lazy";

<FlowDesignerLazy designId={designId} toolbarExtra={<BackButton />} />

// Read-only render of a published snapshot with a run-state overlay:
import { FlowViewer, useInstanceOverlay } from "@/components/flow";

const { overlay, trace } = useInstanceOverlay(instanceId);
<FlowViewer definition={bundleDetail.design!} overlay={overlay} />
```

## 公共 API

| 导出 | 用途 |
| --- | --- |
| `FlowDesigner` / `FlowDesignerLazy` | 自包含的设计器：组件面板、画布、属性面板、工具栏、自动保存、470 冲突对话框、校验诊断、发布对话框、版本历史、调试运行。`FlowDesignerProps = { designId, readOnly?, toolbarExtra?, className? }`。在 Next.js 页面中始终挂载 lazy 入口。 |
| `FlowViewer` | 只读画布：`{ definition, overlay?, onNodeClick?, fitView?, className? }`。渲染历史/实例时使用 bundle 的 `?include=design` 快照——编译后的图会丢弃 `width`/`height`/`data`/`label`，无法忠实重绘。 |
| `useInstanceOverlay(instanceId, { intervalMs?, enabled? })` | 运行时轮询循环：overlay 刷新（默认 2.5s）加经 `sinceSequence` 的增量 trace 累积；实例进入终态后二者自动停止。 |
| `registerConfigControl(type, component)` | 属性面板控件注册表的应用级扩展缝（见下文）。 |
| `FlowPickerModelsProvider` / `DEFAULT_PICKER_MODELS` | 覆写 `userPicker`/`deptPicker`/`rolePicker`/`positionPicker` 背后的模型（默认 `UserAccount`/`DeptInfo`/`EmpRole`/`PositionInfo`），保持组件包与模型解耦。 |
| `toReactFlow` / `fromReactFlow` | 后端 `FlowGraphDocument` 与 xyflow 状态之间的纯函数适配器（映射规则见下文）。 |
| `@/components/flow/types` | 后端 DTO 面的完整 TS 镜像（wire 枚举为 PascalCase 字符串联合）。 |

## 后端契约映射

后端节点把 `label`/`config`/`width`/`height` 作为顶层字段携带；xyflow 把自定义载荷放在 `node.data`。`toReactFlow` 在加载时把它们提升进 `data`，`fromReactFlow` 在保存时提取回去；`node.data` / `graph.metadata` / `definition.metadata` 中的其余内容是编译器忽略的透传数据，往返过程原样保留。边的 `conditionExpression`（条件挂在**边**上，AviatorScript `{{ expr }}`）映射到 `edge.data.conditionExpression`。节点/边 id 由前端生成且稳定（`approval_k3x9q2` / `edge_p0m2aa`）——服务端从不铸造或改写它们。渲染出的 `measured` 尺寸会持久化，历史快照可完整重绘。位置/视口保留两位小数，消除拖拽的浮点噪声。

## 保存 / 版本 / 发布语义

结构性变更递增一个 mutation 计数器（脏 = 计数 > 已保存计数——没有深度 diff）；自动保存 2s 防抖、单飞加水位重排队，并在标签页隐藏/卸载时冲刷。每次成功保存都采纳返回的草稿 `version`（乐观锁）。470 打开阻塞式冲突对话框：Reload（采纳远端、丢弃本地）或 Overwrite（用本地覆盖远端版本）——不做三方合并。发布先冲刷保存、再校验（错误阻断、警告提示），然后 `POST /{id}/publish`；发布会递增草稿版本，因此发布后重新加载草稿。History 抽屉列出 bundle；Activate 切换运行时修订而不动草稿，Restore 用快照覆盖草稿画布。

## 校验诊断

按契约分三层：本地（RHF required/min、描述符端口连接规则、本地环检测）→ 2s 防抖的服务端内存文档校验 → 发布前强制全绿门。`CompileDiagnostic` 锚定到节点（计数徽标）、边（红色描边）或面板字段；底部诊断抽屉可点击穿透以选中并居中锚点。值得了解的契约行为：存在结构性错误时服务端抑制语义检查——先修结构，语义诊断随后出现。

## 属性面板与控件注册表

面板由描述符驱动：`GET /flow/nodeDescriptors` 按节点类型提供 `configSchema`（随部署而变——绝不硬编码），经由按契约控件类型词汇表键控的注册表渲染：`string number boolean enum expression keyValueMap fieldMapping filters orders model variableRef userPicker deptPicker rolePicker positionPicker flowPicker nodeId approverSource approvalTimeout fieldPermissionMap`。`depends` 提供严格相等的条件可见性（隐藏字段保留值）；`sourceField` 为模型驱动控件供数（`fieldMapping`/`filters`/`orders` 读取同级 model）。`filters`/`orders` 经合成的 `MetaField` 复用框架 `FilterBuilder`/`OrderBuilder`。`approverSource` 对各来源的嵌套字段递归走注册表；切换来源类型会重置对象。未知控件类型渲染可见的非崩溃兜底。表达式控件使用 CodeMirror，变量自动补全来自 `GET /{id}/availableVariables`，并有防抖的 `GET /toolkit/validateExpression` 语法检查。

## 调试运行与覆盖层

Debug Run 编译**最后一次保存**的草稿并真实执行——不是沙箱：会写入记录、发送邮件/短信、审批任务进入真实收件箱（对话框有相应警示）。会话期间画布锁定只读，节点绘制运行状态（Completed / WaitingApproval / WaitingTimer / WaitingAsync / Failed），增量 trace 在画布下方流式展示。同一套 overlay 上下文也驱动 `FlowViewer`，监控页面免费获得一致的状态绘制。

## 撤销 / 重做

仅图形的快照历史（上限 50）：节点/边的增删移、连线、label/config/边编辑与自动布局都可经工具栏或 Cmd/Ctrl+Z（Shift 重做）撤销；流程级设置（名称、触发器、开关）刻意排除。加载/重载/恢复时历史重置。

## 主题与密度

`styles/flow-theme.css` 把 xyflow 的 `--xy-*` 变量映射到项目调色板（只用主题变量、无字面颜色——暗色模式自动翻转）。节点/边/面板视觉使用密度 token（`--ds-*`/`--ui-*`）；类别强调色映射到 `chart-*` 调色板槽位。

## 已知限制

`availableVariables` 读取最后保存的草稿，因此新的上游变量在一次自动保存后才出现在补全中。`HumanTask`/`ForEach` 在后端实现前不在面板中（描述符驱动）。撤销只覆盖图形。无协同编辑——470 提供 reload/overwrite 而非合并。表单绑定（`definition.forms`）随保存透传但尚无编辑 UI（后端暂无表单系统）。

## 测试

纯逻辑由 `tests/flow-*.test.ts` 单元测试覆盖：图适配器往返、id 生成、连接规则（端口 + 环）、configSchema→zod、dagre 坐标转换、诊断归一化。交互流程由 flow 模块的 Playwright smoke 覆盖。

# 表单视图 Schema

把表单视图写成数据：分节、字段、widget、关联表格和条件都是纯 JSON，渲染成手写页面用的同一套组件。第一个使用方是 Home 模块的审批页，视图在 `src/app/home/record-views/`：每个模型一份，给跟进和审批申请的人只读展示；员工在审批中心自己提交的类型，放进 `ModelForm` 里新建和编辑——用这个类型自己的申请视图（没有就用同一份审批视图），以及它注册的 block——条件在新建和更新模式下同样判断。

## 相关文档

- [ModelForm](./form)
- [Fields](../fields/fields)
- [Widget 矩阵](../fields/widgets)

## 为什么用数据而不用 JSX

- 定义可以存库、可以编排：里面没有可执行的东西，存在数据库里、由设计器编辑或由租户编写的视图都不会执行代码。视图需要的代码在代码里按名字注册，视图里只写名字（widget、block）。
- 不渲染就知道有哪些字段。页面的表单计划靠遍历 JSX 找 `fieldName`，包在自定义组件里的 `<Field>` 它看不到（`declareFields` 就是为此存在的）。`renderFormView` 直接返回元素，遍历看得到每个字段。
- 条件可移植。`readonly` / `required` / `hidden` 用 `sys_field.constraints` 的语法，前端和后端的 `FilterEvaluator` 都能判断，答案相同。

手写页面仍然用 JSX：它们的代码多数是行为——业务按钮、hooks、向导——不是视图描述的东西。两边渲染的是同一套 `Field` 和 widget。

## 结构

```ts
interface FormViewSchema {
  schemaVersion: 1;
  model: string;
  body: ViewNode[];
}

type ViewNode =
  | string // { type: "field", field: <该字符串> } 的简写
  | { type: "section"; label?; description?; columns?: 1 | 2 | 3 | 4; divided?; children: ViewNode[] }
  | { type: "group"; label?; separator?; children: ViewNode[] }
  | FieldNode
  | { type: "block"; component: string; props?: { [key: string]: JsonValue } };

interface FieldNode {
  type: "field";
  field: string;
  label?; description?; placeholder?; fullWidth?;
  widget?: string; // 字段类型允许的 WidgetType
  widgetProps?: { [key: string]: JsonValue };
  readonly?: ViewCondition;
  required?: ViewCondition;
  hidden?: ViewCondition;
  filters?: FilterCondition; // 关联字段的选择范围
  onChange?: string[] | { update?: string[]; with?: string[] | "all" }; // 这个字段变了，由服务端算出的其他字段
  filterBySource?: boolean; // 关联字段的选择框带上表单这条单据，由服务端给出合适的选项
  columns?: (string | FieldNode)[]; // 以表格显示的一对多 / 多对多：关联模型的字段
  orders?: [string, "ASC" | "DESC"][];
}

type ViewCondition = boolean | FilterCondition;
```

每个节点就是对应组件 props 中属于数据的那部分：

| 节点 | 渲染成 | 携带 |
| --- | --- | --- |
| `section` | `FormSection` | label、description、columns、divided |
| `group` | `Group` | label、separator |
| `field` | `Field` | fieldName、label、description、placeholder、fullWidth、widgetType、widgetProps、readonly / required / hidden、filters、onChange、filterBySource |
| `field.columns` | 经 `tableView` 渲染的 `RelationTable` | 每列也是一个 field 节点；orders |
| `block` | 页面注册的组件 | 名字和 props |

因为是代码而不携带的：`dependsOn` 函数条件、`readCell` 之类的渲染函数、`rules`、`tableView` / `formView` 组件。分节的权限门槛也不携带：谁能看到什么，由填充视图的那次读取决定。

暂不支持：页签（`FormTab`）和关联行弹窗（`formView`）。哪个视图需要时再加节点；只有存量视图需要迁移的改动才提升 `schemaVersion`。

## 条件

`ViewCondition` 是 `true` / `false`，或 `sys_field.constraints` 语法的 FilterCondition：值可以是 `{{ @field }}`（本行的另一个字段）、`{{ TODAY }}` / `{{ YESTERDAY }}` / `{{ NOW }}` / `{{ USER_ID }}`，可带 ISO-8601 偏移（`{{ TODAY - P13Y }}`）；字段位置写 `@mode`（`create` / `update`）和 `@userId` 读上下文。

```ts
{ type: "field", field: "reasonDescription", hidden: ["reason", "!=", "Others"] }
```

`compileViewCondition` 交给 `Field` 一个依赖条件所读字段的 `dependsOn`，用 `evaluateFieldCondition`（`src/utils/field-constraints.ts`）判断——而不是 `Field` 对裸 FilterCondition 使用的过滤 UI 求值器（那里空值表示"不过滤"）。空值只等于空值，比较大小需要两边都有值，值按字段声明的类型转换：这是后端共用的语义，存到服务端的视图可以在服务端得到同样的答案。只读上下文的条件（`@mode`、`@userId`）随单据重新判断。

条件只决定字段的状态。计算出来的值——合计、差额、换算——属于模型（计算字段或级联字段）或 widget，这样单据的每个读者看到的值都一样。

## 渲染

```tsx
const children = renderFormView(view, { metaModel, isFieldShown, columns, userId });
const { plan } = useCompiledFormPlan(metaModel, children);
// …表单运行时，然后：
<FormViewBlocksProvider blocks={BLOCKS}>{children}</FormViewBlocksProvider>
```

- `renderFormView` 是函数而不是组件：返回手写页面会写出的元素树，交给 `ModelForm`、`DialogForm` 或共享运行时渲染。
- `metaModel`：模型没有的字段不显示——已删除，或对该用户隐藏（元数据不返回）——条件转换和 widget 校验需要的类型也来自它。
- `isFieldShown`：模型有、但不显示的字段；审批中心不显示审批读取没有返回的字段。
- `columns`：强制每个分节的列数，不管视图怎么写——窄面板用 1。
- 所有字段都不显示的分节不渲染。
- 字段类型不允许的 widget（`FIELD_TYPE_WIDGET_TYPE_MAP`）被忽略，使用字段的默认 widget。
- 字段上的 `columns` 变成一个 `tableView` 组件，每个节点、每个用户只生成一次：`Field` 从组件上读列，组件必须保持同一个引用。表格渲染表单值里的行，不分页，不发自己的请求。
- `block` 渲染最近的 `FormViewBlocksProvider` 按名字注册的组件；它从所在的表单读取单据（`useFormContext`）。没有注册的名字，原位置显示一句简短说明。

视图里无法按原样渲染的东西——未知的字段、widget、block 或节点类型——在开发环境各警告一次，然后跳过。表格和 block 渲染在 `FormViewBoundary` 里，它原样传递子元素（表单计划仍看得到其中的字段）：列里写了模型没有的字段的表格、或者抛错的 block，原位置显示同一句简短说明。存储的视图不会让页面出错。

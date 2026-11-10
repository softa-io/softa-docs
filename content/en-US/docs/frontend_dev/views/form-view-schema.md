# Form view schema

A form view as data: sections, fields, widgets, relation tables and conditions in plain JSON, rendered into the same components a hand-written page uses. The first user is the Home module's approval pages, whose views live in `src/app/home/record-views/`: one view per model, shown read-only to whoever follows or approves a request, and — for a self-service type its employee files there — rendered inside `ModelForm` to create and edit it, through the type's own applicant view where it names one and the blocks it registers, the conditions judged in create or update mode alike.

## Related Docs

- [ModelForm](./form)
- [Fields](../fields/fields)
- [Widget matrix](../fields/widgets)

## Why data, not JSX

- A definition can be stored and designed: nothing in it runs, so a view kept in a database, edited by a designer or written by a tenant cannot execute code. Code a view needs is registered under a name and named in the view (a widget, a block).
- The fields are known without rendering anything. A page's form plan finds its fields by walking JSX for `fieldName`, and a `<Field>` inside a custom component is invisible to it (`declareFields` exists for that). `renderFormView` returns the elements themselves, so the walk sees every field.
- The conditions are portable. `readonly` / `required` / `hidden` use the grammar of `sys_field.constraints`, which this client and the backend's `FilterEvaluator` both judge, with the same answers.

Hand-written pages stay JSX: what their code does is mostly behaviour — business actions, hooks, wizards — that a view does not describe. Both render the same `Field`s and widgets.

## Shape

```ts
interface FormViewSchema {
  schemaVersion: 1;
  model: string;
  body: ViewNode[];
}

type ViewNode =
  | string // shorthand for { type: "field", field: <the string> }
  | { type: "section"; label?; description?; columns?: 1 | 2 | 3 | 4; divided?; children: ViewNode[] }
  | { type: "group"; label?; separator?; children: ViewNode[] }
  | FieldNode
  | { type: "block"; component: string; props?: { [key: string]: JsonValue } };

interface FieldNode {
  type: "field";
  field: string;
  label?; description?; placeholder?; fullWidth?;
  widget?: string; // a WidgetType the field's type allows
  widgetProps?: { [key: string]: JsonValue };
  readonly?: ViewCondition;
  required?: ViewCondition;
  hidden?: ViewCondition;
  filters?: FilterCondition; // a relation's picker
  onChange?: string[] | { update?: string[]; with?: string[] | "all" }; // fields the server works out when this one changes
  filterBySource?: boolean; // a relation's picker sends the form's record, for the server to offer what fits it
  columns?: (string | FieldNode)[]; // a one-to-many / many-to-many as a table: the related model's fields
  orders?: [string, "ASC" | "DESC"][];
}

type ViewCondition = boolean | FilterCondition;
```

Each node is the data part of a component's props:

| Node | Renders | Carries |
| --- | --- | --- |
| `section` | `FormSection` | label, description, columns, divided |
| `group` | `Group` | label, separator |
| `field` | `Field` | fieldName, label, description, placeholder, fullWidth, widgetType, widgetProps, readonly / required / hidden, filters, onChange, filterBySource |
| `field.columns` | `RelationTable` through `tableView` | each column a field node; orders |
| `block` | a component the page registers | its name and props |

Not carried, because they are code: `dependsOn` function conditions, render functions such as `readCell`, `rules`, `tableView` / `formView` components. A section's permission gates are not carried either: who sees what is decided by the read that fills the view.

Not supported yet: tabs (`FormTab`) and a relation row's dialog (`formView`). Add them as nodes when a view needs them; bump `schemaVersion` only for a change stored views must be migrated for.

## Conditions

`ViewCondition` is `true` / `false`, or a FilterCondition in the grammar of `sys_field.constraints`: values may be `{{ @field }}` (another field of the record), `{{ TODAY }}` / `{{ YESTERDAY }}` / `{{ NOW }}` / `{{ USER_ID }}`, optionally with an ISO-8601 offset (`{{ TODAY - P13Y }}`); in the field slot, `@mode` (`create` / `update`) and `@userId` read the context.

```ts
{ type: "field", field: "reasonDescription", hidden: ["reason", "!=", "Others"] }
```

`compileViewCondition` hands `Field` a `dependsOn` over the fields the condition reads, judged by `evaluateFieldCondition` (`src/utils/field-constraints.ts`) — not by the filter UI's evaluator `Field` would use for a bare FilterCondition, where a blank side means "no filter". A blank value equals nothing but blank, ordering needs two values, values coerce by the declared field type: the semantics the backend shares, so a stored view can be enforced there with the same answers. A condition that reads only the context (`@mode`, `@userId`) is re-judged with the record.

Conditions only conclude a field's state. A computed value — a total, a difference, a conversion — belongs on the model (a computed or cascaded field) or in a widget, so every reader of the record sees the same value.

## Rendering

```tsx
const children = renderFormView(view, { metaModel, isFieldShown, columns, userId });
const { plan } = useCompiledFormPlan(metaModel, children);
// …the form runtime, then:
<FormViewBlocksProvider blocks={BLOCKS}>{children}</FormViewBlocksProvider>
```

- `renderFormView` is a function, not a component: it returns the element tree a hand-written page would hold, for `ModelForm`, `DialogForm` or the shared runtime to render.
- `metaModel`: a field the model lacks is left out — removed, or withheld from this user, whose metadata leaves it out — and the types conditions coerce by and widget checks need come from it.
- `isFieldShown`: a field to leave out though the model has it; the approval center leaves out what the approval read did not return.
- `columns`: every section's column count, whatever the view says — one in a narrow panel.
- A section whose every field is left out is not rendered.
- A widget the field's type does not allow (`FIELD_TYPE_WIDGET_TYPE_MAP`) is ignored and the field's default widget used.
- `columns` on a field becomes a `tableView` component, made once per node and user: `Field` reads the columns off the component, which must keep its identity. The table renders the rows in the form's value; it is not paged, so it makes no request of its own.
- A `block` renders the component registered under its name by the nearest `FormViewBlocksProvider`; it reads the record from the form it sits in (`useFormContext`). A name nothing registers leaves a short note in its place.

Problems a view cannot be rendered with as written — an unknown field, widget, block or node type — are warned about in development, once each, and skipped. A table and a block render inside `FormViewBoundary`, which passes its children through (the planner still sees the fields in them): a table whose columns name a field its model lacks, or a block that throws, leaves the same short note in its place. A stored view never fails the page.

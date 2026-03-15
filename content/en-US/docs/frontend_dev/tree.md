# Tree Internals

Tree primitives in this folder are internal implementation details.

Business-facing entry points live elsewhere:

- `ModelTable.sideTree`
  - primary doc: [ModelTable](./table)
  - use for list pages that need a left tree filter panel
- `Field widgetType="SelectTree"`
  - primary doc: [Relation fields](./fields/relations)
  - use for hierarchical relation selection inside forms and inline editors

Internal building blocks in this folder:

- `Tree`
- `TreePanel`
- `SelectTreePanel`

Documentation intent:

- if you are building page-level list filtering, read `ModelTable` docs first
- if you are building a form field, read `Field` / widget docs first
- only read this file when maintaining tree infrastructure itself

These files are still used by table and widget infrastructure, but they are not part of the recommended business API surface.

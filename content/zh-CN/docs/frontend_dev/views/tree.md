# Tree 内部实现

本目录中的 Tree 原语属于内部实现细节。

业务入口在别处：

- `ModelTable.sideTree`
  - 主文档：[ModelTable](./table)
  - 用于需要左侧树形筛选的列表页
- `Field widgetType="SelectTree"`
  - 主文档：[Relation fields](../fields/relations)
  - 用于表单与行内编辑器中的层级关联选择

本文件夹中的内部构建块：

- `Tree`
- `TreePanel`
- `SelectTreePanel`

文档意图：

- 若你在做页面级列表筛选，请先读 `ModelTable` 文档
- 若你在做表单字段，请先读 `Field` / 控件文档
- 仅在你维护树基础设施本身时才需要读本文件

这些文件仍被表格与控件基础设施使用，但不属于推荐的业务 API 面。

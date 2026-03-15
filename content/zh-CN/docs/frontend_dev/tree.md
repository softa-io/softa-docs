# Tree 内部实现

此目录下的 Tree 原语属于内部实现细节。

面向业务代码的入口位于其他位置：

- `ModelTable.sideTree`
  - 主文档：[ModelTable](./table)
  - 用于需要左侧树筛选面板的列表页
- `Field widgetType="SelectTree"`
  - 主文档：[关联字段](./fields/relations)
  - 用于表单和内联编辑器中的层级关联选择

此目录中的内部构件：

- `Tree`
- `TreePanel`
- `SelectTreePanel`

文档定位：

- 如果你在做页面级列表筛选，请先阅读 `ModelTable` 文档
- 如果你在做表单字段，请先阅读 `Field` / widget 文档
- 只有在维护 tree 基础设施本身时，才需要阅读这个文件

这些文件仍然被表格和 widget 基础设施使用，但它们不属于推荐的业务 API 对外表面。

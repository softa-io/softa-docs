# 通用查询条件

## 1、中缀表达式

中缀表达式是最常见的表达式书写方式，特点是运算符位于两个操作数的中间。在日常数学计算和逻辑表达中非常普遍。例如， `1 < 2` 就是一个非常简单的中缀表达式。在计算机领域，几乎所有的高级编程语言，都使用中缀表达式作为算术和逻辑运算的基础，如 `amount > 100` 。

由于中缀表达式的直观易懂，符合人类的思维习惯，并且可以组合出复杂的逻辑表达式，因此，Softa 采用中缀表达式来构造数据查询条件。

中缀表达式非常灵活，既能够表达简单的二元关系，如 `a > b`，又能构建嵌套结构的复杂查询条件，如 `(a > b AND c < d) OR (e = f AND g != h)`。使用中缀表达式时有一个明确的规则，必须使用括号来明确表达不同条件组合的优先级。

其它运算表达式：

**（1）波兰表达式（前缀表达式）**：是一种将运算符置于操作数之前的表示方法，计算顺序从右向左，易于计算机解析和执行，但组合条件的可读性比较差。

**（2）逆波兰表达式（后缀表达式）**：与波兰表达式相反，将运算符置于操作数之后，计算顺序从左向右。同样，易于计算机执行计算过程，但是组合条件可读性比较差。

## 2、Operator 比较操作符

| 序号 | 操作符 | 代码枚举 | 含义 | 备注 |
| --- | --- | --- | --- | --- |
| 1 | = | EQUAL | 等于 |  |
| 2 | != | NOT_EQUAL | 不等于 |  |
| 3 | > | GREATER_THAN | 大于 |  |
| 4 | >= | GREATER_THAN_OR_EQUAL | 大于等于 |  |
| 5 | < | LESS_THAN | 小于 |  |
| 6 | <= | LESS_THAN_OR_EQUAL | 小于等于 |  |
| 7 | CONTAINS | CONTAINS | 包含 | 文本搜索，不支持索引 |
| 8 | NOT CONTAINS | NOT_CONTAINS | 不包含 | 文本搜索，不支持索引 |
| 9 | START WITH | START_WITH | 以……开始 | 文本搜索，支持索引 |
| 10 | NOT START WITH | NOT_START_WITH | 不以......开始 | 文本搜索，支持索引 |
| 11 | IN | IN | 在……中 |  |
| 12 | NOT IN | NOT_IN | 不在……中 |  |
| 13 | BETWEEN | BETWEEN | 在 … 和 … 之间 | 闭区间 |
| 14 | NOT BETWEEN | NOT_BETWEEN | 不在 … 和 … 之间 | 开区间 |
| 15 | IS SET | IS_SET | 已设置过值 |  |
| 16 | IS NOT SET | IS_NOT_SET | 未设置过值 |  |
| 17 | PARENT OF | PARENT_OF | 查询所有上级 | 允许多值，支持索引 |
| 18 | CHILD OF | CHILD_OF | 查询所有下级 | 允许多值，支持索引 |

### 2.1 `CONTAINS` 和 `NOT CONTAINS`

文本搜索，`CONTAINS` 和 `NOT CONTAINS` 分别对应 SQL 查询 `LIKE` 和 `NOT LIKE` 的**模糊匹配**。这两个操作符都不支持索引。

### 2.2 `START WITH` 和 `NOT START WITH`

`START WITH` 和 `NOT START WITH` 仅用于字符串的搜索匹配，分别对应 SQL查询 `LIKE` 和 `NOT LIKE` 的**前缀匹配**模式。这两个操作符是为了应对大数据量的直接搜索，可以支持数据库索引，在不考虑将数据存储到专用的搜索引擎时使用。

### 2.3 `IN` 和 `NOT IN`

支持多值匹配，Value 是数据集合形式。如 `a IN [1, 2, 3]`

### 2.4 `BETWEEN` 和 `NOT BETWEEN`

`BETWEEN` 是闭区间，Value是一个包含两个元素的数据列表，匹配范围包含左右两个元素本身，如 `a ≤ field ≤ b`。

`NOT BETWEEN` 是开区间，匹配范围不包含左右两个元素本身，如 `field < a OR field > b`。

### 2.5 `IS SET` 和 `IS NOT SET`

`IS SET` 表示该字段已经设置过值，等同于 SQL 条件  `IS NOT NULL` 。

`IS NOT SET` 表示该字段未设置过值，等同于 SQL 条件  `IS NULL` 。

### 2.6 `PARENT OF` 和 `CHILD OF`

在树形数据结构中，经常需要递归查询指定节点的所有父级节点，或指定节点的所有子节点，如上下级组织关系等。而且，这里的指定节点，根据业务场景的不同，可能是一个节点，也可能是多个节点。

Softa 为了提高此类场景的查询性能，采用了 `ID 路径查询`  的机制，实现通过一条 SQL 查询出所有父节点或所有子节点。

（1）需要进行上下级查询的业务模型，如部门，增加 idPath 字段

（2）转为 id IN split(idPath, '/')

（3）等同于 START_WITH ，转为左匹配 (id_path LIKE 'idPath%')

## 3、Filters 通用筛选条件

在企业级业务系统中，经常出现复合的筛选条件，如专业用户在客户端通过自定义搜索条件筛选数据，以及服务端根据业务属性组合条件控制数据访问范围，这些场景都需要系统支持动态组合的筛选条件。

Softa 通过定义 Filters 对象，封装常见的数据转换和比较函数，在代码中传递和操作筛选条件。

### 3.1 Filters 结构化查询

结构化定义的 Filters 分为 Unit、Tree、Empty 三种类型，分别对应最小查询单元、查询结构树、空条件。所有的查询条件使用中缀表达式表示。支持客户端以单个字符串或字符串列表两种形式传递参数，如果是字符串格式，服务端程序将通过 JSON 反序列化字符串为 Filters 对象，如果是字符串列表，则直接调用 Filters 解析函数。

（1）**最小查询单元**

Filter的最小查询单元对象为 `FilterUnit`，结构为 `[field, operator, value]` ，即 `[字段名，操作符，比较值]`，如查询名称等于 `Tom` 的用户： `["name", "=", "Tom"]`。

`FilterUnit` 的操作符 `operator` 对大小写不敏感。具体支持的操作符清单，参考 `Operator 比较操作符` 章节。

（2）**查询结构树**

查询结构树，也即多个查询单元的嵌套与组合。如 `[A OR B] AND [C OR D OR [E AND F] OR G]`，其中，每个独立的大写字母，都代表一个 `[field, operator, value]` 结构的最小查询单元 `FilterUnit` 。示例如下：
`[["name", "=", "Tom"], "OR", ["code", "=", "A100"]], "AND", ["priority", ">", 1]]`

查询结构树支持组合条件的无限嵌套。其中，查询条件之间的逻辑操作符仅接受 `AND` 和 `OR`，对大小写不敏感，未传递逻辑操作符时默认为 AND。如 `[["name", "=", "Tom"], ["priority", ">", 1]]`  的逻辑操作符默认为 `AND`。

（3）**字段间比较**

Softa 支持在筛选条件中，进行字段间比较。比如在需要筛选 `fieldA > fieldB` 数据的场景 ，可以将 `FilterUnit: [field, operator, value]` 结构的 value属性，替换为保留字段名的占位符  `@{fieldName}` ，如 `["fieldA", ">", "@{FieldB}"]`。


### 3.2 Filters 级联查询

在企业级业务系统中，经常会遇到级联查询的场景，Softa 支持通过链式操作符 `.` 连接关系型字段，基于关联模型的数据条件，查询主模型的数据。

级联查询的定义格式为 `[field1.field2.field3.field4Name, operator, value]`，除末级字段外，字段链上字段类型只能是OneToOne、ManyToOne、OneToMany、ManyToMany类型。可以在全局配置参数中限定最大级联层级。如 `customerId.industryId.name = "互联网"` 表示查询互联网行业客户的订单数据。

Softa 的级联查询，支持 Filters 中包含多个级联条件、多级级联等复合查询条件，也即每一个查询单元 FilterUnit 都可以是级联查询。

级联查询是一种高级查询技术，它作为系统支持复杂业务需求的补充手段，允许用户执行多层次的数据关联查询。在OneToOne、ManyToOne级联字段查询场景中，服务端会通过多表 join 查询查询数据，如果遇到高频的多层次级联查询场景，应当从模型结构上进行优化，比如在业务表中增加冗余字段，减少级联查询的层级，提升查询的性能。对于大数据量的关联查询场景，考虑使用ES检索引擎。

### 3.3 XToMany 查询条件

在 Softa 上下文中，XToMany 代表了 OneToMany、ManyToMany 这两种字段类型，这两种字段类型的数据处理，在很多场景下的具有一定的相似性。

在查询条件中遇到 OneToMany、ManyToMany 字段时，Softa 会先根据 Many 端模型的筛选条件查询数据，将查询结果聚合到主模型的查询条件后，再执行最终的主模型数据查询，也即至少经过两次 SQL 查询。

OneToMany、ManyToMany 字段的查询条件，跟其它字段类型的逻辑处理稍有不同。当筛选条件操作符为肯定式（即不包含 NOT 类型的操作符），任意一条关联模型的数据命中时，则代表命中关联的主模型数据。否定式子查询（操作符为`NOT EQUAL, NOT CONTAINS, NOT IN`），关联模型的数据都不命中时，才返回关联的主模型数据。

## 4、Filters 语义化查询
### 4.1 Filters 语义化查询简介

在客户端查询场景中，专业用户可以通过定义 `DSL` 查询数据，如 `name = "Tom" OR total > 200` 此时，需要提供尽可能简化、但又保持灵活性不变的 `Filters` 定义方法。Softa 除了支持结构化的查询方法，也支持使用语义化的字符串进行查询。

* 语义化查询，示例1：
```
name = "Tom" OR code = "A100"
```
等价于结构化查询:
```
[
    ["name", "=", "Tom"],
    "OR",
    ["code", "=", "A100"]
]
```
* 语义化查询，示例2：
```
(name = "Tom" OR code = "A100") AND priority > 1
```
等价于结构化查询
```
[
    [
        ["name", "=", "Tom"],
        "OR",
        ["code", "=", "A100"]
    ],
    "AND",
    ["priority", ">", 1]
]
```

在语义化查询中，如果 value 值是字符串类型，仍然需要保留双引号，如果 value 值类型是多个值，需要使用 `[]` 中括号。

### 4.2 语义化查询的实现

在语义化查询场景，Softa 使用 `ANTLR` 语法解析，将用户输入的语义表达式转换成 `Filters` 对象。其中语法解析规则定义如下：

```js
grammar FilterExpr;

expr:   expr AND expr               # AndExpr
    |   expr OR expr                # OrExpr
    |   '(' expr ')'                # ParenExpr
    |   unit                        # UnitExpr
    ;

AND:    'AND';
OR:     'OR';

unit:   FIELD OPERATOR value        # FilterUnitExpr
    ;

value: singleValue                  # SingleValueExpr
     | listValue                    # ListValueExpr
     ;

singleValue: NUMBER
           | BOOLEAN
           | QUOTED_STRING
           ;

listValue: '[' singleValue (',' singleValue)* ']'
          ;

FIELD:  [a-z][a-zA-Z0-9]*;
OPERATOR: '='
        | '!='
        | '>'
        | '>='
        | '<'
        | '<='
        | 'CONTAINS'
        | 'NOT CONTAINS'
        | 'START WITH'
        | 'NOT START WITH'
        | 'IN'
        | 'NOT IN'
        | 'BETWEEN'
        | 'NOT BETWEEN'
        | 'IS SET'
        | 'IS NOT SET'
        | 'PARENT OF'
        | 'CHILD OF';

NUMBER: [0-9]+ ('.' [0-9]+)?;
BOOLEAN: 'true' | 'false';
QUOTED_STRING: '"' (~["\\] | '\\' .)* '"';  // Double-quoted string, supports escape characters

WS: [ \t\r\n]+ -> skip;                     // Ignore whitespace
```

语义搜索表达式的 visitor 定义如下：

```java
public class FilterExprVisitorImpl extends FilterExprBaseVisitor<Filters> {
    @Override
    public Filters visitParenExpr(FilterExprParser.ParenExprContext ctx) {
        return visit(ctx.expr());
    }

    @Override
    public Filters visitAndExpr(FilterExprParser.AndExprContext ctx) {
        Filters left = visit(ctx.expr(0));
        Filters right = visit(ctx.expr(1));
        return Filters.and(left, right);
    }

    @Override
    public Filters visitOrExpr(FilterExprParser.OrExprContext ctx) {
        Filters left = visit(ctx.expr(0));
        Filters right = visit(ctx.expr(1));
        return Filters.or(left, right);
    }

    @Override
    public Filters visitUnitExpr(FilterExprParser.UnitExprContext ctx) {
        if (ctx.unit() instanceof FilterExprParser.FilterUnitExprContext unitContext) {
            String field = unitContext.FIELD().getText();
            Operator operator = Operator.of(unitContext.OPERATOR().getText());
            Object value = parseValue(unitContext.value());
            return Filters.of(field, operator, value);
        }
        throw new IllegalArgumentException("Unsupported unit expression: " + ctx.unit().getClass().getName());
    }

    private Object parseValue(FilterExprParser.ValueContext ctx) {
        if (ctx instanceof FilterExprParser.SingleValueExprContext singleValueCtx) {
            FilterExprParser.SingleValueContext singleValue = singleValueCtx.singleValue();
            return parseSingleValue(singleValue);
        } else if (ctx instanceof FilterExprParser.ListValueExprContext listValueCtx) {
            List<Object> list = new ArrayList<>();
            if (listValueCtx.listValue() instanceof FilterExprParser.ListValueContext valueListContext) {
                for (FilterExprParser.SingleValueContext valueCtx : valueListContext.singleValue()) {
                    list.add(parseSingleValue(valueCtx)); // Recursively parse each value in the list
                }
            }
            return list;
        }
        throw new IllegalArgumentException("Unsupported value context");
    }
}
```

### 4.3 两种方式的性能比较

使用 JMH 进行基准测试，1s 内执行 `10,000` 次，分别解析如下查询条件：

（1）语义化查询
```
((name = "Te st" AND code IN ["A01"]) OR version NOT IN [1]) AND priority != 21
```
（2）结构化场景
```
[
    [
        [
            ["name", "=", "Te st"],
            "AND",
            ["code", "IN", ["A01"]]
        ],
        "OR",
        ["version", "NOT IN", [1]]
    ],
    "AND",
    ["priority","!=",21]
]
```

测试结果如下：

![Performance](/image/query_performance.png)

测试结果说明，使用结构化查询解析效率相对较高。因此，Softa 服务端默认使用结构化查询和存储，同时，支持客户端语义化查询。但这并与意味着使用语义化查询效率很低，客户端完全可以从用户体验角度考虑使用语义化查询，或自然语言查询。

### 4.4 基于 AI 的自然语言查询
语义化查询是一种介于自然语言查询与结构化查询之间的方法。在 `AI Agent` 应用场景中，AI 能够利用模型元数据将自然语言查询转换为语义化查询，以执行复杂的数据查询。

为什么不直接将自然语言转换为 `SQL` 语句？在企业级业务系统中，一个查询过程不仅包括用户指定的查询条件，还需考虑用户权限范围、模型的查询约束，以及可能涉及的选项集、用户语言、关联模型数据和动态计算数据等因素。Softa 已经在其语义化查询和结构化查询的底层实现中支持这些场景。

因此，将用户的自然语言转换为系统支持的语义化查询条件，是实现 AI Agent 与业务系统整合的一个有效途径。

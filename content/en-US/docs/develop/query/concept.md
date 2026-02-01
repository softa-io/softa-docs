# Query Condition

## 1. Infix Notation

Infix notation is the most common way of writing expressions, characterized by the operator being placed between two operands. It is very common in everyday mathematical calculations and logical expressions. For example, `1 < 2` is a very simple infix expression. In the field of computer science, almost all high-level programming languages use infix notation as the basis for arithmetic and logical operations, such as `amount > 100`.

Due to the intuitive and easy-to-understand nature of infix notation, which aligns with human thinking habits and can combine complex logical expressions, Softa uses infix notation to construct data query conditions.

Infix notation is very flexible. It can express simple binary relations, such as `a > b`, and can also construct complex nested query conditions, such as `(a > b AND c < d) OR (e = f AND g != h)`. There is a clear rule when using infix notation: parentheses must be used to clearly express the priority of different condition combinations.

Other types of expression notation:

**(1) Polish Notation (Prefix Notation)**: This is a method of placing the operator before the operands, with the calculation order from right to left. It is easy for computers to parse and execute, but the readability of combined conditions is relatively poor.

**(2) Reverse Polish Notation (Postfix Notation)**: Contrary to Polish notation, it places the operator after the operands, with the calculation order from left to right. Similarly, it is easy for computers to execute the calculation process, but the readability of combined conditions is relatively poor.

## 2. Comparison Operators

| Number | Operator | Code Enum | Meaning | Remarks |
|--------|----------|-----------|---------|---------|
| 1 | = | EQUAL | Equal to | |
| 2 | != | NOT_EQUAL | Not equal to | |
| 3 | > | GREATER_THAN | Greater than | |
| 4 | >= | GREATER_THAN_OR_EQUAL | Greater than or equal to | |
| 5 | < | LESS_THAN | Less than | |
| 6 | <= | LESS_THAN_OR_EQUAL | Less than or equal to | |
| 7 | CONTAINS | CONTAINS | Contains | Text search, does not support indexing |
| 8 | NOT CONTAINS | NOT_CONTAINS | Does not contain | Text search, does not support indexing |
| 9 | START WITH | START_WITH | Starts with | Text search, supports indexing |
| 10 | NOT START WITH | NOT_START_WITH | Does not start with | Text search, supports indexing |
| 11 | IN | IN | In | |
| 12 | NOT IN | NOT_IN | Not in | |
| 13 | BETWEEN | BETWEEN | Between | Closed interval |
| 14 | NOT BETWEEN | NOT_BETWEEN | Not between | Open interval |
| 15 | IS SET | IS_SET | Has been set | |
| 16 | IS NOT SET | IS_NOT_SET | Has not been set | |
| 17 | PARENT OF | PARENT_OF | Queries all ancestors | Allows multiple values, supports indexing |
| 18 | CHILD OF | CHILD_OF | Queries all descendants | Allows multiple values, supports indexing |

### 2.1 `CONTAINS` and `NOT CONTAINS`

`CONTAINS` and `NOT CONTAINS`, are equivalent to `LIKE` and `NOT LIKE` in SQL, and used for text search matching. Neither operator supports indexing.

### 2.2 `START WITH` and `NOT START WITH`

`START WITH` and `NOT START WITH` are solely for string search matches, respectively corresponding to SQL queries' `LIKE` and `NOT LIKE` **prefix matching**. These operators are meant for direct searches in large datasets and can support database indexing when not considering storing data in a specialized search engine.

### 2.3 `IN` and `NOT IN`

Supports multiple value matching, where Value is in a collection format, such as `a IN [1, 2, 3]`.

### 2.4 `BETWEEN` and `NOT BETWEEN`

`BETWEEN` signifies a closed interval, with Value being a data list containing two elements, including the range itself at both ends, like `a ≤ field ≤ b`.

`NOT BETWEEN` signifies an open interval, excluding the range itself at both ends, like `field < a OR field > b`.

### 2.5 `IS SET` and `IS NOT SET`

`IS SET` indicates that a field has been set, equivalent to the SQL condition `IS NOT NULL`.

`IS NOT SET` indicates that a field has not been set, equivalent to the SQL condition `IS NULL`.

### 2.6 `PARENT OF` and `CHILD OF`

In tree-structured data, it is often necessary to recursively query all parent nodes or all child nodes of a specified node, such as hierarchical organizational relationships. Depending on the business scenario, the specified node may be a single node or multiple nodes.

To enhance query performance in such scenarios, Softa employs an `ID path query` mechanism, enabling the retrieval of all parent or child nodes with a single SQL query.

1. Business models requiring hierarchical queries, like departments, add an `idPath` field.
2. Convert to `id IN split(idPath, '/')`.
3. Equivalent to `START_WITH`, convert to left match `(id_path LIKE 'idPath%')`.

## 3. Filters Universal Filtering Conditions

In enterprise-level business systems, composite filtering conditions are often encountered. For example, professional users may filter data on the client side using custom search conditions, and the server side may control data access scopes based on business attributes. These scenarios require the system to support dynamically composed filtering conditions.

Softa supports this by defining `Filters` objects, which encapsulate common data transformation and comparison functions. These Filters objects are used to pass and manipulate filtering conditions in the code.

### 3.1 Structured Query Filters

Structured Filters are categorized into Unit, Tree, and Empty types, corresponding to the smallest query unit, query structure tree, and empty condition, respectively. All query conditions are expressed using infix notation. Clients can pass parameters as either a single string or a list of strings; if in string format, server-side programs deserialize the string into a Filters object, and if a list of strings, directly invoke Filters parsing function.

- **Smallest Query Unit:** The smallest query unit, `FilterUnit`, is structured as `[field, operator, value]`, such as querying users named `Tom`: `["name", "=", "Tom"]`. The `operator` in `FilterUnit` is case-insensitive. For a list of supported operators, see the Comparison Operators section.

- **Query Structure Tree:** A query structure tree combines multiple query units nested together. For example, `[["name", "=", "Tom"], "OR", ["code", "=", "A100"]], "AND", ["priority", ">", 1]]` supports infinitely nested combined conditions. Logical operators between query conditions accept only `AND` and `OR`, are case-insensitive, and default to `AND` if not provided.

- **Field Comparison:** Softa supports field comparisons within filtering conditions, such as `fieldA > fieldB`, by replacing the `value` attribute in `FilterUnit: [field, operator, value]` with a placeholder for the reserved field name `@{fieldName}`, like `["fieldA", ">", "@{FieldB}"]`.

### 3.2 Filters Cascading Query

In enterprise-level business systems, cascading query scenarios are often encountered. Softa supports connecting relational fields through the chain operator (`.`) to query the main model's data based on the associated model's data conditions.

The format for defining a cascading query is `[field1.field2.field3.field4Name, operator, value]`. Except for the last-level field, the field types in the field chain can only be OneToOne, ManyToOne, OneToMany, or ManyToMany. The maximum cascading level can be limited in global configuration parameters. For example, `customerId.industryId.name = "Internet"` indicates querying order data where the customer's industry is `Internet`.

Softa's cascading query supports multiple cascading conditions and multi-level cascades in Filters, meaning each query unit, `FilterUnit`, can be a cascading query.

Cascading queries are an advanced query technique, serving as a supplementary means for the system to support complex business needs. They allow users to execute multi-level data association queries. In OneToOne and ManyToOne cascading field query scenarios, the server performs multi-table join queries. If high-frequency multi-level cascading query scenarios are encountered, the model structure should be optimized, such as by adding redundant fields in business tables to reduce the levels of cascading queries and improve query performance. For large data volume association query scenarios, consider using the ES search engine.

### 3.3 XToMany Query Conditions

In the context of Softa, XToMany represents the field types OneToMany and ManyToMany. The data handling for these two field types has certain similarities in many scenarios.

When encountering OneToMany or ManyToMany fields in query conditions, Softa first queries data based on the filtering conditions of the Many-side model. The query results are then aggregated into the main model's query conditions before executing the final query on the main model's data, which means at least two SQL queries are performed.

The query conditions for OneToMany and ManyToMany fields differ slightly from the logical processing of other field types. When the filtering condition operator is affirmative (i.e., not containing NOT-type operators), if any data in the associated model matches, it indicates that the associated main model data is matched. For negative subQueries (operators like `NOT EQUAL, NOT CONTAINS, NOT IN`), the associated main model data is returned only if none of the associated model's data matches.

## 4. Filters Semantic Query
### 4.1 Introduction to Filters Semantic Query

In client-side query scenarios, professional users can define `DSL` to query data, such as `name = "Tom" OR total > 200`. At this point, it is necessary to provide a `Filters` definition method that is as simplified as possible while maintaining flexibility. In addition to supporting structured query methods, Softa also supports using semantic strings for queries.

* Semantic query, example 1:
```
name = "Tom" OR code = "A100"
```
is equivalent to the structured query:
```
[
    ["name", "=", "Tom"],
    "OR",
    ["code", "=", "A100"]
]
```
* Semantic query, example 2:
```
(name = "Tom" OR code = "A100") AND priority > 1
```
is equivalent to the structured query:
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
In semantic queries, if the value is of string type, double quotes should still be retained. If the value is of multiple values, square brackets `[]` should be used.

### 4.2 Implementation of Semantic Query

In semantic query scenarios, Softa uses `ANTLR` syntax parsing to convert user input semantic expressions into `Filters` objects. The syntax parsing rules are defined as follows:

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
        | 'LIKE'
        | 'NOT LIKE'
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

The visitor definition for semantic search expressions is as follows:

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
        return Filters.merge(LogicOperator.AND, left, right);
    }

    @Override
    public Filters visitOrExpr(FilterExprParser.OrExprContext ctx) {
        Filters left = visit(ctx.expr(0));
        Filters right = visit(ctx.expr(1));
        return Filters.merge(LogicOperator.OR, left, right);
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

### 4.3 Performance Comparison of Two Methods

Using JMH for benchmarking, each query condition was parsed 10,000 times within 1 second:

(1) Semantic Query
```
((name = "Te st" AND code IN ["A01"]) OR version NOT IN [1]) AND priority != 21
```
(2) Structured Query
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

The test results are as follows:

![Performance](/image/query_performance.png)

The test results indicate that structured query parsing is relatively more efficient. Therefore, Softa server by default uses structured queries and storage, while also supporting client-side semantic queries. However, this does not mean that semantic query efficiency is very low. From a user experience perspective, clients can fully consider using semantic queries or natural language queries.

### 4.4 AI-Based Natural Language Query

Semantic query is a method that lies between natural language query and structured query. In `AI Agent` application scenarios, AI can leverage model metadata to convert natural language queries into semantic queries to perform complex data queries.

Why not directly convert natural language into `SQL` statements? In enterprise-level business systems, a query process not only includes the query conditions specified by the user but also needs to consider user permissions, model query constraints, and factors such as option sets, user language, associated model data, and dynamically calculated data. Softa already supports these scenarios in its underlying implementation of semantic and structured queries.

Therefore, converting the user's natural language into system-supported semantic query conditions is an effective way to achieve the integration of `AI Agents` with business systems.

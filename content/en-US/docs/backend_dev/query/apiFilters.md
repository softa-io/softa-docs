# General Query in API

## 1. Introduction to QueryParams

`QueryParams` provides a flexible and structured way to define query conditions for API endpoints, enabling precise data retrieval based on filters, sorting, grouping, and extensions.

## 2. Filters with Infix Expressions

Filters use infix expressions to define conditions for querying data. These expressions can target objects, strings, semantics, or even AI-assisted queries.

### 2.1 Object Queries

Object queries are defined using arrays to represent conditions. Examples:

- **Empty Query**:
  []

- **Single Condition**:
  ["name", "=", "IT"]

- **Multiple Conditions**:
  [["name", "=", "IT"], ["level", "=", 6]]

- **Compound Conditions with Logical Operators**:
  - Using `OR`:
    [["name", "=", "IT"], "OR", ["code", "=", "A010"], "OR", ["level", "=", 2]]

  - Combining `OR` and `AND`:
    [["name", "=", "IT"], "OR", ["code", "=", "A010"]], "AND", ["level", "=", 2]

### 2.2 String Queries

String-based queries allow conditions to be expressed as simple strings. They are often used for easier readability or when conditions are straightforward.

### 2.3 Semantic Queries

Semantic queries utilize human-friendly syntax to express conditions, enabling more intuitive and readable query definitions.

### 2.4 Query Extensions: AI Queries

AI-assisted queries allow leveraging machine learning or natural language processing to define dynamic and context-aware conditions.

## 3. Orders: Sorting Conditions

Define sorting criteria to order the results of a query. For example:

- Ascending order:
  ["name", "ASC"]

- Descending order:
  ["date", "DESC"]

## 4. groupBy: Grouping Conditions

Grouping conditions specify how data should be aggregated based on specific fields. For instance:

- Group by a single field:
  ["department"]

- Group by multiple fields:
  ["department", "role"]
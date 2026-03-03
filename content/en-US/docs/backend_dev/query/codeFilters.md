# General Query Conditions

## 1. FlexQuery Dynamic Queries

### 1.1 Single Model Query
```java
// SELECT name, code FROM table WHERE name = 'PM' AND code = '001'
FlexQuery flexQuery = new FlexQuery()
    .select("name", "salary")
    .where(new Filters().eq("name", "PM").eq("code", "001"));
// Equivalent to:
flexQuery = new FlexQuery()
    .select(Job::getName, Job::getSalary)
    .where(new Filters().eq(Job::getName, "PM").eq(Job::getCode, "001"));
// Execute query
List<Job> jobs = this.searchList(flexQuery);
```

Professional implementation:
```java
private List<DesignAppVersion> getHistoricalVersion(Long envId) {
    List<String> fields = ListUtils.getLambdaFields(
            DesignAppVersion::getName,
            DesignAppVersion::getAppId,
            DesignAppVersion::getLocked,
            DesignAppVersion::getPublished);
    Filters filters = new Filters().eq(DesignAppVersion::getEnvId, envId)
            .eq(DesignAppVersion::getLocked, false);
    FlexQuery flexQuery = new FlexQuery().select(fields).where(filters);
    return this.searchList(flexQuery);
}
```

### 1.2 Associated Query for OneToMany Data
Assume the Department model is defined as follows:
```java
public class Department {
    private String name;
    private List<Employee> employees;
    private List<Position> positions;
}
```

To query a specific department by ID and retrieve all employees and positions within the department:
```java
SubQueries subQueries = new SubQueries().expand(Department::getEmployees)
        .expand(DesignModel::getPositions);
Department dept = this.getById(id, subQueries);
```

Other examples:
```java
// When retrieving the import template, also retrieve the list of import fields under that template
SubQueries subQueries = new SubQueries().expand(ImportTemplate::getImportFields);
ImportTemplate importTemplate = importTemplateService.getById(templateId, subQueries);
```

## 2. Filters Object Construction
Using the Job model in an online recruitment system as an example, which includes several simple attributes:
```java
public class Job {
    private String title;     // Job title
    private Integer grade;    // Job grade: 1-20
    private String status;    // Job status: Open, Closed, Cancelled
    private Integer salary;   // Minimum salary, in K
}
```

### 2.1 Simple `AND` Condition Query
All query operations support declaring fields with `Lambda` expressions (e.g., `Job::getTitle`, `Job::getGrade`) or string declarations (e.g., `"title"`, `"grade"`).
For professional code, `Lambda` expressions are recommended to avoid typos and issues during field refactoring. In special cases, string declarations can be used.

1. Construct `filters1` and `filters2`:
```java
// WHERE title = 'PM'
Filters filters1 = new Filters().eq(Job::getTitle, "PM");
// WHERE grade > 6
Filters filters2 = new Filters().gt(Job::getGrade, 6);
```

Using string field declarations:
```java
Filters filters1 = new Filters().eq("title", "PM");
Filters filters2 = new Filters().gt("grade", 6);
```

> All field declaration methods support both `Lambda` and string formats. Their correspondence is as follows:
> - `Job::getTitle` -> `"title"`
> - `Job::getGrade` -> `"grade"`
> - `Job::getStatus` -> `"status"`
> - `Job::getSalary` -> `"salary"`

2. Combine `filters1` and `filters2` with `AND` logic. The following are equivalent:
```java
// .and(filters): A non-static method accepting a single filters parameter
Filters filters3 = filters1.and(filters2);
// .and(filters1, filters2, Filters...): A static method requiring at least two filters parameters
filters3 = Filters.and(filters1, filters2);
// Filters default to `AND` logic
filters3 = new Filters().eq(Job::getTitle, "PM").gt(Job::getGrade, 6);
filters3 = Filters.and().eq(Job::getTitle, "PM").gt(Job::getGrade, 6);
```

3. `filters3` is equivalent to the following SQL statement:
```sql
WHERE title = 'PM' AND grade > 6
```

### 2.2 Simple `OR` Condition Query
1. Construct `filters4` and `filters5`:
```java
// WHERE status = 'Open'
Filters filters4 = new Filters().eq(Job::getStatus, "Open");
// WHERE salary < 30
Filters filters5 = new Filters().lt(Job::getSalary, 30);
```

2. Combine `filters4` and `filters5` with `OR` logic. The following are equivalent:
```java
// .or(filters): A non-static method accepting a single filters parameter
Filters filters6 = filters4.or(filters5);
// .or(filters4, filters5, Filters...): A static method requiring at least two filters parameters
filters6 = Filters.or(filters4, filters5);
filters6 = Filters.or().eq(Job::getStatus, "Open").lt(Job::getSalary, 30);
```

3. `filters6` is equivalent to the following SQL statement:
```sql
WHERE status = 'Open' OR salary < 30
```

### 2.3 Compound Query Conditions: Combining with `AND` Logic
1. Combine `filters1`, `filters2`, and `filters6` into a single `AND` query condition. The following are equivalent:
```java
// filters1 = new Filters().eq(Job::getTitle, "PM");
// filters2 = new Filters().gt(Job::getGrade, 6);
// filters6 = Filters.or().eq(Job::getStatus, "Open").lt(Job::getSalary, 30);
// filters6 is internally an `OR` logic
Filters filters7 = filters1.and(filters2).and(filters6);
filters7 = filters6.and(filters1).and(filters2);
filters7 = Filters.and(filters1, filters2, filters6);
```

2. `filters7` is equivalent to the following SQL statement:
```sql
WHERE title = 'PM' AND grade > 6 AND (status = 'Open' OR salary < 30)
```

### 2.4 Other Uses
1. Merging multiple filters objects:
```java
// Assume List<Filters> filtersList = Lists.newArrayList(filters1, filters2, filters3);
Filters filters = Filters.and(filtersList);
```

## 3. Orders Object Construction

## 4. SubQueries Object Construction
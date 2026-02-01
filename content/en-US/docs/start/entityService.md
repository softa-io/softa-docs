# Building a Pro-code Application

## 1. Filters
```java

```

For more details, refer to the [Query Conditions](develop/query) sections.

## 2. FlexQuery

## 3. `EntityService` interface methods

### count
```java
/**
 * Counts the number of rows matching the given filters.
 *
 * @param filters filtering conditions
 * @return the total count of matching rows
 */
K createOne(T entity);
```

### createOne
```java
/**
 * Creates a new entity and returns its ID.
 *
 * @param entity the entity to be created
 * @return the ID of the newly created entity
 */
Long count(Filters filters);
```

### createOneAndFetch
```java
/**
 * Creates a new entity and returns the created entity with any auto-generated fields populated.
 *
 * @param entity the entity to be created
 * @return the newly created entity
 */
T createOneAndFetch(T entity);
```

### createList
```java
/**
 * Creates multiple entities at once and returns a list of their IDs.
 *
 * @param entities the list of entities to be created
 * @return a list of IDs for the created entities
 */
List<K> createList(List<T> entities);
```

### createListAndFetch
```java
/**
 * Creates multiple entities at once and returns them with any auto-generated fields populated.
 *
 * @param entities the list of entities to be created
 * @return a list of the newly created entities
 */
List<T> createListAndFetch(List<T> entities);
```

### getById (single-parameter)
```java
/**
 * Get an entity by id.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param id the id of the entity to get
 * @return an Optional object containing the entity if found, or empty if not found
 */
Optional<T> getById(K id);
```

### getById (with SubQueries)
```java
/**
 * Get an entity by id, with subQueries to expand relational fields.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param id the id of the entity to get
 * @param subQueries subQueries object, used to expand relational fields
 * @return an Optional object containing the entity if found, or empty if not found
 */
Optional<T> getById(K id, SubQueries subQueries);
```

### getById (with fields)
```java
/**
 * Get an entity by id, with specified fields to read.
 * If the fields is not specified, all accessible fields as the default.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param id the id of the entity to get
 * @param fields field list to read
 * @return an Optional object containing the entity if found, or empty if not found
 */
Optional<T> getById(K id, Collection<String> fields);
```

### getByIds (list of IDs)
```java
/**
 * Get multiple entities by ids.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param ids a list of ids to get
 * @return a list of entities
 */
List<T> getByIds(List<K> ids);
```

### getByIds (with SubQueries)
```java
/**
 * Get multiple entities by ids.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param ids data ids list
 * @param subQueries subQueries object, can expand relational fields
 * @return a list of entities
 */
List<T> getByIds(List<K> ids, SubQueries subQueries);
```

### getByIds (with fields)
```java
/**
 * Get multiple entities by ids, with specified fields to read.
 * If the fields is not specified, all accessible fields as the default.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param ids data ids list
 * @param fields field list to read
 * @return a list of entities
 */
List<T> getByIds(List<K> ids, Collection<String> fields);
```

### getDistinctFieldValue
```java
/**
 * Get distinct values for the specified field, filtered by the given conditions.
 *
 * @param <V> the type of the field's value
 * @param fieldReference the field reference to get the value from
 * @param filters optional filtering conditions
 * @return a list of distinct field values
 */
<V extends Serializable, R> List<V> getDistinctFieldValue(SFunction<T, R> fieldReference, Filters filters);
```

### getFieldValue
```java
/**
 * Get the specified field value by id and field reference.
 * The ManyToOne/OneToOne/Option/MultiOption fields are original values.
 *
 * @param id data id
 * @param fieldReference field reference to get the value from
 * @return field value
 */
<V extends Serializable, R> V getFieldValue(K id, SFunction<T, R> fieldReference);
```

### getIds
```java
/**
 * Get the ids based on the filters.
 *
 * @param filters the filters to apply
 * @return a list of IDs
 */
List<K> getIds(Filters filters);
```

### getRelatedIds (with method reference)
```java
/**
 * Get the distinct ids for ManyToOne/OneToOne relational field based on the filters.
 *
 * @param <EK> the type of the related entity ID, extending Serializable
 * @param <R> the return type of the method reference
 * @param filters the filters to apply
 * @param fieldReference the field reference to get the related entity ID
 * @return distinct ids for relational field
 */
<EK extends Serializable, R> List<EK> getRelatedIds(Filters filters, SFunction<T, R> fieldReference);
```

### getRelatedIds (with fieldName)
```java
/**
 * Get the distinct ids for ManyToOne/OneToOne relational field based on the filters.
 *
 * @param <EK> the type of the related entity ID, extending Serializable
 * @param filters filters
 * @param fieldName relational field name
 * @return distinct ids for relational field
 */
<EK extends Serializable> List<EK> getRelatedIds(Filters filters, String fieldName);
```

### updateOne (null ignored)
```java
/**
 * Updates an existing entity by its ID. Null values are ignored.
 *
 * @param entity the entity with updated values
 * @return true if the update was successful; otherwise, an exception is thrown
 */
boolean updateOne(T entity);
```

### updateOne (option to ignore null)
```java
/**
 * Updates an existing entity by its ID, with an option to ignore null values.
 *
 * @param entity the entity with updated values
 * @param ignoreNull if `true`, null values are ignored; otherwise, they overwrite existing values
 * @return `true` if the update was successful; otherwise, an exception is thrown
 */
boolean updateOne(T entity, boolean ignoreNull);
```

### updateOneAndFetch (null ignored)
```java
/**
 * Updates an existing entity by its ID. Null values are ignored.
 * Returns the updated entity with the latest field values.
 *
 * @param entity the entity with updated values
 * @return the updated entity with the latest field values
 */
T updateOneAndFetch(T entity);
```

### updateOneAndFetch (option to ignore null)
```java
/**
 * Updates an existing entity by its ID, with an option to ignore null values.
 * Returns the updated entity with the latest field values.
 *
 * @param entity the entity with updated values
 * @param ignoreNull if `true`, null values are ignored; otherwise, they overwrite existing values
 * @return the updated entity with the latest field values
 */
T updateOneAndFetch(T entity, boolean ignoreNull);
```

### updateList (null ignored)
```java
/**
 * Updates multiple entities by their IDs. Null values are ignored.
 *
 * @param entities the list of entities to be updated
 * @return `true` if the update was successful; otherwise, an exception is thrown
 */
boolean updateList(List<T> entities);
```

### updateList (option to ignore null)
```java
/**
 * Updates multiple entities by their IDs, with an option to ignore null values.
 *
 * @param entities the list of entities to be updated
 * @param ignoreNull if `true`, null values are ignored; otherwise, they overwrite existing values
 * @return `true` if the update was successful; otherwise, an exception is thrown
 */
boolean updateList(List<T> entities, boolean ignoreNull);
```

### updateListAndFetch (null ignored)
```java
/**
 * Updates multiple entities by their IDs. Null values are ignored.
 * Returns the updated entities with the latest field values.
 *
 * @param entities the list of entities to be updated
 * @return a list of updated entities with the latest field values
 */
List<T> updateListAndFetch(List<T> entities);
```

### updateListAndFetch (option to ignore null)
```java
/**
 * Updates multiple entities by their IDs, with an option to ignore null values.
 * Returns the updated entities with the latest field values.
 *
 * @param entities the list of entities to be updated
 * @param ignoreNull if `true`, null values are ignored; otherwise, they overwrite existing values
 * @return a list of updated entities with the latest field values
 */
List<T> updateListAndFetch(List<T> entities, boolean ignoreNull);
```

### updateByFilter
```java
/**
 * Performs a batch update of rows that match the provided filters,
 * updating the fields specified in the value map.
 * <p>If no filters are specified, all data visible to the current user might be updated.</p>
 *
 * @param filters optional filter criteria
 * @param value a map of field-value pairs to update
 * @return the number of rows affected
 */
Integer updateByFilter(Filters filters, Map<String, Object> value);
```

### deleteById
```java
/**
 * Deletes an entity by its ID.
 *
 * @param id the ID of the entity to be deleted
 * @return `true` if the deletion was successful; otherwise, an exception is thrown
 */
boolean deleteById(K id);
```

### deleteByIds
```java
/**
 * Deletes multiple entities by their IDs.
 *
 * @param ids the list of IDs of the entities to be deleted
 * @return `true` if the deletion was successful; otherwise, an exception is thrown
 */
boolean deleteByIds(List<K> ids);
```

### deleteByFilters
```java
/**
 * Deletes entities based on the specified filters.
 *
 * @param filters the filters that determine which entities to delete
 * @return `true` if the deletion was successful; otherwise, an exception is thrown
 */
boolean deleteByFilters(Filters filters);
```

### searchOne (Filters)
```java
/**
 * Query one entity that matches the specified filters.
 * If multiple entities match, an exception is thrown.
 *
 * @param filters the filters used to find the entity
 * @return the single matching entity
 */
T searchOne(Filters filters);
```

### searchOne (FlexQuery)
```java
/**
 * Query one entity that matches the specified FlexQuery, which can set fields to read.
 * If multiple entities match, an exception is thrown.
 *
 * @param flexQuery FlexQuery object containing fields, filters, orders, etc.
 * @return the single matching entity
 */
T searchOne(FlexQuery flexQuery);
```

### searchList (no args)
```java
/**
 * Query all entities without pagination. Only for code use.
 * If the result exceeds the MAX_BATCH_SIZE, an error is logged, but no exception is thrown.
 *
 * @return a list of all entities
 */
List<T> searchList();
```

### searchList (Filters)
```java
/**
 * Query all entities that match the specified filters without pagination.
 * If the result exceeds the MAX_BATCH_SIZE, an error is logged, but no exception is thrown.
 *
 * @param filters the filters used to find the entities
 * @return a list of matching entities
 */
List<T> searchList(Filters filters);
```

### searchList (FlexQuery)
```java
/**
 * Query all entities that match the specified flexQuery without pagination.
 * If the result exceeds the MAX_BATCH_SIZE, an error log is recorded, but no exception is thrown.
 *
 * @param flexQuery FlexQuery object containing fields, filters, orders, etc.
 * @return a list of matching entities
 */
List<T> searchList(FlexQuery flexQuery);
```

### searchList (FlexQuery, DTO)
```java
/**
 * Executes a FlexQuery without pagination and maps the results to the specified DTO type.
 * If the result exceeds the MAX_BATCH_SIZE, an error is logged, but no exception is thrown.
 *
 * @param <R> the DTO type
 * @param flexQuery FlexQuery object containing fields, filters, sorting, etc.
 * @param dtoClass the class of the DTO type
 * @return a list of DTO objects of the specified type
 */
<R> List<R> searchList(FlexQuery flexQuery, Class<R> dtoClass);
```

### searchPage (FlexQuery)
```java
/**
 * Performs a paginated query based on a FlexQuery.
 * <p>The page size must not exceed MAX_BATCH_SIZE.</p>
 *
 * @param flexQuery a FlexQuery object containing fields, filters, sorting, etc.
 * @param page a Page object containing pagination information
 * @return a Page containing the requested entities
 */
Page<T> searchPage(FlexQuery flexQuery, Page<T> page);
```

### searchPage (FlexQuery, DTO)
```java
/**
 * Performs a paginated query based on a FlexQuery and maps the results to a specified DTO type.
 * <p>The page size must not exceed MAX_BATCH_SIZE.</p>
 *
 * @param <R> the DTO type
 * @param flexQuery a FlexQuery object containing fields, filters, sorting, etc.
 * @param page a Page object containing pagination information
 * @param dtoClass the class of the DTO type
 * @return a Page containing the requested DTO objects
 */
<R> Page<R> searchPage(FlexQuery flexQuery, Page<R> page, Class<R> dtoClass);
```

### groupById
```java
/**
 * Groups entities by their IDs based on the provided filters.
 * <p>If the result exceeds MAX_BATCH_SIZE, an error is logged but no exception is thrown.</p>
 *
 * @param filters the filters used to find the entities
 * @return a map of IDs to the corresponding entities
 */
Map<Serializable, T> groupById(Filters filters);
```
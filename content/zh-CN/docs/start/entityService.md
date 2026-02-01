# 构建专业代码应用

## EntityService 通用方法

### count
```java
/**
 * 统计符合给定过滤条件的行数。
 *
 * @param filters 过滤条件
 * @return 符合条件的总行数
 */
Long count(Filters filters);
```

### createOne
```java
/**
 * 创建一个新的实体并返回其 ID。
 *
 * @param entity 要创建的实体
 * @return 新创建实体的 ID
 */
K createOne(T entity);
```

### createOneAndFetch
```java
/**
 * 创建一个新的实体，并返回带有自动生成字段值的实体对象。
 *
 * @param entity 要创建的实体
 * @return 新创建的实体对象
 */
T createOneAndFetch(T entity);
```

### createList
```java
/**
 * 批量创建多个实体，并返回这些实体的 ID 列表。
 *
 * @param entities 要创建的实体列表
 * @return 创建后的实体 ID 列表
 */
List<K> createList(List<T> entities);
```

### createListAndFetch
```java
/**
 * 批量创建多个实体，并返回包含自动生成字段值的实体对象列表。
 *
 * @param entities 要创建的实体列表
 * @return 新创建的实体对象列表
 */
List<T> createListAndFetch(List<T> entities);
```

### getById (单个ID)
```java
/**
 * 根据 ID 获取实体。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param id 要获取的实体 ID
 * @return 如果找到则返回包含实体的 Optional，否则返回空
 */
Optional<T> getById(K id);
```

### getById (含子查询 SubQueries)
```java
/**
 * 根据 ID 获取实体，可使用 subQueries 展开关联字段。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param id 要获取的实体 ID
 * @param subQueries 用于展开关联字段的对象
 * @return 如果找到则返回包含实体的 Optional，否则返回空
 */
Optional<T> getById(K id, SubQueries subQueries);
```

### getById (指定字段)
```java
/**
 * 根据 ID 获取实体，并可指定要读取的字段。
 * 如果未指定字段，则默认读取所有可访问字段。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param id 要获取的实体 ID
 * @param fields 要读取的字段列表
 * @return 如果找到则返回包含实体的 Optional，否则返回空
 */
Optional<T> getById(K id, Collection<String> fields);
```

### getByIds (ID列表)
```java
/**
 * 根据 ID 列表获取多个实体。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param ids 要获取的实体 ID 列表
 * @return 实体列表
 */
List<T> getByIds(List<K> ids);
```

### getByIds (含子查询 SubQueries)
```java
/**
 * 根据 ID 列表获取多个实体，并可使用 subQueries 展开关联字段。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param ids 实体 ID 列表
 * @param subQueries 用于展开关联字段的对象
 * @return 实体列表
 */
List<T> getByIds(List<K> ids, SubQueries subQueries);
```

### getByIds (指定字段)
```java
/**
 * 根据 ID 列表获取多个实体，并可指定要读取的字段。
 * 如果未指定字段，则默认读取所有可访问字段。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param ids 实体 ID 列表
 * @param fields 要读取的字段列表
 * @return 实体列表
 */
List<T> getByIds(List<K> ids, Collection<String> fields);
```

### getDistinctFieldValue
```java
/**
 * 获取指定字段的唯一值列表，并根据给定条件进行过滤。
 *
 * @param <V> 字段值的类型
 * @param fieldReference 要获取值的字段引用
 * @param filters 可选的过滤条件
 * @return 唯一字段值的列表
 */
<V extends Serializable, R> List<V> getDistinctFieldValue(SFunction<T, R> fieldReference, Filters filters);
```

### getFieldValue
```java
/**
 * 根据实体 ID 和字段方法引用，获取指定字段的值。
 * ManyToOne/OneToOne/Option/MultiOption 字段保留原始值。
 *
 * @param id 实体 ID
 * @param method 字段访问方法（Lambda 表达式或方法引用）
 * @param <V> 字段值类型
 * @param <R> 字段访问方法的返回类型
 * @return 字段的值
 */
<V extends Serializable, R> V getFieldValue(K id, SFunction<T, R> method);
```

### getIds
```java
/**
 * 根据过滤条件获取符合条件的实体 ID 列表。
 *
 * @param filters 要应用的过滤条件
 * @return 匹配的实体 ID 列表
 */
List<K> getIds(Filters filters);
```

### getRelatedIds (字段方法引用)
```java
/**
 * 根据过滤条件，获取 ManyToOne/OneToOne 关联字段的去重 ID 列表。
 *
 * @param <EK> 关联实体 ID 类型
 * @param <R> 字段访问方法的返回类型
 * @param filters 过滤条件
 * @param method 字段访问方法（Lambda 表达式或方法引用）
 * @return 去重的关联实体 ID 列表
 */
<EK extends Serializable, R> List<EK> getRelatedIds(Filters filters, SFunction<T, R> method);
```

### getRelatedIds (字段名)
```java
/**
 * 根据过滤条件和字段名，获取 ManyToOne/OneToOne 关联字段的去重 ID 列表。
 *
 * @param <EK> 关联实体 ID 类型
 * @param filters 过滤条件
 * @param fieldName 关联字段名称
 * @return 去重的关联实体 ID 列表
 */
<EK extends Serializable> List<EK> getRelatedIds(Filters filters, String fieldName);
```

### updateOne (忽略 null)
```java
/**
 * 根据实体 ID 更新已有实体，忽略空值（null）。
 *
 * @param entity 包含更新数据的实体
 * @return 若更新成功返回 true，否则抛出异常
 */
boolean updateOne(T entity);
```

### updateOne (可选忽略 null)
```java
/**
 * 根据实体 ID 更新已有实体，可选择是否忽略空值（null）。
 *
 * @param entity 包含更新数据的实体
 * @param ignoreNull 若为 true，则忽略空值；否则空值将覆盖原值
 * @return 若更新成功返回 true，否则抛出异常
 */
boolean updateOne(T entity, boolean ignoreNull);
```

### updateOneAndFetch (忽略 null)
```java
/**
 * 根据实体 ID 更新已有实体，忽略空值（null）。
 * 返回更新后的实体，包含最新字段值。
 *
 * @param entity 包含更新数据的实体
 * @return 更新后的实体（包含最新字段值）
 */
T updateOneAndFetch(T entity);
```

### updateOneAndFetch (可选忽略 null)
```java
/**
 * 根据实体 ID 更新已有实体，可选择是否忽略空值（null）。
 * 返回更新后的实体，包含最新字段值。
 *
 * @param entity 包含更新数据的实体
 * @param ignoreNull 若为 true，则忽略空值；否则空值将覆盖原值
 * @return 更新后的实体（包含最新字段值）
 */
T updateOneAndFetch(T entity, boolean ignoreNull);
```

### updateList (忽略 null)
```java
/**
 * 批量更新多个实体（根据 ID），忽略空值（null）。
 *
 * @param entities 要更新的实体列表
 * @return 若更新成功返回 true，否则抛出异常
 */
boolean updateList(List<T> entities);
```

### updateList (可选忽略 null)
```java
/**
 * 批量更新多个实体（根据 ID），可选择是否忽略空值（null）。
 *
 * @param entities 要更新的实体列表
 * @param ignoreNull 若为 true，则忽略空值；否则空值将覆盖原值
 * @return 若更新成功返回 true，否则抛出异常
 */
boolean updateList(List<T> entities, boolean ignoreNull);
```

### updateListAndFetch (忽略 null)
```java
/**
 * 批量更新多个实体（根据 ID），忽略空值（null）。
 * 返回更新后的实体列表，包含最新字段值。
 *
 * @param entities 要更新的实体列表
 * @return 更新后的实体列表（包含最新字段值）
 */
List<T> updateListAndFetch(List<T> entities);
```

### updateListAndFetch (可选忽略 null)
```java
/**
 * 批量更新多个实体（根据 ID），可选择是否忽略空值（null）。
 * 返回更新后的实体列表，包含最新字段值。
 *
 * @param entities 要更新的实体列表
 * @param ignoreNull 若为 true，则忽略空值；否则空值将覆盖原值
 * @return 更新后的实体列表（包含最新字段值）
 */
List<T> updateListAndFetch(List<T> entities, boolean ignoreNull);
```

### updateByFilter
```java
/**
 * 对符合指定过滤条件的行进行批量更新，
 * 更新值由字段-值映射提供。
 * <p>如果未指定过滤条件，则可能会更新当前用户可见的所有数据。</p>
 *
 * @param filters 可选的过滤条件
 * @param value 要更新的字段-值映射
 * @return 受影响的行数
 */
Integer updateByFilter(Filters filters, Map<String, Object> value);
```

### deleteById
```java
/**
 * 根据实体 ID 删除对应的实体。
 *
 * @param id 要删除的实体 ID
 * @return 若删除成功返回 true，否则抛出异常
 */
boolean deleteById(K id);
```

### deleteByIds
```java
/**
 * 批量删除多个实体（根据 ID 列表）。
 *
 * @param ids 要删除的实体 ID 列表
 * @return 若删除成功返回 true，否则抛出异常
 */
boolean deleteByIds(List<K> ids);
```

### deleteByFilters
```java
/**
 * 根据指定过滤条件删除实体。
 *
 * @param filters 用于匹配实体的过滤条件
 * @return 若删除成功返回 true，否则抛出异常
 */
boolean deleteByFilters(Filters filters);
```

### searchOne (Filters)
```java
/**
 * 根据过滤条件查询单个实体。
 * 若匹配到多个实体，则抛出异常。
 *
 * @param filters 用于查询的过滤条件
 * @return 匹配的单个实体
 */
T searchOne(Filters filters);
```

### searchOne (FlexQuery)
```java
/**
 * 使用指定的 FlexQuery 查询单个实体，可设置需要读取的字段等。
 * 若匹配到多个实体，则抛出异常。
 *
 * @param flexQuery 包含字段、过滤条件、排序等信息的 FlexQuery 对象
 * @return 匹配的单个实体
 */
T searchOne(FlexQuery flexQuery);
```

### searchList (无参)
```java
/**
 * 无分页查询所有实体（仅限代码调用）。
 * 如果结果数量超过 MAX_BATCH_SIZE，会记录错误日志，但不抛出异常。
 *
 * @return 所有实体的列表
 */
List<T> searchList();
```

### searchList (Filters)
```java
/**
 * 根据过滤条件无分页查询实体（仅限代码调用）。
 * 如果结果数量超过 MAX_BATCH_SIZE，会记录错误日志，但不抛出异常。
 *
 * @param filters 用于查询的过滤条件
 * @return 匹配的实体列表
 */
List<T> searchList(Filters filters);
```

### searchList (FlexQuery)
```java
/**
 * 根据指定的 FlexQuery 无分页查询实体（仅限代码调用）。
 * 如果结果数量超过 MAX_BATCH_SIZE，会记录错误日志，但不抛出异常。
 *
 * @param flexQuery 包含字段、过滤条件、排序等信息的 FlexQuery 对象
 * @return 匹配的实体列表
 */
List<T> searchList(FlexQuery flexQuery);
```

### searchList (FlexQuery, DTO)
```java
/**
 * 执行无分页的 FlexQuery，并将结果映射为指定的 DTO 类型。
 * 如果结果数量超过 MAX_BATCH_SIZE，会记录错误日志，但不抛出异常。
 *
 * @param <R> DTO 类型
 * @param flexQuery 包含字段、过滤条件、排序等信息的 FlexQuery 对象
 * @param dtoClass 要映射成的 DTO 类型
 * @return 指定类型的 DTO 列表
 */
<R> List<R> searchList(FlexQuery flexQuery, Class<R> dtoClass);
```

### searchPage (FlexQuery)
```java
/**
 * 基于 FlexQuery 执行分页查询。
 * 分页大小不能超过 MAX_BATCH_SIZE。
 *
 * @param flexQuery 包含字段、过滤条件、排序等信息的 FlexQuery 对象
 * @param page 包含分页信息的 Page 对象
 * @return 包含查询结果的 Page 对象
 */
Page<T> searchPage(FlexQuery flexQuery, Page<T> page);
```

### searchPage (FlexQuery, DTO)
```java
/**
 * 基于 FlexQuery 执行分页查询，并将结果映射为指定的 DTO 类型。
 * 分页大小不能超过 MAX_BATCH_SIZE。
 *
 * @param <R> DTO 类型
 * @param flexQuery 包含字段、过滤条件、排序等信息的 FlexQuery 对象
 * @param page 包含分页信息的 Page 对象
 * @param dtoClass 要映射成的 DTO 类型
 * @return 包含查询到的 DTO 对象的 Page
 */
<R> Page<R> searchPage(FlexQuery flexQuery, Page<R> page, Class<R> dtoClass);
```

### groupById
```java
/**
 * 根据过滤条件查询实体，并以实体 ID 为键进行分组。
 * 如果结果数量超过 MAX_BATCH_SIZE，会记录错误日志，但不抛出异常。
 *
 * @param filters 用于查找实体的过滤条件
 * @return 一个 Map，键为实体 ID，值为对应的实体
 */
Map<Serializable, T> groupById(Filters filters);
```
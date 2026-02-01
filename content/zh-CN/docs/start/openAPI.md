# 通用模型接口
最新在线接口文档参考: https://api-cn.softa.io

以下为模型级别通用接口。

<a id="opIdcopyList"></a>

## POST copyList

POST /{modelName}/copyList

基于 ids 复制多条数据，并返回新数据的 ids。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |模型名|
|ids|query|array[object]| 是 |要复制的数据 ids|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcopyListAndReturn"></a>

## POST copyListAndReturn

POST /{modelName}/copyListAndReturn

基于 ids 复制多条数据，并返回新增的数据列表。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |模型名|
|ids|query|array[object]| 是 |要复制的数据 ids|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcopyOne"></a>

## POST copyOne

POST /{modelName}/copyOne

基于 id 复制一条记录，并返回新增记录的 id。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|id|query|number| 是 |复制的数据源ID|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcopyOneAndReturn"></a>

## POST copyOneAndReturn

POST /{modelName}/copyOneAndReturn

基于 id 复制一条记录，并返回新增记录的数据。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |模型名|
|id|query|number| 是 |复制的数据源ID|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcopyWithoutCreate"></a>

## GET copyWithoutCreate

GET /{modelName}/copyWithoutCreate

基于 id 复制一条记录，并返回可复制的字段值，但是并不自动插入数据库，而是由客户端调用 Create 方法入库。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |模型名|
|id|query|number| 是 |复制的数据源ID|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcount"></a>

## GET count

GET /{modelName}/count

根据指定的筛选条件、分组条件和排序条件，返回分组计数值。仅传递 filters 时，返回总计数值。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|filters|query|array| 否 |计数的数据筛选条件，参考中缀表达式用法，仅传递 filters 时，返回总计数值。|
|groupBy|query|array[string]| 否 |分组计数的字段，未指定则不分组，直接返回总数。|
|orders|query|array| 否 |分组结果排序字段.|
|effectiveDate|query|string(date)| 否 |时间轴模型的有效日期。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcreateList"></a>

## POST createList

POST /{modelName}/createList

批量创建并返回创建后的 id 列表。

> Body 请求参数

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|array[object]| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcreateListAndReturn"></a>

## POST createListAndReturn

POST /{modelName}/createListAndReturn

批量创建数据，并从数据库返回最新数据结果。

> Body 请求参数

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|array[object]| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcreateOne"></a>

## POST createOne

POST /{modelName}/createOne

创建单条数据并返回数据 ID。

> Body 请求参数

```json
{
  "property1": {},
  "property2": {}
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|object| 否 |none|
|» **additionalProperties**|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdcreateOneAndReturn"></a>

## POST createOneAndReturn

POST /{modelName}/createOneAndReturn

创建单条数据，并从数据库返回最新数据。

> Body 请求参数

```json
{
  "property1": {},
  "property2": {}
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|object| 否 |none|
|» **additionalProperties**|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIddeleteList"></a>

## POST deleteList

POST /{modelName}/deleteList

根据 ids 参数批量删除数据。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|ids|query|array[object]| 否 |要删除数据的 ids。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIddeleteOne"></a>

## POST deleteOne

POST /{modelName}/deleteOne

根据 id 参数删除1条记录。时间轴模型，则会删除该 id 相关的所有切片记录。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|id|query|number| 是 |要删除数据的 id。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIddeleteSlice"></a>

## POST deleteSlice

POST /{modelName}/deleteSlice

根据 sliceId 参数删除时间轴模型1条切片记录。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|sliceId|query|number| 是 |要删除时间轴切片数据的 sliceId。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdgetUnmaskedField"></a>

## GET getUnmaskedField

GET /{modelName}/getUnmaskedField

获取指定字段的脱敏前数据，适用于原始字段是掩码脱敏字段。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|id|query|number| 是 |要读取的数据 id。|
|field|query|string| 是 |要获取明文的字段名。|
|effectiveDate|query|string(date)| 否 |时间轴数据的有效日期。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdgetUnmaskedFields"></a>

## GET getUnmaskedFields

GET /{modelName}/getUnmaskedFields

"获取多个字段的脱敏前数据，适用于原始字段是掩码脱敏字段。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|id|query|number| 是 |要读取的数据 id。|
|fields|query|array[string]| 是 |要获取明文的字段名列表。|
|effectiveDate|query|string(date)| 否 |时间轴数据的有效日期。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdreadList"></a>

## GET readList

GET /{modelName}/readList

根据 ids 参数读取多条数据列表。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|ids|query|array[object]| 是 |要读取的数据列表的 ids。|
|fields|query|array[string]| 是 |要读取的字段名列表组成的字符串，为空则全部可见字段。|
|effectiveDate|query|string(date)| 否 |时间轴数据的有效日期。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdreadOne"></a>

## GET readOne

GET /{modelName}/readOne

根据 id 读取1条数据。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|id|query|number| 是 |要读取的数据的 id。|
|fields|query|array[string]| 是 |要读取的字段名列表组成的字符串，为空则全部可见字段。|
|effectiveDate|query|string(date)| 否 |时间轴数据的有效日期。|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdsearchList"></a>

## POST searchList

POST /{modelName}/searchList

根据指定的字段 fields、筛选条件 filters、排序条件 orders、分组计数字段，以及子查询条件，返回数据列表，不进行分页，但可以通过 pageSize 控制返回数据行数，默认返回 50 条数据。

> Body 请求参数

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "fields": [
    "id",
    "name"
  ],
  "filters": [
    "name",
    "=",
    "Tom"
  ],
  "groupBy": [],
  "orders": [
    "name",
    "ASC"
  ],
  "pageNumber": 1,
  "pageSize": 50,
  "splitBy": [],
  "subQueries": {},
  "summary": true
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|[QueryParams](#schemaqueryparams)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdsearchPage"></a>

## POST searchPage

POST /{modelName}/searchPage

根据指定的字段 fields、筛选条件 filters、排序条件 orders、页码 pageNumber、分页大小 pageSize、分组计数字段，以及子查询条件，返回分页数据，不传时使用后端默认值。

> Body 请求参数

```json
{}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|[QueryParams](#schemaqueryparams)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdsearchPivot"></a>

## POST searchPivot

POST /{modelName}/searchPivot

根据指定的字段 fields、筛选条件 filters、排序条件 orders、groupBy 字段、splitBy 字段，返回透视表数据。

> Body 请求参数

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "fields": [
    "id",
    "name"
  ],
  "filters": [
    "name",
    "=",
    "Tom"
  ],
  "groupBy": [],
  "orders": [
    "name",
    "ASC"
  ],
  "pageNumber": 1,
  "pageSize": 50,
  "splitBy": [],
  "subQueries": {},
  "summary": true
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|[QueryParams](#schemaqueryparams)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdsearchSimpleAgg"></a>

## POST searchSimpleAgg

POST /{modelName}/searchSimpleAgg

纯粹的 SUM、AVG、MIN、MAX、COUNT 聚合函数查询。如： ["SUM", "amount"]，返回值的 key 为驼峰字符串 sumAmount。
忽略 AggQuery 的 fields、groupBy、page参数。需要数据分组、数据分页时，请使用 searchPage 接口。

> Body 请求参数

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "filters": [
    "name",
    "=",
    "Tom"
  ]
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|[SimpleQueryParams](#schemasimplequeryparams)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdupdateByFilter"></a>

## POST updateByFilter

POST /{modelName}/updateByFilter

根据筛选条件更新数据，当前用户权限范围内，符合筛选条件的数据都会被更新。

> Body 请求参数

```json
{
  "property1": {},
  "property2": {}
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|filters|query|array| 否 |筛选条件[]，详细参考中缀表达式用法，默认当前用户全部可见数据。|
|body|body|object| 否 |none|
|» **additionalProperties**|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdupdateList"></a>

## POST updateList

POST /{modelName}/updateList

根据数据列表的 id 字段批量更新数据。成功返回 True，失败则抛出异常。

> Body 请求参数

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|array[object]| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdupdateListAndReturn"></a>

## POST updateListAndReturn

POST /{modelName}/updateListAndReturn

根据数据列表的 id 字段批量更新数据，并从数据库返回更新后的数据列表。

> Body 请求参数

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|array[object]| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdupdateOne"></a>

## POST updateOne

POST /{modelName}/updateOne

根据数据的 id 更新1条记录。成功返回 True，失败则抛出异常。

> Body 请求参数

```json
{
  "id": 1,
  "cost": 2.555555,
  "profit": "3.9999999"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|object| 否 |none|
|» **additionalProperties**|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

<a id="opIdupdateOneAndReturn"></a>

## POST updateOneAndReturn

POST /{modelName}/updateOneAndReturn

根据数据的 id 字段更新1条数据，并从数据库返回更新后的数据值。

> Body 请求参数

```json
{
  "property1": {},
  "property2": {}
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|modelName|path|string| 是 |none|
|body|body|object| 否 |none|
|» **additionalProperties**|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

## 数据模型

<h2 id="tocS_API Response Body">API Response Body</h2>

<a id="schemaapi response body"></a>
<a id="schema_API Response Body"></a>
<a id="tocSapi response body"></a>
<a id="tocsapi response body"></a>

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|integer(int32)|false|none||响应状态码|
|data|boolean|false|none||结果数据|
|error|string|false|none||Error 消息|
|message|string|false|none||普通消息|

<h2 id="tocS_Filters">Filters</h2>

<a id="schemafilters"></a>
<a id="schema_Filters"></a>
<a id="tocSfilters"></a>
<a id="tocsfilters"></a>

```json
[
  "name",
  "=",
  "Tom"
]

```

支持嵌套筛选条件, 形如 [a OR b] AND [c OR d OR [e AND f] OR g] 结构，示例如下：
* []
* ["name", "=", "Tom"]
* [["name", "=", "Tom"], ["version", "=", "6"]]
* [["name", "=", "Tom"], "OR", ["code", "=", "A010"], "OR", ["version", "=", "2"]]
* [["name", "=", "Tom"], "OR", ["code", "=", "A010"]], "AND", ["version", "=", "2"]]

### 属性

*None*

<h2 id="tocS_AggFunctions">AggFunctions</h2>

<a id="schemaaggfunctions"></a>
<a id="schema_AggFunctions"></a>
<a id="tocSaggfunctions"></a>
<a id="tocsaggfunctions"></a>

```json
[
  "SUM",
  "amount"
]

```

支持多个聚合查询条件:
* []
* ["SUM", "amount"]
* [["SUM", "amount"], ["COUNT", "id"]]

### 属性

*None*

<h2 id="tocS_QueryParams">QueryParams</h2>

<a id="schemaqueryparams"></a>
<a id="schema_QueryParams"></a>
<a id="tocSqueryparams"></a>
<a id="tocsqueryparams"></a>

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "fields": [
    "id",
    "name"
  ],
  "filters": [
    "name",
    "=",
    "Tom"
  ],
  "groupBy": [],
  "orders": [
    "name",
    "ASC"
  ],
  "pageNumber": 1,
  "pageSize": 50,
  "splitBy": [],
  "subQueries": {},
  "summary": true
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|aggFunctions|[AggFunctions](#schemaaggfunctions)|false|none||支持多个聚合查询条件:<br />* []<br />* ["SUM", "amount"]<br />* [["SUM", "amount"], ["COUNT", "id"]]|
|effectiveDate|string(date)|false|none||Effective date, default is `Today`.|
|fields|[string]|false|none||Fields to get, empty means all fields.|
|filters|[Filters](#schemafilters)|false|none||支持嵌套筛选条件, 形如 [a OR b] AND [c OR d OR [e AND f] OR g] 结构，示例如下：<br />* []<br />* ["name", "=", "Tom"]<br />* [["name", "=", "Tom"], ["version", "=", "6"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"], "OR", ["version", "=", "2"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"]], "AND", ["version", "=", "2"]]|
|groupBy|[string]|false|none||Fields to group by, empty means no grouping.|
|orders|[Orders](#schemaorders)|false|none||支持多个排序条件：<br />* []<br />* ["name", "ASC"]<br />* [["name", "ASC"], ["sequence", "DESC"]]<br />* or string format: "name ASC, sequence DESC"|
|pageNumber|integer(int32)|false|none||Page number, start from 1, default 1.|
|pageSize|integer(int32)|false|none||Page size, or limit size for searchList, default 50.|
|splitBy|[string]|false|none||Pivot split field list.|
|subQueries|object|false|none||Sub queries for relational fields: {fieldName: SubQuery}|
|» **additionalProperties**|[SubQuery](#schemasubquery)|false|none||基于关系型字段的子查询条件，结构如: {fieldName: SubQuery}|
|summary|boolean|false|none||Whether to return the summary result of numeric fields, default no summary.|

<h2 id="tocS_SubQuery">SubQuery</h2>

<a id="schemasubquery"></a>
<a id="schema_SubQuery"></a>
<a id="tocSsubquery"></a>
<a id="tocssubquery"></a>

```json
{}

```

基于关系型字段的子查询条件，结构如: {fieldName: SubQuery}

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|count|boolean|false|none||Only count the sub records, true/false|
|fields|[string]|false|none||子查询字段列表。|
|filters|[Filters](#schemafilters)|false|none||支持嵌套筛选条件, 形如 [a OR b] AND [c OR d OR [e AND f] OR g] 结构，示例如下：<br />* []<br />* ["name", "=", "Tom"]<br />* [["name", "=", "Tom"], ["version", "=", "6"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"], "OR", ["version", "=", "2"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"]], "AND", ["version", "=", "2"]]|
|orders|[Orders](#schemaorders)|false|none||支持多个排序条件：<br />* []<br />* ["name", "ASC"]<br />* [["name", "ASC"], ["sequence", "DESC"]]<br />* or string format: "name ASC, sequence DESC"|
|topN|integer(int32)|false|none||TopN query on OneToMany field, using with `orders`.|

<h2 id="tocS_Orders">Orders</h2>

<a id="schemaorders"></a>
<a id="schema_Orders"></a>
<a id="tocSorders"></a>
<a id="tocsorders"></a>

```json
[
  "name",
  "ASC"
]

```

支持多个排序条件：
* []
* ["name", "ASC"]
* [["name", "ASC"], ["sequence", "DESC"]]
* or string format: "name ASC, sequence DESC"

### 属性

*None*

<h2 id="tocS_SimpleQueryParams">SimpleQueryParams</h2>

<a id="schemasimplequeryparams"></a>
<a id="schema_SimpleQueryParams"></a>
<a id="tocSsimplequeryparams"></a>
<a id="tocssimplequeryparams"></a>

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "filters": [
    "name",
    "=",
    "Tom"
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|aggFunctions|[AggFunctions](#schemaaggfunctions)|false|none||支持多个聚合查询条件:<br />* []<br />* ["SUM", "amount"]<br />* [["SUM", "amount"], ["COUNT", "id"]]|
|effectiveDate|string(date)|false|none||Effective date, default is `Today`.|
|filters|[Filters](#schemafilters)|false|none||支持嵌套筛选条件, 形如 [a OR b] AND [c OR d OR [e AND f] OR g] 结构，示例如下：<br />* []<br />* ["name", "=", "Tom"]<br />* [["name", "=", "Tom"], ["version", "=", "6"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"], "OR", ["version", "=", "2"]]<br />* [["name", "=", "Tom"], "OR", ["code", "=", "A010"]], "AND", ["version", "=", "2"]]|

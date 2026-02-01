# Common Model APIs
The latest online API documentation is available at https://api.softa.io

The following are common model-level API.

<a id="opIdcopyList"></a>

## POST copyList

POST /{modelName}/copyList

Copy multiple rows based on ids, and return the new data ids.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|ids|query|array[object]| yes |Data source IDs to be copied.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcopyListAndReturn"></a>

## POST copyListAndReturn

POST /{modelName}/copyListAndReturn

Copy multiple rows based on ids, and return the new rows.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|ids|query|array[object]| yes |Data source IDs to be copied.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcopyOne"></a>

## POST copyOne

POST /{modelName}/copyOne

Copy a single row based on id, and return the id of the new row.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data source ID to be copied.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcopyOneAndReturn"></a>

## POST copyOneAndReturn

POST /{modelName}/copyOneAndReturn

Copy a single row based on id, and return the new row.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data source ID to be copied.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcopyWithoutCreate"></a>

## GET copyWithoutCreate

GET /{modelName}/copyWithoutCreate

Copy one row by id, only return the copyable field values, without inserting into database.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data source ID to be copied.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcount"></a>

## GET count

GET /{modelName}/count

Returns a count or group counting based on the specified `filter`, `groupBy`, and `orders`.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|filters|query|array| no |Filters for data to be counted.|
|groupBy|query|array[string]| no |Fields for group counts, Return the total count if not specified.|
|orders|query|array| no |The field order of the grouped results|
|effectiveDate|query|string(date)| no |Effective date for timeline model.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcreateList"></a>

## POST createList

POST /{modelName}/createList

Create multiple rows and return the id list.

> Body Parameters

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|array[object]| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcreateListAndReturn"></a>

## POST createListAndReturn

POST /{modelName}/createListAndReturn

Create multiple rows and return the latest values from database.

> Body Parameters

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|array[object]| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcreateOne"></a>

## POST createOne

POST /{modelName}/createOne

Create a single row and return the id.

> Body Parameters

```json
{
  "property1": {},
  "property2": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|object| no |none|
|» **additionalProperties**|body|object| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdcreateOneAndReturn"></a>

## POST createOneAndReturn

POST /{modelName}/createOneAndReturn

Create one row return the latest values from database.

> Body Parameters

```json
{
  "property1": {},
  "property2": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|object| no |none|
|» **additionalProperties**|body|object| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIddeleteList"></a>

## POST deleteList

POST /{modelName}/deleteList

Delete multiple rows by ids.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|ids|query|array[object]| yes |Data IDs to be deleted.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIddeleteOne"></a>

## POST deleteOne

POST /{modelName}/deleteOne

Delete one row by id. All slices related to this `id` will be deleted for timeline model.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data ID to be deleted|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIddeleteSlice"></a>

## POST deleteSlice

POST /{modelName}/deleteSlice

Delete a slice of the timeline model by `sliceId`.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|sliceId|query|number| yes |`sliceId` of the timeline slice data to delete.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdgetUnmaskedField"></a>

## GET getUnmaskedField

GET /{modelName}/getUnmaskedField

Get the original value for masking field.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data ID to be read|
|field|query|string| yes |The masking field name to get the original value|
|effectiveDate|query|string(date)| no |Effective date for timeline model.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdgetUnmaskedFields"></a>

## GET getUnmaskedFields

GET /{modelName}/getUnmaskedFields

Get the original values for multiple masking fields.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data ID to be read|
|fields|query|array[string]| yes |The masking field list to get the original values|
|effectiveDate|query|string(date)| no |Effective date for timeline model.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdreadList"></a>

## GET readList

GET /{modelName}/readList

Read multiple rows by ids.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|ids|query|array[object]| yes |Data IDs to be read.|
|fields|query|array[string]| no |A list of field names to be read. If not specified, it defaults to all visible fields.|
|effectiveDate|query|string(date)| no |Effective date for timeline model.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdreadOne"></a>

## GET readOne

GET /{modelName}/readOne

Read one row by id.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|id|query|number| yes |Data ID, number or string type.|
|fields|query|array[string]| no |A list of field names to be read. If not specified, it defaults to all visible fields.|
|effectiveDate|query|string(date)| no |Effective date for timeline model.|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdsearchList"></a>

## POST searchList

POST /{modelName}/searchList

Get the data list based on the specifiedfields, filters, orders, limitSize, aggFunctions, and subQueries. Default limit to 50.

> Body Parameters

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
  "filters": {},
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

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|[QueryParams](#schemaqueryparams)| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdsearchPage"></a>

## POST searchPage

POST /{modelName}/searchPage

Paging aggregation query parameters, including fields, filters, orders, pageNumber, pageSizegroupBy, aggFunctions, subQueries, etc. Use the backend default value when not specified.

> Body Parameters

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
  "filters": {},
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

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|[QueryParams](#schemaqueryparams)| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdsearchPivot"></a>

## POST searchPivot

POST /{modelName}/searchPivot

Get the pivot table data based on the specified fields, filters, orders, groupBy, splitBy.

> Body Parameters

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
  "filters": {},
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

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|[QueryParams](#schemaqueryparams)| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdsearchSimpleAgg"></a>

## POST searchSimpleAgg

POST /{modelName}/searchSimpleAgg

Pure SUM, AVG, MIN, MAX, COUNT aggregate query, like `["SUM", "amount"]` or `[["SUM", "amount"], [], ...]`,
the return key is `sumAmount`.

> Body Parameters

```json
{
  "aggFunctions": [
    "SUM",
    "amount"
  ],
  "effectiveDate": "2019-08-24",
  "filters": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|[SimpleQueryParams](#schemasimplequeryparams)| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdupdateByFilter"></a>

## POST updateByFilter

POST /{modelName}/updateByFilter

Update data according to the filters, within the current user's permission scope.

> Body Parameters

```json
{
  "property1": {},
  "property2": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|filters|query|array| no |Data filter to update.|
|body|body|object| no |none|
|» **additionalProperties**|body|object| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdupdateList"></a>

## POST updateList

POST /{modelName}/updateList

Update multiple rows by id. Return true on success.

> Body Parameters

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|array[object]| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdupdateListAndReturn"></a>

## POST updateListAndReturn

POST /{modelName}/updateListAndReturn

Update multiple rows by id, and return the latest values from database.

> Body Parameters

```json
[
  {
    "property1": {},
    "property2": {}
  }
]
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|array[object]| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdupdateOne"></a>

## POST updateOne

POST /{modelName}/updateOne

Update one row by id. Return true on success.

> Body Parameters

```json
{
  "property1": {},
  "property2": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|object| no |none|
|» **additionalProperties**|body|object| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

<a id="opIdupdateOneAndReturn"></a>

## POST updateOneAndReturn

POST /{modelName}/updateOneAndReturn

Update one row by id, and return the latest values from database.

> Body Parameters

```json
{
  "property1": {},
  "property2": {}
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|modelName|path|string| yes |none|
|body|body|object| no |none|
|» **additionalProperties**|body|object| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "data": true,
  "error": "string",
  "message": "string"
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

# Data Schema

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

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer(int32)|false|none||Status Code|
|data|boolean|false|none||Result Data|
|error|string|false|none||Error Message|
|message|string|false|none||Common Message|

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

Support multiple aggregation queries:
* []
* ["SUM", "amount"]
* [["SUM", "amount"], ["COUNT", "id"]]

### Attribute

*None*

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

Support multiple order conditions:
* []
* ["name", "ASC"]
* [["name", "ASC"], ["sequence", "DESC"]]
* or string format: "name ASC, sequence DESC"

### Attribute

*None*

<h2 id="tocS_SubQuery">SubQuery</h2>

<a id="schemasubquery"></a>
<a id="schema_SubQuery"></a>
<a id="tocSsubquery"></a>
<a id="tocssubquery"></a>

```json
{}

```

Sub queries for relational fields: {fieldName: SubQuery}

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|count|boolean|false|none||Only count the sub records, true/false|
|fields|[string]|false|none||Sub query fields.|
|filters|object|false|none||none|
|orders|[Orders](#schemaorders)|false|none||Support multiple order conditions:<br />* []<br />* ["name", "ASC"]<br />* [["name", "ASC"], ["sequence", "DESC"]]<br />* or string format: "name ASC, sequence DESC"|
|topN|integer(int32)|false|none||TopN query on OneToMany field, using with `orders`.|

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

Support nested filters, such as [a OR b] AND [c OR d OR [e AND f] OR g]
* []
* ["name", "=", "Tom"]
* [["name", "=", "Tom"], ["version", "=", "6"]]
* [["name", "=", "Tom"], "OR", ["code", "=", "A010"], "OR", ["version", "=", "2"]]
* [["name", "=", "Tom"], "OR", ["code", "=", "A010"]], "AND", ["version", "=", "2"]]

### Attribute

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
  "filters": {},
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

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|aggFunctions|[AggFunctions](#schemaaggfunctions)|false|none||Support multiple aggregation queries:<br />* []<br />* ["SUM", "amount"]<br />* [["SUM", "amount"], ["COUNT", "id"]]|
|effectiveDate|string(date)|false|none||Effective date, default is `Today`.|
|fields|[string]|false|none||Fields list to get, empty means all fields of the model.|
|filters|object|false|none||none|
|groupBy|[string]|false|none||Fields to group by, empty means no grouping.|
|orders|[Orders](#schemaorders)|false|none||Support multiple order conditions:<br />* []<br />* ["name", "ASC"]<br />* [["name", "ASC"], ["sequence", "DESC"]]<br />* or string format: "name ASC, sequence DESC"|
|pageNumber|integer(int32)|false|none||Page number, start from 1, default 1.|
|pageSize|integer(int32)|false|none||Page size, or limit size for searchList, default 50.|
|splitBy|[string]|false|none||Pivot split field list.|
|subQueries|object|false|none||Sub queries for relational fields: {fieldName: SubQuery}|
|» **additionalProperties**|[SubQuery](#schemasubquery)|false|none||Sub queries for relational fields: {fieldName: SubQuery}|
|summary|boolean|false|none||Whether to return the summary result of numeric fields, default no summary.|

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
  "filters": {}
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|aggFunctions|[AggFunctions](#schemaaggfunctions)|false|none||Support multiple aggregation queries:<br />* []<br />* ["SUM", "amount"]<br />* [["SUM", "amount"], ["COUNT", "id"]]|
|effectiveDate|string(date)|false|none||Effective date, default is `Today`.|
|filters|object|false|none||none|

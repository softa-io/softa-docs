# 字段元数据

> **参见**：在 Java 实体类字段上通过注解声明这些属性，见 [`@Field` 注解](../../backend_dev/model_dev/annotation#field--sysfield)。

字段元数据是模型字段的描述信息的集合，它定义了该模型在业务场景中用到的各种字段，以及每个字段的类型、长度、默认值、必填、只读、关联关系等等。借助这些元数据，Softa 能够以一致的方式处理数据响应、处理与交互，并抽象通用需求，确保数据的一致性、准确性和完整性。

## 1、字段类型介绍

| 序号 | 类型 | 类型名称 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| 1 | String | 字符串 | "" | 通过 `length` 配置字符串长度。|
| 2 | Integer | 整数 | 0 | 通过 `length` 配置整数位数。|
| 3 | Long | 长整数 | 0L |  |
| 4 | Double | 小数 | 0.00 | 普通小数，用于可接受精度损失的计算场景。|
| 5 | BigDecimal | 精确小数 | "0" | 用于金额、货币、汇率等高精度计算场景。 |
| 6 | Boolean | 布尔字段 | false |  |
| 7 | Date | 日期字段 |  | 格式 `yyyy-MM-dd`，如 `2026-02-01` |
| 8 | DateTime | 日期时间 |  | 格式 `yyyy-MM-dd HH:mm:ss`，如 `2026-02-01 12:15:20` |
| 9 | Option | 单选字段 |  |  |
| 10 | MultiOption | 多选字段 | [] |  |
| 11 | MultiString | 字符串列表 | [] |  |
| 12 | File | 单个文件 |  | 虚拟字段，上传并绑定一个文件 |
| 13 | MultiFile | 多个文件 |  | 虚拟字段，上传并绑定多个文件 |
| 14 | JSON | JSON |  | JSON字符串存储 |
| 15 | Filters | 筛选条件 |  | 存储中缀表达式筛选条件 |
| 16 | Orders | 排序条件 |  | 存储多字段排序条件 |
| 17 | OneToOne | 一对一 |  | 配置 `relatedModel` |
| 18 | ManyToOne | 多对一 |  | 配置 `relatedModel` |
| 19 | OneToMany | 一对多 |  | 虚拟字段，配置 `relatedModel` + `relatedField` |
| 20 | ManyToMany | 多对多 |  | 虚拟字段，配置 `relatedModel` + `joinModel` + `joinLeft` + `joinRight`|

> 备注：
	1. OneToOne、ManyToOne、OneToMany、ManyToMany 字段涉及到的外键为逻辑外键，非数据库物理外键。
	2. 虚拟字段，在当前数据表中并不存在，操作虚拟字段时，框架自动进行相关处理。

**需要补充说明的字段类型如下：**

### 1.1 `Date` 日期

代码中为 `LocalDate` 对象，展示格式为 `yyyy-MM-dd` ，如 `2026-02-01` 。

### 1.2 `DateTime` 日期时间

适用于精确到秒的日期时间类型，代码中为 `LocalDateTime` 对象，数据库中存储为时间戳，展示格式为 `yyyy-MM-dd HH:mm:ss` ，如 `2026-02-01 12:15:20` 。

### 1.3 `Option` 单选

单选字段，必须配置 `optionCode` 属性（选项集编码）。

在保存单选字段的值时，实际传递和存储的是选项条目的编码。

API 获取单选字段的值时，默认返回 `[itemCode, itemName]` 格式，也即同时返回条目的编码和名称。

选项集的配置和使用，具体参考 [选项集](option) 章节

### 1.4 `MultiOption` 多选

多选字段跟单选字段的区别是，多选字段允许从同一个选项集中，选择多个选项，保存时传递选项的编码字符串列表，并在数据库中存储的多个选项条目的编码，使用 `,` 间隔。

API 读取多选字段的值时，默认返回 `[[itemCode, itemName], ... ]` 格式，也即多个选项的编码和名称。

### 1.5 `MultiString` 字符串列表

适用于通过单字段存储多个字符串值，程序中处理字符串列表对象，在数据库中使用 `,` 间隔存储。

### 1.6 `File` File 字段
该字段类型，用于上传和绑定一个文件。文件自动存储在 FileRecord 模型。

### 1.7 `MultiFile` MultiFile 字段
该字段类型，用于上传和绑定多个文件。文件自动存储在 FileRecord 模型。

### 1.8 `JSON` JSON 字段

JSON 格式字段，一般仅用于 JSON 数据存储和对象转换。需要针对 JSON 数据进行索引和条件查询时，需要手工处理。

### 1.9 `Filters`

仅用于存储 `Filters` 对象的 JSON 字符串。

### 1.10 `Orders`

仅用于存储 `Orders` 对象的 JSON 字符串。

### 1.11 `OneToOne` 一对一

关系型字段，需配置 `relatedModel` 和 `relatedField` 属性。选择的数据具有唯一性。

### 1.12 `ManyToOne`  多对一

关系型字段，需配置 `relatedModel` 和 `relatedField` 属性。

### 1.13 `OneToMany` 一对多

大多数情况下，针对单条记录的 OneToMany 数据，由客户端通过调用 Many 端模型的 API 进行创建、更新或删除。

1. **全量提交**：`[{row1}, {row2}]`，当字段值为 `[]` 时，清空历史记录。
2. **增量提交**，以 `PatchType` 为 Key：
```json
{
  "Create": [{ "name": "new row" }],
  "Update": [{ "id": 101, "name": "changed" }],
  "Delete": [102, 103]
}
```
更多详情见 [API 数据提交](../../backend_dev/api/apiSubmit.md)。

3. **接口响应**：OneToMany 字段的返回形态取决于 `QueryParams.fields`、`QueryParams.subQueries` 与 `ConvertType`。详见 [API 响应](../../backend_dev/api/apiResponse.md) 中的 OneToMany 小节。

备注：
- `OneToMany` 是虚拟字段，依据关联模型的逻辑外键查询并绑定数据，字段本身没有物理数据库列。

### 1.14 `ManyToMany` 多对多

1. **全量提交**：`[id1, id2, id3]`。框架会计算差集，并相应创建或删除连接（中间）表行。
2. **增量提交**，以 `PatchType` 为 Key：
```json
{
  "Add": [1, 2, 3],
  "Remove": [4, 5]
}
```
更多详情见 [API 数据提交](../../backend_dev/api/apiSubmit.md)。

3. **ManyToMany 级联搜索**：典型用法是按连接表字段上的条件筛选当前表记录（例如「在某个时间段内被分配过指定角色的用户」）。参见 [查询条件](../../backend_dev/api/apiQuery.md) 一节。

4. **接口响应**：ManyToMany 字段的返回形态（`List<ModelReference>` 或 `List<Row Map>`）由 `QueryParams.fields`、`QueryParams.subQueries` 与 `ConvertType` 决定。详见 [API 响应](../../backend_dev/api/apiResponse.md) 中的 ManyToMany 小节。

备注：
- `ManyToMany` 也是虚拟字段，依据 JoinModel 中的逻辑外键查询并绑定数据，字段本身没有物理数据库列。

## 2、字段元数据属性

| 序号 | 字段信息 | 数据类型 | 描述 | 备注 |
| --- | --- | --- | --- | --- |
| 1 | labelName | String | 字段标签 |  |
| 2 | modelName | String | 模型名 |  |
| 3 | fieldName | String | 字段名 |  |
| 4 | fieldType | Option | 字段类型 |  |
| 5 | optionCode | String | 选项集编码 |  |
| 6 | defaultValue | String | 字段默认值 |  |
| 7 | length | Integer | 字段长度 |  |
| 8 | scale | Integer | 小数位数 |  |
| 9 | required | Boolean | 必填字段，默认 `false` |  |
| 10 | readonly | Boolean | 只读字段，默认 `false` |  |
| 11 | hidden | Boolean | 是否隐藏，默认 `false` |  |
| 12 | copyable | Boolean | 可复制字段，默认 `true` |  |
| 13 | searchable | Boolean | 可搜索字段，默认 `true` |  |
| 14 | dynamic | Boolean | 动态字段，默认 `false` |  |
| 15 | translatable | Boolean | 可翻译字段，默认 `false` |  |
| 16 | encrypted | Boolean | 加密字段，默认 `false` |  |
| 17 | maskingType | Option | 脱敏类型 |  |
| 18 | computed | Boolean | 计算型字段，默认 `false` |  |
| 19 | expression | String | 计算表达式 |  |
| 20 | cascadedField | String | 级联字段 | 关系属性 |
| 21 | relatedModel | String | 关联模型 | 关系属性 |
| 22 | relatedField | String | 关联字段 | OneToMany 的 Many 端字段名 |
| 23 | joinModel | String | ManyToMany 连接模型 | 中间模型 |
| 24 | joinLeft | String | 连接模型左侧字段名 | 存储左侧模型外键 |
| 25 | joinRight | String | 连接模型右侧字段名 | 存储右侧模型外键 |
| 26 | filters | String | 关系型字段过滤条件 | 关系属性 |
| 27 | columnName | String | 数据表列名 | 只读 |
| 28 | description | String | 字段描述 |  |

### 2.1 `labelName` 字段标签

字段的标签名称，也即字段的语义化名称，通常作为显示在列表页表头或表单页的字段名称。如 `联系电话` 。

### 2.2 `modelName` 模型名

字段所属的模型名，这里的模型名是指模型的技术名称，如 `ProductCategory` 。

### 2.3 `fieldName` 字段名

字段的技术名称，使用小驼峰命名，对应实体类中的属性名，如 `unitPrice`。

查询前，Softa 会按存储类型将字段名转换为下划线命名，例如 `unit_price`。

### 2.4 `fieldType` 字段类型

系统预置的字段类型，包括字符串文本、多种数值类型、日期类型、选项集类型、JSON 类型，以及多种关系类型等，详见 `字段类型 FieldType` 小结。

### 2.5 `optionCode` 选项集编码

选项集一般应用于选项相对固定、选项数量有限，但又需要支持扩展的的业务场景。在 Softa 中，所有的选项信息存储在 `选项集模型`和 `选项集条目模型` 中。

当字段类型为 `单选` 或 `多选` 时，需要配置字段的 `optionCode` 选项集编码属性。

### 2.6 `defaultValue` 字段默认值

默认值配置。创建新记录时，若该字段未被赋值，将使用默认值。

创建（Create）时的赋值逻辑：

1. 若字段已有值（非 `NULL`），Softa 使用当前值，不再应用默认值。对文本字段，空字符串 `""` 视为已有值；对数值字段，`0` 也视为已有值。
2. 若字段未被赋值，Softa 优先使用 `defaultValue`。
3. 若未配置 `defaultValue`，Softa 使用该字段类型的全局默认值（见上文字段类型）。

### 2.7 `length` 字段长度

字段的长度，对应于字符串类型的字符长度，以及整数类型、高精度数值类型的数字位数。

### 2.8 `scale` 小数位数

浮点数类型、高精度数值类型的小数位数，默认小数位数为 2 位。

### 2.9 `required` 必填字段

必填校验。Softa 在应用层校验必填字段，不依赖数据库。

创建或更新数据时会检查 `required` 属性。这与数据库 `NOT NULL` 不同：数据库列可有默认值，从应用视角未必「必填」。Softa 的 `required` 更严格：

- `required=true` 时，创建必须提供值，且不得为空（含不允许空字符串）。
- 更新该字段时，不能设为 null/空。

### 2.10 `readonly` 只读字段

是否允许客户端更新该字段。`readonly=true` 时，客户端/API 不能赋值或更新该字段，仅允许服务端更新（例如计算字段或自动填充字段）。客户端创建/更新会校验该属性；尝试赋值将报错。

审计字段 `createdId`、`createdTime`、`updatedId`、`updatedTime` 由系统自动维护，默认 `readonly=true`。

### 2.11 `hidden` 是否隐藏

是否在客户端默认隐藏该字段，默认为 `false` ，即不隐藏。

### 2.12 `copyable` 可复制字段

在客户端对数据进行复制时，是否复制当前字段的数据，默认为 `true` ，即所有字段都是可复制的，主键 `id` 字段除外。

### 2.13 `searchable` 可搜索字段

在通用搜索场景中，该字段是否可以作为查询条件。默认为  `true` ，即所有字段都是可搜索的。

### 2.14 `dynamic` 动态字段

是否为动态字段，默认 `false`。

`dynamic=true` 时，字段值在运行时动态计算，典型包括动态计算字段与动态级联字段。

运行时系统会自动计算动态字段的值，该字段在数据库中没有物理列。

动态字段的值通常表示最新计算结果。使用动态计算字段时，需审慎评估场景及对客户端性能的影响。

### 2.15 `translatable` 可翻译字段

在数据多语言场景中，表示当前字段的值是否可翻译，`translatable=true` 表示当前字段是多语言字段。默认为 `false` 。

### 2.16 `encrypted` 加密字段

该字段是否为加密字段，默认使用 AES256 加密。

### 2.17 `maskingType` 脱敏类型

字段含敏感数据时，配置脱敏类型（手机号、姓名、证件号、银行卡号等）。

客户端经 API 取数时，Softa 会自动对字段脱敏；可将全部或部分值替换为 `****`。

脱敏不影响服务端计算字段或级联字段：计算字段可依赖脱敏字段，计算字段本身也可被脱敏。

客户端可调用 `getUnmaskedField` API 获取指定字段的明文；服务端会记录访问日志。

- `All` : 全部脱敏，全部替换为  `****` 。
- `Name`：名称脱敏，保留首尾各 1 个字符，当名称只有 2 个字符时，保留最后 1 个字符。
- `Email` ：邮箱脱敏，保留前 4 位字符。
- `PhoneNumber` ：电话号码脱敏，对后 4 位字符进行脱敏。
- `IdNumber`：证件号脱敏，保留首尾各 4 位字符。
- `CardNumber`：卡号码脱敏，保留末尾 4 位字符。

### 2.18 `computed` 计算型字段

是否为计算字段。计算字段可配置表达式，并依赖当前模型的其他字段。

目前出于性能考虑，单个表达式不支持跨模型引用字段；若需要，可在 Flow 编排中读取其他模型的字段并参与计算。

- `dynamic=false` 的计算字段：依赖字段变化时，Softa 会自动触发重算。
- `dynamic=true` 的计算字段：结果不落库，读取时再求值表达式。

### 2.19 `expression` 计算表达式

计算表达式。可引用当前模型的其他字段，并进行算术、字符串函数、日期函数等常用运算。

数值类型采用高精度计算以避免精度损失：计算过程保留 16 位小数，最后使用**银行家舍入**。由于数值字段的 `scale` 通常 \(\le 16\)，不会影响字段自身的精度控制。

Softa 使用 **[AviatorScript](https://github.com/killme2008/aviatorscript)** 作为表达式引擎，并在安全沙箱模式下运行。

### 2.20 `cascadedField` 级联字段

级联字段通过 OneToOne/ManyToOne 从关联模型读取字段值。格式为点号分隔：左侧为当前模型上 OneToOne/ManyToOne 字段名，右侧为关联模型上的字段名，例如 `productId.productName`。

- `dynamic=false` 的级联字段：依赖的 OneToOne/ManyToOne 变化时，Softa 自动触发重算。
- `dynamic=true` 的级联字段：级联值不落库；读取时 Softa 动态取关联侧最新值。

此为逻辑级联，非数据库级联。仅 OneToOne/ManyToOne 支持级联取值。

### 2.21 `relatedModel` 关联模型

关系型字段的关联模型，即 OneToOne、ManyToOne、OneToMany、ManyToMany 字段类型的关联模型名。

### 2.22 `relatedField` 关联字段

- OneToMany：关联模型（Many 端）上指向当前模型外键的字段名，不得为空。
- OneToOne/ManyToOne：默认取关联模型的 `id`。

### 2.23 `joinModel` ManyToMany 连接模型

ManyToMany 中 `joinModel` 不得为空。它是连接（中间）模型，保存两侧模型之间的映射。

查询时，Softa 先从 `joinModel` 取映射关系，再从 `relatedModel` 读取关联数据以完成多对多查询。

默认命名：左侧模型名 + 右侧模型名 + `Rel`，例如 `User` + `Role` + `Rel` → `UserRoleRel`。

### 2.24 `joinLeft` 连接模型左侧字段名

ManyToMany 中，连接模型里保存**左侧**模型外键的字段名。

默认命名：左侧模型名首字母小写 + `Id`，例如 `User` → `userId`。

### 2.25 `joinRight` 连接模型右侧字段名

ManyToMany 中，连接模型里保存**右侧**模型外键的字段名。

默认命名：右侧模型名首字母小写 + `Id`，例如 `Role` → `roleId`。

### 2.26 `filters` 关系型字段过滤条件

OneToOne/ManyToOne 关系字段的基础过滤条件；按业务场景固定，与用户搜索条件以 `AND` 合并。

### 2.27 `columnName` 数据表列名

只读：由字段名推导的物理列名（例如 `unitPrice` → `unit_price`）。

`fieldName` 变更时，Softa 默认同步列名。可通过全局 DDL 开关关闭自动改表列名，以配合由其他方式执行 DDL 的流程。

### 2.28 `description` 字段描述

字段的业务描述。

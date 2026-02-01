# 字段元数据

字段元数据是模型字段的描述信息的集合，它定义了该模型在业务场景中用到的各种字段，以及每个字段的类型、长度、默认值、必填、只读、关联关系等等。通过这些元数据，系统可以按照统一的模式控制数据的响应、处理和交互，同时也可以对通用需求进行抽象处理，确保数据的一致性、准确性和完整性。

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
| 8 | DateTime | 日期时间 |  | 格式 `yyyy-MM-dd HH:mm:ss`，如 `2025-02-01 12:15:20` |
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
| 20 | ManyToMany | 多对多 |  | 虚拟字段，配置 `relatedModel` + `jointModel` + `jointLeft` + `jointRight`|

> 备注：
	1. OneToOne、ManyToOne、OneToMany、ManyToMany 字段涉及到的外键为逻辑外键，非数据库物理外键。
	2. 虚拟字段，在当前数据表中并不存在，操作虚拟字段时，框架自动进行相关处理。

**需要补充说明的字段类型如下：**

### 1.1 `Date` 日期

代码中为 `LocalDate` 对象，展示格式为 `yyyy-MM-dd` ，如 `2026-02-01` 。

### 1.2 `DateTime` 日期时间

适用于精确到秒的日期时间类型，代码中为 `LocalDateTime` 对象，数据库中存储为时间戳，展示格式为 `yyyy-MM-dd HH:mm:ss` ，如 `2026-02-01 12:15:20` 。

### 1.3 `Option` 单选

单选字段，必须配置 `OptionCode`  属性，即选项集编码。

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

### 1.9 `Filter` 筛选条件字段

仅用于存储筛选条件对象 Filters 的 JSON 字符串。

### 1.9 `Orders` 筛选条件字段

仅用于存储排序条件对象 Orders 的 JSON 字符串。

### 1.10 `OneToOne` 一对一

关系型字段，需配置 `relatedModel` 和 `relatedField` 属性。选择的数据具有唯一性。

### 1.11 `ManyToOne`  多对一

关系型字段，需配置 `relatedModel` 和 `relatedField` 属性。

### 1.12 `OneToMany` 一对多

OneToMany 字段的数据，一般在客户端针对单条数据进行新增、编辑、删除，调用 Many 端的模型接口即可。

针对批量编辑 OneToMany 字段值的场景：

（1）字段值为 `[]`，空列表表示全部删除历史记录

（2）字段值不为空时， `[{...}, {...}]` 即 Many 端的数据列表结构时，自动识别出 Many 端的新增、编辑和删除的记录，并进行相应的处理。

### 1.13 `ManyToMany` 多对多

（1） `ManyToMany` 字段的更新

在 Create/Update 场景中，ManyToMany 字段的值传参关联模型的 id 列表。如 Update 请求:

```json
{
	"id": 12,
	"attendeeIds": [1, 2, 3]
}
```

程序自动识别被删除的关系。

（2） `ManyToMany` 字段的级联搜索

应用场景：通过关联表字段的筛选条件，过滤当前表的数据。具体参考 [查询条件](../../develop/query) 章节。

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
| 23 | jointModel | String | ManyToMany 连接模型 | 中间模型 |
| 24 | jointLeft | String | 连接模型左侧字段名 | 存储左侧模型外键 |
| 25 | jointRight | String | 连接模型右侧字段名 | 存储右侧模型外键 |
| 26 | filters | String | 关系型字段过滤条件 | 关系属性 |
| 27 | columnName | String | 数据表列名 | 只读 |
| 28 | description | String | 字段描述 |  |

### 2.1 `labelName` 字段标签

字段的标签名称，也即字段的语义化名称，通常作为显示在列表页表头或表单页的字段名称。如 `联系电话` 。

### 2.2 `modelName` 模型名

字段所属的模型名，这里的模型名是指模型的技术名称，如 `ProductCategory` 。

### 2.3 `fieldName` 字段名

字段的技术名称，使用小驼峰命名，对应实体类的属性名称定义，如 `unitPrice`。在查询前，会根据存储类型对字段名进行转换，将字段名转换成 `下划线命名` ，如 `unit_price`。

### 2.4 `fieldType` 字段类型

系统预置的字段类型，包括字符串文本、多种数值类型、日期类型、选项集类型、JSON 类型，以及多种关系类型等，详见 `字段类型 FieldType` 小结。

### 2.5 `optionCode` 选项集编码

选项集一般应用于选项相对固定、选项数量有限，但又需要支持扩展的的业务场景。在 Softa 中，所有的选项信息存储在 `选项集模型`和 `选项集条目模型` 中。

当字段类型为 `单选` 或 `多选` 时，需要配置字段的 `optionCode` 选项集编码属性。

### 2.6 `defaultValue` 字段默认值

字段的默认值配置，在创建新记录时，如果当前字段没有被赋值，将使用默认值填充。

Create 场景下默认值的赋值逻辑：
（1）判断字段是否有值（非 `NULL`），有值则使用当前值，不再使用默认值。如文本字段的空字符串 `` 也算是有值，数值字段的 0 也是有值。

（2）当前字段没有被赋值时，优先使用默认值填充。

（3）如果字段未配置默认值时，则采用字段类型对应的默认值，具体参考下文 `字段类型 FieldType` ，不同字段类型对应的全局默认值。

### 2.7 `length` 字段长度

字段的长度，对应于字符串类型的字符长度，以及整数类型、高精度数值类型的数字位数。

### 2.8 `scale` 小数位数

浮点数类型、高精度数值类型的小数位数，默认小数位数为 2 位。

### 2.9 `required` 必填字段

字段的必填属性控制，在 Softa 的数据处理程序层面就会立即进行校验，不依赖数据库进行控制。当 create 或 update 数据时检查字段的必填属性，与数据库的 `not null` 属性不同，数据库的`not null` 字段可以有默认值不一定是必填，Softa 字段的 `required` 控制逻辑比数据库的 `not null` 更加严格，`required=true` 的字段，在创建时必须赋值，且值不能为空（包括空字符串也不被允许），更新该字段时，也不能置空。

### 2.10 `readonly` 只读字段

是否允许客户端更新。`readonly=true` 的字段，不允许客户端/API赋值、更新该字段，仅支持服务端更新，如计算型字段或自动填充字段。客户端创建和更新数据时检查字段的该属性，给只读字段赋值时会报错。

审计字段 createdId、createdTime、updatedId、updatedTime 的值由底层自动维护，默认即 `readonly=true`。

### 2.11 `hidden` 是否隐藏

是否在客户端默认隐藏该字段，默认为 `false` ，即不隐藏。

### 2.12 `copyable` 可复制字段

在客户端对数据进行复制时，是否复制当前字段的数据，默认为 `true` ，即所有字段都是可复制的，主键 `id` 字段除外。

### 2.13 `searchable` 可搜索字段

在通用搜索场景中，该字段是否可以作为查询条件。默认为  `true` ，即所有字段都是可搜索的。

### 2.14 `dynamic` 动态字段

该字段是否为动态字段，默认 `false`，程序运行时自动计算动态字段的值，该值不存储在数据库中。

可为 `true` 的场景：动态计算字段、动态级联字段，动态字段的值一般代表最新数据的计算结果值，使用动态计算字段时，需要考虑对客户端性能的影响。

### 2.15 `translatable` 可翻译字段

在数据多语言场景中，表示当前字段的值是否可翻译，`translatable=true` 表示当前字段是多语言字段。默认为 `false` 。

### 2.16 `encrypted` 加密字段

该字段是否为加密字段，默认使用 AES256 加密。

### 2.17 `maskingType` 脱敏类型

当该字段为敏感数据时，配置的数据脱敏类型，可按照手机号、姓名、身份证号、银行卡号规则脱敏等等。

客户端通过 API 获取数据时，程序会自动对该字段的数据进行脱敏处理。脱敏方式可以配置为将字段的全部或部分数据替换为 `****` 字符串。

脱敏字段不影响级联字段、计算型字段这些在服务端计算处理的字段类型，也即计算型字段可以依赖脱敏字段，或计算型字段同时也是脱敏字段。

客户端可以通过 `getUnmaskedField` 接口获取指定字段的敏感数据，在此过程中，服务端将记录敏感数据的访问日志。

- `All` : 全部脱敏，全部替换为  `****` 。
- `Name`：名称脱敏，保留首尾各 1 个字符，当名称只有 2 个字符时，保留最后 1 个字符。
- `Email` ：邮箱脱敏，保留前 4 位字符。
- `PhoneNumber` ：电话号码脱敏，对后 4 位字符进行脱敏。
- `IdNumber`：证件号脱敏，保留首尾各 4 位字符。
- `CardNumber`：卡号码脱敏，保留末尾 4 位字符。

### 2.18 `computed` 计算型字段

表示该字段是否为计算型字段。计算型字段可配置计算表达式，并在计算表达式中依赖当前模型的其它字段。

目前出于性能考虑，不支持在单个计算表达式中跨模型引用字段，如有需要，可以在 Flow 编排中跨模型读取字段数据并参与计算。

`dynamic=false` 的计算型字段，当依赖的字段发生变化时，自动触发重新计算。

`dynamic=true` 的计算型字段，表示计算结果并不存储在数据库中，当读取该计算型字段时，自动执行计算。

### 2.19 `expression` 计算表达式

在 `expression` 表达式中，可以引用当前模型的其它字段进行计算。在表达式中，可以进行四则运算，调用字符串函数、日期函数等常用工具函数。

对于数值类型，默认采用高精度计算避免精度损失，计算过程中保留 16 位小数，末尾采用 `银行家舍入法`。由于数值字段的小数位数参数配置一般小于等于 16 位，因此该计算过程的精度不影响字段本身的精度控制。

Softa 引用了 **[AviatorScript](https://github.com/killme2008/aviatorscript)** 作为表达式引擎，并设置为安全沙箱模式。

### 2.20 `cascadedField` 级联字段

通过 OneToOne/ManyToOne 字段引用关联模型的字段值，配置格式为点号间隔的级联字段，左侧为当前模型的 OneToOne/ManyToOne 字段名，右侧为关联模型的字段名，如 `productId.productName`。

`dynamic=false` 的级联字段，当依赖的 OneToOne/ManyToOne 字段发生变化时，自动触发重新计算。

`dynamic=true` 的级联字段，表示级联值并不存储在数据库中，当读取该级联字段时，自动级联读取最新的字段值。

此级联为逻辑级联，非数据库级联。仅 OneToOne/ManyToOne 字段支持级联取值。

### 2.21 `relatedModel` 关联模型

关系型字段的关联模型，即 OneToOne、ManyToOne、OneToMany、ManyToMany 字段类型的关联模型名。

### 2.22 `relatedField` 关联字段

* 当字段类型为 OneToMany 时，填写关联模型中存储当前模型外键的字段名，且不能为空。
* OneToOne、ManyToOne 时默认该属性为关联模型的 `id`。

### 2.23 `jointModel` ManyToMany 连接模型

当字段类型为 ManyToMany 时，jointModel 不能为空。jointModel 配置的是连接模型，也即中间模型，存储的是左右两个模型的映射关系数据。

在查询时，先到 `jointModel` 连接模型查询映射关系数据，再到 `relatedModel` 查询关联模型的字段数据，从而实现多对多关系的查询。

默认值规则：根据左右两个模型名，以及 `Rel` 标识，自动拼接生成连接模型名，如 `User` + `Role` + `Rel` = `UserRoleRel`。

### 2.24 `jointLeft` 连接模型左侧字段名

当字段类型为 `ManyToMany` 时，配置连接模型存储左侧模型外键的字段名。

默认值规则：将左侧模型名首字母转换为小写，再拼接 `Id` ，如 `User` + `Id` = `userId`。

### 2.25 `jointRight` 连接模型右侧字段名

当字段类型为 `ManyToMany` 时，配置连接模型存储右侧模型外键的字段名。

默认值规则：将右侧模型名首字母转换为小写，再拼接 `Id` ，如 `Role` + `Id` = `roleId`。

### 2.26 `filters` 关系型字段过滤条件

针对 `OneToOne、ManyToOne` 关系型字段的基础筛选条件，用于根据业务场景对可选数据进行过滤，客户端在执行查询时可携带的固定筛选条件，与用户搜索条件是 `AND` 关系。

### 2.27 `columnName` 数据表列名

只读字段，字段对应的数据表列名，由字段名自动转换，如 `unit_price`。

字段名变化时，默认同步修改数据表列名。可以通过全局 DDL 开关配置关闭自动修改数据表，以满足通过其它方式提交 DDL 的场景。

### 2.28 `description` 字段描述

字段的业务描述。

# 快速启动
本章节介绍如何在本地快速启动相关应用程序。

## 1、拉取代码仓库
```bash
git clone https://github.com/softa-io/softa.git
```
快速启动所需的文件在 `./deploy` 目录下。

## 2、运行最小化应用 mini-app
mini-app 是一个仅依赖 web 模块的最小应用，可以验证通用接口能力，通过通用接口访问系统元数据。

### 2.1 方式一：Docker Compose 运行
```bash
docker-compose -f deploy/mini-app/docker-compose.yml up -d
```

### 2.2、方式二：源码运行 mini-app 应用
* （1）使用 IDE 加载 Maven 模块。
* （2）配置 application-dev.yml 文件中的 Redis 和数据库连接信息。
* （3）在 MySQL 数据库执行 ./deploy/mini-app/init_mysql 中的 SQL 脚本。
* （3）配置 Profile 为 dev，并运行 mini-app 应用的主程序。

### 2.3、调用 OpenAPI 接口
mini-app 应用的 API 路径：`/api/mini`
#### 2.3.1 查看接口文档
mini-app 应用的 Swagger 接口文档地址：

[http://localhost/api/mini/swagger-ui/index.html](http://localhost/api/mini/swagger-ui/index.html)

#### 2.3.2 导入 OpenAPI 接口
本地服务启动后，可以将 OpenAPI 接口文档导入到 ApiFox 等接口工具，mini-app 应用的 OpenAPI 接口文档地址为：

http://localhost/api/mini/v3/api-docs

#### 2.3.3 通过 curl 命令调用
```bash
curl -X POST 'http://localhost/api/mini/SysField/searchPage' \
-H 'Content-Type: application/json' \
-d '{}'
```

## 3、运行 demo-app 应用
demo-app 是一个实验性应用，依赖了开发过程中新增的 starters，用来验证新增的功能特性。因此，准备工作也会复杂一些。

由于 Demo 应用依赖了 ElasticSearch、Pulsar、OSS，需要先运行这些服务，或者连接到已有的测试环境。

### 3.1 运行服务依赖
如果已经有 ElasticSearch、Pulsar、OSS 测试环境，可以跳过运行步骤，直接创建 ES index 、消息 Topics 和 OSS Bucket。

#### 3.1.1 Docker Compose 运行 ElasticSearch
```bash
docker-compose -f deploy/efk/docker-compose.yml up -d
```
Kibana 客户端访问地址： http://localhost:5601

#### 3.1.2 Docker Compose 运行 Pulsar
```bash
docker-compose -f deploy/pulsar/docker-compose.yml up -d
```
Pulsar 客户端地址： http://localhost:8080

#### 3.1.3 Docker Compose 运行 OSS（Minio）
Softa 的 OSS 存储，支持 Minio 和 阿里云 OSS 服务。在测试过程中，为了减少外部依赖，通过运行单机 Minio 服务提供 OSS 服务。
```bash
docker-compose -f deploy/minio/docker-compose.yml up -d
```
* OSS API 地址： http://localhost:9000
* 管理界面地址 http://localhost:9001
* Root 用户名: minioadmin
* Root 密码: minioadmin

### 3.2 Docker Compose 运行 Demo 应用
#### 3.2.1 配置环境变量
如果连接到已有的 ElasticSearch、Pulsar 和 OSS，修改 `deploy/demo-app/docker-compose.yml` 中的 `demo-app` 服务的环境变量，指定相关的服务地址。其中 `SPRING_PULSAR_CLIENT_SERVICE_URL` 需要配置 Pulsar 服务的 IP 地址。
```yml
  demo-app:
    image: softa/demo-app:1.0
    ports:
      - 80:80
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/demo?useUnicode=true&characterEncoding=utf-8&allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=GMT%2B8
      - SPRING_PULSAR_CLIENT_SERVICE_URL=host.docker.internal:6650
      - SPRING_ELASTICSEARCH_CLUSTER=http://host.docker.internal:9200
      - SPRING_ELASTICSEARCH_USERNAME=your_username
      - SPRING_ELASTICSEARCH_PASSWORD=your_password
      - SPRING_ELASTICSEARCH_INDEX_CHANGELOG=demo_dev_changelog
      - OSS_TYPE=minio
      - OSS_ENDPOINT=http://host.docker.internal:9000
      - OSS_ACCESS_KEY=minioadmin
      - OSS_SECRET_KEY=minioadmin
      - OSS_BUCKET=demo-app
    depends_on:
      - redis
      - mysql
```

#### 3.2.2 Docker Compose 运行 Demo 应用
```bash
docker-compose -f deploy/demo-app/docker-compose.yml up -d
```

### 3.3、调用 OpenAPI 接口
demo-app 应用的 API 路径：`/api/demo`
#### 3.3.1 查看接口文档
Demo 应用的 Swagger 接口文档地址：

[http://localhost/api/demo/swagger-ui/index.html](http://localhost/api/demo/swagger-ui/index.html)

#### 3.3.2 导入 OpenAPI 接口
本地服务启动后，可以将 OpenAPI 接口文档导入到 ApiFox 等接口工具，Demo 应用的 OpenAPI 接口文档地址为：

http://localhost/api/demo/v3/api-docs

#### 3.3.3 通过 curl 命令调用
```bash
curl -X POST 'http://localhost/api/demo/SysField/searchPage' \
-H 'Content-Type: application/json' \
-d '{}'
```
# 1. 构建多平台镜像

## 1.1 通过 GitHub Actions 构建并推送
你可以使用 GitHub Actions 工作流或其他 CI 工具，构建并推送多平台镜像到 Docker 镜像仓库。

更多细节请参考 `.github/workflows/build-and-push.yml` 文件。
当推送以 "v" 开头的 tag 时触发构建，例如 `v1.0.0`。

`./deploy/Dockerfile` 是一个通用的多阶段 Dockerfile，可用于构建应用镜像。
在 GitHub Actions 工作流中，会通过 build args 传入 `APP_PATH`、`APP_NAME` 参数。
镜像的 `version` 会从 tag 名中提取，例如 `v1.0.0` -> `1.0.0`。

## 1.2 本地脚本手动构建并推送
构建镜像并推送到 Docker 镜像仓库。

通过指定 `APP_PATH`、`APP_VERSION` 来构建 Java 应用镜像。
```
./deploy/build.sh <APP_PATH> <APP_VERSION> [<REGISTRY_NAMESPACE>]
```
其中 `APP_PATH` 是应用源码目录的相对路径，例如 `apps/demo-app`。
并且 `APP_PATH` 的最后一段名称就是应用名，例如 `demo-app`。

`REGISTRY_NAMESPACE` 为可选参数，默认值是 `softa`。
你可以指定 `REGISTRY_NAMESPACE`，将镜像推送到你自己的 Docker 镜像仓库。

构建 Demo 应用镜像示例：
```bash
./deploy/build.sh apps/demo-app 1.0.3
```

# 2. 通过 Docker Compose 启动 EFK（可选）
```bash
docker-compose -f deploy/efk/docker-compose.yml up -d
```
通过 `http://localhost:5601` 访问 Kibana 控制台。

或者你也可以通过配置 `spring.elasticsearch.uris` 属性，连接到你自己的 Elasticsearch 集群。

# 3. 通过 Docker Compose 启动 Pulsar（可选）
```bash
docker-compose -f deploy/pulsar/docker-compose.yml up -d
```
通过 `http://localhost:8080` 访问 Pulsar 控制台。

或者你也可以通过配置 `spring.pulsar.service-url` 属性，连接到你自己的 Pulsar 集群。

最关键的是：你需要配置 `mq.topics.xxx.topic` 属性，才能启用对应的 Listener。

另一方面，如果你还没准备好搭建 Pulsar 服务，也可以选择不配置，
或注释掉 `mq.topics.xxx` 相关 topics，以避免因无法启动而阻塞。

# 4. 通过 Docker Compose 启动 Minio（可选）
```bash
docker-compose -f deploy/minio/docker-compose.yml up -d
```
### Minio API 地址
`http://localhost:9000`

### Minio Web UI 控制台
`http://localhost:9001`
Username: minioadmin
Password: minioadmin

# 5. 通过 Docker Compose 启动 Demo 应用
```bash
docker-compose -f ./deploy/demo-app/docker-compose.yml up -d
```
创建数据库实例，并执行 `deploy/demo-app/init_mysql` 中的 SQL 脚本。

# 6. 生产环境
强烈建议生产环境通过流水线，并使用 Kubernetes 进行容器化部署。
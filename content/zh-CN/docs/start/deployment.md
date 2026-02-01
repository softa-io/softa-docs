# 系统部署

## 1. 构建多架构镜像并推送到镜像仓库
在构建 Docker 镜像时，需要为每种 CPU 架构分别构建镜像。这里仅考虑 linux/amd64、linux/arm64 两种 CPU 架构，能覆盖绝大多数机器的 CPU。
### 1.1 准备多架构环境
Docker Engine 已经内置了 buildx 插件，支持同时构建多架构镜像。

创建并使用新的 builder，以支持 multi-architecture 构建：
```bash
docker buildx create --name multi-arch --use
```
显示已有 builder，检查是否创建成功：
```bash
docker buildx ls
```
### 1.2 构建多架构 Docker 镜像
在代码库根目录下，通过指定 `APP_PATH` 和 `APP_VERSION` 来构建 Java 应用镜像。
```bash
./deploy/build.sh <APP_PATH> <APP_VERSION> [<REGISTRY_NAMESPACE>]
```
构建参数中，`APP_PATH` 是要构建应用的相对目录，字符串末级名称即是应用名称。如 Demo 应用的目录为 `apps/demo-app`。

 `REGISTRY_NAMESPACE` 是可选参数，默认值为 `softa`，也即 Docker Hub 官方仓库的 `softa` 命名空间。
可以通过指定 `REGISTRY_NAMESPACE` 将 Docker 镜像推送到私有镜像仓库。

构建 Demo 应用的镜像示例：
```bash
./deploy/build.sh apps/demo-app 1.0
```

## 2 通过 Docker Compose 启动 Demo 应用
```bash
docker-compose -f ./deploy/demo-app/docker-compose.yml up -d
```
具体可以参考 [快速开始](./quickStart) 中的 Demo 应用配置和启动小节。

## 3 生产环境
建议生产环境通过流水线、Kubernetes 进行部署。
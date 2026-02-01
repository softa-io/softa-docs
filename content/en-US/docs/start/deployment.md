# System Deployment

## 1. Build Multi-Architecture Images and Push to Image Registry
When building Docker images, it is necessary to create images for each CPU architecture. Here, only `linux/amd64` and `linux/arm64` architectures are considered, as they cover the majority of CPUs.

### 1.1 Prepare Multi-Architecture Environment
Docker Engine includes the `buildx` plugin, which supports building multi-architecture images.

Create and use a new builder to enable multi-architecture builds:
```bash
docker buildx create --name multi-arch --use
```

List existing builders to verify the new builder was created successfully:
```bash
docker buildx ls
```

### 1.2 Build Multi-Architecture Docker Images
In the root directory of the code repository, build Java application images by specifying `APP_PATH` and `APP_VERSION`:
```bash
./deploy/build.sh <APP_PATH> <APP_VERSION> [<REGISTRY_NAMESPACE>]
```

In the parameters:
- `APP_PATH` is the relative directory of the application to be built. The last segment of the string serves as the application name. For example, the directory for the demo application is `apps/demo-app`.
- `REGISTRY_NAMESPACE` is an optional parameter. The default value is `softa`, which corresponds to the `softa` namespace in the official Docker Hub registry.
  You can specify `REGISTRY_NAMESPACE` to push the Docker image to a private image registry.

Example for building the demo application image:
```bash
./deploy/build.sh apps/demo-app 1.0
```

## 2. Launch the Demo Application Using Docker Compose
```bash
docker-compose -f ./deploy/demo-app/docker-compose.yml up -d
```

For detailed configuration and launch instructions, refer to the [Quick Start Guide](./quickStart) section for the demo application.

## 3. Production Environment
It is recommended to deploy the production environment using CI/CD pipelines and Kubernetes.
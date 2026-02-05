# Quick Start Guide
This section introduces how to quickly launch related applications locally.

## 1. Clone the Code Repository
```bash
git clone https://github.com/softa-io/softa.git
```
The files required for quick launch are located in the `./deploy` directory.

## 2. Run the Minimal Application (mini-app)
The mini-app is a minimal application that only depends on the web module. It can be used to verify general interface capabilities and access system metadata via general interfaces.

### 2.1 Method 1: Run with Docker Compose
```bash
docker-compose -f deploy/mini-app/docker-compose.yml up -d
```

### 2.2 Method 2: Run the mini-app from Source Code
1. Load the Maven module using an IDE.
2. Configure the Redis and database connection information in the `application-dev.yml` file.
3. Execute the SQL scripts in `./deploy/mini-app/init_mysql` in the MySQL database.
4. Set the profile to `dev` and run the main program of the mini-app.

### 2.3 Call OpenAPI Interfaces
The API path for the mini-app is: `/api/mini`

#### 2.3.1 View API Documentation
The Swagger API documentation for the mini-app is available at:
[http://localhost/api/mini/swagger-ui/index.html](http://localhost/api/mini/swagger-ui/index.html)

#### 2.3.2 Import OpenAPI Interfaces
After starting the local service, you can import the OpenAPI documentation into tools like ApiFox. The OpenAPI documentation for the mini-app is available at:
[http://localhost/api/mini/v3/api-docs](http://localhost/api/mini/v3/api-docs)

#### 2.3.3 Call via curl
```bash
curl -X POST 'http://localhost/api/mini/SysField/searchPage' \
-H 'Content-Type: application/json' \
-d '{}'
```

## 3. Run the demo-app Application
Demo app is an aggregated application that depends on all starter modules, and is used to experience all feature capabilities. Therefore, the preparation work is a bit more involved.

Because the Demo application depends on ElasticSearch, Pulsar, and OSS, you need to start these services first, or connect to an existing test environment.

### 3.1 Run ElasticSearch and Pulsar
If there is an existing ElasticSearch, Pulsar and OSS testing environment, you can skip these steps and directly create the necessary ES indices and message topics.

#### 3.1.1 Run ElasticSearch with Docker Compose
```bash
docker-compose -f deploy/efk/docker-compose.yml up -d
```
Kibana client access: [http://localhost:5601](http://localhost:5601)

#### 3.1.2 Run Pulsar with Docker Compose
```bash
docker-compose -f deploy/pulsar/docker-compose.yml up -d
```
Access the Pulsar console at [http://localhost:8080](http://localhost:8080)

If the `mq.topics.xxx` topic properties are not configured in the Spring configuration file, the corresponding listener will not be started.

In other words, if the Pulsar environment is not ready yet, you can avoid startup failures by simply not configuring the `mq.topics` properties.

#### 3.1.3 Running OSS (Minio) with Docker Compose

The OSS storage for Softa supports both Minio and Alibaba Cloud OSS services. During testing, to reduce external dependencies, a standalone Minio service is used to provide OSS functionality.

```bash
docker-compose -f deploy/minio/docker-compose.yml up -d
```

- Minio API endpoint: [http://localhost:9000](http://localhost:9000)
- Web UI Dashboard: [http://localhost:9001](http://localhost:9001)
- Root user: `minioadmin`
- Root password: `minioadmin`

### 3.2 Run the Demo Application with Docker Compose
#### 3.2.1 Configure Environment Variables
If connecting to an existing ElasticSearch, Pulsar and OSS, modify the environment variables of `demo-app` in `deploy/demo-app/docker-compose.yml`.`SPRING_PULSAR_CLIENT_SERVICE_URL` requires the address of the Pulsar server.
```yaml
  demo-app:
    image: softa/demo-app:1.0.2
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

#### 3.2.2 Run the Demo Application with Docker Compose
```bash
docker-compose -f deploy/demo-app/docker-compose.yml up -d
```

### 3.3 Call OpenAPI Interfaces
The API path for the demo-app is: `/api/demo`

#### 3.3.1 View API Documentation
The Swagger API documentation for the demo application is available at:
[http://localhost/api/demo/swagger-ui/index.html](http://localhost/api/demo/swagger-ui/index.html)

#### 3.3.2 Import OpenAPI Interfaces
After starting the local service, you can import the OpenAPI documentation into tools like ApiFox. The OpenAPI documentation for the demo-app is available at:
[http://localhost/api/demo/v3/api-docs](http://localhost/api/demo/v3/api-docs)

#### 3.3.3 Call via curl
```bash
curl -X POST 'http://localhost/api/demo/SysField/searchPage' \
-H 'Content-Type: application/json' \
-d '{}'
```
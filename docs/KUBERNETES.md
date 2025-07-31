# Kubernetes 部署指南

本文档详细说明如何将 Hono 项目部署到 k3s Kubernetes 集群。

## 目录结构

```
k8s/
├── namespace.yaml          # 命名空间和资源限制
├── secrets.yaml           # 密钥配置
├── postgres.yaml          # PostgreSQL 数据库
├── redis.yaml             # Redis 缓存
├── pgbouncer.yaml         # PgBouncer 连接池
├── app.yaml               # Hono 应用
├── ingress.yaml           # 外部访问配置
└── monitoring.yaml        # Prometheus + Grafana 监控

scripts/k8s/
├── deploy.sh              # 一键部署脚本
├── cleanup.sh             # 清理脚本
├── build-and-push.sh      # 镜像构建脚本
└── test-functionality.sh  # 功能测试脚本
```

## 前置要求

### 1. 安装 k3s

```bash
# 安装 k3s
curl -sfL https://get.k3s.io | sh -

# 配置 kubectl
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# 验证安装
kubectl cluster-info
```

### 2. 安装 Docker

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install docker.io
sudo usermod -aG docker $USER

# macOS
brew install docker

# 启动 Docker
sudo systemctl start docker
```

### 3. 验证环境

```bash
# 检查工具
kubectl version --client
docker --version

# 检查 k3s 状态
kubectl get nodes
kubectl get pods -A
```

## 快速部署

### 1. 一键部署

```bash
# 部署到 k3s
./scripts/k8s/deploy.sh

# 使用自定义镜像标签
IMAGE_TAG=v1.0.0 ./scripts/k8s/deploy.sh

# 使用镜像仓库
REGISTRY=docker.io/myuser IMAGE_TAG=v1.0.0 ./scripts/k8s/deploy.sh
```

### 2. 验证部署

```bash
# 检查所有资源状态
kubectl get all -n hono-template

# 检查应用日志
kubectl logs -f -l app=hono-app -n hono-template

# 运行功能测试
./scripts/k8s/test-functionality.sh
```

### 3. 访问应用

部署完成后，应用可通过以下方式访问：

- **NodePort**: http://localhost:30999
- **Ingress**: http://hono-template.local (需配置 hosts)
- **监控面板**: http://localhost:30300 (Grafana)

## 手动部署步骤

### 1. 构建 Docker 镜像

```bash
# 构建镜像
./scripts/k8s/build-and-push.sh latest

# 或使用现有 Dockerfile
docker build -f Dockerfile.k8s -t hono-template:latest .
```

### 2. 部署基础设施

```bash
# 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 部署配置和密钥
kubectl apply -f k8s/secrets.yaml

# 部署数据库
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# 等待数据库就绪
kubectl wait --for=condition=Ready pod -l app=postgres -n hono-template --timeout=300s
kubectl wait --for=condition=Ready pod -l app=redis -n hono-template --timeout=300s
```

### 3. 部署中间件

```bash
# 部署 PgBouncer
kubectl apply -f k8s/pgbouncer.yaml
kubectl wait --for=condition=Ready pod -l app=pgbouncer -n hono-template --timeout=120s
```

### 4. 部署应用

```bash
# 部署应用和服务
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/ingress.yaml

# 等待应用就绪
kubectl wait --for=condition=Ready pod -l app=hono-app -n hono-template --timeout=300s
```

### 5. 部署监控 (可选)

```bash
# 部署 Prometheus 和 Grafana
kubectl apply -f k8s/monitoring.yaml

# 访问 Grafana: http://localhost:30300
# 默认账号: admin / admin123
```

## 配置说明

### 环境变量配置

在 `k8s/secrets.yaml` 中修改以下配置：

```yaml
stringData:
  # 生产环境必须更换
  CLIENT_JWT_SECRET: your-secure-client-jwt-secret
  ADMIN_JWT_SECRET: your-secure-admin-jwt-secret

  # 数据库配置
  DB_PASSWORD: your-secure-db-password

  # Grafana 密码
  GRAFANA_ADMIN_PASSWORD: your-secure-grafana-password
```

### 资源限制

在 `k8s/namespace.yaml` 中配置集群资源限制：

```yaml
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
```

### 域名配置

要使用 Ingress 域名访问，需要配置 hosts 文件：

```bash
# 获取节点 IP
kubectl get nodes -o wide

# 添加到 /etc/hosts (Linux/macOS) 或 C:\Windows\System32\drivers\etc\hosts (Windows)
<NODE_IP> hono-template.local
```

## 功能测试

### 自动化测试

```bash
# 运行完整功能测试
./scripts/k8s/test-functionality.sh

# 指定测试端点
./scripts/k8s/test-functionality.sh http://hono-template.local

# 指定命名空间
./scripts/k8s/test-functionality.sh http://localhost:30999 hono-template
```

### 手动测试

#### 1. 健康检查

```bash
curl http://localhost:30999/health
# 期望返回: {"status":"ok"}
```

#### 2. API 文档

```bash
# 访问 OpenAPI 文档
curl http://localhost:30999/doc
```

#### 3. 监控指标

```bash
# 检查 Prometheus 指标
curl http://localhost:30999/metrics
```

#### 4. 数据库连接

```bash
# 测试数据库连接
kubectl exec -n hono-template deployment/postgres -- \
  psql -U postgres -d postgres -c "SELECT version();"
```

#### 5. Redis 连接

```bash
# 测试 Redis 连接
kubectl exec -n hono-template deployment/redis -- redis-cli ping
```

### 性能测试

```bash
# 简单压力测试 (需要安装 apache2-utils)
ab -n 1000 -c 10 http://localhost:30999/health

# 或使用 curl 进行简单测试
time curl http://localhost:30999/health
```

## 故障排查

### 常见问题

#### 1. Pod 启动失败

```bash
# 查看 Pod 状态
kubectl get pods -n hono-template

# 查看详细事件
kubectl describe pod <pod-name> -n hono-template

# 查看容器日志
kubectl logs <pod-name> -n hono-template -c <container-name>
```

#### 2. 服务无法访问

```bash
# 检查服务状态
kubectl get services -n hono-template

# 检查端点
kubectl get endpoints -n hono-template

# 测试服务内部连接
kubectl exec -n hono-template <pod-name> -- curl http://hono-app-service/health
```

#### 3. 数据库迁移失败

```bash
# 查看应用启动日志
kubectl logs -l app=hono-app -n hono-template

# 手动执行迁移
kubectl exec -n hono-template deployment/hono-app -- \
  sh -c "cd /app/migrate && pnpm run db:migrate ../migrations"
```

#### 4. 持久化存储问题

```bash
# 检查 PVC 状态
kubectl get pvc -n hono-template

# 检查存储类
kubectl get storageclass

# 检查卷挂载
kubectl describe pod <pod-name> -n hono-template
```

### 日志收集

```bash
# 收集所有应用日志
kubectl logs -l app=hono-app -n hono-template --previous > app-logs.txt

# 收集数据库日志
kubectl logs -l app=postgres -n hono-template > postgres-logs.txt

# 收集集群事件
kubectl get events -n hono-template --sort-by=.metadata.creationTimestamp
```

## 清理和维护

### 完全清理

```bash
# 使用清理脚本
./scripts/k8s/cleanup.sh

# 强制清理（不询问确认）
./scripts/k8s/cleanup.sh --force
```

### 部分清理

```bash
# 只删除应用
kubectl delete -f k8s/app.yaml
kubectl delete -f k8s/ingress.yaml

# 只删除监控
kubectl delete -f k8s/monitoring.yaml

# 删除持久化数据
kubectl delete pvc --all -n hono-template
```

### 更新部署

```bash
# 构建新镜像
IMAGE_TAG=v1.1.0 ./scripts/k8s/build-and-push.sh

# 更新部署
kubectl set image deployment/hono-app hono-app=hono-template:v1.1.0 -n hono-template

# 查看滚动更新状态
kubectl rollout status deployment/hono-app -n hono-template

# 回滚部署（如需要）
kubectl rollout undo deployment/hono-app -n hono-template
```

## 监控和观察

### Grafana 仪表板

访问 http://localhost:30300：

- 用户名: admin
- 密码: admin123 (在 secrets.yaml 中配置)

### Prometheus 指标

访问 http://localhost:9090 查看 Prometheus 控制台

### 关键指标

- HTTP 请求率: `rate(http_requests_total[5m])`
- 响应时间: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- 内存使用: `process_resident_memory_bytes`
- CPU 使用: `rate(process_cpu_seconds_total[5m]) * 100`

## 生产环境配置

### 安全配置

1. **更换默认密钥**：

   ```bash
   # 生成安全的 JWT 密钥
   openssl rand -base64 32
   ```

2. **配置 TLS**：

   ```yaml
   # 在 ingress.yaml 中启用 TLS
   tls:
     - hosts:
         - hono-template.yourdomain.com
       secretName: hono-tls-secret
   ```

3. **网络策略**：
   ```yaml
   # 限制 Pod 间通信
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: hono-network-policy
   spec:
   # ... 网络策略配置
   ```

### 资源优化

1. **调整资源限制**：

   ```yaml
   resources:
     requests:
       cpu: 500m
       memory: 1Gi
     limits:
       cpu: 2000m
       memory: 2Gi
   ```

2. **配置水平扩展**：
   ```yaml
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   metadata:
     name: hono-app-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: hono-app
     minReplicas: 2
     maxReplicas: 10
     metrics:
       - type: Resource
         resource:
           name: cpu
           target:
             type: Utilization
             averageUtilization: 80
   ```

### 备份策略

1. **数据库备份**：

   ```bash
   # 创建备份 CronJob
   kubectl create cronjob postgres-backup \
     --image=postgres:16-alpine \
     --schedule="0 2 * * *" \
     -- pg_dump -h postgres-service -U postgres postgres > /backup/backup-$(date +%Y%m%d).sql
   ```

2. **配置备份**：
   ```bash
   # 导出配置
   kubectl get configmap,secret -n hono-template -o yaml > config-backup.yaml
   ```

## 总结

通过本指南，您可以：

1. **快速部署**：使用一键部署脚本快速启动整个应用栈
2. **完整测试**：通过自动化测试验证所有功能正常
3. **监控观察**：使用 Prometheus 和 Grafana 监控应用性能
4. **故障排查**：根据常见问题快速定位和解决问题
5. **生产就绪**：应用生产环境最佳实践

项目现已完全适配 k3s 部署，具备企业级的可靠性和可维护性。

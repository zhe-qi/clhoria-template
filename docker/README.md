# Docker 配置说明

这个目录包含各种服务的 Docker 配置文件。

## 监控服务

监控功能已集成到主 `docker-compose.yml` 中，使用 Docker Compose Profiles：

```bash
# 启动监控服务
docker-compose --profile monitoring up -d

# 启动完整应用（含监控）
docker-compose --profile full up -d
```

## 监控服务访问

- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **PgBouncer Exporter**: http://localhost:9127/metrics

## 配置文件

- `grafana/` - Grafana 仪表板和数据源配置
- `pgbouncer/` - PgBouncer 连接池配置
- `prometheus/` - Prometheus 配置

## 监控架构

```
PgBouncer → pgbouncer_exporter → Prometheus → Grafana
```

所有配置都在主 `docker-compose.yml` 文件中，无需额外的配置文件。

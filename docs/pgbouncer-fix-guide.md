# PgBouncer 处理方案使用说明

这个文档提供了 PgBouncer "pidfile exists, another instance running" 问题的完整解决方案。

## 🚀 快速解决

### 立即修复（电脑重启后）
```bash
# 运行系统恢复脚本
./scripts/system-recovery.sh
```

### 手动修复步骤
```bash
# 1. 停止所有服务
docker-compose down

# 2. 清理 Docker 资源
docker system prune -f

# 3. 重新启动服务
docker-compose up -d postgres pgbouncer redis
```

## 📁 新增文件说明

### 1. 脚本文件

- **`scripts/pgbouncer-health-check.sh`** - PgBouncer 健康检查脚本
- **`scripts/pgbouncer-monitor.sh`** - 监控守护进程脚本  
- **`scripts/system-recovery.sh`** - 系统重启后恢复脚本

### 2. 配置更新

- **`docker/pgbouncer/entrypoint.sh`** - 添加了 PID 文件清理机制
- **`docker-compose.yml`** - 优化了健康检查配置

## 🛠️ 使用方法

### 健康检查脚本
```bash
# 检查 PgBouncer 健康状态（自动修复）
./scripts/pgbouncer-health-check.sh
```

### 监控守护进程
```bash
# 启动监控
./scripts/pgbouncer-monitor.sh start

# 查看状态  
./scripts/pgbouncer-monitor.sh status

# 查看日志
./scripts/pgbouncer-monitor.sh logs

# 停止监控
./scripts/pgbouncer-monitor.sh stop
```

### 系统恢复
```bash
# 系统重启后运行此脚本恢复所有服务
./scripts/system-recovery.sh
```

## 🔧 核心改进

### 1. PID 文件清理机制
`docker/pgbouncer/entrypoint.sh` 现在会：
- 检查现有 PID 文件
- 验证进程是否真实运行
- 自动清理过期的 PID 文件
- 防止重复启动

### 2. 增强的健康检查  
`docker-compose.yml` 中的改进：
- 增加启动时间到 60 秒
- 增加重试次数到 5 次
- 更稳定的容器启动

### 3. 自动监控和恢复
- 定期健康检查（60秒间隔）
- 自动故障恢复
- 完整的日志记录
- 优雅的进程管理

## 📋 预防措施

### 1. 系统重启后
```bash
# 每次系统重启后运行
./scripts/system-recovery.sh
```

### 2. 启用监控
```bash
# 启动后台监控（推荐）
./scripts/pgbouncer-monitor.sh start
```

### 3. 定期检查
```bash
# 添加到 crontab（可选）
# 每小时检查一次
0 * * * * /path/to/project/scripts/pgbouncer-health-check.sh
```

## 🐛 故障排除

### 查看日志
```bash
# 查看 Docker 日志
docker-compose logs pgbouncer

# 查看监控日志
./scripts/pgbouncer-monitor.sh logs

# 查看健康检查状态
./scripts/pgbouncer-health-check.sh
```

### 手动清理
```bash
# 如果脚本无法解决问题，手动清理
docker-compose exec pgbouncer rm -f /var/run/pgbouncer/pgbouncer.pid
docker-compose restart pgbouncer
```

## ✅ 验证修复
```bash
# 测试 PgBouncer 连接
PGPASSWORD=postgres psql -h localhost -p 6432 -U postgres -d postgres -c "SELECT 1 as test;"

# 查看服务状态
docker-compose ps
```

这套解决方案确保了 PgBouncer 的稳定运行和自动故障恢复能力。
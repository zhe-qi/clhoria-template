#!/bin/bash
# 系统重启后的服务恢复脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# 清理所有 Docker 资源
cleanup_docker() {
    log "清理 Docker 资源..."
    
    # 停止所有服务
    cd "$PROJECT_ROOT"
    docker-compose down 2>/dev/null || true
    
    # 清理系统资源
    docker system prune -f --volumes 2>/dev/null || true
    
    log "Docker 资源清理完成"
}

# 启动核心服务
start_services() {
    log "启动核心数据库服务..."
    cd "$PROJECT_ROOT"
    
    # 启动 PostgreSQL
    docker-compose up -d postgres
    
    # 等待 PostgreSQL 启动
    log "等待 PostgreSQL 启动..."
    sleep 10
    
    # 启动 PgBouncer
    log "启动 PgBouncer 服务..."
    docker-compose up -d pgbouncer
    
    # 等待 PgBouncer 启动
    log "等待 PgBouncer 启动..."
    sleep 15
    
    # 启动 Redis
    log "启动 Redis 服务..."
    docker-compose up -d redis
    
    log "核心服务启动完成"
}

# 验证服务状态
verify_services() {
    log "验证服务状态..."
    cd "$PROJECT_ROOT"
    
    # 检查服务状态
    docker-compose ps
    
    # 测试 PgBouncer 连接
    log "测试 PgBouncer 连接..."
    if docker-compose exec -T pgbouncer sh -c 'PGPASSWORD=${DB_PASSWORD:-postgres} psql -h localhost -p 6432 -U ${DB_USER:-postgres} -d ${DB_NAME:-postgres} -c "SELECT 1 as test;"' > /dev/null 2>&1; then
        log "PgBouncer 连接测试成功"
    else
        error "PgBouncer 连接测试失败"
        return 1
    fi
    
    # 测试 Redis 连接
    log "测试 Redis 连接..."
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "Redis 连接测试成功"
    else
        error "Redis 连接测试失败"
        return 1
    fi
    
    log "所有服务验证通过"
}

# 主函数
main() {
    log "开始系统重启后的服务恢复流程..."
    
    # 步骤 1: 清理
    cleanup_docker
    
    # 步骤 2: 启动服务
    start_services
    
    # 步骤 3: 验证
    verify_services
    
    log "服务恢复流程完成！"
    log "建议运行以下命令启动监控："
    log "  $SCRIPT_DIR/pgbouncer-monitor.sh start"
}

main "$@"
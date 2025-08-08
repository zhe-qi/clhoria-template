#!/bin/bash
# PgBouncer 健康检查和自动修复脚本

set -e

# 配置
COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="pgbouncer"
MAX_RETRIES=3
RETRY_DELAY=10

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# 检查 PgBouncer 健康状态
check_pgbouncer_health() {
    log "检查 PgBouncer 健康状态..."
    
    # 检查容器是否运行
    if ! docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME" | grep -q "Up"; then
        error "PgBouncer 容器未运行"
        return 1
    fi
    
    # 检查连接是否正常
    if ! docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
        sh -c 'PGPASSWORD=${DB_PASSWORD:-postgres} psql -h localhost -p 6432 -U ${DB_USER:-postgres} -d ${DB_NAME:-postgres} -c "SELECT 1;" > /dev/null 2>&1'; then
        error "PgBouncer 连接测试失败"
        return 1
    fi
    
    log "PgBouncer 健康检查通过"
    return 0
}

# 清理 PID 文件
cleanup_pid_files() {
    log "清理可能的 PID 文件..."
    docker-compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
        sh -c 'rm -f /var/run/pgbouncer/pgbouncer.pid' 2>/dev/null || true
}

# 重启 PgBouncer 服务
restart_pgbouncer() {
    log "重启 PgBouncer 服务..."
    
    # 停止服务
    docker-compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME"
    
    # 清理 PID 文件
    cleanup_pid_files
    
    # 启动服务
    docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
    
    # 等待服务启动
    sleep 5
}

# 主函数
main() {
    local retry_count=0
    
    log "开始 PgBouncer 健康检查..."
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if check_pgbouncer_health; then
            log "PgBouncer 运行正常"
            exit 0
        fi
        
        retry_count=$((retry_count + 1))
        warn "健康检查失败 (尝试 $retry_count/$MAX_RETRIES)"
        
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log "尝试重启 PgBouncer..."
            restart_pgbouncer
            
            log "等待 ${RETRY_DELAY} 秒后重试..."
            sleep $RETRY_DELAY
        fi
    done
    
    error "PgBouncer 健康检查失败，已达到最大重试次数"
    
    # 收集诊断信息
    log "收集诊断信息..."
    echo "=== Docker Compose 状态 ==="
    docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME" || true
    
    echo "=== PgBouncer 容器日志 (最后50行) ==="
    docker-compose -f "$COMPOSE_FILE" logs --tail 50 "$SERVICE_NAME" || true
    
    exit 1
}

# 如果直接运行脚本，执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
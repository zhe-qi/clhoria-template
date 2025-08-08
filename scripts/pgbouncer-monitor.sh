#!/bin/bash
# PgBouncer 监控和自动恢复守护进程

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_CHECK_SCRIPT="$SCRIPT_DIR/pgbouncer-health-check.sh"
CHECK_INTERVAL=60  # 检查间隔（秒）
PID_FILE="/tmp/pgbouncer-monitor.pid"
LOG_FILE="/tmp/pgbouncer-monitor.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

warn() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

# 检查是否已有监控进程在运行
check_monitor_running() {
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            error "监控进程已在运行 (PID: $old_pid)"
            exit 1
        else
            warn "发现过期的 PID 文件，清理中..."
            rm -f "$PID_FILE"
        fi
    fi
}

# 清理函数
cleanup() {
    log "停止 PgBouncer 监控守护进程..."
    rm -f "$PID_FILE"
    exit 0
}

# 启动监控
start_monitor() {
    log "启动 PgBouncer 监控守护进程..."
    log "检查间隔: ${CHECK_INTERVAL} 秒"
    log "日志文件: $LOG_FILE"
    
    # 保存进程 ID
    echo $$ > "$PID_FILE"
    
    # 设置信号处理
    trap cleanup SIGTERM SIGINT
    
    while true; do
        if [ -x "$HEALTH_CHECK_SCRIPT" ]; then
            if ! "$HEALTH_CHECK_SCRIPT" >> "$LOG_FILE" 2>&1; then
                error "健康检查失败，请查看日志文件: $LOG_FILE"
            fi
        else
            error "健康检查脚本不存在或不可执行: $HEALTH_CHECK_SCRIPT"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# 停止监控
stop_monitor() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "停止监控进程 (PID: $pid)..."
            kill "$pid"
            rm -f "$PID_FILE"
            log "监控进程已停止"
        else
            warn "监控进程未运行，清理 PID 文件"
            rm -f "$PID_FILE"
        fi
    else
        warn "未找到 PID 文件，监控进程可能未运行"
    fi
}

# 查看监控状态
status_monitor() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "监控进程正在运行 (PID: $pid)"
            return 0
        else
            error "PID 文件存在但进程未运行"
            return 1
        fi
    else
        error "监控进程未运行"
        return 1
    fi
}

# 显示日志
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        local lines=${1:-50}
        echo "=== PgBouncer 监控日志 (最后 $lines 行) ==="
        tail -n "$lines" "$LOG_FILE"
    else
        warn "日志文件不存在: $LOG_FILE"
    fi
}

# 帮助信息
show_help() {
    echo "用法: $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "命令："
    echo "  start    - 启动监控守护进程"
    echo "  stop     - 停止监控守护进程"
    echo "  restart  - 重启监控守护进程"
    echo "  status   - 查看监控状态"
    echo "  logs     - 显示监控日志 (默认最后50行)"
    echo "  help     - 显示此帮助信息"
    echo ""
    echo "示例："
    echo "  $0 start              # 启动监控"
    echo "  $0 logs 100           # 显示最后100行日志"
}

# 主函数
main() {
    case "${1:-}" in
        start)
            check_monitor_running
            start_monitor
            ;;
        stop)
            stop_monitor
            ;;
        restart)
            stop_monitor
            sleep 2
            check_monitor_running
            start_monitor
            ;;
        status)
            status_monitor
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "无效的命令: ${1:-}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
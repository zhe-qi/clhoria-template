#!/bin/bash

# 功能测试脚本
# 用法: ./scripts/k8s/test-functionality.sh [endpoint] [namespace]

set -e

# 参数
ENDPOINT=${1:-"http://localhost:30999"}
NAMESPACE=${2:-"hono-template"}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    ((TOTAL_TESTS++))
}

# 等待服务可用
wait_for_service() {
    log_info "等待服务启动..."
    local retries=30
    local count=0

    while [ $count -lt $retries ]; do
        if curl -s "$ENDPOINT/health" >/dev/null 2>&1; then
            log_success "服务已就绪"
            return 0
        fi

        echo -n "."
        sleep 2
        ((count++))
    done

    log_error "服务启动超时"
    return 1
}

# 测试健康检查端点
test_health_check() {
    log_test "测试健康检查端点"

    local response=$(curl -s -w "%{http_code}" "$ENDPOINT/health" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    local body="${response%???}"

    if [ "$http_code" = "200" ]; then
        log_success "健康检查端点正常 (HTTP $http_code)"
        echo "  响应内容: $body"
    else
        log_error "健康检查端点异常 (HTTP $http_code)"
        echo "  响应内容: $body"
    fi
}

# 测试 OpenAPI 文档
test_openapi_docs() {
    log_test "测试 OpenAPI 文档"

    local response=$(curl -s -w "%{http_code}" "$ENDPOINT/doc" 2>/dev/null || echo "000")
    local http_code="${response: -3}"

    if [ "$http_code" = "200" ]; then
        log_success "OpenAPI 文档可访问 (HTTP $http_code)"
    else
        log_error "OpenAPI 文档无法访问 (HTTP $http_code)"
    fi
}

# 测试 Prometheus 指标
test_metrics() {
    log_test "测试 Prometheus 指标"

    local response=$(curl -s -w "%{http_code}" "$ENDPOINT/metrics" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    local body="${response%???}"

    if [ "$http_code" = "200" ] && echo "$body" | grep -q "# HELP"; then
        log_success "Prometheus 指标正常 (HTTP $http_code)"
        local metric_count=$(echo "$body" | grep -c "^# HELP" || echo "0")
        echo "  指标数量: $metric_count"
    else
        log_error "Prometheus 指标异常 (HTTP $http_code)"
    fi
}

# 测试公共路由
test_public_routes() {
    log_test "测试公共路由"

    # 测试登录端点
    local login_response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"invalid","password":"invalid"}' \
        "$ENDPOINT/auth/login" 2>/dev/null || echo "000")
    local login_code="${login_response: -3}"

    if [ "$login_code" = "400" ] || [ "$login_code" = "401" ] || [ "$login_code" = "422" ]; then
        log_success "登录端点响应正常 (HTTP $login_code)"
    else
        log_error "登录端点异常 (HTTP $login_code)"
    fi
}

# 测试数据库连接
test_database_connection() {
    log_test "测试数据库连接"

    # 通过 kubectl 执行数据库连接测试
    local db_test=$(kubectl exec -n $NAMESPACE deployment/hono-app -- \
        sh -c 'node -e "
            import(\"./dist/src/db/index.js\").then(db => {
                db.default.select().from(\"information_schema.tables\").limit(1)
                .then(() => console.log(\"DATABASE_OK\"))
                .catch(e => console.log(\"DATABASE_ERROR:\", e.message))
            })
        "' 2>/dev/null || echo "KUBECTL_ERROR")

    if echo "$db_test" | grep -q "DATABASE_OK"; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接异常: $db_test"
    fi
}

# 测试 Redis 连接
test_redis_connection() {
    log_test "测试 Redis 连接"

    # 测试 Redis 连接
    local redis_test=$(kubectl exec -n $NAMESPACE deployment/redis -- \
        redis-cli ping 2>/dev/null || echo "ERROR")

    if [ "$redis_test" = "PONG" ]; then
        log_success "Redis 连接正常"
    else
        log_error "Redis 连接异常: $redis_test"
    fi
}

# 测试 PgBouncer 连接
test_pgbouncer_connection() {
    log_test "测试 PgBouncer 连接"

    # 测试 PgBouncer 状态
    local pgbouncer_test=$(kubectl exec -n $NAMESPACE deployment/pgbouncer -- \
        sh -c 'echo "SHOW pools;" | psql -h localhost -p 6432 -U stats -d pgbouncer' 2>/dev/null | grep -c "postgres" || echo "0")

    if [ "$pgbouncer_test" -gt "0" ]; then
        log_success "PgBouncer 连接正常"
    else
        log_error "PgBouncer 连接异常"
    fi
}

# 测试应用日志
test_application_logs() {
    log_test "测试应用日志"

    local logs=$(kubectl logs -n $NAMESPACE deployment/hono-app --tail=10 2>/dev/null || echo "ERROR")

    if echo "$logs" | grep -q "服务器端口" || echo "$logs" | grep -q "Server listening"; then
        log_success "应用日志正常"
    else
        log_warning "应用日志可能有问题"
        echo "  最近日志: $(echo "$logs" | tail -3)"
    fi
}

# 测试资源状态
test_resource_status() {
    log_test "测试 Kubernetes 资源状态"

    # 检查 Pod 状态
    local pod_status=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | awk '{print $3}' | grep -v "Running" | wc -l)

    if [ "$pod_status" -eq "0" ]; then
        log_success "所有 Pod 运行正常"
    else
        log_error "发现 $pod_status 个非运行状态的 Pod"
        kubectl get pods -n $NAMESPACE
    fi

    # 检查服务状态
    local service_count=$(kubectl get services -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [ "$service_count" -gt "0" ]; then
        log_success "服务配置正常 ($service_count 个服务)"
    else
        log_error "未发现任何服务"
    fi
}

# 测试持久化存储
test_persistent_storage() {
    log_test "测试持久化存储"

    local pvc_status=$(kubectl get pvc -n $NAMESPACE --no-headers 2>/dev/null | grep -c "Bound" || echo "0")
    local pvc_total=$(kubectl get pvc -n $NAMESPACE --no-headers 2>/dev/null | wc -l || echo "0")

    if [ "$pvc_status" -eq "$pvc_total" ] && [ "$pvc_total" -gt "0" ]; then
        log_success "持久化存储正常 ($pvc_status/$pvc_total 已绑定)"
    else
        log_error "持久化存储异常 ($pvc_status/$pvc_total 已绑定)"
        kubectl get pvc -n $NAMESPACE
    fi
}

# 性能测试
test_performance() {
    log_test "测试应用性能"

    # 简单的性能测试
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "%{http_code}" "$ENDPOINT/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))

    local http_code="${response: -3}"

    if [ "$http_code" = "200" ] && [ "$duration" -lt "1000" ]; then
        log_success "性能测试通过 (响应时间: ${duration}ms)"
    elif [ "$http_code" = "200" ]; then
        log_warning "响应较慢 (响应时间: ${duration}ms)"
    else
        log_error "性能测试失败 (HTTP $http_code)"
    fi
}

# 显示测试结果总结
show_summary() {
    echo ""
    echo "========================================"
    echo "测试结果总结"
    echo "========================================"
    echo "总测试数: $TOTAL_TESTS"
    echo "通过测试: $PASSED_TESTS"
    echo "失败测试: $FAILED_TESTS"
    echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo "========================================"

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "所有测试通过！应用运行正常"
        return 0
    else
        log_error "发现 $FAILED_TESTS 个问题，请检查日志"
        return 1
    fi
}

# 主函数
main() {
    log_info "开始功能测试"
    log_info "测试端点: $ENDPOINT"
    log_info "命名空间: $NAMESPACE"
    echo ""

    # 检查 kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安装"
        exit 1
    fi

    # 检查 curl
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装"
        exit 1
    fi

    # 等待服务启动
    if ! wait_for_service; then
        log_error "服务未启动，跳过功能测试"
        exit 1
    fi

    echo ""
    log_info "开始执行测试..."
    echo ""

    # 执行所有测试
    test_health_check
    test_openapi_docs
    test_metrics
    test_public_routes
    test_database_connection
    test_redis_connection
    test_pgbouncer_connection
    test_application_logs
    test_resource_status
    test_persistent_storage
    test_performance

    # 显示总结
    show_summary
}

# 显示使用帮助
show_help() {
    echo "用法: $0 [endpoint] [namespace]"
    echo ""
    echo "参数:"
    echo "  endpoint   测试端点 (默认: http://localhost:30999)"
    echo "  namespace  Kubernetes 命名空间 (默认: hono-template)"
    echo ""
    echo "示例:"
    echo "  $0                                        # 使用默认参数"
    echo "  $0 http://localhost:30999                 # 指定端点"
    echo "  $0 http://hono-template.local hono-prod   # 指定端点和命名空间"
}

# 检查是否需要显示帮助
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 运行主函数
main

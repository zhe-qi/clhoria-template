#!/bin/bash

# k8s 清理脚本
# 用法: ./scripts/k8s/cleanup.sh [--force]

set -e

NAMESPACE="hono-template"
FORCE_DELETE=${1:-""}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 确认删除
confirm_delete() {
    if [ "$FORCE_DELETE" != "--force" ]; then
        echo ""
        log_warning "这将删除以下资源:"
        echo "  - 命名空间: $NAMESPACE"
        echo "  - 所有 Pods, Services, PVCs"
        echo "  - 持久化数据 (数据库和 Redis 数据)"
        echo ""
        read -p "确认删除? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消删除"
            exit 0
        fi
    fi
}

# 删除资源
delete_resources() {
    log_info "开始清理 Kubernetes 资源..."

    # 检查命名空间是否存在
    if ! kubectl get namespace $NAMESPACE &>/dev/null; then
        log_warning "命名空间 $NAMESPACE 不存在"
        return 0
    fi

    # 显示将要删除的资源
    echo ""
    log_info "当前资源状态:"
    kubectl get all,pvc,ingress -n $NAMESPACE 2>/dev/null || true

    echo ""
    log_info "删除应用资源..."

    # 删除 Ingress (先删除，避免流量进入)
    kubectl delete -f k8s/ingress.yaml --ignore-not-found=true

    # 删除应用部署
    kubectl delete -f k8s/app.yaml --ignore-not-found=true

    # 等待应用 Pod 终止
    log_info "等待应用 Pod 终止..."
    kubectl wait --for=delete pod -l app=hono-app -n $NAMESPACE --timeout=60s 2>/dev/null || true

    # 删除中间件服务
    log_info "删除中间件服务..."
    kubectl delete -f k8s/pgbouncer.yaml --ignore-not-found=true

    # 删除数据库服务
    log_info "删除数据库服务..."
    kubectl delete -f k8s/postgres.yaml --ignore-not-found=true
    kubectl delete -f k8s/redis.yaml --ignore-not-found=true

    # 等待所有 Pod 终止
    log_info "等待所有 Pod 终止..."
    kubectl wait --for=delete pod --all -n $NAMESPACE --timeout=120s 2>/dev/null || true

    # 删除配置和密钥
    log_info "删除配置和密钥..."
    kubectl delete -f k8s/secrets.yaml --ignore-not-found=true

    # 删除命名空间（这会删除所有剩余资源）
    log_info "删除命名空间..."
    kubectl delete -f k8s/namespace.yaml --ignore-not-found=true

    # 等待命名空间完全删除
    log_info "等待命名空间完全删除..."
    timeout 60s bash -c "while kubectl get namespace $NAMESPACE &>/dev/null; do sleep 2; done" || {
        log_warning "命名空间删除超时，可能仍在清理中"
    }

    log_success "资源清理完成"
}

# 清理 Docker 镜像 (可选)
cleanup_images() {
    echo ""
    read -p "是否删除本地 Docker 镜像? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理本地 Docker 镜像..."

        # 删除本地镜像
        docker rmi hono-template:latest 2>/dev/null && log_success "删除镜像 hono-template:latest" || log_info "镜像 hono-template:latest 不存在"

        # 清理未使用的镜像
        docker image prune -f
        log_success "Docker 镜像清理完成"
    fi
}

# 验证清理结果
verify_cleanup() {
    log_info "验证清理结果..."

    if kubectl get namespace $NAMESPACE &>/dev/null; then
        log_warning "命名空间 $NAMESPACE 仍然存在"
        kubectl get all -n $NAMESPACE
    else
        log_success "命名空间 $NAMESPACE 已完全删除"
    fi

    # 检查是否有残留的 PV
    echo ""
    log_info "检查持久卷状态..."
    local pvs=$(kubectl get pv -o jsonpath='{.items[?(@.spec.claimRef.namespace=="'$NAMESPACE'")].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$pvs" ]; then
        log_warning "发现残留的持久卷:"
        kubectl get pv $pvs
        echo ""
        read -p "是否删除这些持久卷? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete pv $pvs
            log_success "持久卷已删除"
        fi
    else
        log_success "没有残留的持久卷"
    fi
}

# 主函数
main() {
    log_info "开始清理 Hono 应用 k8s 资源"

    # 检查 kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安装"
        exit 1
    fi

    confirm_delete
    delete_resources
    verify_cleanup
    cleanup_images

    echo ""
    log_success "清理完成!"
    log_info "如需重新部署，请运行: ./scripts/k8s/deploy.sh"
}

# 运行主函数
main

#!/bin/bash

# k8s 部署脚本
# 用法: ./scripts/k8s/deploy.sh [environment]

set -e

# 默认环境
ENVIRONMENT=${1:-development}
NAMESPACE="hono-template"
IMAGE_TAG=${IMAGE_TAG:-latest}
REGISTRY=${REGISTRY:-""}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查依赖
check_dependencies() {
    log_info "检查依赖工具..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安装"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "docker 未安装"
        exit 1
    fi

    log_success "依赖检查完成"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."

    local image_name="hono-template"
    if [ -n "$REGISTRY" ]; then
        image_name="${REGISTRY}/${image_name}"
    fi

    docker build -f Dockerfile.k8s -t "${image_name}:${IMAGE_TAG}" .

    if [ -n "$REGISTRY" ]; then
        log_info "推送镜像到仓库..."
        docker push "${image_name}:${IMAGE_TAG}"
    fi

    log_success "镜像构建完成: ${image_name}:${IMAGE_TAG}"
}

# 更新镜像标签
update_image_tag() {
    if [ -n "$REGISTRY" ]; then
        local full_image="${REGISTRY}/hono-template:${IMAGE_TAG}"
        log_info "更新部署配置中的镜像标签: $full_image"

        # 临时更新 app.yaml 中的镜像
        sed -i.bak "s|image: hono-template:.*|image: $full_image|g" k8s/app.yaml
    fi
}

# 恢复镜像标签
restore_image_tag() {
    if [ -f "k8s/app.yaml.bak" ]; then
        mv k8s/app.yaml.bak k8s/app.yaml
        log_info "恢复原始镜像配置"
    fi
}

# 应用 Kubernetes 配置
apply_configs() {
    log_info "应用 Kubernetes 配置..."

    # 创建命名空间（如果不存在）
    kubectl apply -f k8s/namespace.yaml

    # 应用配置和密钥
    kubectl apply -f k8s/secrets.yaml

    # 等待命名空间就绪
    kubectl wait --for=condition=Ready namespace/$NAMESPACE --timeout=30s

    # 按顺序部署服务
    log_info "部署数据库服务..."
    kubectl apply -f k8s/postgres.yaml
    kubectl apply -f k8s/redis.yaml

    # 等待数据库服务就绪
    log_info "等待数据库服务启动..."
    kubectl wait --for=condition=Ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=redis -n $NAMESPACE --timeout=300s

    # 部署 PgBouncer
    log_info "部署 PgBouncer..."
    kubectl apply -f k8s/pgbouncer.yaml
    kubectl wait --for=condition=Ready pod -l app=pgbouncer -n $NAMESPACE --timeout=120s

    # 部署应用
    log_info "部署应用服务..."
    kubectl apply -f k8s/app.yaml
    kubectl apply -f k8s/ingress.yaml

    # 等待应用就绪
    log_info "等待应用启动..."
    kubectl wait --for=condition=Ready pod -l app=hono-app -n $NAMESPACE --timeout=300s

    log_success "所有服务部署完成"
}

# 检查部署状态
check_deployment() {
    log_info "检查部署状态..."

    echo ""
    log_info "=== Pods 状态 ==="
    kubectl get pods -n $NAMESPACE -o wide

    echo ""
    log_info "=== Services 状态 ==="
    kubectl get services -n $NAMESPACE

    echo ""
    log_info "=== Ingress 状态 ==="
    kubectl get ingress -n $NAMESPACE

    echo ""
    log_info "=== PVC 状态 ==="
    kubectl get pvc -n $NAMESPACE

    # 检查应用健康状态
    echo ""
    log_info "=== 健康检查 ==="

    # 获取 NodePort
    NODEPORT=$(kubectl get service hono-app-nodeport -n $NAMESPACE -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "")

    if [ -n "$NODEPORT" ]; then
        log_info "应用可通过以下方式访问:"
        echo "  - NodePort: http://localhost:$NODEPORT"
        echo "  - Ingress: http://hono-template.local (需要配置 hosts 文件)"

        # 测试 NodePort 连接
        if curl -f http://localhost:$NODEPORT/health &>/dev/null; then
            log_success "应用健康检查通过"
        else
            log_warning "应用健康检查失败，请检查日志"
        fi
    fi
}

# 显示日志
show_logs() {
    echo ""
    log_info "=== 应用日志 (最近50行) ==="
    kubectl logs -l app=hono-app -n $NAMESPACE --tail=50
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    restore_image_tag
}

# 主函数
main() {
    log_info "开始部署 Hono 应用到 k3s ($ENVIRONMENT 环境)"
    log_info "镜像标签: $IMAGE_TAG"

    # 设置清理陷阱
    trap cleanup EXIT

    check_dependencies
    build_image
    update_image_tag
    apply_configs
    check_deployment

    echo ""
    log_success "部署完成!"
    log_info "运行以下命令查看实时日志:"
    echo "  kubectl logs -f -l app=hono-app -n $NAMESPACE"

    # 询问是否显示日志
    read -p "是否显示应用日志? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_logs
    fi
}

# 运行主函数
main

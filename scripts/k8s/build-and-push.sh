#!/bin/bash

# 构建和推送 Docker 镜像脚本
# 用法: ./scripts/k8s/build-and-push.sh [tag] [registry]

set -e

# 参数
IMAGE_TAG=${1:-latest}
REGISTRY=${2:-""}
IMAGE_NAME="hono-template"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi

    if ! docker info &>/dev/null; then
        log_error "Docker 守护进程未运行"
        exit 1
    fi
}

# 构建镜像
build_image() {
    local full_image_name="$IMAGE_NAME"
    if [ -n "$REGISTRY" ]; then
        full_image_name="${REGISTRY}/${IMAGE_NAME}"
    fi

    log_info "构建 Docker 镜像: ${full_image_name}:${IMAGE_TAG}"
    log_info "使用 Dockerfile: Dockerfile.k8s"

    # 构建镜像
    docker build \
        -f Dockerfile.k8s \
        -t "${full_image_name}:${IMAGE_TAG}" \
        --build-arg NODE_ENV=production \
        --build-arg PORT=9999 \
        .

    # 同时标记为 latest (如果不是 latest 标签)
    if [ "$IMAGE_TAG" != "latest" ]; then
        docker tag "${full_image_name}:${IMAGE_TAG}" "${full_image_name}:latest"
        log_info "同时标记为: ${full_image_name}:latest"
    fi

    log_success "镜像构建完成"
}

# 推送镜像
push_image() {
    if [ -z "$REGISTRY" ]; then
        log_warning "未指定镜像仓库，跳过推送"
        return 0
    fi

    local full_image_name="${REGISTRY}/${IMAGE_NAME}"

    log_info "推送镜像到仓库: ${full_image_name}:${IMAGE_TAG}"

    # 推送镜像
    docker push "${full_image_name}:${IMAGE_TAG}"

    # 推送 latest 标签
    if [ "$IMAGE_TAG" != "latest" ]; then
        docker push "${full_image_name}:latest"
        log_info "推送 latest 标签完成"
    fi

    log_success "镜像推送完成"
}

# 显示镜像信息
show_image_info() {
    local full_image_name="$IMAGE_NAME"
    if [ -n "$REGISTRY" ]; then
        full_image_name="${REGISTRY}/${IMAGE_NAME}"
    fi

    echo ""
    log_info "=== 镜像信息 ==="
    docker images "${full_image_name}" | head -3

    echo ""
    log_info "=== 镜像详情 ==="
    docker inspect "${full_image_name}:${IMAGE_TAG}" | jq -r '.[0] | {
        Id: .Id[7:19],
        Created: .Created,
        Size: .Size,
        Architecture: .Architecture,
        Os: .Os
    }'

    echo ""
    log_info "=== 镜像使用方法 ==="
    echo "本地运行:"
    echo "  docker run -p 9999:9999 ${full_image_name}:${IMAGE_TAG}"
    echo ""
    echo "k8s 部署:"
    echo "  IMAGE_TAG=${IMAGE_TAG} REGISTRY=${REGISTRY} ./scripts/k8s/deploy.sh"
}

# 清理旧镜像
cleanup_old_images() {
    echo ""
    read -p "是否清理旧的镜像版本? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理悬空镜像..."
        docker image prune -f
        log_success "清理完成"
    fi
}

# 主函数
main() {
    log_info "开始构建 Hono 应用 Docker 镜像"
    log_info "镜像标签: $IMAGE_TAG"
    if [ -n "$REGISTRY" ]; then
        log_info "镜像仓库: $REGISTRY"
    else
        log_info "仅本地构建，不推送到远程仓库"
    fi

    check_docker
    build_image
    push_image
    show_image_info
    cleanup_old_images

    echo ""
    log_success "构建完成!"
}

# 显示使用帮助
show_help() {
    echo "用法: $0 [tag] [registry]"
    echo ""
    echo "参数:"
    echo "  tag      镜像标签 (默认: latest)"
    echo "  registry 镜像仓库地址 (可选)"
    echo ""
    echo "示例:"
    echo "  $0                                    # 构建 hono-template:latest"
    echo "  $0 v1.0.0                            # 构建 hono-template:v1.0.0"
    echo "  $0 v1.0.0 docker.io/myuser          # 构建并推送到 docker.io/myuser/hono-template:v1.0.0"
    echo "  $0 latest harbor.example.com/proj    # 构建并推送到私有仓库"
}

# 检查是否需要显示帮助
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 运行主函数
main

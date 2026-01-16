# 使用 Node.js 25 官方镜像（与项目 Dockerfile 保持一致）
FROM node:25-bookworm

# 配置 pnpm 环境
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 安装系统依赖和开发工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    zsh \
    sudo \
    openssh-client \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# 安装 pnpm（与 package.json 中的 packageManager 版本一致）
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# 设置 node 用户的 sudo 权限（无密码）
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node

# 切换到 node 用户
USER node

# 设置工作目录
WORKDIR /workspaces

# 设置默认 shell 为 zsh
ENV SHELL=/bin/zsh

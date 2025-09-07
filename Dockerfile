# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base
# 配置 pnpm 环境
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 启用 corepack 以使用 pnpm
RUN corepack enable

# 生产依赖安装阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖，减少镜像大小
# 跳过后续处理脚本以避免 msgpackr-extract 构建问题
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --prod && \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# 构建阶段
FROM base AS builder
WORKDIR /app

# 设置构建时环境变量和优化选项
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV CI=true

# 安装所有依赖用于构建
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch && \
    pnpm install --frozen-lockfile --ignore-scripts

# 复制源码
COPY . .

# 构建应用（增加超时和静默输出）
RUN timeout 300 pnpm build --silent || (echo "Build timeout, retrying with verbose output..." && pnpm build)

# 生产阶段
FROM base AS runner
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# 安装运行时依赖并清理缓存
RUN apk add --no-cache openssl && \
    rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# 从 deps 阶段复制生产依赖（避免重复安装）
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules
COPY --chown=hono:nodejs package.json ./

# 从构建阶段复制构建产物
COPY --from=builder --chown=hono:nodejs /app/dist ./dist

# 复制数据库迁移文件和种子数据
COPY --from=builder --chown=hono:nodejs /app/migrations ./migrations
COPY --from=builder --chown=hono:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# 复制脚本目录
COPY --from=builder --chown=hono:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/run.sh

# 安装迁移脚本的依赖（简化版本）
COPY --from=builder --chown=hono:nodejs /app/migrations/migrate ./migrate
COPY --from=builder --chown=hono:nodejs /app/tsconfig.json ./migrate/tsconfig.json

# 临时安装迁移依赖并立即清理
WORKDIR /app/migrate
COPY --from=builder /app/migrations/migrate/package.json ./package.json
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# 返回主目录并设置权限
WORKDIR /app
RUN chown -R hono:nodejs /app

# 切换到非 root 用户
USER hono

# 设置默认端口
ARG PORT=9999
ENV PORT=${PORT}
EXPOSE ${PORT}

# 生产阶段入口点
ENTRYPOINT ["sh", "./scripts/run.sh"]

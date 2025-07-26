# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base
# 配置 pnpm 环境
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 启用 corepack 以使用 pnpm
RUN corepack enable

# 依赖安装阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 获取依赖包到 pnpm store（优化 Docker 缓存）
RUN pnpm fetch --frozen-lockfile

# 安装所有依赖
RUN pnpm install --offline --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

# 设置构建时环境变量
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# 安装 OpenSSL（数据库连接需要）
RUN apk add --no-cache openssl

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# 复制 package 文件用于生产依赖安装
COPY package.json pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm fetch --frozen-lockfile && \
    pnpm install --prod --offline --frozen-lockfile && \
    pnpm store prune

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制数据库迁移文件
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# 复制脚本目录
COPY --from=builder /app/scripts ./scripts
RUN chmod +x ./scripts/run.sh

# 安装迁移脚本的依赖
COPY --from=builder /app/migrations/migrate ./migrate
COPY --from=builder /app/tsconfig.json ./migrate/tsconfig.json

# 备份应用的node_modules
RUN mv node_modules _node_modules

# 安装迁移所需的依赖
WORKDIR /app/migrate
COPY --from=builder /app/migrations/migrate/package.json ./package.json
RUN pnpm install --no-frozen-lockfile

# 恢复应用的node_modules
WORKDIR /app
RUN mv _node_modules node_modules

# 设置文件权限
RUN chown -R hono:nodejs /app

# 切换到非 root 用户
USER hono

# 设置默认端口
ARG PORT=9999
ENV PORT=${PORT}
EXPOSE ${PORT}

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# 启动应用
ENTRYPOINT ["sh", "./scripts/run.sh"]

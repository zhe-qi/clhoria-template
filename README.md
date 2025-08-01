# Hono Template

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。集成 Drizzle ORM + PostgreSQL 数据层，实现完整的 RBAC 权限体系、多租户架构和 OpenAPI 规范。支持多层路由分离、JWT 认证、Redis 缓存、限流中间件等企业级功能，提供开箱即用的后端解决方案。

## 功能特性

### 🏗️ 核心架构

- **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- **严格架构**: 函数式开发规范、多层路由结构（公共/客户端/管理端）
- **多租户支持**: 域管理和数据隔离
- **自动化文档**: OpenAPI 规范，自动生成 API 文档

### 🔐 认证授权

- **多层认证授权**: JWT + Casbin 基于角色的访问控制
- **完整 RBAC**: 用户、角色、权限、菜单管理
- **部门管理**: 树形组织架构，支持数据权限
- **岗位管理**: 用户职务配置和权限分配

### 📊 数据管理

- **字典管理**: 系统常用固定数据维护
- **参数管理**: 动态配置系统参数
- **操作日志**: 系统操作记录和异常日志追踪
- **登录日志**: 用户登录状态和异常监控

### 🚀 性能优化

- **高性能缓存**: Redis 缓存 + 多层限流策略
- **任务队列**: 基于 BullMQ 的定时任务和后台任务队列管理
- **对象存储**: 集成 Cloudflare R2 对象存储服务
- **连接池监控**: 数据库连接池状态监控和性能分析

### 🛠️ 开发工具

- **AI Agent 集成**: 智能代码生成和业务逻辑推理，替代传统低效工具
- **Claude Code 优化**: 专为 Claude Code 优化，包含完整的 CLAUDE.md 配置和 MCP 插件支持
- **测试友好**: Vitest 测试框架，完整的测试环境配置
- **生产就绪**: 优化构建 + Docker 支持

### 📈 监控运维

- **实时监控**: 在线用户状态监控和系统资源监控
- **通知公告**: 系统消息发布和维护通知
- **缓存监控**: Redis 缓存状态查询和管理
- **性能指标**: Prometheus + Grafana 监控方案

## 项目预览

<div align="center">
  <img src="https://r2.promptez.cn/drizzle-studio.webp" width="30%" alt="Drizzle Studio">
  <img src="https://r2.promptez.cn/swagger.webp" width="30%" alt="Swagger API 文档">
  <img src="https://r2.promptez.cn/test.webp" width="30%" alt="测试覆盖率">
</div>

## 快速开始

### 使用 Docker Compose（推荐）

最简单的方式是使用 Docker Compose 一键启动：

1. **复制配置文件**

   ```bash
   cp .env.example .env
   ```

2. **启动服务**

   ```bash
   # 启动完整应用（数据库 + 应用）
   docker-compose up --build

   # 仅启动数据库服务（用于本地开发）
   docker-compose --profile services up -d

   # 启动应用 + 监控服务
   docker-compose --profile monitoring up -d

   # 启动所有服务（应用 + 数据库 + 监控）
   docker-compose --profile full up -d

   # 后台运行
   docker-compose up -d

   # 停止服务
   docker-compose down

   # 删除数据卷（重置数据库）
   docker-compose down -v
   ```

   应用启动时会自动执行数据库迁移和数据初始化。访问 <http://localhost:9999> 查看 API 文档。

### 本地开发环境

#### 环境要求

- Node.js >= 24
- pnpm >= 10
- PostgreSQL >= 17
- Redis >= 7

#### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/zhe-qi/hono-template
   cd hono-template
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   ```

4. **初始化数据库**

   ```bash
   # 推送数据库架构到开发环境
   pnpm push

   # 填充初始数据（可选，应用启动时会自动检查并初始化）
   pnpm seed

   # 同步权限数据
   pnpm sync:permissions
   ```

   **生产环境部署**需要先验证迁移：

   ```bash
   pnpm generate  # 生成迁移文件
   pnpm migrate   # 执行迁移
   ```

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

访问 <http://localhost:9999> 查看 API 文档。

### 目录结构

```text
src/
├── app.ts                    # 应用入口，路由配置
├── index.ts                  # 服务器启动文件
├── db/
│   ├── schema/              # Drizzle 数据库架构
│   └── index.ts             # 数据库实例
├── routes/
│   ├── public/              # 公共路由（无认证）
│   ├── client/              # 客户端路由（JWT）
│   └── admin/               # 管理端路由（JWT + RBAC）
├── services/                # 业务逻辑层（函数式服务，支持公共服务抽离）
├── lib/
│   ├── create-app.ts        # 应用创建和中间件配置
│   ├── configure-open-api.ts # OpenAPI 配置
│   └── enums/               # 枚举定义
├── scripts/                 # 脚本文件
└── types/                   # TypeScript 类型定义
```

## 开发规范

### 路由模块结构

```text
routes/{tier}/{feature}/
├── {feature}.handlers.ts    # 业务逻辑处理器
├── {feature}.routes.ts      # 路由定义和 OpenAPI 架构
└── {feature}.index.ts       # 统一导出
```

### 数据库架构

```text
src/db/schema/
├── {entity}.ts             # Drizzle 表定义
└── index.ts                # 统一导出
```

### 服务层

服务层采用函数式架构，强调代码复用和模块化设计：

```text
src/services/
├── {domain}.ts             # 领域业务逻辑服务
├── shared/                  # 公共服务模块
│   ├── cache.ts            # 缓存服务
│   ├── auth.ts             # 认证服务
│   └── validation.ts       # 验证服务
└── index.ts                # 统一导出
```

**设计原则**：

- **函数式设计**: 所有服务都是纯函数或异步函数
- **公共服务抽离**: 将通用功能抽离为独立的共享服务模块
- **依赖注入**: 通过参数传递依赖，便于测试和复用
- **领域隔离**: 按业务领域组织服务，避免交叉依赖

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t hono-template .

# 运行容器
docker run -p 9999:9999 --env-file .env hono-template
```

为了更好的服务隔离、独立扩缩容和维护便利性，建议将数据库、缓存和应用服务分别部署

### 生产构建

```bash
pnpm build
pnpm start
```

### Kubernetes 部署

项目包含 Kubernetes 部署配置文件：

剪切 scripts/k8s/Dockerfile.k8s 到根目录，查看部署文档 docs/KUBERNETES.md

**移除 K8s 配置**：如不需要 Kubernetes 部署，可删除 `k8s/` 和 `script/k8s` 目录

## 部署特性

**可选 SaaS 依赖**: sentry、Cloudflare R2 对象存储等第三方服务均为可选，可完全部署在内网环境。技术栈符合信创要求，支持迁移至国产数据库（如达梦、人大金仓等）。

## 性能对比

### Hono vs Fastify 性能分析

在 Node.js 环境下，Fastify 依然保持性能优势，但差距已经不大：

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

详细基准测试：[bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

## Claude Code 支持

专为 Claude Code 开发体验优化，包含完整的 CLAUDE.md 配置文件和详细代码注释。

### 推荐 MCP 插件

- **Serena**: 智能代码分析和编辑
- **Context7**: 实时技术文档查询

## 监控

提供完整的监控解决方案，包含 Grafana、Prometheus、数据库连接池监控等。

### 访问地址

| 服务       | 地址                            | 默认账号       |
| ---------- | ------------------------------- | -------------- |
| Grafana    | <http://localhost:3000>         | admin/admin123 |
| Prometheus | <http://localhost:9090>         | 无需认证       |
| 应用指标   | <http://localhost:9999/metrics> | 无需认证       |

## 开发计划

### 后续计划

- [ ] **工作流自动化**: 集成 n8n 工作流引擎
- [ ] **性能测试**: 集成 k6 压力测试框架
- [ ] **日志分析**: 集成 Kafka + Elasticsearch 日志收集和分析系统
- [ ] **AI 智能化**: 自然语言代码生成和业务逻辑推理
- [ ] **前端集成**: Vue3 管理界面和低代码平台

## 测试

使用 Vitest 测试框架，支持完整的单元测试和集成测试。

```bash
# 运行测试
pnpm test

# 查看覆盖率
pnpm test:coverage
```

## 支持

如有问题或建议，请创建 [Issue](https://github.com/your-repo/issues) 或联系维护者。

## 贡献指南

欢迎贡献！请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，提交 PR 前确保 `pnpm test` 和 `pnpm lint` 通过。

## 项目引用

感谢以下优秀开源项目的启发：

- [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter) - 启动模板基础参考
- [soybean-admin-nestjs](https://github.com/soybeanjs/soybean-admin-nestjs) - 后台管理功能参考

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

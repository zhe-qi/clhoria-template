# Hono Template

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。集成 Drizzle ORM + PostgreSQL 数据层，实现完整的 RBAC 权限体系、多租户架构和 OpenAPI 规范。支持多层路由分离、JWT 认证、Redis 缓存、限流中间件等企业级功能，提供开箱即用的后端解决方案。

## 项目特性

- 🚀 **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- 🔐 **多层认证授权**: JWT + Casbin 基于角色的访问控制
- �📚 **自动化文档**: OpenAPI 规范，自动生成 API 文档
- 🏗️ **严格架构**: 函数式开发规范、多层路由结构（公共/客户端/管理端）
- 🔄 **完整 RBAC**: 用户、角色、权限、菜单管理
- 🌐 **多租户支持**: 域管理和数据隔离
- ⚡ **高性能缓存**: Redis 缓存 + 多层限流策略
- 🌍 **边缘就绪**: 为边缘计算和 Serverless 部署优化
- 🧪 **测试友好**: Vitest 测试框架，完整的测试环境配置
- 📦 **生产就绪**: 优化构建 + Docker 支持
- ☁️ **对象存储**: 集成 Cloudflare R2 对象存储服务
- ⏰ **任务队列**: 基于 BullMQ 的定时任务和后台任务队列管理
- 🤖 **Claude Code 优化**: 专为 Claude Code 优化，包含完整的 CLAUDE.md 配置和 MCP 插件支持

## 项目预览

### Drizzle Studio 数据库管理

![Drizzle Studio](https://r2.promptez.cn/drizzle-studio.webp)

### Swagger API 文档

![Swagger API 文档](https://r2.promptez.cn/swagger.webp)

### 测试覆盖率报告

![测试覆盖率](https://r2.promptez.cn/test.webp)

## 快速开始

### 使用 Docker Compose（推荐）

最简单的方式是使用 Docker Compose 一键启动：

1. **复制配置文件**

   ```bash
   cp .env.example .env
   ```

2. **启动服务**

   ```bash
   docker-compose up --build
   ```

   这将自动启动 PostgreSQL、Redis 和应用服务。应用启动时会自动执行数据库迁移和数据初始化。访问 <http://localhost:9999> 查看 API 文档。

### 本地开发环境

如需本地开发，请按以下步骤配置：

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

   复制环境变量模板文件并根据需要进行配置：

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

   **注意**：

   - 应用启动时会自动执行数据库迁移和数据初始化（如果数据库为空）
   - 生产环境部署时，需要先验证迁移：

   ```bash
   # 生成迁移文件
   pnpm generate

   # 执行迁移（生产环境）
   pnpm migrate
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

### 生产构建

```bash
pnpm build
pnpm start
```

## 运行时兼容性

原则上稍作修改即可兼容 Bun、Deno 等现代 JavaScript 运行时，支持高性能部署。后续规划 Monorepo 架构，单独提供可部署到边缘运行时的模块化代码，涵盖评论系统、文章管理、R2 图片格式化、视频转码等场景，充分利用边缘计算的低延迟和高可用性优势。

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

### 快速启动

```bash
# 启动监控服务
docker-compose --profile monitoring up -d

# 启动完整应用 + 监控
docker-compose --profile full up -d
```

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

欢迎贡献！请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

```bash
# 示例提交
git commit -m "feat: 添加用户权限管理功能"
git commit -m "fix: 修复登录状态验证问题"
```

提交 PR 前请确保测试通过：`pnpm test` 和 `pnpm lint`。

## 项目引用

本项目参考了优秀的开源项目，在此表示感谢：

- **启动模板**: 基于 [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter) 进行魔改和扩展
- **后台参考**: 参考了 [soybean-admin-nestjs](https://github.com/soybeanjs/soybean-admin-nestjs) 的大量后台管理代码实现

这些项目为本模板的架构设计和功能实现提供了宝贵的参考和灵感。

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

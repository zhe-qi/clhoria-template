# Hono Template

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。集成 Drizzle ORM + PostgreSQL 数据层，实现完整的 RBAC 权限体系、多租户架构和 OpenAPI 规范。支持多层路由分离、JWT 认证、Redis 缓存、限流中间件等企业级功能，提供开箱即用的后端解决方案。

## 项目特性

- 🚀 **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- 🔐 **多层认证授权**: JWT + Casbin 基于角色的访问控制
- 📚 **自动化文档**: OpenAPI 规范，自动生成 API 文档
- 🏗️ **严格架构**: 函数式开发规范、多层路由结构（公共/客户端/管理端）
- 🔄 **完整 RBAC**: 用户、角色、权限、菜单管理
- 🌐 **多租户支持**: 域管理和数据隔离
- ⚡ **高性能**: Redis 缓存 + 限流中间件
- 🧪 **测试友好**: Vitest 测试框架
- 📦 **生产就绪**: 优化构建 + Docker 支持

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

   这将自动启动 PostgreSQL、Redis 和应用服务。访问 <http://localhost:9999> 查看 API 文档。

### 本地开发环境

如需本地开发，请按以下步骤配置：

#### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- Redis >= 6

#### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
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

   编辑 `.env` 文件，填写必要的配置。

4. **初始化数据库**

   ```bash
   # 推送数据库架构到开发环境
   pnpm push

   # 填充初始数据
   pnpm seed

   # 同步权限数据
   pnpm sync:permissions
   ```

   **注意**：生产环境部署时，需要先验证迁移：

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

## 项目架构

### 路由架构

应用使用多层路由结构，在 `src/app.ts` 中定义：

1. **公共路由** (`/routes/public/`) - 无需认证
2. **客户端路由** (`/routes/client/`) - JWT 认证
3. **管理端路由** (`/routes/admin/`) - JWT + Casbin 授权

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
├── services/                # 业务逻辑层
├── lib/
│   ├── create-app.ts        # 应用创建和中间件配置
│   ├── configure-open-api.ts # OpenAPI 配置
│   └── enums/               # 枚举定义
├── scripts/                 # 脚本文件
└── types/                   # TypeScript 类型定义
```

### 技术栈

- **Web 框架**: Hono with OpenAPI support
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存**: Redis + ioredis
- **认证**: JWT (@node-rs/argon2 密码哈希)
- **授权**: Casbin RBAC
- **文档**: OpenAPI 3.0 + Scalar API Reference
- **日志**: Pino with hono-pino
- **限流**: hono-rate-limiter + rate-limit-redis
- **验证**: Zod with OpenAPI schema generation

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

```text
src/services/
├── {domain}.ts             # 业务逻辑服务
└── index.ts                # 统一导出
```

## 环境变量

| 变量名              | 描述                  | 默认值        |
| ------------------- | --------------------- | ------------- |
| `NODE_ENV`          | 运行环境              | `development` |
| `PORT`              | 服务器端口            | `9999`        |
| `LOG_LEVEL`         | 日志级别              | `debug`       |
| `DATABASE_URL`      | PostgreSQL 连接字符串 | -             |
| `REDIS_URL`         | Redis 连接字符串      | -             |
| `CLIENT_JWT_SECRET` | 客户端 JWT 密钥       | -             |
| `ADMIN_JWT_SECRET`  | 管理端 JWT 密钥       | -             |

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

## Claude Code 配置

如果使用 Claude Code 开发此项目，建议配置以下 MCP 插件以获得更好的开发体验：

### 推荐的 MCP 插件

1. **Serena** - 智能代码分析和编辑工具

   - 提供语义化的代码搜索和编辑功能
   - 支持符号级别的代码操作
   - 智能的代码重构和分析能力

2. **Context7** - 实时文档查询工具
   - 获取最新的库文档和 API 参考
   - 支持 Hono、Drizzle ORM、Zod 等技术栈的文档查询
   - 提供准确的代码示例和最佳实践

### 配置步骤

请参考 Claude Code 官方文档配置相应的 MCP 插件：<https://docs.anthropic.com/en/docs/claude-code/mcp>

## 开发计划

### 短期计划（当前版本）

- [ ] **单元测试覆盖**

  - 为所有端点路由添加完整的单元测试
  - 集成测试用例，确保 API 功能正确性
  - 设置测试覆盖率目标和自动化测试流程

- [ ] **工作流自动化**
  - 集成 n8n 工作流引擎
  - 添加内置模板库
  - 通过大模型能力实现自然语言操作后台
  - 支持工作流可视化配置和执行

### 中期计划

- [ ] **模型配置生成器**

  - 根据实体和 DTO 自动生成基础模型配置
  - 前端表单和表格组件自动生成
  - 支持复杂业务逻辑的配置化

- [ ] **CLI 工具开发**
  - 自动生成基础实体、DTO、控制器和路由
  - 代码模板和脚手架功能
  - 支持自定义代码生成规则

### 长期计划

- [ ] **AI 智能化**

  - 基于自然语言的代码生成
  - 智能化的业务逻辑推理
  - 自动化测试用例生成

- [ ] **前端集成**
  - Vue3 + TypeScript 管理界面
  - 低代码/无代码平台
  - 可视化配置界面

## 路线图

基于上述开发计划，项目将逐步演进为：

1. **完整的 B 端产品开发框架** - 支持 CRUD 密集型业务场景
2. **智能化开发工具** - 通过 AI 能力提升开发效率
3. **工作流驱动的业务平台** - 支持复杂业务流程自动化
4. **低代码开发平台** - 降低业务系统开发门槛

## 支持

如有问题或建议，请创建 [Issue](https://github.com/your-repo/issues) 或联系维护者。

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

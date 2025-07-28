# Hono Template

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。集成 Drizzle ORM + PostgreSQL 数据层，实现完整的 RBAC 权限体系、多租户架构和 OpenAPI 规范。支持多层路由分离、JWT 认证、Redis 缓存、限流中间件等企业级功能，提供开箱即用的后端解决方案。

## 项目特性

- 🚀 **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- 🔐 **多层认证授权**: JWT + Casbin 基于角色的访问控制
- 📚 **自动化文档**: OpenAPI 规范，自动生成 API 文档
- 🏗️ **严格架构**: 函数式开发规范、多层路由结构（公共/客户端/管理端）
- 🔄 **完整 RBAC**: 用户、角色、权限、菜单管理
- 🌐 **多租户支持**: 域管理和数据隔离
- ⚡ **高性能缓存**: Redis 缓存 + 限流中间件
- 🌍 **边缘就绪**: 为边缘计算和 Serverless 部署优化
- 🧪 **测试友好**: Vitest 测试框架，完整的测试环境配置
- 📦 **生产就绪**: 优化构建 + Docker 支持
- ☁️ **对象存储**: 集成 Cloudflare R2 对象存储服务
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

   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件，填写必要的配置。

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

## 项目架构

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

## Claude Code 一流支持

本项目专为 Claude Code 开发体验进行了深度优化，提供业界领先的 AI 辅助开发能力。

### 🎯 开箱即用的配置

- **CLAUDE.md 配置文件**: 包含完整的项目架构说明、开发规范和最佳实践
- **详细的代码注释**: 所有路由、服务和架构层面都有清晰的文档说明
- **标准化开发模式**: 统一的文件结构、命名约定和开发工作流

### 🚀 推荐的 MCP 插件

1. **Serena** - 智能代码分析和编辑工具

   - 语义化代码搜索和符号级编辑
   - 智能重构和架构分析
   - 支持项目记忆和上下文理解

2. **Context7** - 实时技术文档查询
   - Hono、Drizzle ORM、Zod 等技术栈的最新文档
   - 准确的 API 参考和代码示例
   - 智能的最佳实践建议

### 💡 Claude Code 优势体验

- **智能代码生成**: 基于项目架构自动生成符合规范的代码
- **架构理解**: 深度理解多层路由、RBAC 权限体系和服务层架构
- **测试驱动**: 自动生成测试用例和测试数据
- **文档同步**: 代码变更时自动更新相关文档

### 📚 配置指南

详细的 MCP 插件配置请参考：[Claude Code MCP 文档](https://docs.anthropic.com/en/docs/claude-code/mcp)

## 开发计划

### 短期计划（当前版本）

- [ ] **工作流自动化**

  - 集成 n8n 工作流引擎
  - 添加内置模板库
  - 通过大模型能力实现自然语言操作后台
  - 支持工作流可视化配置和执行

- [ ] **性能测试**

  - 集成 k6 压力测试框架
  - 添加性能基准测试用例
  - 自动化性能监控和报告
  - 负载测试和并发测试

- [ ] **模型配置生成器**（考虑中）

  - 发现使用 Claude Code 生成会更好，暂时搁置此功能
  - 基于 AI 的代码生成更灵活且符合项目规范

- [ ] **AI 智能化**

  - 基于自然语言的代码生成
  - 智能化的业务逻辑推理
  - 自动化测试用例生成

- [ ] **前端集成**

  - Vue3 + TypeScript 管理界面
  - 低代码/无代码平台
  - 可视化配置界面

## 测试

本项目使用 Vitest 作为测试框架，支持完整的单元测试和集成测试。

### 测试环境配置

1. **复制测试配置文件**

   ```bash
   cp .env.example .env.test
   ```

   编辑 `.env.test` 文件，配置测试环境的数据库和 Redis 连接。建议使用独立的测试数据库。

2. **运行测试**

   ```bash
   # 运行所有测试
   pnpm test

   # 运行测试并查看覆盖率
   pnpm test:coverage

   # 监视模式运行测试
   pnpm test:watch
   ```

### 测试说明

- 测试文件使用 `.test.ts` 或 `.spec.ts` 后缀
- 测试配置文件位于 `vitest.config.ts`
- 测试环境会自动加载 `.env.test` 配置文件
- 支持测试数据库的自动迁移和清理

## 支持

如有问题或建议，请创建 [Issue](https://github.com/your-repo/issues) 或联系维护者。

## 贡献指南

我们欢迎所有形式的贡献！无论是新功能、Bug 修复、文档改进还是测试用例，都能帮助项目变得更好。

### 🚀 快速开始贡献

1. **Fork 项目** - 点击右上角的 Fork 按钮
2. **克隆到本地**
   ```bash
   git clone https://github.com/your-username/hono-template.git
   cd hono-template
   ```
3. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或者
   git checkout -b fix/your-fix-name
   ```
4. **本地开发**
   ```bash
   pnpm install
   pnpm dev
   ```

### 📝 提交规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建工具、依赖更新等

**示例**：

```bash
git commit -m "feat: 添加用户权限管理功能"
git commit -m "fix: 修复登录状态验证问题"
git commit -m "docs: 更新 API 文档"
```

### 🧪 测试要求

提交 PR 前请确保：

- [ ] 新功能包含相应的测试用例
- [ ] 所有测试通过：`pnpm test`
- [ ] 代码通过 lint 检查：`pnpm lint`
- [ ] TypeScript 类型检查通过：`pnpm typecheck`

### 📋 PR 流程

1. **推送到你的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```
2. **创建 Pull Request**
   - 提供清晰的标题和描述
   - 说明更改的原因和内容
   - 如果修复了 Issue，请关联相关 Issue
3. **代码审查**
   - 响应审查意见并进行必要的修改
   - 保持 PR 内容专注和简洁
4. **合并**
   - 维护者审查通过后将合并你的贡献

### 💡 贡献建议

- **Issue 优先**：在开始大型功能之前，请先创建 Issue 讨论
- **保持简洁**：每个 PR 专注于一个功能或修复
- **文档同步**：代码更改时请同步更新相关文档
- **Claude Code 友好**：如果你使用 Claude Code，请确保遵循项目的 CLAUDE.md 规范

感谢你的贡献！🎉

## 项目引用

本项目参考了优秀的开源项目，在此表示感谢：

- **启动模板**: 基于 [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter) 进行魔改和扩展
- **后台参考**: 参考了 [soybean-admin-nestjs](https://github.com/soybeanjs/soybean-admin-nestjs) 的大量后台管理代码实现

这些项目为本模板的架构设计和功能实现提供了宝贵的参考和灵感。

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

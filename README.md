# Clhoria（克洛莉亚）基于 Hono 的快速开发模板

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。采用 AI 驱动开发模式，结合 Hono + OpenAPI + Zod 完整技术体系，实现真正的类型安全和开发效率提升。集成 Drizzle ORM + PostgreSQL 数据层，完整的 RBAC 权限体系，提供比传统后台管理系统更稳定、更高效的开发体验。

Clhoria 将复杂的技术架构化繁为简，让每一次编码都如诗般优雅，每一个功能都如花般绽放。选择 Clhoria，就是选择与未来同行。

> 模板配套的后台管理前端部分基于 Refine + Shadcn 开发：[https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## 功能特性

- **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- **严格架构**: 函数式开发规范、多层级路由结构
- **自动化文档**: OpenAPI 规范，自动生成 API 文档
- **多层认证授权**: JWT + Casbin 基于角色的访问控制
- **声明式分页器**: 基于 refine 规范的声明式查询
- **完整 RBAC**: 用户、角色、权限、菜单管理
- **日志中间件**: 收集日志，可选择阿里云 SLS 上传日志
- **高性能缓存**: Redis 缓存 + 多层限流策略
- **任务队列**: 基于 BullMQ 的定时任务和后台任务队列管理
- **对象存储**: 集成 Cloudflare R2 对象存储服务
- **智能验证码**: 集成 Cap.js，支持多种挑战类型的现代化验证码系统
- **AI 原生开发**: Claude Code + OpenAPI 自动生成，告别手工维护接口文档的痛苦
- **类型安全体系**: Hono + Zod + TypeScript 全链路类型推导，编译时发现问题
- **智能测试覆盖**: Vitest + AI 辅助，自动生成测试用例，确保接口稳定性
- **即时反馈开发**: 热重载开发环境，代码变更实时生效，无需重启服务
- **Claude Code 深度优化**: 完整 CLAUDE.md 配置，MCP 插件生态，AI 理解项目架构
- **实时监控**: 在线用户状态监控和系统资源监控
- **缓存监控**: Redis 缓存状态查询和管理

## 开发体验对比

### 🚀 AI 驱动 vs 传统工具

| 对比维度     | 本项目 (AI + Modern Stack)                            | 传统代码生成器                                 |
| ------------ | ----------------------------------------------------- | ---------------------------------------------- |
| **开发效率** | Claude Code 智能理解需求，秒级生成符合规范的代码      | 手动配置模板，生成僵化代码，需大量修改         |
| **接口管理** | OpenAPI + Zod 自动同步，类型安全，文档永不过期        | 手工维护接口文档，容易不同步，运行时才发现错误 |
| **代码质量** | TypeScript 全链路类型检查，编译时发现问题             | 生成代码缺乏类型约束，运行时错误频发           |
| **测试保障** | AI 辅助生成测试用例，自动化测试覆盖，接口稳定性有保障 | 依赖手动测试，需要频繁点击后台验证功能         |
| **维护成本** | 代码规范统一，AI 理解项目架构，维护简单               | 生成代码风格不一致，后期维护困难               |
| **扩展性**   | 函数式架构，模块化设计，易于扩展和重构                | 耦合严重，扩展困难，牵一发动全身               |

### 💡 核心优势

- 传统方式：点击后台 → 配置表单 → 生成代码 → 手动调试 → 反复修改
- AI 驱动：描述需求 → AI 理解架构 → 生成符合规范代码 → 自动测试通过
- 编译时类型检查，杜绝运行时类型错误
- API 请求/响应自动类型推导
- 数据库 Schema 变更自动同步到代码类型
- 热重载开发，代码变更实时生效
- AI 智能补全，理解项目上下文
- 自动化测试，确保每次变更的稳定性

## 项目预览

<div align="center">
  <img src="https://r2.promptez.cn/github/studio.png" width="45%" alt="Drizzle Studio">
  <img src="https://r2.promptez.cn/github/test.png" width="45%" alt="Swagger API 文档">
  <img src="https://r2.promptez.cn/github/login.png" width="45%" alt="Swagger API 文档">
  <img src="https://r2.promptez.cn/github/user.png" width="45%" alt="Swagger API 文档">
  <img src="https://r2.promptez.cn/github/studio.png" width="45%" alt="Swagger API 文档">
  <img src="https://r2.promptez.cn/github/list.png" width="45%" alt="Swagger API 文档">
</div>

## 快速开始

### 本地开发环境

- Node.js >= 22
- pnpm >= 10
- PostgreSQL >= 17
- Redis >= 7

#### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/zhe-qi/clhoria-template
   cd clhoria-template
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

**架构原则**：

- **按需抽离**: 仅当业务逻辑在多个路由间复用时才创建服务层，避免过度抽象
- **函数式设计**: 采用命名导出的纯函数/异步函数，支持 `create*`、`get*`、`update*`、`delete*` 等标准前缀
- **混合实现**: 简单 CRUD 操作直接在 handler 中实现，复杂业务逻辑抽离为服务函数
- **事务管理**: 复杂业务操作使用 `db.transaction()` 确保数据一致性
- **缓存集成**: 服务层集成 Redis 缓存，提供数据缓存和权限缓存管理

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t clhoria-template .

# 运行容器
docker run -p 9999:9999 --env-file .env clhoria-template
```

## 部署特性

**可选 SaaS 依赖**: sentry、Cloudflare R2 对象存储等第三方服务均为可选，可完全部署在内网环境。技术栈符合信创要求，支持迁移至国产数据库（如人大金仓、华为高斯等）。

## 验证码系统对比

### 🔐 Cap.js vs svg-captcha

| 对比维度     | Cap.js (本项目采用)                            | svg-captcha                     |
| ------------ | ---------------------------------------------- | ------------------------------- |
| **安全性**   | 多种挑战类型，难以被自动化工具破解             | 基于图像识别，易被 OCR 工具破解 |
| **用户体验** | 现代化交互界面，快速通过验证，用户体验遥遥领先 | 传统图片验证，识别扭曲文字      |
| **扩展性**   | 数据库存储，支持分布式部署和自定义挑战类型     | 内存存储，功能固定              |

## 性能对比

### Hono vs Fastify 性能分析

在 Node.js 环境下，Fastify 依然保持性能优势，但差距已经不大：

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

详细基准测试：[bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

## Claude Code 深度集成（可选）

本项目专为 AI 驱动开发而设计，提供业界领先的 Claude Code 开发体验。开发者从传统"代码工程"升级为**"上下文工程"**，通过精准的需求描述和架构理解，让 AI 承担繁重的编码工作。

### 上下文工程

**上下文工程师**是 AI 时代的新型开发角色，不再专注于编写具体代码，而是通过精准的需求描述和架构理解，让 AI 承担繁重的编码工作。开发者的核心价值转向业务逻辑设计、系统架构规划和用户需求理解。

**核心技能转变**

- ❌ 不再需要：记忆语法细节、重复编写样板代码、手动维护文档
- ✅ 重点关注：业务逻辑设计、系统架构规划、用户需求理解

**上下文驱动开发模式**

- 🧠 **完整项目上下文**: CLAUDE.md 配置让 AI 深度理解代码架构
- 🎯 **精准需求描述**: 通过结构化的需求描述，获得准确的代码实现
- 🔍 **智能模式识别**: AI 自动分析现有代码模式，生成风格一致的新代码
- 🛠️ **自动规范遵循**: 自动遵循项目规范：路由结构、命名约定、错误处理

### 📚 推荐 MCP 插件生态

增强 Claude Code 开发能力的专业插件：

- **[Serena](https://github.com/SerenaAI/serena-mcp)**: 智能代码分析和重构建议
- **[Context7](https://github.com/context7/mcp-plugin)**: 实时技术文档查询和代码示例

## 测试

使用 Vitest 测试框架，支持完整的单元测试和集成测试。

```bash
# 运行测试
pnpm test
```

## 支持

如有问题或建议，请创建 [Issue](https://github.com/zhe-qi/clhoria-template/issues) 或联系维护者。

## 贡献指南

欢迎贡献！请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，提交 PR 前确保 `pnpm test` 和 `pnpm lint` 通过。

## 许可证

MIT License - 查看 [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) 文件了解详情。

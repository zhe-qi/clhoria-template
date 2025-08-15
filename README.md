# Clhoria（克洛莉亚）基于 Hono 的快速开发模板

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

现代化企业级后端模板，基于 Hono 框架构建的高性能 TypeScript 应用。采用 AI 驱动开发模式，结合 Hono + OpenAPI + Zod 完整技术体系，实现真正的类型安全和开发效率提升。集成 Drizzle ORM + PostgreSQL 数据层，完整的 RBAC 权限体系、多租户架构，提供比传统后台管理系统更稳定、更高效的开发体验。

她是 Claude Code 智慧与 Hono 框架体系力量的完美结合，一位守护现代化开发的技术女神。在她的引领下，AI 驱动的开发不再是梦想，而是触手可及的现实。

Clhoria 将复杂的技术架构化繁为简，让每一次编码都如诗般优雅，每一个功能都如花般绽放。选择 Clhoria，就是选择与未来同行。

## 功能特性

- **现代化技术栈**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- **严格架构**: 函数式开发规范、多层路由结构（公共/客户端/管理端）
- **多租户支持**: 域管理和数据隔离
- **自动化文档**: OpenAPI 规范，自动生成 API 文档
- **多层认证授权**: JWT + Casbin 基于角色的访问控制
- **声明式分页器**: 基于 Prisma 规范的声明式查询，支持复杂条件和多表关联
- **完整 RBAC**: 用户、角色、权限、菜单管理
- **部门管理**: 树形组织架构，支持数据权限
- **岗位管理**: 用户职务配置和权限分配
- **字典管理**: 系统常用固定数据维护
- **参数管理**: 动态配置系统参数
- **操作日志**: 基于 TimescaleDB 的高性能时序日志存储和分析（可选择阿里云 SLS 替代）
- **登录日志**: 用户登录状态和异常监控，支持时序数据查询，时序高性能插入，低成本日志存储
- **高性能缓存**: Redis 缓存 + 多层限流策略
- **任务队列**: 基于 BullMQ 的定时任务和后台任务队列管理
- **对象存储**: 集成 Cloudflare R2 对象存储服务
- **连接池监控**: 数据库连接池状态监控和性能分析
- **智能验证码**: 集成 Cap.js，支持多种挑战类型的现代化验证码系统
- **AI 原生开发**: Claude Code + OpenAPI 自动生成，告别手工维护接口文档的痛苦
- **类型安全体系**: Hono + Zod + TypeScript 全链路类型推导，编译时发现问题
- **智能测试覆盖**: Vitest + AI 辅助，自动生成测试用例，确保接口稳定性
- **即时反馈开发**: 热重载开发环境，代码变更实时生效，无需重启服务
- **Claude Code 深度优化**: 完整 CLAUDE.md 配置，MCP 插件生态，AI 理解项目架构
- **实时监控**: 在线用户状态监控和系统资源监控
- **通知公告**: 系统消息发布和维护通知
- **缓存监控**: Redis 缓存状态查询和管理
- **性能指标**: Prometheus + Grafana 监控方案
- **WebSocket 实时通信**: 基于 Socket.IO 的实时消息推送和双向通信

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
  <img src="https://r2.promptez.cn/drizzle-studio.webp" width="45%" alt="Drizzle Studio">
  <img src="https://r2.promptez.cn/swagger.webp" width="45%" alt="Swagger API 文档">
</div>
<div align="center">
<img src="https://r2.promptez.cn/test.webp" width="50%" alt="测试覆盖率">
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
   # 启动所有服务（应用 + 数据库 + 监控）
   docker-compose --profile full up

   # 仅启动数据库服务（用于本地开发）
   docker-compose --profile services up -d

   # 启动应用 + 监控服务
   docker-compose --profile monitoring up -d

   # 停止服务
   docker-compose down

   # 删除数据卷（重置数据库）
   docker-compose down -v
   ```

   应用启动时会自动执行数据库迁移和数据初始化。访问 <http://localhost:9999> 查看 API 文档。

### 本地开发环境

#### 环境要求

- Node.js >= 22
- pnpm >= 10
- PostgreSQL >= 17 + TimescaleDB
- Redis >= 7

postgres 在 node24 上运行可能偶尔会爆警告参考 [issue](https://github.com/porsager/postgres/issues/1061) 目前看来好像没啥问题，程序还是很稳定的

#### TypeScript 5.9+ 和 ts-go 支持

本项目支持使用实验性的 ts-go 来提升 TypeScript 的类型检查和语言服务性能。

**使用 ts-go (推荐)**

1. 安装 VSCode 插件：

   ```
   https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview
   ```

2. 目前仅用于类型检查和语言服务，运行和打包分别使用 `tsx` 和 `tsdown`

**不使用 ts-go**

如果不希望使用 ts-go，可以按以下步骤回退：

1. 移除 `.vscode/settings.json` 里的 `"typescript.experimental.useTsgo": true`
2. 执行 `pnpm remove @typescript/native-preview`
3. 修改 `package.json` 中的 `typecheck` 命令，将 `npx tsgo` 改为 `tsc`

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

   # 初始化 TimescaleDB（如果使用 TimescaleDB）
   pnpm timescale:init

   # 填充初始数据（可选，应用启动时会自动检查并初始化）
   pnpm seed

   # 同步权限数据
   pnpm sync:permissions
   ```

   **TimescaleDB 相关命令**：

   ```bash
   # 完整迁移到 TimescaleDB
   pnpm timescale:migrate

   # 优化 TimescaleDB 配置
   pnpm timescale:optimize

   # 测试 TimescaleDB 连接
   pnpm timescale:test
   ```

   **日志存储方案选择**：

   - **TimescaleDB**：适合对日志进行复杂查询和分析的场景，提供 SQL 兼容的时序数据库功能
   - **阿里云 SLS**：适合轻量级日志存储需求，可平滑移除 TimescaleDB 降低运维复杂度，减少基础设施依赖

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
│   ├── pagination/          # 声明式分页器
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

服务层采用混合架构模式，根据业务复杂度选择合适的实现方式：

```text
src/services/
├── system/                  # 系统模块服务
│   ├── user.ts             # 用户管理服务
│   ├── global-params.ts    # 全局参数服务
│   ├── menu.ts             # 菜单管理服务
│   ├── dictionary.ts       # 字典管理服务
│   ├── notices.ts          # 通知公告服务
│   └── scheduled-jobs.ts   # 定时任务服务
├── logging/                 # 日志模块服务
│   ├── timescale-service.ts # 时序数据库服务
│   └── index.ts            # 日志服务导出
├── object-storage.ts        # 对象存储服务
└── ip.ts                   # IP 地址解析服务
```

**架构原则**：

- **按需抽离**: 仅当业务逻辑在多个路由间复用时才创建服务层，避免过度抽象
- **函数式设计**: 采用命名导出的纯函数/异步函数，支持 `create*`、`get*`、`update*`、`delete*` 等标准前缀
- **混合实现**: 简单 CRUD 操作直接在 handler 中实现，复杂业务逻辑抽离为服务函数
- **事务管理**: 复杂业务操作使用 `db.transaction()` 确保数据一致性
- **缓存集成**: 服务层集成 Redis 缓存，提供数据缓存和权限缓存管理

### 声明式分页器

基于 [Prisma 查询规范](https://prisma.org.cn/docs/orm/reference/prisma-client-reference#or) 的声明式分页解决方案：

```typescript
import paginatedQuery from "@/lib/pagination";

type PaginatedResult = z.infer<typeof selectAdminUsersSchema> & {
  usersToRoles: typeof usersToRoles.$inferSelect;
};

export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<PaginatedResult>({
    table: adminUsers,
    params: {
      ...query,
      where: {
        username: { contains: "admin" },
        status: { equals: 1 },
        OR: [
          { email: { endsWith: "@company.com" } },
          { role: { in: ["admin", "moderator"] } }
        ],
        AND: [
          { createdAt: { gte: new Date("2024-01-01") } },
          { NOT: { deletedAt: { not: null } } }
        ]
      },
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "username", direction: "asc" }
      ],
      join: { usersToRoles: { type: "left", on: { id: "userId" }, as: "roles" } },
    },
    joinTables: {
      usersToRoles,
    },
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};
```

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

## 部署特性

**可选 SaaS 依赖**: sentry、Cloudflare R2 对象存储等第三方服务均为可选，可完全部署在内网环境。技术栈符合信创要求，支持迁移至国产数据库（如达梦、人大金仓等）。

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

## 监控

提供完整的监控解决方案，包含 Grafana、Prometheus、数据库连接池监控等。

### 访问地址

| 服务       | 地址                                                               | 默认账号       |
| ---------- | ------------------------------------------------------------------ | -------------- |
| Grafana    | <http://localhost:3000>                                            | admin/admin123 |
| Prometheus | <http://localhost:9090>                                            | 无需认证       |
| Bull Board | <http://localhost:9999/admin/ui/queues?token=YOUR_ADMIN_JWT_TOKEN> | 需要管理员JWT  |
| 应用指标   | <http://localhost:9999/metrics>                                    | 无需认证       |

## 开发计划

- [ ] **工作流自动化**: 集成 n8n 工作流引擎
- [ ] **上下文工程工具链**: 扩展 AI 辅助开发工具，支持更复杂的业务场景
- [ ] **前端集成**: Vue3 管理界面

## 测试

使用 Vitest 测试框架，支持完整的单元测试和集成测试。

```bash
# 运行测试
pnpm test

# 查看覆盖率
pnpm test:coverage
```

## 支持

如有问题或建议，请创建 [Issue](https://github.com/zhe-qi/clhoria-template/issues) 或联系维护者。

## 贡献指南

欢迎贡献！请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，提交 PR 前确保 `pnpm test` 和 `pnpm lint` 通过。

## 许可证

MIT License - 查看 [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) 文件了解详情。

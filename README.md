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
- **混合架构**: 函数式开发规范、多层级路由结构、复杂业务可选DDD
- **自动化文档**: OpenAPI 3.1 规范 + Scalar UI，代码即文档，支持在线调试和类型生成
- **多层认证授权**: JWT 双密钥（Admin/Client 隔离）+ Casbin RBAC
- **声明式分页器**: 基于 Refine 规范的安全声明式查询，拓展 refine 查询支持仅后端联表查询
- **完整 RBAC**: 用户管理 + 角色管理 + Casbin 权限策略 + Refine Resource 菜单
- **智能权限系统**: Casbin KeyMatch3 + RESTful + Refine Resource，无需后端存储权限标识
- **高性能菜单**: 基于 Refine 的菜单和路由最佳实践，相比传统动态路由性能更优
- **类型安全字典**: PostgreSQL Enum + Drizzle-Zod + OpenAPI 手动同步前端枚举，编译时类型检查
- **日志中间件**: 收集日志，支持多种存储方案（阿里云 SLS、PostgreSQL TimescaleDB、Loki 等）
- **高性能缓存**: Redis 缓存 + 多层限流策略 + 权限缓存 + 会话管理 + 分布式锁
- **任务队列**: 基于 BullMQ 的定时任务和后台任务队列管理
- **对象存储**: 集成 S3 兼容对象存储（支持 Cloudflare R2、阿里云 OSS、AWS S3 等）
- **智能验证码**: 集成 Cap.js，支持多种挑战类型的现代化验证码系统
- **AI 原生开发**: Claude Code + OpenAPI 自动生成，告别手工维护接口文档的痛苦
- **类型安全体系**: Hono + Zod + TypeScript 全链路类型推导，编译时发现问题
- **智能测试覆盖**: Vitest + AI 辅助，自动生成测试用例，确保接口稳定性
- **即时反馈开发**: 热重载开发环境，代码变更实时生效，无需重启服务
- **Claude Code 深度优化**: 完整 CLAUDE.md 配置，MCP 插件生态，AI 理解项目架构
- **监控系统**: 集成 Sentry 错误追踪，支持自建或云原生方案（小团队推荐云服务，免运维）
- **高并发方案**: K8s 集群 + 负载均衡 + Redis 分布式会话，支持水平扩展
- **CPU 密集优化**: 多次调用用 N-API，单次调用用 WASM，多线程用 Worker Threads

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

### 混合架构策略（可选）

**简单 CRUD（80%）**：直接在 handler 实现，保持轻量

```typescript
// routes/admin/posts/handlers.ts
export const list: PostRouteHandlerType<"list"> = async (c) => {
  const result = await db.select().from(posts).limit(10);
  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};
```

**复杂业务（20%）**：采用轻量 DDD 分层

```text
src/domain/user/                      # 领域层
├── user.application.ts               # 应用服务：编排多个领域服务
├── user.entity.ts                    # 领域实体：核心业务逻辑和规则验证
└── user.repository.ts                # 仓储接口：定义数据访问抽象

src/infrastructure/persistence/       # 基础设施层
└── user.repository.impl.ts           # 仓储实现：Drizzle ORM 数据访问

src/routes/admin/users/handlers.ts   # 表示层：调用应用服务编排
```

**分层职责**：

- **Handler**：HTTP 请求响应、参数验证、调用应用服务、错误码映射
- **Application**：业务流程编排、事务边界控制、跨聚合根协调
- **Entity**：领域对象建模、业务规则验证、状态变更逻辑
- **Repository**：数据访问抽象与实现分离

## 核心架构特性

### 🎯 权限 + 菜单 + 字典一体化方案

基于 **Casbin + Refine + PostgreSQL Enum + OpenAPI** 的现代化架构，彻底简化传统后台管理系统的复杂度。

#### 核心思路

**权限系统**：基于 RESTful API 路径 + Casbin KeyMatch3，代码即权限，无需数据库存储权限标识
**菜单系统**：Refine Resource 编译时路由，运行时零开销，代码即菜单
**字典系统**：TypeScript 枚举 → PostgreSQL Enum → OpenAPI 自动生成，前后端 100% 同步

#### 对比传统方案

| 维度     | 本项目方案                                   | 传统方案                                        |
| -------- | -------------------------------------------- | ----------------------------------------------- |
| **权限** | OpenAPI 路由定义，Casbin 策略匹配，自动同步  | 数据库权限表 + 关联表，手动维护，容易不一致     |
| **菜单** | 编译时生成路由树，类型安全，零运行时开销     | 数据库存储菜单，运行时查询解析，需要管理界面    |
| **字典** | 单一数据源，编译时类型检查，4 字节 Enum 存储 | 数据库字典表，运行时查询，需要 JOIN，容易不同步 |
| **维护** | 改一处自动同步，TypeScript 编译时报错        | 多处手动同步：数据库 → 后端 → 前端 → 文档       |

#### 实现示例

```typescript
// 权限：Casbin 策略 + Refine Resource 自动关联
// p, role:admin, /admin/users*, (GET)|(POST)
const resources = [{ name: "admin/users", meta: { label: "用户管理" } }];

// 字典：TypeScript 枚举 → PostgreSQL Enum → OpenAPI 自动同步
export const UserStatus = { NORMAL: "NORMAL", DISABLED: "DISABLED" } as const;
export const userStatusEnum = pgEnum("user_status", Object.values(UserStatus));
// 前端运行：npx openapi-typescript http://localhost:9999/admin/doc
// 自动获取最新类型，编译时检查，改动立即暴露所有不兼容代码
```

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

## 开发体验对比

| 对比维度     | 本项目 (AI + Modern Stack)                       | 传统代码生成器                             |
| ------------ | ------------------------------------------------ | ------------------------------------------ |
| **开发效率** | Claude Code 智能理解需求，秒级生成符合规范的代码 | 手动配置模板麻烦，生成僵化代码，需大量修改 |
| **接口管理** | OpenAPI + Zod 自动同步，类型安全，文档永不过期   | 手工维护接口文档，容易不同步               |
| **代码质量** | TypeScript 全链路类型检查，编译时发现问题        | 生成代码缺乏类型约束，运行时错误频发       |
| **维护成本** | 代码规范统一，AI 理解项目架构，维护简单          | 代码量大不够优雅，不好维护                 |

## 性能对比

### Hono vs Fastify 性能分析

在 Node.js 环境下，Fastify 依然保持性能优势，但差距已经不大：

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

详细基准测试：[bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

### 🚀 高并发与性能优化方案

**高并发解决方案**：K8s 集群 + 负载均衡 + Redis 分布式会话 + 数据库主从读写分离，实现无状态水平扩展

**CPU 密集型优化**：

| 场景             | 推荐方案         | 适用场景                       |
| ---------------- | ---------------- | ------------------------------ |
| **多次重复调用** | N-API (原生模块) | 图像处理、加密解密、数据压缩   |
| **单次密集计算** | WASM             | 复杂算法、科学计算、单次重计算 |
| **并行多任务**   | Worker Threads   | 大量独立任务、并发数据处理     |

## Claude Code 深度集成（可选）

本项目专为 AI 驱动开发而设计，提供完整的 CLAUDE.md 配置，让 AI 深度理解项目架构。

**推荐 MCP 插件**：

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

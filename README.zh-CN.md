# Clhoria 基于 Hono 的快速开发模板

[English](./README.md) | 简体中文

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

可用于生产环境的现代化后端开发模板,基于 Hono 框架构建的高性能 TypeScript 应用。采用 AI 驱动开发模式,结合 Hono + OpenAPI + Zod 完整技术体系,实现真正的类型安全和开发效率提升。集成 Drizzle ORM + PostgreSQL 数据层,完整的 RBAC 权限体系,提供比传统后台管理系统更稳定、更高效的开发体验。

Clhoria 将复杂的技术架构化繁为简,让每一次编码都如诗般优雅,每一个功能都如花般绽放。选择 Clhoria,就是选择与未来同行。

> 模板配套的后台管理前端部分基于 Refine + Shadcn 开发:[https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## 功能特性

- **现代化技术栈**: Hono + TypeScript + Vite + Drizzle ORM (v1) + PostgreSQL
- **渐进式分层**: 函数式开发规范、多层级路由结构、复杂业务可选DDD
- **自动化文档**: OpenAPI 3.1 规范 + Scalar UI,代码即文档,支持在线调试和类型生成
- **多层认证授权**: JWT 双密钥(Admin/Client 隔离)+ Casbin RBAC + KeyMatch3 RESTful,无需存储权限标识
- **声明式分页器**: 基于 Refine 规范的安全声明式查询,拓展 refine 查询支持仅后端联表查询
- **完整权限体系**: 用户管理 + 角色管理 + Casbin 权限策略 + Refine Resource 编译时菜单路由,零运行时开销
- **业务和系统字典**: 业务字典支持运行时动态配置(JSONB + Redis缓存),系统字典使用Pg枚举编译时类型检查
- **日志中间件**: 收集日志,支持多种存储方案(阿里云 SLS、PostgreSQL TimescaleDB、Loki 等)
- **高性能缓存**: Redis 缓存 + 多层限流策略 + 权限缓存 + 会话管理 + 分布式锁
- **任务队列和定时任务**: 基于 BullMQ + Redis 的后台任务队列管理和定时任务调度（分布式安全，支持定时任务，Bull Board UI）
- **函数式基础设施**: 基于 Effect-TS 构建基础设施层，类型安全的依赖注入、可组合的错误处理、结构化并发
- **对象存储**: 集成 S3 兼容对象存储(支持 Cloudflare R2、阿里云 OSS、AWS S3 等)
- **智能验证码**: 集成 Cap.js,基于 SHA-256 工作量证明的轻量级现代验证码,隐私友好无追踪
- **类型安全体系**: Hono + Zod + TypeScript 全链路类型推导,编译时发现问题
- **即时反馈开发**: 基于 Vite 的热重载开发环境,代码变更毫秒级生效,开发体验极致流畅
- **声明式 DSL 架构**: `defineConfig` 配置驱动应用组装,`defineMiddleware` 声明中间件链,入口文件简洁
- **AI 驱动开发**: Claude Code + CLAUDE.md + MCP 插件生态,AI 理解项目架构,自动生成测试用例(Vitest)
- **规范驱动工作流**: 集成 [OpenSpec](https://github.com/Fission-AI/OpenSpec) AI 原生变更管理——通过结构化制品提案、规划、实现、归档变更（`/opsx:propose` → `/opsx:apply` → `/opsx:archive`）
- **监控系统**: 集成 Sentry 错误追踪,支持自建或云原生方案(小团队推荐云服务,免运维)
- **Excel 处理**: 基于 excelize-wasm 的高性能 Excel 处理，单例延迟加载，golang 同款

## Drizzle ORM 版本

本项目提供两个 Drizzle ORM 版本供选择：

| 分支         | Drizzle 版本        | 说明                                                        |
| ------------ | ------------------- | ----------------------------------------------------------- |
| `main`       | **v1** (1.0.0-beta) | 最新版本，支持 Relations v2、`through` 多对多、预定义过滤器 |
| `drizzle-v0` | **v0** (0.x stable) | 稳定版本，经典 Relations API，久经考验                      |

```bash
# 使用 Drizzle v1（默认）
git clone https://github.com/zhe-qi/clhoria-template.git

# 使用 Drizzle v0（稳定版）
git clone -b drizzle-v0 https://github.com/zhe-qi/clhoria-template.git
```

> **迁移说明**：Drizzle v1 在 Relations API 上有破坏性变更。详见 [Drizzle v1 迁移指南](https://orm.drizzle.team/docs/migrations)。

## 快速开始

### 本地开发环境

- Node.js >= 24（建议使用latest）
- pnpm >= 10（根据package.json里的packageManager版本号来即可）
- PostgreSQL >= 18（如果使用17请参考readme中的降级指南很轻松的降级）
- Redis >= 7（这个无所谓，7或者latest都行）

#### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/zhe-qi/clhoria-template
   cd clhoria-template
   ```

2. **安装依赖**

   ```bash
   npm i -g corepack
   pnpm install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   ```

4. **初始化数据库**

   ```bash
   # 启动postgres服务(可选,在本地docker环境下快速搭建postgres数据库)
   docker compose --env-file .env run -d --service-ports postgres

   # 启动redis服务(可选,在本地docker环境下快速搭建redis)
   docker compose --env-file .env run -d --service-ports redis

   # 执行数据库迁移(开发环境快速迭代请直接使用 pnpm push，尽可能保证 generate 和 migrate 用在重要节点)
   pnpm migrate

   # 填充初始数据(可选,应用启动时会自动检查并初始化)
   npm install -g bun
   pnpm seed
   ```

   **生产环境部署**需要先验证迁移:

   ```bash
   pnpm generate  # 生成迁移文件
   pnpm migrate   # 执行迁移
   ```

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

访问 <http://localhost:9999> 查看 API 文档。

## TypeScript 5.9+ 和 ts-go 支持

本项目支持使用实验性的 ts-go 来提升 TypeScript 的类型检查和语言服务性能。在当前项目规模下，ts-go 的性能提升非常明显，且语言服务相对稳定，推荐使用。

### 使用 ts-go（推荐）

安装 VSCode 插件：[TypeScript Native Preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)

> **注意**：目前 ts-go 仅用于类型检查和语言服务，开发和打包基于 Vite (Rolldown)。

> **缓存问题**：如果遇到 ts 服务报错或类型缓存异常，使用 `Cmd + Shift + P` 打开命令面板，输入 `restart`，找到 **TypeScript: Restart TS Server** 重启 TS 服务即可恢复正常。

> **性能提示**：Zod 对类型服务的性能消耗较大，ts-go 在这方面有明显改善。如果能接受偶尔的缓存问题，仍然建议继续使用 ts-go 以获得更好的开发体验。

### 不使用 ts-go

如果不希望使用 ts-go，可以按以下步骤回退：

1. 移除 `.vscode/settings.json` 里的 `"typescript.experimental.useTsgo": true`
2. 执行 `pnpm remove @typescript/native-preview`
3. 修改 `package.json` 中的 `typecheck` 命令，将 `npx tsgo` 改为 `tsc`

## 开发规范

本项目采用 **规范驱动开发（Spec-Driven Development, SDD）** 方法论。SDD 颠覆了传统的开发层级关系——让规范成为主导，代码成为规范的实现。通过 AI 能力，精确的规范可以直接生成可工作的代码，同时通过结构化流程避免混乱。

> 📖 延伸阅读：[Spec-Driven Development](https://github.com/github/spec-kit/blob/main/spec-driven.md)

### OpenSpec 变更工作流

本项目集成了 [OpenSpec](https://github.com/Fission-AI/OpenSpec)，用于结构化的 AI 原生变更管理。每个功能或修复都会生成独立的制品文件夹，包含 proposal、specs、design 和 tasks。

```text
/opsx:propose "add-user-export"    # 创建变更 + 生成所有规划制品
/opsx:apply                        # 按任务列表执行实现
/opsx:archive                      # 归档已完成的变更
/opsx:explore                      # 在正式变更前探索想法
```

生成的制品位于 `openspec/changes/<name>/`（已 gitignore）。斜杠命令在 Claude Code 和 GitHub Copilot 中均可使用。

### Claude Code 开发流程

遵循 6 阶段标准流程：`Spec → 生成代码 → 生成测试 → 循环优化 → 模块文档`

| 阶段     | 输出                                               |
| -------- | -------------------------------------------------- |
| Spec     | `docs/{feature}/spec.md`（需求、架构、测试策略）   |
| 生成代码 | 完整接口代码（Schema + Handlers）+ migration       |
| 生成测试 | `__tests__/int.test.ts`                            |
| 循环优化 | 持续改进直到通过验收                               |
| 模块文档 | `docs/{feature}/module.md`（文件索引、功能、要点） |

**验收标准**：所有测试通过 + 符合 CLAUDE.md 规范 + 无明显性能问题

---

### 路由模块结构

```text
routes/{tier}/{feature}/
├── {feature}.handlers.ts       # 业务处理器（必需）
├── {feature}.routes.ts         # 路由定义 + OpenAPI（必需）
├── {feature}.index.ts          # 统一导出（必需）
├── {feature}.types.ts          # 类型定义（必需）
├── {feature}.schema.ts         # 路由级 Zod Schema（可选，复杂 Schema 时）
├── {feature}.helpers.ts        # 辅助函数（可选，复杂业务逻辑或模块内复用）
└── __tests__/                  # 测试目录（推荐）
```

简单 DB 操作直接在 handlers 中内联，复杂业务逻辑抽到 helpers。跨层级复用的服务放在 `src/services/{service}/`

### 数据库架构

```text
src/db/schema/
├── _shard/                     # 共享基础组件
│   ├── base-columns.ts         # 通用字段（id/createdAt/updatedAt等）
│   └── enums.ts                # PostgreSQL 枚举定义
├── {tier}/{feature}/           # 业务表定义（按层级和功能组织）
│   ├── {entity}.ts             # Drizzle 表定义
│   └── index.ts                # 该功能模块的表导出
└── index.ts                    # 根导出（汇总所有 schema）
```

**目录说明:**

- **`_shard/` 目录**: 存放跨功能的共享基础组件
  - `base-columns.ts`: 导出 `baseColumns` 对象，所有表通过 `...baseColumns` 扩展
  - `enums.ts`: 使用 `pgEnum()` 定义数据库枚举类型

- **业务表组织**: 按 `{tier}/{feature}` 分层（如 `admin/system/users.ts`），与路由结构对应

### Zod Schema 分层

- **DB 层**（`db/schema/{entity}.ts`）：通过 `createSelectSchema` / `createInsertSchema` 从 Drizzle 表定义生成基础 Schema，`.meta({ description })` 仅在此层添加
- **路由层**（`routes/{tier}/{feature}/*.schema.ts`）：继承 DB Schema 进行 pick/omit/extend 组合，推荐用 `z.ZodType<Interface>` 约束类型安全
- 简单 CRUD 可直接在 `routes.ts` 中使用 DB Schema，无需单独 schema 文件

```typescript
// DB 层：生成基础 Schema
export const selectUserSchema = createSelectSchema(users, {
  username: schema => schema.meta({ description: "用户名" }),
});
// 路由层：组合业务 Schema
export const createUserRequestSchema: z.ZodType<CreateUserRequest>
  = insertUserSchema.pick({ username: true, email: true });
```

**PostgreSQL 版本说明**:

- **PostgreSQL 18 及以上**: 无需任何修改,直接使用即可。项目默认使用 PostgreSQL 18 的 `uuidv7()` 函数。
- **PostgreSQL 18 以下**: 需要手动修改 `src/db/schema/_shard/base-columns.ts` 文件:
  1. 安装 `uuid` 库:
     ```bash
     pnpm add uuid
     pnpm add -D @types/uuid
     ```
  2. 修改 `base-columns.ts` 文件,在文件顶部添加导入:
     ```typescript
     import { uuidV7 } from "uuid";
     ```
  3. 修改 `id` 字段定义:
     ```typescript
     // 将
     uuid().primaryKey().notNull().default(sql`uuidv7()`);
     // 改为
     uuid().primaryKey().notNull().$defaultFn(() => uuidV7());
     ```

### 架构策略

**本项目默认采用 Vertical Slice Architecture（垂直切片架构）+ Transaction Script 模式**：按功能特性组织代码（`routes/{tier}/{feature}/`），每个切片自包含 routes、handlers、types、schema，Handler 内直接操作 Drizzle 完成业务逻辑。选择这种架构是因为大多数后台管理场景本质是数据进出，分层架构（Controller → Service → Repository）在简单 CRUD 中只是增加了透传样板代码，垂直切片让每个功能模块高内聚、低耦合，新增/删除功能不影响其他模块，也更利于 AI 理解和生成代码。复杂逻辑抽到 helpers 即可。

**复杂业务（约 20%）** 当业务规则、状态流转、跨模块编排等复杂度超出 Transaction Script 承载范围时，根据场景选择合适的架构模式：

| 场景               | 推荐架构      | 说明                                                                                            |
| ------------------ | ------------- | ----------------------------------------------------------------------------------------------- |
| 需要技术解耦       | 六边形架构    | Port/Adapter 隔离外部依赖                                                                       |
| 复杂业务规则       | DDD           | 领域模型封装业务规则                                                                            |
| 复杂 + 解耦        | DDD + 六边形  | 两者结合                                                                                        |
| 纯函数优先         | FCIS          | Functional Core 纯逻辑 + Imperative Shell 处理副作用，核心可独立测试                            |
| 纯函数 + 解耦      | FCIS + 六边形 | 纯函数核心 + Port/Adapter 隔离 I/O，兼顾可测试性与可替换性                                      |
| 类型安全副作用管理 | Effect-TS     | 基于 Effect 的函数式架构，类型安全的依赖注入、错误处理、结构化并发，副作用在类型层面可追踪      |
| 读写模型差异大     | 单体 CQRS     | 同一数据库内读写分离模型，Query 侧可扁平化 DTO/视图优化查询，Command 侧走领域逻辑，无需消息总线 |

**核心思路**：DDD 关注领域建模，六边形关注依赖隔离，FCIS 关注纯函数与副作用分离，Effect-TS 将副作用提升到类型系统，单体 CQRS 解决读写模型不对称问题。可根据业务复杂度自由组合。

> **单体 CQRS vs 数据库读写分离**：云厂商 PG 集群 Proxy（如阿里云 PolarDB、RDS Proxy）解决的是**数据库负载**问题——同一条 SQL 自动路由到主/只读节点，应用代码无感知。单体 CQRS 解决的是**应用模型**问题——写入走富领域模型保证业务一致性，查询走扁平 DTO/数据库视图跳过领域层直达数据，两者用不同的数据结构和代码路径。前者是运维层面的水平扩展，后者是代码层面的关注点分离，互不冲突且可叠加使用。

> **Effect-TS 深度集成**：Effect 的 `Context.Tag` + `Layer` 体系天然就是六边形架构——`Tag` 声明接口（Port），`Layer` 提供实现（Adapter），业务逻辑通过 `Effect.gen` 编排，只依赖 Tag 抽象而不依赖具体实现。测试时替换 `Layer` 即可注入 mock，无需额外的 interface 文件。同时 Effect 的类型通道 `Effect<Success, Error, Requirements>` 让依赖、错误、成功值全部显式声明在函数签名中——编译器强制你处理每一种错误路径，遗漏直接报红。相比手写 Port/Adapter + try/catch，Effect 用一套机制同时解决了依赖注入、错误处理和并发控制，适合状态机、工作流、跨服务编排等真正复杂的业务场景。本项目已在基础设施层（分布式锁 `withLock`、任务队列、资源初始化）使用 Effect，业务层可按需渐进采用。

```text
src/domain/[module]/                     # 领域层（纯业务逻辑）
├── [module].entity.ts                   # 领域实体
├── [module].service.ts                  # 领域服务
└── [module].repository.port.ts          # 仓储接口（Port）
src/infrastructure/persistence/          # 基础设施层（Adapter 实现）
```

## 核心架构特性

### 🔄 自动路由加载

基于 `import.meta.glob` 自动扫描 `routes/{tier}/**/*.index.ts` 并注册路由模块。新增模块只需创建目录，保存后 HMR 毫秒级生效。每个模块必须在 `{feature}.index.ts` 中 `export default` 路由实例。

### 🧩 单例管理系统

统一管理 PostgreSQL、Redis、Casbin 等长连接资源，解决 Vite HMR 模式下的连接泄漏问题，支持自动资源清理

### 💉 三层依赖注入

本项目没有使用传统 DI 容器（如 InversifyJS），而是采用更轻量直接的三层注入策略：

| 层级             | 机制                                                               | 作用域 | 典型用途                                                                                          |
| ---------------- | ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| **模块单例**     | `createSingleton` / `createAsyncSingleton` / `createLazySingleton` | 进程级 | DB 连接池、Redis 客户端、Casbin Enforcer、Logger 等长生命周期资源                                 |
| **请求上下文**   | Hono `c.set()` / `c.get()` + `AppBindings` 类型约束                | 请求级 | JWT 负载、请求 ID、tierBasePath 等请求作用域数据，中间件写入 → Handler 读取                       |
| **Effect Layer** | `Context.Tag` + `Layer.mergeAll`                                   | 可组合 | 基础设施服务（DB、Logger、pg-boss）的类型安全组合，用于分布式锁、任务队列等需要 Effect 编排的场景 |

**为什么不用 DI 容器**：后台管理系统的依赖图天然简单——长连接资源是进程级单例，请求数据通过 Hono Context 传递，两层已覆盖 90% 场景。Effect Layer 补充了需要类型安全组合的剩余 10%（如 `withLock` 分布式锁）。引入 DI 容器只会增加间接层和注册仪式，对于这种规模的项目来说过度设计。

#### 核心思路

**权限系统**:基于 RESTful API 路径 + Casbin KeyMatch3,代码即权限,无需数据库存储权限标识
**菜单系统**:Refine Resource 编译时路由,运行时零开销,代码即菜单
**字典系统**:TypeScript 枚举 → PostgreSQL Enum → OpenAPI 自动生成,前后端 100% 同步

#### 对比传统方案

| 维度     | 本项目方案                                 | 传统方案                                     |
| -------- | ------------------------------------------ | -------------------------------------------- |
| **权限** | OpenAPI 路由定义,Casbin 策略匹配,自动同步  | 数据库权限表 + 关联表,手动维护,容易不一致    |
| **菜单** | 编译时生成路由树,类型安全,零运行时开销     | 数据库存储菜单,运行时查询解析,需要管理界面   |
| **字典** | 单一数据源,编译时类型检查,4 字节 Enum 存储 | 数据库字典表,运行时查询,需要 JOIN,容易不同步 |
| **维护** | 改一处自动同步,TypeScript 编译时报错       | 多处手动同步:数据库 → 后端 → 前端 → 文档     |

### 📝 日志系统

基于 pino transport 架构，支持多目标输出（开发 `pino-pretty` / 生产 stdout JSON / 可选阿里云 SLS）。三种 child logger 自动注入 `type` 字段：`logger`（系统）、`operationLogger`（CRUD 审计，type: `OPERATION`）、`loginLogger`（登录记录，type: `LOGIN`）。

操作日志中间件已在 admin tier 全局配置（无参数模式存储原始 `urlPath`），也支持局部模式手动指定模块名：

```typescript
router.use(operationLog({ moduleName: "订单管理", description: "创建订单" }));
```

自定义 Transport 接入：在项目根目录创建 `transports/sls-transport.mjs`，使用 `pino-abstract-transport` 构建，然后在 `logger.ts` 的 `buildTransportTargets()` 中取消注释 SLS target。操作日志 `urlPath` 与 Casbin keymatch3 规则和 Refine resource 天然对应，前端可直接用权限树映射中文标签作为日志筛选维度。

### 📋 任务队列系统（BullMQ）

基于 BullMQ + Redis 构建，提供高性能任务队列管理和定时任务调度，使用 Effect-TS 函数式封装确保类型安全。

**访问 Bull Board 管理界面**：

```bash
pnpm dev
# 访问 http://localhost:3000/api/admin/queue-board
```

**基础用法 - 添加任务**：

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// 添加即时任务
const program = queueManager.addJob("email", "send-welcome", {
  email: "user@example.com",
  subject: "欢迎注册！",
});

await Effect.runPromise(program);
```

**注册 Worker 处理器**：

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// 注册 Worker 处理任务
const program = queueManager.registerWorker("email", async (job) => {
  console.log("处理邮件:", job.data);
  // 邮件发送逻辑
  return { success: true };
});

Effect.runSync(program);
```

**定时任务（Repeatable Jobs）**：

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// 每天凌晨 3 点执行清理任务
const program = queueManager.scheduleJob(
  "cleanup",
  "daily-cleanup",
  { type: "cleanup" },
  {
    pattern: "0 3 * * *",
    tz: "Asia/Shanghai",
  }
);

await Effect.runPromise(program);
```

**Redis 配置要求**：

BullMQ 依赖 Redis，需要以下配置：

- **maxmemory-policy**: `noeviction`（防止任务数据被驱逐）
- **数据持久化**: 建议开启 AOF 或 RDB

本地开发环境（Docker Compose）已自动配置。阿里云 Redis 需要在控制台手动设置 `maxmemory-policy`。

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t clhoria-template .

# 运行容器
docker run -p 9999:9999 --env-file .env clhoria-template
```

## 部署特性

**可选 SaaS 依赖**: sentry、Cloudflare R2 对象存储等第三方服务均为可选,可完全部署在内网环境。技术栈符合信创要求,支持迁移至国产数据库(如人大金仓、华为高斯等)。

### Redis 集群 / 哨兵

模板默认使用单机 Redis。如需 Redis Cluster/Sentinel，请自行替换 `src/lib/services/redis.ts` 中的初始化逻辑，或使用云厂商 Proxy 模式（阿里云 Redis、AWS ElastiCache 等）。

## 开发体验对比

| 对比维度     | 本项目 (AI + Modern Stack)                      | 传统代码生成器                           |
| ------------ | ----------------------------------------------- | ---------------------------------------- |
| **开发效率** | Claude Code 智能理解需求,秒级生成符合规范的代码 | 手动配置模板麻烦,生成僵化代码,需大量修改 |
| **接口管理** | OpenAPI + Zod 自动同步,类型安全,文档永不过期    | 手工维护接口文档,容易不同步              |
| **代码质量** | TypeScript 全链路类型检查,编译时发现问题        | 生成代码缺乏类型约束,运行时错误频发      |
| **维护成本** | 代码规范统一,AI 理解项目架构,维护简单           | 代码量大不够优雅,不好维护                |

## 验证码系统对比

### 🔐 Cap.js vs svg-captcha

| 对比维度     | Cap.js (本项目采用)                          | svg-captcha                    |
| ------------ | -------------------------------------------- | ------------------------------ |
| **安全性**   | SHA-256 工作量证明,无视觉破解面,抗自动化     | 基于图像识别,易被 OCR 工具破解 |
| **用户体验** | 无视觉谜题,后台静默计算,支持 Widget/隐形模式 | 传统图片验证,识别扭曲文字      |
| **隐私**     | 自托管,零追踪零遥测,完全掌控数据             | 内存存储,功能固定              |

## 性能对比

### Hono vs Fastify 性能分析

在 Node.js 22 环境下,Fastify 依然保持性能优势,但差距已经不大:

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

详细基准测试:[bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

### 🚀 高并发与性能优化方案

**高并发解决方案**:K8s/阿里云 SLB 负载均衡 + PostgreSQL/Redis 高可用集群 + 分布式会话,实现无状态水平扩展

**计算密集型优化**:

| 场景             | 推荐方案       | 适用场景                       |
| ---------------- | -------------- | ------------------------------ |
| **多次重复调用** | napi-rs        | 图像处理、加密解密、数据压缩   |
| **单次密集计算** | WASM           | 复杂算法、科学计算、单次重计算 |
| **并行多任务**   | Worker Threads | 大量独立任务、并发数据处理     |

## Claude Code 深度集成(可选)

本项目专为 AI 驱动开发而设计,提供完整的 CLAUDE.md 配置,让 AI 深度理解项目架构。

**推荐 MCP 插件**:

- **[Serena](https://github.com/SerenaAI/serena-mcp)**:智能代码分析和重构建议
- **[Context7](https://github.com/context7/mcp-plugin)**:实时技术文档查询和代码示例

## VSCode 代码片段

项目内置了 CRUD 开发常用的代码片段模板（`.vscode/crud.code-snippets`），在 TypeScript 文件中输入前缀后按 `Tab` 键即可快速生成代码。

| 前缀            | 说明                                          |
| --------------- | --------------------------------------------- |
| `crud-schema`   | 完整 schema.ts 模板                           |
| `crud-routes`   | 完整 routes.ts 模板（含 CRUD 五个路由）       |
| `crud-handlers` | 完整 handlers.ts 模板（含 CRUD 五个处理函数） |
| `crud-index`    | 完整 index.ts 模板                            |

## 测试

使用 Vitest 测试框架,支持完整的单元测试和集成测试,可以在 tests 下添加端到端测试。

```bash
# 运行测试
pnpm test
```

## 引用

- [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter)
- [stoker](https://github.com/w3cj/stoker)

## 支持

如有问题或建议,请创建 [Issue](https://github.com/zhe-qi/clhoria-template/issues) 或联系维护者。

**QQ 交流群**: 1076889416

## 贡献指南

欢迎贡献!请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范,提交 PR 前确保 `pnpm test` 和 `pnpm lint` 通过。

## 许可证

MIT License - 查看 [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) 文件了解详情。

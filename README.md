# Clhoria 基于 Hono 的快速开发模板

简体中文 | [English](./readme.en.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

现代化企业级后端模板,基于 Hono 框架构建的高性能 TypeScript 应用。采用 AI 驱动开发模式,结合 Hono + OpenAPI + Zod 完整技术体系,实现真正的类型安全和开发效率提升。集成 Drizzle ORM + PostgreSQL 数据层,完整的 RBAC 权限体系,提供比传统后台管理系统更稳定、更高效的开发体验。

Clhoria 将复杂的技术架构化繁为简,让每一次编码都如诗般优雅,每一个功能都如花般绽放。选择 Clhoria,就是选择与未来同行。

> 模板配套的后台管理前端部分基于 Refine + Shadcn 开发:[https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## 功能特性

- **现代化技术栈**: Hono + TypeScript + Vite + Drizzle ORM + PostgreSQL
- **混合架构**: 函数式开发规范、多层级路由结构、复杂业务可选DDD
- **自动化文档**: OpenAPI 3.1 规范 + Scalar UI,代码即文档,支持在线调试和类型生成
- **多层认证授权**: JWT 双密钥(Admin/Client 隔离)+ Casbin RBAC
- **声明式分页器**: 基于 Refine 规范的安全声明式查询,拓展 refine 查询支持仅后端联表查询
- **完整 RBAC**: 用户管理 + 角色管理 + Casbin 权限策略 + Refine Resource 菜单
- **智能权限系统**: Casbin KeyMatch3 + RESTful + Refine Resource,无需后端存储权限标识
- **高性能菜单**: 基于 Refine 的菜单和路由最佳实践,相比传统动态路由性能更优
- **业务和系统字典**: 业务字典支持运行时动态配置(JSONB + Redis缓存),系统字典使用 Pg枚举 编译时类型检查
- **日志中间件**: 收集日志,支持多种存储方案(阿里云 SLS、PostgreSQL TimescaleDB、Loki 等)
- **高性能缓存**: Redis 缓存（支持集群模式）+ 多层限流策略 + 权限缓存 + 会话管理 + 分布式锁
- **任务队列和定时任务**: 基于 pg-boss 的后台任务队列管理，基于 croner 的定时任务
- **对象存储**: 集成 S3 兼容对象存储(支持 Cloudflare R2、阿里云 OSS、AWS S3 等)
- **智能验证码**: 集成 Cap.js,支持多种挑战类型的现代化验证码系统
- **AI 原生开发**: Claude Code + OpenAPI 自动生成,告别手工维护接口文档的痛苦
- **类型安全体系**: Hono + Zod + TypeScript 全链路类型推导,编译时发现问题
- **智能测试覆盖**: Vitest + AI 辅助,自动生成测试用例,确保接口稳定性
- **即时反馈开发**: 基于 Vite 的热重载开发环境,代码变更毫秒级生效,开发体验极致流畅
- **Claude Code 深度优化**: 完整 CLAUDE.md 配置,MCP 插件生态,AI 理解项目架构
- **监控系统**: 集成 Sentry 错误追踪,支持自建或云原生方案(小团队推荐云服务,免运维)

## 快速开始

### 本地开发环境

- Node.js >= 24
- pnpm >= 10
- PostgreSQL >= 18
- Redis >= 7

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

   # 推送数据库架构到开发环境
   pnpm push

   # 填充初始数据(可选,应用启动时会自动检查并初始化)
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

## 开发规范

### Claude Code 开发流程

配合 Claude Code 进行功能开发时，遵循以下 8 阶段标准流程：

```
1. 需求分析 → 2. 技术架构设计 → 3. 测试规划 → 4. 生成接口代码 →
5. 生成测试用例 → 6-7. 循环优化 → 8. 生成 Skill 文档
```

#### 各阶段核心要点

| 阶段            | 目标                                  | 输出                             |
| --------------- | ------------------------------------- | -------------------------------- |
| 1. 需求分析     | 确保需求清晰完整                      | 明确的需求描述                   |
| 2. 技术架构设计 | 使用 thinking 模式设计架构            | `docs/{feature}/architecture.md` |
| 3. 测试规划     | 根据架构生成测试策略                  | `docs/{feature}/test-plan.md`    |
| 4. 生成接口代码 | 一次性生成完整代码(Schema + Handlers) | 完整的接口代码 + migration       |
| 5. 生成测试用例 | 基于接口类型生成可执行测试            | `__tests__/int.test.ts`          |
| 6-7. 循环优化   | 持续改进直到满足验收标准              | 通过验收的代码                   |
| 8. Skill 文档   | 生成供 Claude 快速学习的文档          | `docs/{feature}/skill.md`        |

#### 验收标准（Done Criteria）

- ✅ 所有测试通过（**必须**）
- ✅ 符合 CLAUDE.md 规范（**必须**）
- ✅ 无明显性能问题（**必须**）
- ✅ 代码质量达标（**可选**）

#### 文档产出

每个功能模块完成后，应包含以下文档：

```
docs/{feature}/
├── architecture.md  # 技术架构设计
├── test-plan.md     # 测试策略
└── skill.md         # Claude 快速学习文档
```

<details>
<summary>📋 文档模板示例（点击展开）</summary>

**architecture.md 模板**

```markdown
# {功能名称} 技术架构

## 功能概述

{简短描述功能}

## 数据库设计

- 表结构：{表名、字段、类型}
- 关系：{表关系}
- 索引：{索引策略}

## API 设计

| 路径                 | 方法 | 描述     | 权限  |
| -------------------- | ---- | -------- | ----- |
| /api/admin/{feature} | GET  | 列表查询 | admin |
| /api/admin/{feature} | POST | 创建     | admin |

## 技术选型

- {选择的技术及原因}

## 关键技术决策

- {重要的架构决策及理由}
```

**test-plan.md 模板**

```markdown
# {功能名称} 测试计划

## 功能概述

{简短描述}

## 测试场景矩阵

| 接口 | 正常流程 | 异常流程       | 边界条件     |
| ---- | -------- | -------------- | ------------ |
| 创建 | ✓        | 重复、无效格式 | 字段长度限制 |
| 查询 | ✓        | 不存在的 ID    | 分页边界     |
```

**skill.md 模板**

```markdown
# {功能名称} - Claude Skill 文档

## 快速索引

- 入口：`src/routes/admin/{feature}/index.ts`
- 测试：`src/routes/admin/{feature}/__tests__/int.test.ts`

## 核心概念

- **{术语}**：{解释}

## 数据流图

\`\`\`
请求 → JWT验证 → RBAC授权 → Zod验证 → 业务逻辑 → Resp.ok()
\`\`\`

## 避坑指南

- ⚠️ 响应必须使用 `Resp.ok()` / `Resp.fail()` 包装
- ⚠️ 日志使用 `logger.info()` 不用 console.log
- ⚠️ DB Schema 用 `snake_case`，TS 用 `camelCase`
```

</details>

---

### 路由模块结构

```text
routes/{tier}/{feature}/
├── {feature}.handlers.ts       # 业务逻辑处理器（必需）
├── {feature}.routes.ts         # 路由定义和 OpenAPI 规范（必需）
├── {feature}.index.ts          # 统一导出（必需）
├── {feature}.types.ts          # 类型定义（必需）
├── {feature}.schema.ts         # 路由级 Zod Schema（可选）
├── {feature}.services.ts       # 路由级服务函数（可选）
├── {feature}.helpers.ts        # 辅助工具函数（可选）
└── __tests__/                  # 测试目录（推荐）
    └── {feature}.test.ts
```

**文件说明:**

| 文件                    | 状态 | 用途                                         |
| ----------------------- | ---- | -------------------------------------------- |
| `{feature}.handlers.ts` | 必需 | 实现路由的业务逻辑处理函数                   |
| `{feature}.routes.ts`   | 必需 | 定义路由的 OpenAPI 规范和路径                |
| `{feature}.index.ts`    | 必需 | 导出路由实例                                 |
| `{feature}.types.ts`    | 必需 | 路由处理器类型定义和业务类型                 |
| `{feature}.schema.ts`   | 可选 | 定义该模块特有的 Zod 校验 Schema             |
| `{feature}.services.ts` | 可选 | 该模块专属的服务函数（复杂逻辑或模块内复用） |
| `{feature}.helpers.ts`  | 可选 | 模块内部的辅助工具函数（纯函数）             |
| `__tests__/`            | 推荐 | 集成测试文件                                 |

**何时创建可选文件:**

- **schema.ts**: 当有多个复杂的请求/响应 Schema 需要组合和复用时
- **services.ts**: 当业务逻辑复杂或需要在模块内复用时（保持 handlers 简洁）
- **helpers.ts**: 当需要特定的数据转换、格式化或验证辅助函数时

**全局服务:**

- 跨多个层级（admin/client/public）复用的服务应放在 `src/services/{service}/`

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

项目中的 Zod Schema 分为两个层级:

| 层级       | 位置                                  | 内容                              | 用途                                              |
| ---------- | ------------------------------------- | --------------------------------- | ------------------------------------------------- |
| **DB 层**  | `db/schema/{entity}.ts`               | `select*Schema` / `insert*Schema` | 从 Drizzle 表定义生成，作为基础 Schema            |
| **路由层** | `routes/{tier}/{feature}/*.schema.ts` | 业务组合 Schema                   | 继承 DB Schema 并组合成特定接口的请求/响应 Schema |

**标准流程:**

```typescript
// 1. DB 层: 在表定义所在文件生成基础 Schema
// src/db/schema/admin/system/users.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// 2. 路由层: 在 schema.ts 中组合业务 Schema
// src/routes/admin/system/users/users.schema.ts
import { insertUserSchema, selectUserSchema } from "@/db/schema";

export const selectUserSchema = createSelectSchema(users, {
  username: schema => schema.meta({ description: "用户名" })
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

type CreateUserRequest = {
  username: string;
  email?: string;
};

export const createUserRequestSchema: z.ZodType<CreateUserRequest>
  = insertUserSchema.pick({
    username: true,
    email: true
  });

export const userListResponseSchema = z.object({
  data: z.array(selectUserSchema),
  total: z.number()
});
```

**关键规则:**

- 所有 `.meta({ description })` 仅在 DB 层添加（通过 `createSelectSchema` 回调）
- 路由层只负责组合、裁剪和扩展，不重复添加描述
- 如果路由 Schema 简单（如单表 CRUD），可以直接在 `routes.ts` 中使用 DB Schema
- 推荐使用接口约束 Zod Schema（`z.ZodType<Interface>`）以增强类型安全

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

**简单 CRUD（80%）**：Handler 直接操作数据库，函数式设计，按需抽离服务层

**复杂业务（20%）**：根据场景选择架构模式

| 场景           | 推荐架构     | 说明                      |
| -------------- | ------------ | ------------------------- |
| 简单 CRUD      | 三层架构     | Handler 直接操作 Drizzle  |
| 需要技术解耦   | 六边形架构   | Port/Adapter 隔离外部依赖 |
| 业务逻辑复杂   | DDD          | 领域模型封装业务规则      |
| 既复杂又需解耦 | DDD + 六边形 | 两者结合                  |

**DDD / 六边形架构目录结构**:

```text
src/domain/[module]/                  # 领域层（纯业务，无外部依赖）
├── [module].entity.ts                # 领域实体：业务规则、状态变更
├── [module].service.ts               # 领域服务：跨实体逻辑、流程编排
└── [module].repository.port.ts       # 仓储接口（Port）

src/infrastructure/persistence/       # 基础设施层（Adapter）
├── mappers/[module].mapper.ts        # Domain ↔ Drizzle 转换
└── repositories/[module].repository.ts  # 仓储实现（Drizzle ORM）

src/routes/{tier}/{feature}/handlers.ts  # 表示层：HTTP + 调用领域服务
```

**核心原则**: Domain 层纯净（不依赖 Drizzle/Redis）→ Port 定义抽象 → Adapter 实现细节 → 依赖反转

## 核心架构特性

### 🔄 自动路由加载

基于 `import.meta.glob` 自动扫描注册路由模块，新增模块只需创建目录即可。支持 HMR 热更新，修改代码毫秒级生效。

**工作原理:**

```typescript
// src/index.ts
// 1. 自动扫描路由模块
const adminModules = import.meta.glob<{ default: AppOpenAPI }>(
  "./routes/admin/**/*.index.ts",
  { eager: true }
);

// 2. 批量注册路由
for (const module of Object.values(adminModules)) {
  adminApp.route("/", module.default);
}
```

**开发流程:**

1. **创建新功能**: 在 `routes/{tier}/{feature}/` 下创建标准文件结构
2. **自动发现**: Vite 自动扫描新的 `*.index.ts` 文件
3. **立即生效**: 保存后毫秒级热更新，无需重启服务器

**约定:**

- 每个路由模块必须包含 `{feature}.index.ts` 文件
- `index.ts` 必须 `export default` 一个路由实例
- 文件路径格式: `routes/{tier}/{feature}/*.index.ts`

### 🧩 单例管理系统

统一管理 PostgreSQL、Redis、Casbin 等长连接资源，解决 Vite HMR 模式下的连接泄漏问题，支持自动资源清理

### 🎯 权限 + 菜单 + 字典一体化方案

基于 **Casbin + Refine + PostgreSQL Enum + OpenAPI** 的现代化架构,彻底简化传统后台管理系统的复杂度。

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
| **安全性**   | 多种挑战类型,难以被自动化工具破解            | 基于图像识别,易被 OCR 工具破解 |
| **用户体验** | 现代化交互界面,快速通过验证,用户体验遥遥领先 | 传统图片验证,识别扭曲文字      |
| **扩展性**   | 数据库存储,支持分布式部署和自定义挑战类型    | 内存存储,功能固定              |

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

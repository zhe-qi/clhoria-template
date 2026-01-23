# CLAUDE.md

**CRITICAL: Always respond in Simplified Chinese**

## Commands

```bash
# Package manager: pnpm only
pnpm install/dev/build/start/typecheck/lint/lint:fix/test
pnpm generate/push/migrate/studio/seed  # Database
```

## Stack

Hono + Node.js 25 + PostgreSQL(Drizzle snake_case) + Redis(ioredis) + JWT(admin/client) + Casbin RBAC + Zod(Chinese errors) + OpenAPI 3.1.0(Scalar) + Vitest + tsdown

## Architecture

### Route Tiers
- `/api/public/*` - No auth
- `/api/client/*` - JWT only
- `/api/admin/*` - JWT + RBAC + audit logs

### Structure
```
src/
├── index.ts                # 应用入口，基于 import.meta.glob 自动加载路由
├── db/schema/              # 数据库 Schema（snake_case）
│   ├── _shard/             # 共享基础组件
│   │   ├── base-columns.ts # 通用字段（id/createdAt/updatedAt等）
│   │   └── enums.ts        # PostgreSQL 枚举定义
│   ├── {tier}/{feature}/   # 按层级和功能组织的表定义
│   └── index.ts            # 统一导出
├── routes/{tier}/{feature}/
│   ├── {feature}.handlers.ts    # 业务逻辑处理器（必需）
│   ├── {feature}.routes.ts      # 路由定义和 OpenAPI 规范（必需）
│   ├── {feature}.index.ts       # 统一导出（必需）
│   ├── {feature}.types.ts       # 类型定义（必需）
│   ├── {feature}.schema.ts      # 路由级 Zod Schema（可选）
│   ├── {feature}.services.ts    # 路由级服务函数（可选）
│   ├── {feature}.helpers.ts     # 辅助工具函数（可选）
│   └── __tests__/              # 测试文件（推荐）
│       └── {feature}.test.ts
├── services/                    # 跨层级全局服务（如 ip、sms 等）
└── lib/                         # 工具库和通用组件
```

**关键说明:**
- 应用启动时通过 `import.meta.glob` 自动扫描并加载 `routes/{tier}/**/*.index.ts`
- 新增路由模块无需手动注册，创建对应目录和文件即可
- 支持 Vite HMR，代码变更毫秒级生效

## Critical Rules

### Response Wrapping (MANDATORY)
```typescript
// ✓ Wrap all responses
return c.json(Resp.ok(data), HttpStatusCodes.OK);
return c.json(Resp.fail("错误"), HttpStatusCodes.BAD_REQUEST);

// ✗ Never return raw data
return c.json(data, HttpStatusCodes.OK);

// OpenAPI
[HttpStatusCodes.OK]: jsonContent(RefineResultSchema, "成功")
[HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "错误")
```

### Logging (MANDATORY)
```typescript
// ✓ Use logger, data object first
logger.info({ userId }, "[用户]: 登录成功");
logger.error(error, "[系统]: 初始化失败");

// ✗ Never use console.log/warn/error
// ✗ Never put data object after message
```

**Format**: `[模块名]: 描述` | Log progress at 25% intervals only | No emojis/English

**Console 使用规范**
- 默认禁用: 生产代码中禁止使用 `console.log` / `console.warn` / `console.error`
- 特殊场景例外:
  - 环境变量验证（应用启动前，如 `src/utils/zod/env-validator.ts`）
  - 单例资源管理（如 `src/lib/internal/singleton.ts` 的错误处理）
  - 测试代码（`__tests__/` 目录）
  - 工具脚本（非应用运行时代码）
- 其他场景一律使用 logger

### Database Schema

**Basics**
- Import: `import db from "@/db"` (default)
- Casing: TypeScript camelCase → auto snake_case (config: `casing: "snake_case"`)
- Extend `...defaultColumns` (id/createdAt/updatedAt/createdBy/updatedBy)
- Modern syntax: `varchar({ length: 128 })` not `varchar("name", { length })`
- Always specify varchar length
- **NEVER modify `migrations/` folder or `meta/` folder files - they are auto-generated. Only modify schema files in `src/db/schema/`**

**Schema 目录组织**

`src/db/schema/` 目录结构遵循以下规范:

```
src/db/schema/
├── _shard/                      # 共享基础组件（不对应业务表）
│   ├── base-columns.ts          # 默认字段定义（id/createdAt/updatedAt等）
│   └── enums.ts                 # PostgreSQL 枚举类型定义
├── {tier}/{feature}/            # 业务表定义
│   ├── {entity}.ts              # 具体表的 Drizzle Schema
│   └── index.ts                 # 该功能模块的表导出
└── index.ts                     # 根导出（汇总所有 schema）
```

**关键规则:**
- `_shard/` 目录: 存放跨功能的共享组件
  - `base-columns.ts`: 导出 `baseColumns` 对象，供所有表扩展使用
  - `enums.ts`: 使用 `pgEnum()` 定义数据库枚举，从 `lib/enums` 导入 TypeScript 枚举值
  - 文件前缀 `_` 表示内部共享，不对应具体业务表

- 业务表组织: 按 `{tier}/{feature}` 分层组织（如 `admin/system/users.ts`）

- 枚举定义标准流程:
  1. 在 `lib/enums/common.ts` 定义 TypeScript 枚举（`as const` 模式）
  2. 在 `db/schema/_shard/enums.ts` 使用 `pgEnum()` 创建数据库枚举
  3. 在表定义中调用枚举: `status: statusEnum().default(Status.ENABLED).notNull()`

**Enums**
```typescript
// enums.ts
export const statusEnum = pgEnum("status", Object.values(Status));

// schema - call without params
status: statusEnum().default(Status.ENABLED).notNull()
```

**Constraints**
- Return arrays: `table => [unique().on(table.col)]`
- Indexes only when necessary: `index("name_idx").on(table.col)`

**Zod Schema Inheritance**
```typescript
// 1. Base (add descriptions ONLY here via callback)
const selectSchema = createSelectSchema(table, {
  field: schema => schema.meta({ description: "描述" })
});

// 2. Insert
const insertSchema = createInsertSchema(table).omit({ id: true });

// 3. Derived
const patchSchema = insertSchema.partial();
const querySchema = selectSchema.pick({...}).extend({
  // Use extend for: override properties, change types, add new fields
  optional: z.string().optional()
});
```

**Type Constraints（推荐）**
```typescript
// 推荐: 使用接口约束 Zod Schema，确保类型一致性
interface CreateUserRequest {
  username: string;
  email?: string;
}

const createUserSchema: z.ZodType<CreateUserRequest> = z.object({
  username: z.string(),
  email: z.string().optional()  // .optional() not .nullable()
});

// Zod v4 语法
z.uuid()  // not z.string().uuid()

// 说明:
// - 使用接口约束可在编译时发现 Schema 定义与类型不一致的问题
// - 特别适用于复杂的请求/响应 Schema
// - 简单 Schema 可以直接使用 z.infer 推导类型
```

### Route Module Pattern

**Export ({feature}.index.ts)**
```typescript
import { createRouter } from "@/lib/create-app";
import * as handlers from "./{feature}.handlers";
import * as routes from "./{feature}.routes";

export default createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create);
```

**Type Definitions ({feature}.types.ts)**
```typescript
import type * as routes from "./{feature}.routes";
import type { AppRouteHandler } from "@/types/lib";

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type FeatureRouteHandlerType<T extends keyof RouteTypes> =
  AppRouteHandler<RouteTypes[T]>;

// 业务类型定义
export type UserTokenInfo = {
  id: string;
  roles: string[];
};
```

**Handler Typing (MANDATORY)**
```typescript
import type { FeatureRouteHandlerType } from "./{feature}.types";

// ✓ Strict typing
export const list: FeatureRouteHandlerType<"list"> = async (c) => {};

// ✗ Never use any/Context/generic types
```

**可选文件说明**

路由模块可根据业务复杂度选择性添加以下文件:

**{feature}.schema.ts** - 路由级 Zod Schema
```typescript
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { table } from "@/db/schema";

// 基础 Schema（从 DB 表生成）
export const selectSchema = createSelectSchema(table, {
  field: schema => schema.meta({ description: "描述" })
});
export const insertSchema = createInsertSchema(table).omit({ id: true });

// 业务组合 Schema（用于 routes.ts）
interface CreateRequest {
  username: string;
  email?: string;
}

export const createRequestSchema: z.ZodType<CreateRequest> = insertSchema.pick({
  username: true,
  email: true
});

export const updateRequestSchema = insertSchema.partial();

export const listResponseSchema = z.object({
  data: z.array(selectSchema),
  total: z.number()
});
```

**{feature}.services.ts** - 路由级服务函数
- 仅当服务函数专属于该路由模块且复用 ≥2 次时创建
- 跨层级复用的服务应放在 `src/services/`（如 ip、sms 等全局服务）
- 函数命名: `create*` / `get*` / `update*` / `delete*` / `assign*` / `clear*`

**{feature}.helpers.ts** - 辅助工具函数
- 存放该模块特有的辅助函数（如数据转换、格式化、验证逻辑）
- 与 services 的区别: helpers 通常是纯函数，无副作用

**__tests__/{feature}.test.ts** - 测试文件
- 推荐每个路由模块都包含集成测试
- 文件命名: `{feature}.test.ts` 或 `int.test.ts`

**OpenAPI Tags**
```typescript
const routePrefix = "/feature";
const tags = [`${routePrefix}（功能描述）`];

export const list = createRoute({
  tags,
  path: routePrefix,  // or `${routePrefix}/{id}`
  // ...
});
```

## Other Rules

**Must Follow**
- Status codes: Use `HttpStatusCodes` constants
- Dates: Use `date-fns` library
- Timestamps: `timestamp({ mode: "string" })`
- UUID params: Use `IdUUIDParamsSchema`
- Dynamic imports: `await import()`
- Ignore returns: Prefix with `void`
- Redis: Specify return types
- Enums: String values + `as const`
- Naming: PascalCase (classes/types), UPPER_SNAKE_CASE (enum values), kebab-case (files)
- Queries: Use enums not magic values: `eq(table.status, Status.ENABLED)`

**Error Handling**
- Research error behavior of Drizzle/dependencies before try-catch
- Don't blindly wrap in try-catch

**Services**
- 路由级服务: 创建 `{feature}.services.ts`，仅在该路由模块复用 ≥2x 时创建
- 全局服务: 创建 `src/services/{service}/`，跨多个层级（admin/client/public）复用的服务
- 函数命名: `create*`/`get*`/`update*`/`delete*`/`assign*`/`clear*`
- Keep simple CRUD in handlers

**Testing**
- Developer must manually run and test project for debugging

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a backend template based on hono. It uses TypeScript, Drizzle ORM and PostgreSQL, and implements a strictly routing-separated multi-layer architecture (public, client, admin).

## Development Commands

- `pnpm dev` - Start development server with file watching
- `pnpm build` - Build for production using tsdown
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm test` - Run tests using Vitest

## Code Style Standards

### Console Output Guidelines

- **NO EMOJIS**: Never use emojis in console.log, console.warn, or console.error statements
- **Clean Output**: All console output should be plain text without decorative icons or symbols
- **Consistent Format**: Use clear, descriptive text for logging and user feedback
- **Examples**:
  - ✅ Good: `console.log("权限同步完成: 新增 3, 更新 1")`
  - ❌ Bad: `console.log("✅ 权限同步完成: 新增 3, 更新 1")`

### Route Comment Standards

All route definitions MUST include comments using the following format:

1. **Single Line Comments**: Use `/** 描述 */` format for simple route descriptions
   ```typescript
   /** 获取用户列表 */
   export const listUsers = createRoute({
     // route definition
   });
   ```

2. **Multi-line Comments**: Use block comment format for complex descriptions
   ```typescript
   /**
    * 创建新用户
    * 支持批量创建和角色分配
    */
   export const createUser = createRoute({
     // route definition
   });
   ```

3. **Comment Requirements**:
   - ALWAYS add comments above route definitions
   - Use Chinese descriptions for better understanding
   - Keep comments concise and descriptive
   - DO NOT use JSDoc tags (no @param, @returns, etc.)
   - Focus on the business purpose of the route

## Database Commands

- `pnpm generate` - Generate Drizzle migrations from schema changes
- `pnpm push` - Push schema changes directly to database
- `pnpm studio` - Open Drizzle Studio for database management

## Architecture

### Route Organization

The application uses a three-tier route structure defined in `src/app.ts`:

1. **Public Routes** (`/routes/public/`) - No authentication required
2. **Client Routes** (`/routes/client/`) - JWT authentication with CLIENT_JWT_SECRET
3. **Admin Routes** (`/routes/admin/`) - JWT + Casbin authorization

Route execution order is critical as it affects middleware execution. Public routes must be registered first.

### Database Layer

- **ORM**: Drizzle with PostgreSQL
- **Schema**: Located in `src/db/schema/` with barrel exports
- **Configuration**: `drizzle.config.ts` with snake_case convention
- **Migrations**: Stored in `./migrations/`
- **Database Instance**: Default export `db` from `@/db` with snake_case convention
- **Database Import Pattern**: ALWAYS use default import: `import db from "@/db";` (NOT `import { db } from "@/db";`)
- **Null Handling**: `undefined` values are automatically converted to `null` when stored in database

#### Schema Definition Rules

When creating Drizzle schemas, follow these rules:

1. **Table Descriptions**: Always add descriptions to schema fields using `.describe()`
2. **Schema Exports**: Create three schemas for each table:
   - `selectXxxSchema` - for reading data (with field descriptions)
   - `insertXxxSchema` - for creating data (omit id, createdAt, updatedAt)
   - `patchXxxSchema` - for updating data (partial of insertXxxSchema)
3. **Field Descriptions**: Use Chinese descriptions that explain the field purpose and format
4. **Status Fields**: Use `integer().default(1)` for enable/disable flags (1=enabled, 0=disabled)
5. **Custom Field Schema**: When defining custom field schemas, import zod from `@hono/zod-openapi` to access OpenAPI-specific methods like `.openapi()`
6. **Field Column Naming**: Use automatic snake_case conversion:
   - ✅ Correct: `handlerName: varchar({ length: 128 })` (auto-converts to `handler_name`)
   - ❌ Wrong: `handlerName: varchar("handler_name", { length: 128 })` (redundant mapping)
7. **VARCHAR Length Requirements**: Always specify length for varchar fields:
   - ✅ Correct: `varchar({ length: 128 })`
   - ❌ Wrong: `varchar()` (missing length specification)
8. **JSON Field Standards**: When using JSON fields, follow these rules:
   - Always use `jsonb()` instead of `json()` for better performance and indexing
   - Use `.$type<InterfaceName>()` to provide TypeScript type constraints with proper interfaces
   - Define clear TypeScript interfaces for JSON field structure (avoid `any` type)
   - Set appropriate default values using `.default()` method

#### Drizzle ORM 约束和索引定义规范

基于 Drizzle ORM 最新版本（0.31.0+）的约束和索引定义最佳实践：

##### 1. Unique 约束定义

**单列唯一约束**:
```typescript
export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  email: text("email").unique(), // 简单唯一约束
  username: text("username").unique("custom_unique_name"), // 自定义约束名
});
```

**复合唯一约束** - ✅ 正确方式（返回数组）：
```typescript
export const systemOrganization = pgTable("system_organization", {
  ...defaultColumns,
  domain: varchar({ length: 64 }).notNull(),
  code: varchar({ length: 64 }).notNull(),
  status: statusEnum().notNull(),
}, table => [
  // 域内组织代码唯一
  unique().on(table.domain, table.code),
  unique("custom_name").on(table.domain, table.code), // 自定义约束名
]);
```

**❌ 错误方式（返回对象）**：
```typescript
// 不要这样写！
}, (table) => ({
  domainCodeUnique: unique().on(table.domain, table.code), // 错误！
})
```

##### 2. 索引定义

**基础索引定义**:
```typescript
export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
}, table => [
  // 普通索引
  index("name_idx").on(table.name),
  // 唯一索引（推荐用于需要查询性能的唯一字段）
  uniqueIndex("email_idx").on(table.email),
  // 复合索引
  index("name_email_idx").on(table.name, table.email),
]);
```

**高级索引选项（v0.31.0+）**:
```typescript
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id"),
}, table => [
  // 带排序的索引
  index("title_idx").on(table.title.asc()),
  index("created_at_idx").on(table.createdAt.desc()),
  
  // 处理 NULL 值的索引
  index("user_id_idx").on(table.userId.nullsFirst()),
  
  // 条件索引
  index("active_posts_idx")
    .on(table.title)
    .where(sql`${table.userId} IS NOT NULL`),
  
  // 并发创建索引
  index("content_idx")
    .on(table.content)
    .concurrently(),
  
  // 带参数的索引
  index("title_gin_idx")
    .on(table.title)
    .using(sql`gin`)
    .with({ fillfactor: "70" }),
]);
```

##### 3. 索引 vs 唯一约束选择原则

**使用 unique() 约束的场景**:
- 纯粹的数据完整性约束
- 不经常用于查询的唯一字段
- 简单的唯一性要求

**使用 uniqueIndex() 的场景**:
- 需要查询性能优化的唯一字段
- 经常用于 WHERE 条件的唯一字段
- 需要排序或范围查询的唯一字段

```typescript
export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  email: text("email"), // 经常用于登录查询
  socialSecurityNumber: text("ssn"), // 很少查询，只需要唯一性
}, table => [
  uniqueIndex("email_idx").on(table.email), // 需要查询性能
  unique().on(table.socialSecurityNumber), // 只需要唯一性
]);
```

##### 4. 常见模式和最佳实践

**多租户系统的唯一约束**:
```typescript
export const tenantResource = pgTable("tenant_resource", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: varchar({ length: 64 }).notNull(),
  code: varchar({ length: 64 }).notNull(),
  name: varchar({ length: 128 }).notNull(),
}, table => [
  // 租户内代码唯一
  unique().on(table.tenantId, table.code),
  // 为查询性能添加索引
  index("tenant_code_idx").on(table.tenantId, table.code),
]);
```

**层级结构的索引优化**:
```typescript
export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  parentId: uuid(),
  name: varchar({ length: 128 }).notNull(),
  path: text(), // 存储层级路径，如 "/root/child/grandchild"
}, table => [
  // 父子关系查询优化
  index("parent_id_idx").on(table.parentId),
  // 路径查询优化（使用 GIN 索引支持模式匹配）
  index("path_gin_idx").on(table.path).using(sql`gin`),
]);
```

##### 5. 约束命名规范

```typescript
// 推荐的命名规范
export const posts = pgTable("posts", {
  // ...columns
}, table => [
  // 格式：表名_列名_约束类型
  unique("posts_slug_unique").on(table.slug),
  index("posts_created_at_idx").on(table.createdAt),
  uniqueIndex("posts_user_title_unique_idx").on(table.userId, table.title),
]);
```

##### 6. 常见错误和解决方案

**约束定义语法错误**:
```typescript
// ❌ 错误：返回对象而不是数组
}, (table) => ({
  unique: unique().on(table.col1, table.col2)
})

// ✅ 正确：返回数组
}, (table) => [
  unique().on(table.col1, table.col2)
]
```

**类型错误处理**:
```typescript
// 处理可选搜索条件
const searchFields = or(
  ilike(table.name, `%${search}%`),
  table.description ? ilike(table.description, `%${search}%`) : undefined,
);

// 安全的条件组合
if (searchFields) {
  whereCondition = and(baseCondition, searchFields);
}
```

Example:
```typescript
import { z } from "@hono/zod-openapi";

export const selectUsersSchema = createSelectSchema(users, {
  id: schema => schema.describe("用户ID"),
  name: schema => schema.describe("用户名称"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
});

// JSON Field Example with proper interface
interface DictionaryItem {
  code: string;
  label: string;
  value: string;
  status: number;
}

export const sysDictionaries = pgTable("sys_dictionaries", {
  id: uuid().primaryKey().defaultRandom(),
  userName: varchar({ length: 64 }).notNull(), // auto-converts to user_name
  items: jsonb().$type<DictionaryItem[]>().default([]).notNull(),
  // ... other fields
});
```

### Authentication & Authorization

- **JWT**: Separate secrets for client and admin routes
- **Casbin**: Role-based access control for admin routes
- **Middleware**: Applied at route group level in `src/app.ts:32-45`

#### Context Value Extraction Standards

**CRITICAL**: Always use the correct pattern to extract context values from Hono context:

```typescript
// ✅ Correct - Single context value extraction
const domain = c.get("userDomain");

// ✅ Correct - Multiple context values extraction
const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

// ❌ Wrong - Manual extraction from JWT payload
const payload: JWTPayload = c.get("jwtPayload");
const userId = payload.uid as string;
```

**Rules**:
1. Use `c.get("contextKey")` for single context value extraction
2. Use `pickContext(c, ["key1", "key2"])` for multiple context values extraction
3. Import `pickContext` from appropriate utility module when needed
4. Context values are pre-processed by middleware and should be used directly
5. Never manually extract from JWT payload when context values are available

#### JWT User ID Extraction Standards (Legacy)

**NOTE**: This pattern is superseded by context extraction above. Only use when context values are not available:

```typescript
// ✅ Fallback - Extract from JWT payload only when context unavailable
const payload: JWTPayload = c.get("jwtPayload");
const userId = payload.uid as string;
```

### Application Structure

- **App Creation**: `src/lib/create-app.ts` configures base middlewares (security, CORS, compression, logging)
- **OpenAPI**: Configured via `src/lib/configure-open-api.ts` with automatic documentation
- **Entry Point**: `src/index.ts` starts the server using @hono/node-server

### Key Dependencies

- **Hono**: Web framework with OpenAPI support (@hono/zod-openapi)
- **Drizzle**: ORM with Zod integration (drizzle-zod)
- **Authentication**: @node-rs/argon2 for password hashing
- **Authorization**: Casbin for RBAC
- **Validation**: Zod with OpenAPI schema generation
- **Logging**: Pino with hono-pino integration

## File Structure Patterns

### Route Modules

Each route module follows this pattern:

```
routes/{tier}/{feature}/
├── {feature}.handlers.ts    # Business logic
├── {feature}.routes.ts      # Route definitions with OpenAPI schemas
└── {feature}.index.ts       # Barrel export
```

### Database Schema

```
src/db/schema/
├── {entity}.ts             # Drizzle table definitions
└── index.ts                # Barrel exports
```

## Development Notes

- Uses `pnpm` as package manager (enforced by preinstall script)
- TypeScript with ES modules (`"type": "module"`)
- Development uses `tsx watch` for hot reloading
- Production build uses `tsdown` for optimized bundling
- Testing with Vitest in silent mode during tests
- ESLint with @antfu/eslint-config

## Enum Definition Standards

When creating enums in the project, follow these conventions:

### 1. Use Const Assertion Pattern

```typescript
/** 描述枚举的用途 */
export const EnumName = {
  /** 描述选项1 */
  OPTION_1: "value1",

  /** 描述选项2 */
  OPTION_2: "value2",
} as const;

/** 枚举类型 */
export type EnumNameType = (typeof EnumName)[keyof typeof EnumName];
```

### 2. Database Enums

For database-related enums, use `pgEnum` from Drizzle:

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["ENABLED", "DISABLED", "BANNED"]);
```

### 3. Naming Conventions

- **Enum names**: Use PascalCase with descriptive names (e.g., `PermissionResource`, `PermissionAction`)
- **Enum values**: Use UPPER_SNAKE_CASE for constants
- **String values**: Use kebab-case for string values that represent identifiers
- **Type names**: Add `Type` suffix (e.g., `PermissionResourceType`)

### 4. Documentation

- Always include JSDoc comments for enums and their values
- Use Chinese descriptions for better understanding
- Include usage examples when necessary

### 5. File Organization

- Place enums in `src/lib/enums/` directory
- Use barrel exports from `src/lib/enums/index.ts`
- Keep related enums in the same file when appropriate

### 6. Magic Number Elimination

**CRITICAL**: Never use magic numbers in database queries. Always use enums when available:

```typescript
// ❌ Wrong - Magic numbers
.where(eq(sysScheduledJobs.status, 1)); // status = 1 表示启用

// ✅ Correct - Use enums
.where(eq(sysScheduledJobs.status, JobStatus.ENABLED));
```

**Rules**:
- ALWAYS define enums for status values, types, and other categorical data
- Use descriptive enum values instead of numeric constants
- Import and use the appropriate enum in all database queries and business logic
- When working with existing magic numbers, refactor them to use enums

## Route Architecture Standards

When creating new routes, ALWAYS follow the admin-users route structure for consistency:

### Route Definition Structure

1. **Import Order (REQUIRED)**:
   ```typescript
   import { createRoute } from "@hono/zod-openapi";
   import * as HttpStatusCodes from "stoker/http-status-codes";
   import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
   import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

   import { schema imports } from "@/db/schema";
   import { notFoundSchema } from "@/lib/enums";
   import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
   ```

2. **Tags Convention**: Use format `["/resource-name (中文描述)"]`

3. **Request Structure**:
   - List routes: Use simple query schema with optional search field
   - Create routes: Use `jsonContentRequired(insertSchema, "创建参数")`
   - Update routes: Use `jsonContentRequired(patchSchema, "更新参数")`
   - ID routes: ALWAYS use `IdUUIDParamsSchema` for params (never use `IdParamsSchema`)

4. **Response Structure**:
   - List routes: Use `z.array(selectSchema)` to return simple arrays
   - Create/Update routes: Use `selectSchema` with "创建成功"/"更新成功"
   - Error responses: Use `createErrorSchema(schemaType)` with proper schema validation
   - NotFound responses: Use `notFoundSchema` with descriptive message

5. **Error Schema Requirements**:
   - ALWAYS provide the appropriate schema to `createErrorSchema()`
   - Create routes: `createErrorSchema(insertSchema)`
   - Update routes: `createErrorSchema(patchSchema).or(createErrorSchema(IdUUIDParamsSchema))`
   - ID routes: `createErrorSchema(IdUUIDParamsSchema)`

6. **Error Handling Constants**:
   - Use standardized error response functions from `@/lib/enums`
   - For duplicate key errors: Use `getDuplicateKeyError(field, message)`
   - For validation errors: Use `getQueryValidationError(error)`
   - Always import error helpers: `import { getDuplicateKeyError } from "@/lib/enums"`

7. **Field Descriptions**:
   - Use `.describe()` directly for simple field descriptions
   - Do NOT use `.openapi()` unless complex OpenAPI configuration is needed

8. **Tags Convention**:
   - Define tags constant at the top of each route file: `const tags = ["/endpoint-name (中文描述)"];`
   - Use the constant in all route definitions: `tags,` (not `tags: tags`)
   - Format: endpoint name + space + parentheses with Chinese description
   - Examples: `["/dictionaries (字典管理)"]`, `["/sys-users (系统用户)"]`

This structure ensures type safety and consistency across all routes.

### Status Code Standards

**CRITICAL**: All HTTP status codes MUST follow these rules:

1. **Always Use Status Code Constants**:
   ```typescript
   // ✅ Correct
   return c.json(data, HttpStatusCodes.OK);
   return c.json(error, HttpStatusCodes.UNPROCESSABLE_ENTITY);

   // ❌ Wrong
   return c.json(data, 200);
   return c.json(error, 422 as any);
   ```

2. **Single Line Return Format**:
   ```typescript
   // ✅ Correct - Use single line format
   return c.json({ message: "参数不存在" }, HttpStatusCodes.NOT_FOUND);
   return c.json({ token: accessToken, user: userData }, HttpStatusCodes.OK);

   // ❌ Wrong - Avoid multi-line format unless ESLint requires it
   return c.json(
     { message: "参数不存在" },
     HttpStatusCodes.NOT_FOUND,
   );
   ```

3. **All Possible Status Codes MUST be Defined in Routes**:
   ```typescript
   export const someRoute = createRoute({
     // ... other config
     responses: {
       [HttpStatusCodes.OK]: jsonContent(schema, "成功"),
       [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "未找到"),
       [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
         createErrorSchema(requestSchema),
         "参数验证失败"
       ),
       // Include ALL status codes that handlers might return
     },
   });
   ```

4. **Standard Error Status Codes**:
   - `HttpStatusCodes.BAD_REQUEST` (400) - 客户端请求错误
   - `HttpStatusCodes.UNAUTHORIZED` (401) - 未授权
   - `HttpStatusCodes.FORBIDDEN` (403) - 权限不足
   - `HttpStatusCodes.NOT_FOUND` (404) - 资源不存在
   - `HttpStatusCodes.CONFLICT` (409) - 资源冲突（如重复键）
   - `HttpStatusCodes.UNPROCESSABLE_ENTITY` (422) - 参数验证失败
   - `HttpStatusCodes.INTERNAL_SERVER_ERROR` (500) - 服务器内部错误

5. **Error Response Pattern**:
   ```typescript
   // 参数验证错误
   catch (error: any) {
     return c.json({ message: error.message || "操作失败" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
   }

   // 资源不存在
   if (!resource) {
     return c.json({ message: "资源不存在" }, HttpStatusCodes.NOT_FOUND);
   }
   ```

### Error Handling Standards

**CRITICAL**: All error handling MUST follow these rules:

1. **Never Use console.log/error in Route Handlers**:
   ```typescript
   // ❌ Wrong - Don't use console logging in handlers
   catch (error) {
     console.error("操作失败:", error);
     return c.json({...}, 500);
   }

   // ✅ Correct - Return appropriate error response
   catch (error: any) {
     return c.json({ message: error.message || "操作失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
   }
   ```

2. **Error Responses MUST Use Correct Status Codes**:
   ```typescript
   // ❌ Wrong - Don't return 200 for errors
   catch (error) {
     return c.json({ data: [], error: error.message }, HttpStatusCodes.OK);
   }

   // ✅ Correct - Use appropriate error status codes
   catch (error: any) {
     return c.json({ message: error.message || "操作失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
   }
   ```

3. **All Possible Status Codes MUST be in Route Definitions**:
   - If handler can return 500, route MUST have `INTERNAL_SERVER_ERROR` in responses
   - If handler can return 404, route MUST have `NOT_FOUND` in responses
   - If handler can return 422, route MUST have `UNPROCESSABLE_ENTITY` in responses

4. **Error Response Schema Pattern**:
   ```typescript
   const errorResponseSchema = z.object({ message: z.string() });

   // In route definition:
   responses: {
     [HttpStatusCodes.OK]: jsonContent(dataSchema, "成功"),
     [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
       errorResponseSchema,
       "服务器内部错误"
     ),
   }
   ```

5. **Logging Guidelines**:
   - Use structured logging (Pino) in services, not console
   - Errors are automatically logged by middleware
   - Don't duplicate logging in handlers
   - Let the application's logging infrastructure handle error tracking

### Router Index File Structure

All route index files MUST follow this exact pattern:

```typescript
import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./feature.handlers";
import * as routes from "./feature.routes";

export const featureName = createRouter()
  .openapi(routes.routeName1, handlers.routeName1)
  .openapi(routes.routeName2, handlers.routeName2)
  // ... more routes

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type FeatureRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
```

Key requirements:
- Use **named export** for the router (e.g., `export const apiEndpoints`, `export const menus`)
- Include the `RouteTypes` and `FeatureRouteHandlerType` type definitions
- Import `AppRouteHandler` from `@/types/lib`
- Follow the exact naming pattern for type exports

## Domain/Tenant Management

The system includes domain/tenant management functionality at `/sys-domains` endpoint with the following features:

- **List Domains**: GET `/sys-domains` - Paginated list with search capability
- **Create Domain**: POST `/sys-domains` - Create new domain/tenant
- **Update Domain**: PATCH `/sys-domains/{id}` - Update existing domain
- **Delete Domain**: DELETE `/sys-domains/{id}` - Remove domain
- **Get Domain**: GET `/sys-domains/{id}` - Retrieve single domain details

Domain schema includes: `code` (unique identifier), `name`, `description`, `status` (ENABLED/DISABLED/BANNED), audit fields (`createdBy`, `updatedBy`, timestamps).

### Multi-Domain CRUD Operations

**CRITICAL**: All CRUD operations must consider domain isolation:

1. **Domain Field Requirement**:
   - All entities that need domain isolation MUST include a `domain` field in their schema
   - **Domain Field Type**: Use `varchar("domain").notNull()` for domain field, do NOT use foreign key references to maintain flexibility
   - Include domain field in all three schemas: `selectSchema`, `insertSchema`, `patchSchema`

2. **CRUD Operation Rules**:
   - **Create**: Always include domain validation and assignment
   - **Read**: Filter by domain context in all queries
   - **Update**: Ensure domain context is maintained and validated
   - **Delete**: Only allow deletion within the correct domain context

3. **Query Filtering**:

   ```typescript
   // ✅ Correct - Always filter by domain
   const results = await db.select()
     .from(table)
     .where(and(
       eq(table.domain, domainId),
       // other conditions
     ));

   // ❌ Wrong - Missing domain filter
   const results = await db.select().from(table);
   ```

4. **Domain Context in Handlers**:
   - Extract domain from JWT token or request context
   - Validate domain permissions before operations
   - Include domain in all database operations

5. **Schema Example**:

   ```typescript
   export const selectEntitySchema = createSelectSchema(entities, {
     id: schema => schema.describe("实体ID"),
     domain: schema => schema.describe("所属域ID"),
     name: schema => schema.describe("实体名称"),
   });
   ```

## Service Layer Architecture

All business logic should be organized as functional services in the `src/services/` directory:

### Service Organization Rules

1. **Functional Approach**: All services MUST be implemented as pure functions or async functions
2. **Single Responsibility**: Each service file handles one business domain (user, menu, auth, etc.)
3. **Export Pattern**: Use named exports for all service functions
4. **Domain Awareness**: All service functions MUST consider domain context when applicable

### Service Structure Standards

1. **File Naming**: Use kebab-case for service files (e.g., `user.ts`, `sys-global-params.ts`)
2. **Function Naming**: Use descriptive camelCase names with action prefixes:
   - `create*` - for creation operations
   - `get*` - for read operations
   - `update*` - for update operations
   - `delete*` - for deletion operations
   - `assign*` - for assignment operations
   - `clear*` - for cache/cleanup operations

3. **Parameter Interfaces**: Define clear interfaces for function parameters:

   ```typescript
   interface CreateUserParams {
     username: string;
     password: string;
     domain: string;
     // ... other fields
   }

   export async function createUser(params: CreateUserParams) {
     // implementation
   }
   ```

4. **Domain Context**: Always include domain parameter in functions that need isolation:

   ```typescript
   export async function getUserRoutes(userId: string, domain: string) {
     // Always filter by domain
   }
   ```

5. **Transaction Handling**: Use database transactions for complex operations:

   ```typescript
   export async function assignRolesToUser(userId: string, roleIds: string[], domain: string) {
     return db.transaction(async (tx) => {
       // Multiple related operations
     });
   }
   ```

6. **Cache Management**: Implement cache clearing patterns:

   ```typescript
   export async function clearUserMenuCache(userId: string, domain: string) {
     const cacheKey = getUserMenusKey(userId, domain);
     await redisClient.del(cacheKey);
   }
   ```

### Service Integration

- **Import in Handlers**: Services should be imported and called from route handlers
- **Error Handling**: Services should throw descriptive errors that handlers can catch and convert to appropriate HTTP responses
- **Type Safety**: Use TypeScript interfaces and return types for all service functions
- **Testing**: Services should be easily testable as pure functions

### Exception Handling Standards

**CRITICAL**: Do NOT use try-catch blindly in handlers. Always understand the error behavior first:

**重要提醒**: 一般情况下，如果不是确定 Drizzle 会报错，不需要去 try catch。大多数数据库操作（查询、更新、删除）不会抛出异常，只有插入操作在违反约束时才会抛出异常。

1. **Research Before Catching**: Before adding try-catch, investigate:
   - Does the function/library throw exceptions or return error values?
   - What specific exceptions can be thrown?
   - What are the different error scenarios?
   - Can errors be handled through return value checking instead?

2. **Drizzle ORM Exception Behavior**:
   - **Database queries**: Return empty arrays `[]` for no results, do NOT throw
   - **Single record queries**: Return `undefined` for no results, do NOT throw
   - **Insert operations**: Throw on constraint violations (unique, foreign key, etc.)
   - **Update/Delete operations**: Return affected row count, do NOT throw for no matches
   - **Connection errors**: Throw exceptions for network/connection issues

3. **When to Use Try-Catch**:
   ```typescript
   // ✅ Correct - Known exception scenarios
   try {
     const user = await createUser(userData); // Can throw on duplicate key
   } catch (error: any) {
     if (error.message?.includes("duplicate key")) {
       return c.json(getDuplicateKeyError("username", "用户名已存在"), HttpStatusCodes.CONFLICT);
     }
     throw error; // Re-throw unknown errors
   }

   // ✅ Correct - Check return values instead of try-catch
   const [user] = await db.select().from(sysUser).where(eq(sysUser.id, id));
   if (!user) {
     return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
   }
   ```

4. **When NOT to Use Try-Catch**:
   ```typescript
   // ❌ Wrong - Unnecessary try-catch for operations that don't throw
   try {
     const users = await db.select().from(sysUser); // Never throws, returns []
     return c.json(users, HttpStatusCodes.OK);
   } catch (error) {
     return c.json({ message: "查询失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
   }

   // ❌ Wrong - Catching without understanding what can be thrown
   try {
     const result = await someOperation();
   } catch (error) {
     // Generic catch without knowing what errors are possible
   }
   ```

5. **Error Research Process**:
   - Read the library documentation for error handling
   - Check the source code if documentation is unclear
   - Test error scenarios in development
   - Only catch specific, known exceptions
   - Let unknown exceptions bubble up to global error handler

### Examples

See existing services for reference:
- `src/services/user.ts` - User management operations
- `src/services/menu.ts` - Menu and routing operations
- `src/services/global-params.ts` - Configuration management

## Monitoring and Observability

### Built-in Metrics

- **Prometheus Metrics**: `/metrics` endpoint for application performance metrics
- **OpenAPI Documentation**: Auto-generated API documentation

### External Monitoring Stack (Recommended)

Use professional monitoring tools for comprehensive observability:

- **PgBouncer Exporter**: Collects connection pool metrics from PgBouncer
- **Prometheus**: Time-series database for metrics storage
- **Grafana**: Visualization dashboards and alerting

### Quick Setup

```bash
# Start monitoring services (recommended for database monitoring)
docker-compose --profile monitoring up -d

# Start complete application with monitoring
docker-compose --profile full up -d

# Access services:
# - Grafana: http://localhost:3000 (admin/admin123)
# - Prometheus: http://localhost:9090
# - PgBouncer Metrics: http://localhost:9127/metrics
```

**Architecture**: `PgBouncer → pgbouncer_exporter → Prometheus → Grafana`

## Environment

- `NODE_ENV` - Set to "production" for builds and start script
- `DATABASE_URL` - PostgreSQL connection string (through PgBouncer connection pool)
- `REDIS_URL` - Redis connection string
- `CLIENT_JWT_SECRET` - JWT secret for client authentication
- `ADMIN_JWT_SECRET` - JWT secret for admin authentication
- `PORT` - Server port
- `PGBOUNCER_ADMIN_URL` - (Optional) PgBouncer admin connection for monitoring

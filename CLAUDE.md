# CLAUDE.md

Always respond in Chinese-simplified

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Manager
- **pnpm** is required (enforced by preinstall hook)
- Use `pnpm install` for dependency installation

### Development & Build
- `pnpm dev` - Start development server with hot reload using tsx watch
- `pnpm build` - Production build using tsdown bundler
- `pnpm start` - Start production server (requires build first)

### Code Quality
- `pnpm typecheck` - Run TypeScript type checking (no emit)
- `pnpm lint` - Run ESLint with @antfu/eslint-config
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm test` - Run tests with Vitest (LOG_LEVEL=silent)

### Database Operations
- `pnpm generate` - Generate Drizzle migration files
- `pnpm push` - Push schema directly to development database
- `pnpm migrate` - Run migrations (production)
- `pnpm studio` - Open Drizzle Studio for database management
- `pnpm seed` - Run database seeding

## Architecture Overview

### Technology Stack
- **Framework**: Hono (high-performance web framework)
- **Runtime**: Node.js with @hono/node-server
- **Database**: PostgreSQL with Drizzle ORM (snake_case convention)
- **Caching**: Redis with ioredis client
- **Authentication**: JWT tokens (separate secrets for admin/client)
- **Authorization**: Casbin RBAC system
- **Validation**: Zod schemas with Chinese error messages
- **Documentation**: OpenAPI 3.1.0 with Scalar UI
- **Testing**: Vitest framework
- **Bundler**: tsdown for production builds

### Application Structure

#### Multi-tier Route Architecture
The application uses a 3-tier route system with separate middleware chains:

1. **Public Routes** (`/api/public/*`) - No authentication
2. **Client Routes** (`/api/client/*`) - JWT authentication only
3. **Admin Routes** (`/api/admin/*`) - JWT + RBAC authorization + operation logging

#### File Organization Pattern
```
src/
├── app.ts                    # Main application entry with route grouping
├── index.ts                  # Server startup with Zod Chinese localization
├── db/
│   ├── schema/              # Drizzle schema definitions (snake_case)
│   │   ├── auth/            # Authentication tables
│   │   ├── client/          # Client-specific tables
│   │   └── system/          # System management tables
│   └── index.ts             # Database connection
├── routes/
│   ├── public/              # Public API routes
│   ├── client/              # Client API routes
│   └── admin/               # Admin API routes
├── services/                # Business logic layer (functional services)
├── middlewares/             # Custom middleware (auth, logging, etc.)
├── lib/
│   ├── create-app.ts        # App factory with middleware setup
│   ├── openapi/             # OpenAPI configuration
│   ├── refine-query/        # Declarative pagination system
│   ├── casbin/              # RBAC implementation
│   └── stoker/              # Enhanced Hono utilities
└── types/                   # TypeScript type definitions
```

#### Route Module Pattern
Each feature follows this structure:
```
routes/{tier}/{feature}/
├── {feature}.handlers.ts    # Business logic handlers
├── {feature}.routes.ts      # OpenAPI route definitions with Zod schemas
└── {feature}.index.ts       # Module exports
```

### Key Architectural Patterns

#### OpenAPI-First Development
- All routes defined with Zod schemas for validation
- Automatic type inference from schemas to TypeScript
- Self-documenting APIs with Scalar UI
- Multi-app documentation (admin, client, public)

#### Functional Service Layer
- Services are pure functions with named exports
- Standard prefixes: `create*`, `get*`, `update*`, `delete*`
- Only extract services when logic is shared across routes
- Simple CRUD operations stay in handlers

#### Database Integration
- Drizzle ORM with PostgreSQL dialect
- Snake case database convention, camelCase TypeScript
- Transaction support for complex operations
- Schema-first approach with type safety

#### Authentication & Authorization Flow
1. **JWT Middleware**: Validates tokens (separate secrets for admin/client)
2. **Casbin Middleware**: Enforces RBAC permissions (admin only)
3. **Operation Logging**: Tracks admin actions for audit

#### Error Handling & Validation
- Centralized error handling with Stoker utilities
- Zod validation with Chinese error messages
- Structured error responses following OpenAPI specs
- Request logging with Pino logger

## Coding Standards

### API Response & Error Handling

- **Response Format**: ALWAYS use `Resp.ok()` or `Resp.fail()` from `src/utils/zod/response.ts` to wrap response data in handlers
  ```typescript
  // Correct - wrap data with Resp.ok()
  return c.json(Resp.ok(data), HttpStatusCodes.OK);

  // Correct - wrap error message with Resp.fail()
  return c.json(Resp.fail("错误信息"), HttpStatusCodes.BAD_REQUEST);

  // Incorrect - returning data directly without wrapper
  return c.json(data, HttpStatusCodes.OK);
  ```
- **OpenAPI Success Responses**: Wrap with `RefineResultSchema` (equivalent to ok data wrapper)
- **OpenAPI Error Responses**: Use `jsonContent(respErr, "错误描述")` with proper status code, not standalone `respErr`
  ```typescript
  [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "参数错误")
  ```
- **Status Codes**: Always use `HttpStatusCodes` constants instead of magic numbers
- **Error Handling**: Don't blindly use try-catch. Research error behavior of Drizzle, dependencies, and utility functions before catching exceptions

### Code Quality & Imports

- **Console Output**: Never use `console.log`, `console.warn`, or `console.error` statements in production code - always use structured logger
- **Logging**:
  - Use structured logger from `@/lib/logger` for all logging: `logger.info()`, `logger.warn()`, `logger.error()`
  - Use Chinese prefixes with brackets: `[模块名]: 描述信息`
  - Examples:
    ```typescript
    logger.info("[邮件]: 开始处理任务 welcome, ID: abc123");
    logger.error("[系统]: 初始化失败 - 数据库连接超时");
    logger.warn("[文件]: 未知的任务类型 compress, ID: def456");
    ```
  - Prefix conventions:
    - `[邮件]` - Email-related operations
    - `[文件]` - File-related operations
    - `[系统]` - System operations
    - `[用户]` - User operations
    - `[工作者]` - Worker management
    - `[任务系统]` - Job system operations
    - `[调度器]` - Scheduler operations
    - `[定时任务]` - Cron job operations
    - `[系统同步]` - System sync operations
  - Never use emojis or English prefixes in production logs
  - For progress logs, only log at meaningful intervals (e.g., every 25%)
  - **Pino Log Format**: When logging with additional data, place the data object as the first parameter and the message as the second parameter:
    ```typescript
    // Correct - data object first, message second
    logger.info({ userId: "123", action: "login" }, "[用户]: 登录成功");
    logger.info(taskMapping, "[系统同步]: BullMQ任务注册完成");

    // Incorrect - message first, data second (will not display data properly)
    logger.info("[用户]: 登录成功", { userId: "123", action: "login" });
    ```
- **Dynamic Imports**: Always use `await import()` for dynamic imports, never `require()`
- **Unused Return Values**: Prefix with `void` to explicitly ignore unused function return values

### Date & Time Handling

- **Date Formatting**: Always use `formatDate()` from `@/utils/tools/formatter` instead of `new Date().toISOString()`
- **Date Calculations**: Always use `date-fns` library for date calculations and operations
- **Database Timestamps**: Use `timestamp({ mode: "string" })` instead of `timestamp({ mode: "date" })` for consistency with formatDate output

### Database Schema Standards

- **Schema Location**: Located in `src/db/schema/` with barrel exports
- **Database Import**: Always use default import: `import db from "@/db"` (not `import { db } from "@/db"`)
- **Schema Modes**: Create `selectXxxSchema`, `insertXxxSchema`, `patchXxxSchema` for each table
- **Field Descriptions**: Only use `.meta({ description: "中文描述" })` for drizzle-zod schemas (not raw Drizzle tables)
- **Modern Drizzle Syntax**: Use `varchar({ length: 128 })` instead of `varchar("handler_name", { length: 128 })`
- **Field Naming**: Use camelCase in TypeScript schema keys. Drizzle auto-converts to snake_case in database via `casing: "snake_case"` config
  ```typescript
  // TypeScript schema (camelCase key)
  nickName: varchar({ length: 64 })

  // Database column (auto-converted to snake_case)
  // → nick_name VARCHAR(64)

  // Don't manually specify column names, let Drizzle handle it
  // ❌ Bad: varchar("nick_name", { length: 64 })
  // ✅ Good: varchar({ length: 64 })
  ```
- **Default Columns**: Extend `...defaultColumns` from `@/db/common/default-columns` instead of manually defining id, createdAt, updatedAt, createdBy, updatedBy
- **VARCHAR Length**: Always specify length for varchar fields: `varchar({ length: 128 })`
- **JSON Fields**: Use `jsonb().$type<Interface>().default([])` with appropriate TypeScript interfaces
- **Relations**: Define at end of same file, use forward imports to avoid circular dependencies
- **Enum Fields**: Use `pgEnum()` for enum types, call without parameters in schema (Drizzle auto-maps variable name to column)
  ```typescript
  // Define in src/db/schema/_shard/enums.ts using Object.values()
  export const statusEnum = pgEnum("status", Object.values(Status));
  // Results in: pgEnum("status", ["ENABLED", "DISABLED"])

  // Use in table schema - call without parameters
  status: statusEnum().default(Status.ENABLED).notNull()
  ```
- **Constraints**: Return arrays `table => [unique().on(table.col)]` instead of objects (new Drizzle syntax)
- **Indexes**: Use `index("name_idx").on(table.col)` for performance, `uniqueIndex()` for uniqueness+performance. Only add necessary indexes after careful consideration
- **Null Handling**: `undefined` values are automatically converted to `null` when stored in database

#### Zod Schema Inheritance & drizzle-zod Best Practices

- **Zod v4 Syntax**: Use `z.uuid()` instead of `z.string().uuid()` for UUID validation
- **drizzle-zod Field Descriptions**: Use callback form in `createSelectSchema(table, { field: schema => schema.meta({ description: "描述" }) })` to add descriptions without overriding original schema
- **Schema Inheritance Chain**: Use proper inheritance to avoid duplication:
  1. Base schema with descriptions: `createSelectSchema(table, { field: schema => schema.meta(...) })`
  2. Insert schema: `createInsertSchema(table).omit({...})`
  3. Derived schemas: `insertSchema.partial()`, `selectSchema.pick({...})`
- **Field Descriptions**: Define `.meta({ description: "中文描述" })` only once in the `createSelectSchema` callback, then inherit from it
- **extend vs callback**:
  - Use callback in `createSelectSchema` for field descriptions (preserves original schema + adds meta)
  - Use `.extend()` when you need to:
    - Completely override field properties (e.g., change required to optional: `field: z.string().optional()`)
    - Change field types or validation rules (e.g., add coercion, different enums)
    - Add completely new fields not in the original table
- **When to use extend for field override**:
  - Query schemas: Convert required fields to optional for filtering
  - Form schemas: Add client-side validation rules
  - API schemas: Modify field constraints for specific endpoints
- **Schema Naming Pattern**:
  - Base: `selectXxxSchema` (with descriptions via callback), `insertXxxSchema`
  - Derived: `patchXxxSchema = insertXxxSchema.partial()`
  - Query: `xxxQuerySchema = selectXxxSchema.pick({...}).extend({...})`

### Type Safety & Redis

- **Redis Type Safety**: Always specify return types for Redis operations instead of using `any`
- **Constant Assertions**: Use pattern `export const EnumName = { OPTION_1: "value1" } as const`
- **Enum Values**: Always use string values for enums (not numbers) to match PostgreSQL enum types

### Naming Conventions

- **Classes/Types**: PascalCase names
- **Enums/Constants**: UPPER_SNAKE_CASE values
- **Files**: kebab-case strings
- **Magic Values**: Always use enums instead of magic values in queries: `eq(table.status, Status.ENABLED)` instead of `eq(table.status, "ENABLED")`

### Route & Service Patterns

- **Parameters**: Use `IdUUIDParamsSchema` for UUID parameters (not `IdParamsSchema`)
- **Router Exports**: Named exports + RouteTypes + FeatureRouteHandlerType
- **Service Creation**: Only create services when logic is reused 2+ times or will likely be reused, otherwise keep in handlers
- **Function Prefixes**: `create*`, `get*`, `update*`, `delete*`, `assign*`, `clear*`
- **Transactions**: Use `db.transaction()` for complex multi-step operations

#### Route Module Export Pattern
Follow this exact pattern for route module exports in `{feature}.index.ts`:
```typescript
import type { AppRouteHandler } from "@/types/lib";
import { createRouter } from "@/lib/create-app";
import * as handlers from "./{feature}.handlers";
import * as routes from "./{feature}.routes";

export const featureName = createRouter()
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  // ... other routes

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type FeatureNameRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
```

#### Handler Type Definition Pattern
Handlers must use strict typing from the index file. **Never use `any` or `Context` as handler parameter types**:
```typescript
import type { FeatureNameRouteHandlerType } from "./{feature}.index";

export const list: FeatureNameRouteHandlerType<"list"> = async (c) => {
  // handler implementation
};
```

#### Zod Schema Type Constraints
All Zod schemas must use explicit type constraints to ensure type safety:
```typescript
import type { DataInterface } from "@/path/to/types";

const DataSchema: z.ZodType<DataInterface> = z.object({
  field: z.string().optional(), // Use .optional() for optional fields, not .nullable()
  // ... other fields
}).openapi({ description: "描述" });
```

**Handler Type Rules:**
- ALWAYS use the generated route handler type: `FeatureRouteHandlerType<"routeName">`
- NEVER use `any`, `Context`, or other generic types for handler parameters
- Ensure Zod schemas match the TypeScript interfaces exactly using `z.ZodType<T>`
- Use `.optional()` for optional fields in schemas, not `.nullable()`
- Import and use actual type interfaces to constrain Zod schemas

#### OpenAPI Tag & Path Organization
For consistent API documentation grouping, follow this pattern in route files:

```typescript
// Route configuration constants
const routePrefix = "/feature-name";  // Base path for all routes in this module
const tags = [`${routePrefix}（功能描述）`];  // Tag format: path + Chinese description

// Apply to routes
export const list = createRoute({
  tags,
  path: routePrefix,  // GET /feature-name
  // ... other config
});

export const get = createRoute({
  tags,
  path: `${routePrefix}/{id}`,  // GET /feature-name/{id}
  // ... other config
});
```

**Tag Organization Rules:**
- Use `routePrefix` constant to define base path (e.g., `/system/users`, `/queues`, `/jobs`)
- Format tags as: `[route_prefix]（Chinese_description）` (e.g., `/queues（队列管理）`)
- Group related operations under same tag by sharing the `tags` array
- For complex modules with multiple logical groups, create separate prefix/tag pairs:
  ```typescript
  const queueRoutePrefix = "/queues";
  const jobRoutePrefix = "/jobs";
  const queueTags = [`${queueRoutePrefix}（队列管理）`];
  const jobTags = [`${jobRoutePrefix}（任务管理）`];
  ```
- Always use template literals with prefix constants for paths: `path: \`\${routePrefix}/{id}\``
- This ensures consistent API documentation grouping in Scalar UI

## Development Notes

- Application uses strict TypeScript configuration
- Git hooks enforce lint and typecheck on commit
- Rate limiting with Redis store (100 requests/15min)
- Sentry integration for error tracking
- WebSocket support available via @hono/node-ws
- Object storage integration with AWS S3 SDK
- Task queue system with BullMQ
- **Manual Testing**: Developer should manually run and test the project for debugging

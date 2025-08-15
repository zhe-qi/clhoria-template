# CLAUDE.md

Always respond in Chinese-simplified

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

### Route Comment Standards
- **Route Comments**: ALWAYS add `/** 中文描述 */` above route definitions, no JSDoc tags
- **Comment Format**: Use single line `/** 描述 */` for simple routes, multi-line for complex ones
- **No JSDoc Tags**: Focus on business purpose, avoid @param, @returns, etc.

### Core Standards
- **Status Codes**: Always use `HttpStatusCodes` constants, never magic numbers
- **Return Format**: Single line `return c.json(data, HttpStatusCodes.OK)` format
- **Error Handling**: No console.log in handlers, return appropriate HTTP status codes
- **Import Order**: Framework imports first, then schemas, then utils
- **Dynamic Imports**: ALWAYS use `await import()` for dynamic imports, NEVER use `require()`
- **Date Handling**: ALWAYS use `formatDate()` from `@/utils/tools/formatter` instead of `new Date().toISOString()` for consistent date formatting
- **Date Calculations**: ALWAYS use `date-fns` for date calculations and operations:
  - Use `subDays(date, days)` instead of `date.setDate(date.getDate() - days)`
  - Use `addDays(date, days)` for adding days
  - Use `differenceInMilliseconds(endDate, startDate)` instead of `endDate - startDate`
  - Use `format(date, "yyyy-MM-dd")` instead of `date.toISOString().split("T")[0]`
  - For timezone operations, use `date-fns-tz`
- **Database Timestamps**: Use `timestamp({ mode: "string" })` instead of `timestamp({ mode: "date" })` for consistency with formatDate output
- **Redis Type Safety**: ALWAYS specify return types for Redis operations instead of using `any`
- **Unused Return Values**: When function has return value but not used, prefix with `void` to explicitly ignore

### Redis Type Safety Standards
**CRITICAL**: Always specify explicit types for Redis cached data instead of using `any`:

```typescript
// ✅ Correct - Explicit type annotation
export async function getCachedParam(key: string): Promise<SelectGlobalParamsData | null | undefined> {
  try {
    const cached = await redisClient.get(getGlobalParamKey(key));
    if (!cached) {
      return null;
    }
    const parsed = JSON.parse(cached);
    return parsed === CacheConfig.NULL_CACHE_VALUE ? undefined : parsed as SelectGlobalParamsData;
  }
  catch (error) {
    logger.warn({ error, key }, "全局参数缓存获取失败");
    return null;
  }
}

// ❌ Wrong - Using any type
const parsed = JSON.parse(cached); // Returns any
return parsed; // Returns any
```

### Function Return Value Standards
**CRITICAL**: When calling functions with return values that are not used, explicitly void them:

```typescript
// ✅ Correct - Explicitly void unused return values (sync functions)
void updateUserPreferences(userId, preferences);
void logActivity("user_action");

// ✅ Correct - Explicitly void unused return values (async functions)
void await clearUserPermissionCache(userId, domain);
void await sendNotification(userId, message);
void await updateUserLastLogin(userId);

// ❌ Wrong - Ignoring return values without void
clearUserPermissionCache(userId, domain); // Missing void await
updateUserLastLogin(userId); // Missing void (or void await if async)
sendNotification(userId, message); // Missing void await
```

**Rules**:
1. Use `void functionCall()` for sync functions when return value is intentionally ignored
2. Use `void await functionCall()` for async functions when return value is intentionally ignored
3. **NEVER remove `await` from async functions** - always keep the await for proper error handling
4. This makes intent explicit and satisfies ESLint rules
5. Applies to all functions with return values that are not being used

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

1. **Three Schema Pattern**: Create `selectXxxSchema`, `insertXxxSchema`, `patchXxxSchema` for each table
2. **Field Descriptions**: Use `.meta({ description: "中文描述" })` for drizzle-zod schemas ONLY (NOT on raw Drizzle tables)
3. **Modern Drizzle Syntax**: Use modern syntax without column name aliases: `varchar({ length: 128 })` instead of `varchar("handler_name", { length: 128 })`
4. **Default Columns**: Use `...defaultColumns` spread from `@/db/common/default-columns` instead of manually defining id, createdAt, updatedAt, createdBy, updatedBy
5. **VARCHAR Length**: Always specify length for varchar fields: `varchar({ length: 128 })`
6. **JSON Fields**: Use `jsonb().$type<Interface>().default([])` with proper TypeScript interfaces
7. **Relations**: Define in same file at the end, use forward imports to avoid circular dependencies
8. **Status Fields**: Use `integer().default(1)` (1=enabled, 0=disabled)
9. **Constraints**: Return arrays `table => [unique().on(table.col)]`, NOT objects
10. **Indexes**: Use `index("name_idx").on(table.col)` for performance, `uniqueIndex()` for unique+performance

**Database Import**: ALWAYS `import db from "@/db"` (default import)

#### Constraints and Indexes (Drizzle v0.31.0+)

**Unique Constraints**:
```typescript
// Single column
email: text("email").unique()

// Composite (return array)
}, table => [
  unique().on(table.domain, table.code)
]
```

**Indexes**:
```typescript
}, table => [
  index("name_idx").on(table.name),
  uniqueIndex("email_idx").on(table.email), // For performance
  index("created_idx").on(table.createdAt.desc())
]
```

**Use Cases**:
- `unique()`: Data integrity only
- `uniqueIndex()`: Unique + query performance
- `index()`: Query performance

#### Index Usage Guidelines

**CRITICAL RULE**: Don't overuse indexes unless necessary. Only add indexes in these cases:
1. **High-frequency query tables**: Tables with genuinely high query frequency
2. **High-frequency query fields**: Fields frequently used in queries (WHERE/ORDER BY)
3. **No Redis caching**: Query results that cannot or should not use Redis caching
4. **Performance bottlenecks**: Actual query performance issues exist

**Default case**: Most tables don't need additional indexes. Drizzle's unique constraints and primary keys are sufficient. Other index needs should be decided by developers after actual performance testing.

### Authentication & Authorization

- **JWT**: Separate secrets for client (`CLIENT_JWT_SECRET`) and admin (`ADMIN_JWT_SECRET`) routes
- **Casbin**: Role-based access control for admin routes
- **Middleware**: Applied at route group level in `src/app.ts:32-45`

#### Context Value Extraction Standards
**CRITICAL**: Always use correct pattern for context values:

```typescript
// ✅ Correct - Single context value
const domain = c.get("userDomain");

// ✅ Correct - Multiple context values
const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

// ❌ Wrong - Manual JWT extraction when context available
const payload: JWTPayload = c.get("jwtPayload");
const userId = payload.uid as string;
```

**Rules**:
1. Use `c.get("contextKey")` for single values
2. Use `pickContext(c, ["key1", "key2"])` for multiple values
3. Context values are pre-processed by middleware
4. Only extract from JWT payload when context unavailable

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

1. **Const Assertion Pattern**: `export const EnumName = { OPTION_1: "value1" } as const;`
2. **Database Enums**: Use `pgEnum("status", ["ENABLED", "DISABLED", "BANNED"])`
3. **Naming**: PascalCase names, UPPER_SNAKE_CASE values, kebab-case strings
4. **File Organization**: Place in `src/lib/enums/` with barrel exports
5. **Magic Number Elimination**: ALWAYS use enums instead of magic numbers in queries
6. **Enum Usage in Queries**: Use `eq(table.status, Status.ENABLED)` instead of `eq(table.status, 1)`

## Route Architecture Standards

### Route Definition Structure
1. **Import Order**: Framework imports → schemas → utils
2. **Tags Convention**: Use `["/resource (中文描述)"]` format, define as constant
3. **Request Bodies**: `jsonContentRequired(insertSchema, "描述")`
4. **Params**: Use `IdUUIDParamsSchema` for UUID params (NOT `IdParamsSchema`)
5. **Responses**: Include ALL possible status codes from handlers
6. **Error Schemas**: `createErrorSchema(requestSchema)` for validation errors
7. **Router Export**: Named export + `RouteTypes` + `FeatureRouteHandlerType`

### Status Code Standards
**CRITICAL**: All status codes MUST use constants and single-line format:
```typescript
// ✅ Correct
return c.json(data, HttpStatusCodes.OK);
return c.json({ message: "资源不存在" }, HttpStatusCodes.NOT_FOUND);

// ❌ Wrong
return c.json(data, 200);
```

### Error Handling Standards
1. **Never Use console.log in Handlers**: Return appropriate HTTP responses instead
2. **All Status Codes in Routes**: If handler returns 500, route MUST define it
3. **Error Response Pattern**:
   - Validation: `HttpStatusCodes.UNPROCESSABLE_ENTITY`
   - Not Found: `HttpStatusCodes.NOT_FOUND`
   - Conflicts: `HttpStatusCodes.CONFLICT`

### Router Index Structure
```typescript
import type { AppRouteHandler } from "@/types/lib";
import { createRouter } from "@/lib/create-app";
import * as handlers from "./feature.handlers";
import * as routes from "./feature.routes";

export const featureName = createRouter()
  .meta(routes.routeName, handlers.routeName);

type RouteTypes = { [K in keyof typeof routes]: typeof routes[K]; };
export type FeatureRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
```

## Domain/Tenant Management

**Endpoints**: `/sys-domains` (GET/POST/PATCH/DELETE) for domain CRUD operations

**Multi-Domain Rules**:
1. **Domain Field**: Use `varchar("domain").notNull()` in schemas (not foreign keys)
2. **Query Filtering**: ALWAYS filter by domain: `.where(and(eq(table.domain, domainId), ...))`
3. **Context Extraction**: Get domain from `c.get("userDomain")` or JWT context
4. **Schema Pattern**: Include domain in all three schemas (select, insert, patch)

## Service Layer Architecture

### Service Organization Rules
1. **Service Creation**: Only create when logic is reused 2+ times, otherwise keep in handler
2. **Functional Approach**: Pure/async functions with named exports, kebab-case filenames
3. **Domain Context**: Always include domain parameter for multi-tenant operations
4. **Function Prefixes**: `create*`, `get*`, `update*`, `delete*`, `assign*`, `clear*`
5. **Transactions**: Use `db.transaction()` for complex multi-step operations

### Exception Handling Standards
**CRITICAL**: Do NOT use try-catch blindly. Research error behavior first:

**Drizzle Exception Behavior**:
- Database queries: Return `[]` or `undefined`, do NOT throw
- Insert operations: Throw on constraint violations (unique, foreign key)
- Update/Delete: Return affected count, do NOT throw for no matches
- Connection errors: Throw for network issues

**When to Use Try-Catch**:
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

// ✅ Correct - Check return values instead
const [user] = await db.select().from(sysUser).where(eq(sysUser.id, id));
if (!user) {
  return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
}
```

**When NOT to Use Try-Catch**:
```typescript
// ❌ Wrong - Unnecessary for operations that don't throw
try {
  const users = await db.select().from(sysUser); // Never throws, returns []
} catch (error) {
  // This will never execute
}
```

## Environment

- `NODE_ENV` - Set to "production" for builds and start script
- `DATABASE_URL` - PostgreSQL connection string (through PgBouncer connection pool)
- `REDIS_URL` - Redis connection string
- `CLIENT_JWT_SECRET` - JWT secret for client authentication
- `ADMIN_JWT_SECRET` - JWT secret for admin authentication
- `PORT` - Server port

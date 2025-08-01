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

- **NO EMOJIS**: Never use emojis in console output or code comments
- **Route Comments**: ALWAYS add `/** 中文描述 */` above route definitions, no JSDoc tags
- **Status Codes**: Always use `HttpStatusCodes` constants, never magic numbers
- **Return Format**: Single line `return c.json(data, HttpStatusCodes.OK)` format
- **Error Handling**: No console.log in handlers, return appropriate HTTP status codes
- **Import Order**: Framework imports first, then schemas, then utils

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
2. **Field Descriptions**: Use `.describe("中文描述")` for all schema fields
3. **Column Naming**: Use auto snake_case conversion: `handlerName: varchar({ length: 128 })`
4. **JSON Fields**: Use `jsonb().$type<Interface>().default([])` with proper TypeScript interfaces
5. **Relations**: Define in same file at the end, use forward imports to avoid circular dependencies
6. **Status Fields**: Use `integer().default(1)` (1=enabled, 0=disabled)
7. **Constraints**: Return arrays `table => [unique().on(table.col)]`, NOT objects
8. **Indexes**: Use `index("name_idx").on(table.col)` for performance, `uniqueIndex()` for unique+performance

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

**CRITICAL RULE**: 非必要不要滥用索引，只在以下情况才添加索引：
1. **高频查询表**: 表的查询频率确实很高
2. **高频查询字段**: 查询中频繁使用的字段（WHERE/ORDER BY）
3. **无Redis缓存**: 该查询结果没有必要或无法使用Redis缓存
4. **性能瓶颈**: 确实存在查询性能问题

**默认情况**: 大多数表不需要额外索引，Drizzle的unique约束和主键已足够。其他索引需求由开发者根据实际性能测试后决定添加。

### Authentication & Authorization

- **JWT**: Separate secrets for client (`CLIENT_JWT_SECRET`) and admin (`ADMIN_JWT_SECRET`) routes
- **Casbin**: Role-based access control for admin routes
- **Context Extraction**: Use `c.get("userDomain")` for single parameter, or `pickContext(c, ["userDomain", "userId"])` for multiple parameters
- **Single Parameter Rule**: Use `const domain = c.get("userDomain")` instead of `const [domain] = pickContext(c, ["userDomain"])`
- **Middleware**: Applied at route group level in `src/app.ts:32-45`

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

### Route Structure Checklist

1. **Import Order**: Framework imports → schemas → utils
2. **Tags**: Use `["/resource (中文描述)"]` format
3. **Request Bodies**: `jsonContentRequired(insertSchema, "描述")`
4. **Params**: Use `IdUUIDParamsSchema` for UUID params
5. **Responses**: Include ALL possible status codes from handlers
6. **Error Schemas**: `createErrorSchema(requestSchema)` for validation errors
7. **Router Export**: Named export + `RouteTypes` + `FeatureRouteHandlerType`

### Standard HTTP Status Codes
- 400 BAD_REQUEST, 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND, 409 CONFLICT, 422 UNPROCESSABLE_ENTITY
- 500 INTERNAL_SERVER_ERROR

### Error Patterns
```typescript
// Validation error
catch (error: any) {
  return c.json({ message: error.message || "操作失败" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
}

// Resource not found
if (!resource) {
  return c.json({ message: "资源不存在" }, HttpStatusCodes.NOT_FOUND);
}
```

## Domain/Tenant Management

**Endpoints**: `/sys-domains` (GET/POST/PATCH/DELETE) for domain CRUD operations

**Multi-Domain Rules**:
1. **Domain Field**: Use `varchar("domain").notNull()` in schemas (not foreign keys)
2. **Query Filtering**: ALWAYS filter by domain: `.where(and(eq(table.domain, domainId), ...))`
3. **Context Extraction**: Get domain from `c.get("userDomain")` or JWT context
4. **Schema Pattern**: Include domain in all three schemas (select, insert, patch)

## Service Layer Architecture

**Core Rules**:
1. **Service Creation**: Only create when logic is reused 2+ times, otherwise keep in handler
2. **Structure**: Pure/async functions with named exports, kebab-case filenames
3. **Domain Context**: Always include domain parameter for multi-tenant operations
4. **Function Prefixes**: `create*`, `get*`, `update*`, `delete*`, `assign*`, `clear*`
5. **Transactions**: Use `db.transaction()` for complex multi-step operations

**Exception Handling**:
- Research error behavior before adding try-catch
- Drizzle queries return `[]` or `undefined`, don't throw (except inserts on constraint violations)
- Only catch known exception scenarios, let unknown errors bubble up

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

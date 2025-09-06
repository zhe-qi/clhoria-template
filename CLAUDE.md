# CLAUDE.md

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

- **Response Format**: Use `Resp.fail()` or `Resp.ok()` from `src/utils/zod/response.ts`
- **OpenAPI Success Responses**: Wrap with `RefineResultSchema` (equivalent to ok data wrapper)
- **OpenAPI Error Responses**: Use `jsonContent(respErr, "错误描述")` with proper status code, not standalone `respErr`
  ```typescript
  [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "参数错误")
  ```
- **Status Codes**: Always use `HttpStatusCodes` constants instead of magic numbers
- **Return Format**: Single-line format: `return c.json(data, HttpStatusCodes.OK)`
- **Error Handling**: Don't blindly use try-catch. Research error behavior of Drizzle, dependencies, and utility functions before catching exceptions

### Code Quality & Imports

- **Console Output**: Never use emojis in `console.log`, `console.warn`, or `console.error` statements - keep all output plain text
- **Logging**: Use the structured logger from `@/lib/logger` instead of `console` statements (except for debugging). Logger methods: `logger.info()`, `logger.warn()`, `logger.error()` with proper pino format
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
- **Default Columns**: Extend `...defaultColumns` from `@/db/common/default-columns` instead of manually defining id, createdAt, updatedAt, createdBy, updatedBy
- **VARCHAR Length**: Always specify length for varchar fields: `varchar({ length: 128 })`
- **JSON Fields**: Use `jsonb().$type<Interface>().default([])` with appropriate TypeScript interfaces
- **Relations**: Define at end of same file, use forward imports to avoid circular dependencies
- **Status Fields**: Use `integer().default(1)` (1=enabled, 0=disabled)
- **Constraints**: Return arrays `table => [unique().on(table.col)]` instead of objects (new Drizzle syntax)
- **Indexes**: Use `index("name_idx").on(table.col)` for performance, `uniqueIndex()` for uniqueness+performance. Only add necessary indexes after careful consideration
- **Null Handling**: `undefined` values are automatically converted to `null` when stored in database

### Type Safety & Redis

- **Redis Type Safety**: Always specify return types for Redis operations instead of using `any`
- **Constant Assertions**: Use pattern `export const EnumName = { OPTION_1: "value1" } as const`
- **Database Enums**: Use `pgEnum("status", ["ENABLED", "DISABLED", "BANNED"])`

### Naming Conventions

- **Classes/Types**: PascalCase names
- **Enums/Constants**: UPPER_SNAKE_CASE values
- **Files**: kebab-case strings
- **Magic Numbers**: Always use enums instead of magic numbers in queries: `eq(table.status, Status.ENABLED)` instead of `eq(table.status, 1)`

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

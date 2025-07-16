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

## Database Commands

- `pnpm generate` - Generate Drizzle migrations from schema changes
- `pnpm push` - Push schema changes directly to database
- `pnpm studio` - Open Drizzle Studio for database management
- `pnpm generate:model` - Generate model configurations (custom script)

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

#### Schema Definition Rules

When creating Drizzle schemas, follow these rules:

1. **Table Descriptions**: Always add descriptions to schema fields using `.describe()`
2. **Schema Exports**: Create three schemas for each table:
   - `selectXxxSchema` - for reading data (with field descriptions)
   - `insertXxxSchema` - for creating data (omit id, createdAt, updatedAt)
   - `patchXxxSchema` - for updating data (partial of insertXxxSchema)
3. **Field Descriptions**: Use Chinese descriptions that explain the field purpose and format
4. **Status Fields**: Use `integer().default(1)` for enable/disable flags (1=enabled, 0=disabled)

Example:
```typescript
export const selectUsersSchema = createSelectSchema(users, {
  id: schema => schema.describe("用户ID"),
  name: schema => schema.describe("用户名称"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
});
```

### Authentication & Authorization

- **JWT**: Separate secrets for client and admin routes
- **Casbin**: Role-based access control for admin routes
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
   import { notFoundSchema } from "@/lib/constants";
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
   - Use standardized error response functions from `@/lib/constants`
   - For duplicate key errors: Use `getDuplicateKeyError(field, message)`
   - For validation errors: Use `getQueryValidationError(error)`
   - Always import error helpers: `import { getDuplicateKeyError } from "@/lib/constants"`

7. **Field Descriptions**:
   - Use `.describe()` directly for simple field descriptions
   - Do NOT use `.openapi()` unless complex OpenAPI configuration is needed

This structure ensures type safety and consistency across all routes.

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

## Environment

- `NODE_ENV` - Set to "production" for builds and start script
- `DATABASE_URL` - PostgreSQL connection string
- `CLIENT_JWT_SECRET` - JWT secret for client authentication
- `ADMIN_JWT_SECRET` - JWT secret for admin authentication
- `PORT` - Server port

## Backend Example Directory

The `backend-example/` contains a more complex NestJS-based architecture with DDD patterns, but the main template uses the simpler Hono structure described above.

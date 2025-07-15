# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hono-based backend template designed for B2B CRUD-intensive applications and survey scenarios. It uses TypeScript, Drizzle ORM with PostgreSQL, and implements a multi-tier architecture with strict route separation (public, client, admin).

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

## Environment

- `NODE_ENV` - Set to "production" for builds and start script
- `DATABASE_URL` - PostgreSQL connection string
- `CLIENT_JWT_SECRET` - JWT secret for client authentication
- `ADMIN_JWT_SECRET` - JWT secret for admin authentication
- `PORT` - Server port

## Backend Example Directory

The `backend-example/` contains a more complex NestJS-based architecture with DDD patterns, but the main template uses the simpler Hono structure described above.

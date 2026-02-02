# CLAUDE.md

**CRITICAL: Always respond in Simplified Chinese**

## Commands

```bash
pnpm install/dev/build/start/typecheck/lint/lint:fix/test
pnpm generate/push/migrate/studio/seed  # Database
```

## Stack

Hono + Node.js 25 + PostgreSQL(Drizzle snake_case) + Redis(ioredis) + JWT(admin/client) + Casbin RBAC + Zod(Chinese errors) + OpenAPI 3.1.0(Scalar) + Vitest + vite

## Architecture

**Route Tiers**: `/api/public/*` (no auth) | `/api/client/*` (JWT) | `/api/admin/*` (JWT+RBAC+audit)

**Auto-load**: `import.meta.glob` from `routes/{tier}/**/*.index.ts`

**CRUD 模块开发详见 `/crud` skill**

**数据库 Schema 开发详见 `/db-schema` skill**

## Critical Rules

### Response & Logging (MANDATORY)
```typescript
return c.json(Resp.ok(data), HttpStatusCodes.OK);
return c.json(Resp.fail("error"), HttpStatusCodes.BAD_REQUEST);
logger.info({ userId }, "[Module]: message");  // data object FIRST
// NEVER: console.log/warn/error (except: env validation, singleton, tests, scripts)
```

## Other Rules

- Status codes: `HttpStatusCodes` constants
- Dates: `date-fns` library
- Timestamps: `timestamp({ mode: "string" })`
- UUID params: `IdUUIDParamsSchema`
- Naming: PascalCase (classes/types), UPPER_SNAKE_CASE (enum values), kebab-case (files)
- Folder grouping: When multiple files of same type exist (e.g., `*.services.ts`), create a folder (e.g., `services/`)
- Queries: Use enums `eq(table.status, Status.ENABLED)` not magic values
- Services: Route-level (`{feature}.services.ts`) for complex business logic or reuse within module; global (`src/services/`) for cross-tier shared logic
- Types: Prefer inferring from Zod schemas (`z.infer<typeof schema>`) over manual definitions

## Dev Workflow

1. Write code (schema, routes, handlers, types)
2. Run `pnpm typecheck && pnpm lint:fix`
3. Write unit tests (ref: `src/routes/admin/system/users/__tests__/`)
4. Run `pnpm test`
5. Commit (no manual API testing needed)

**DB Schema Changes**: modify schema → `pnpm push` (dev) → `pnpm generate` (migration)

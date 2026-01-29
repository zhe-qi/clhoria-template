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

**Structure**: Auto-load routes via `import.meta.glob` from `routes/{tier}/**/*.index.ts`

```
src/
├── db/schema/           # DB Schema (snake_case)
│   ├── _shard/          # Shared: base-columns.ts, enums.ts
│   └── {tier}/{feature}/
├── routes/{tier}/{feature}/
│   ├── {feature}.handlers.ts   # Required
│   ├── {feature}.routes.ts     # Required
│   ├── {feature}.index.ts      # Required
│   ├── {feature}.types.ts      # Required
│   ├── {feature}.schema.ts     # Optional: route-level Zod
│   ├── {feature}.services.ts   # Optional: reuse ≥2x
│   ├── {feature}.helpers.ts    # Optional: pure functions
│   └── __tests__/
├── services/            # Global services (ip, sms, etc.)
└── lib/
```

## Critical Rules

### Response Wrapping (MANDATORY)
```typescript
return c.json(Resp.ok(data), HttpStatusCodes.OK);
return c.json(Resp.fail("error"), HttpStatusCodes.BAD_REQUEST);
// OpenAPI: jsonContent(RefineResultSchema, "desc") / jsonContent(respErr, "desc")
```

### Logging (MANDATORY)
```typescript
logger.info({ userId }, "[Module]: message");  // data object FIRST
// NEVER: console.log/warn/error (except: env validation, singleton, tests, scripts)
```

### DB Schema
- Import: `import db from "@/db"` (default export)
- Casing: TS camelCase → auto snake_case
- Extend `...defaultColumns` (id/createdAt/updatedAt/createdBy/updatedBy)
- Syntax: `varchar({ length: 128 })` - always specify length
- **NEVER modify `migrations/` or `meta/` folders**

**Enums** (3-step flow):
1. Define TS enum in `lib/enums/common.ts` (string values + `as const`)
2. Create pgEnum in `db/schema/_shard/enums.ts`: `pgEnum("status", Object.values(Status))`
3. Use in table: `status: statusEnum().default(Status.ENABLED).notNull()`

**Constraints**: Return arrays `table => [unique().on(table.col)]`

### Zod Schema
```typescript
// 1. Base (descriptions here only)
const selectSchema = createSelectSchema(table, {
  field: schema => schema.meta({ description: "desc" })
});
// 2. Insert
const insertSchema = createInsertSchema(table).omit({ id: true });
// 3. Derived: .partial(), .pick(), .extend()
// 4. Query params: RefineQueryParamsSchema.extend(customSchema.shape)
// Use .extend() to merge, NOT .merge() (deprecated)
// Use z.enum([...]) NOT z.nativeEnum() (deprecated)
// Use z.uuid() NOT z.string().uuid()
// Type constraint (recommended): const schema: z.ZodType<Interface> = z.object({...})
```

### Route Module
```typescript
// {feature}.index.ts
export default createRouter()
  .openapi(routes.list, handlers.list);

// {feature}.types.ts
export type FeatureRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

// {feature}.handlers.ts - STRICT typing
export const list: FeatureRouteHandlerType<"list"> = async (c) => {};

// OpenAPI tags format
const tags = [`${routePrefix}（Feature description）`];
```

## Other Rules

- Backward compatibility: Skip unless explicitly requested
- Status codes: `HttpStatusCodes` constants
- Dates: `date-fns` library
- Timestamps: `timestamp({ mode: "string" })`
- UUID params: `IdUUIDParamsSchema`
- Dynamic imports: `await import()`
- Ignore returns: Prefix with `void`
- Redis: Specify return types
- Enums: String values + `as const`
- Naming: PascalCase (classes/types), UPPER_SNAKE_CASE (enum values), kebab-case (files)
- Queries: Use enums `eq(table.status, Status.ENABLED)` not magic values
- Error handling: Research Drizzle/deps behavior before try-catch
- Services: Route-level (`{feature}.services.ts`) for ≥2x reuse; global (`src/services/`) for cross-tier

## Dev Workflow

1. Write code (schema, routes, handlers, types)
2. Run `pnpm typecheck && pnpm lint:fix`
3. Write unit tests (ref: `src/routes/admin/system/users/__tests__/`)
4. Run `pnpm test`
5. Commit (no manual API testing needed)

**DB Schema Changes**: modify schema → `pnpm push` (dev) → `pnpm generate` (migration)

**Redis Cache** (Public routes):
```typescript
// Read: redisClient.get(key) → return cached or query DB → setex(key, TTL, data)
// Admin CUD: void redisClient.del(key)
```

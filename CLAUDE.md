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
├── app.ts
├── db/schema/          # snake_case DB
├── routes/{tier}/{feature}/
│   ├── *.handlers.ts
│   ├── *.routes.ts     # OpenAPI + Zod
│   └── *.index.ts
├── services/           # Functional, reuse ≥2x only
└── lib/
```

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

### Database Schema

**Basics**
- Import: `import db from "@/db"` (default)
- Casing: TypeScript camelCase → auto snake_case (config: `casing: "snake_case"`)
- Extend `...defaultColumns` (id/createdAt/updatedAt/createdBy/updatedBy)
- Modern syntax: `varchar({ length: 128 })` not `varchar("name", { length })`
- Always specify varchar length
- **NEVER modify `migrations/` folder or `meta/` folder files - they are auto-generated. Only modify schema files in `src/db/schema/`**

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

**Type Constraints**
```typescript
// Always constrain Zod schemas
const Schema: z.ZodType<Interface> = z.object({
  field: z.string().optional()  // .optional() not .nullable()
});

// Zod v4
z.uuid()  // not z.string().uuid()
```

### Route Module Pattern

**Export ({feature}.index.ts)**
```typescript
import type { AppRouteHandler } from "@/types/lib";
import { createRouter } from "@/lib/create-app";
import * as handlers from "./*.handlers";
import * as routes from "./*.routes";

export const feature = createRouter()
  .openapi(routes.get, handlers.get);

type RouteTypes = { [K in keyof typeof routes]: typeof routes[K] };
export type FeatureRouteHandlerType<T extends keyof RouteTypes> =
  AppRouteHandler<RouteTypes[T]>;
```

**Handler Typing (MANDATORY)**
```typescript
import type { FeatureRouteHandlerType } from "./*.index";

// ✓ Strict typing
export const list: FeatureRouteHandlerType<"list"> = async (c) => {};

// ✗ Never use any/Context/generic types
```

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
- Extract only when reused ≥2x or likely will be
- Prefixes: `create*`/`get*`/`update*`/`delete*`/`assign*`/`clear*`
- Keep simple CRUD in handlers

**Testing**
- Developer must manually run and test project for debugging

**Job System (BullMQ)**
- Task naming: Use underscores or hyphens, NEVER colons (BullMQ uses colon as internal delimiter)
  - ✓ Correct: `send_email`, `daily_report`, `user-sync`
  - ✗ Wrong: `send:email`, `daily:report`, `user:sync`
- Lock keys: Use format `{taskName}` without additional prefixes (will be auto-prefixed by REDIS_KEY_PREFIX)
- Idempotency keys: Use descriptive names without colons
- Distributed deployment: Enable `useLock: true` for scheduled tasks to prevent duplicate execution
- Production: Remove demo tasks from `src/jobs/user-tasks.ts` before deployment
- Task registration: Add custom processors to `customTaskProcessors` array in `user-tasks.ts`
- Scheduled tasks: Add cron tasks to `customScheduledTasks` array in `user-tasks.ts`
- Reference: Check `src/jobs/examples/` for implementation examples

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
- Folder grouping: When multiple files of same type exist (e.g., `*.helpers.ts`), create a folder (e.g., `helpers/`)
- Queries: Use enums `eq(table.status, Status.ENABLED)` not magic values
- Helpers: Route-level (`{feature}.helpers.ts`) for complex business logic or reuse within module; simple DB operations stay inline in handlers; global (`src/services/`) for cross-tier shared logic
- Types: Prefer inferring from Zod schemas (`z.infer<typeof schema>`) over manual definitions
- Simple guard clauses: `if (!x) return null;` 单行无花括号（适用于 return 单个值、单个变量、单个函数调用等简短表达式，如 `return fallbackPath;`、`return Promise.resolve();`）

## Dev Workflow

1. Write code (schema, routes, handlers, types)
2. Run `pnpm typecheck && pnpm lint:fix`
3. Write unit tests (ref: `src/routes/admin/system/users/__tests__/`)
4. Run `pnpm test`
5. Commit (no manual API testing needed)

**DB Schema Changes**: modify schema → `pnpm push` (dev) → `pnpm generate` (migration)

## Workflow Orchestration

### Plan-First Default
- Non-trivial tasks (3+ steps or architectural decisions) must enter plan mode
- If deviating from plan, stop immediately and re-plan — never push through
- Use plan mode for verification steps too, not just building
- Write detailed specs upfront to reduce ambiguity

### Sub-Agent Strategy
- Use sub-agents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to sub-agents
- For complex problems, throw more compute at it via sub-agents
- Each sub-agent handles one focused task only

### Self-Improvement Loop
- After every user correction: record the pattern in `tasks/lessons.md`
- Write rules to prevent the same class of mistakes
- Iterate on these lessons until error rate drops
- Review relevant project lessons at the start of each session

### Pre-Completion Verification
- Never mark a task as done until proven working
- Compare behavior against main branch when relevant
- Ask: "Would a senior engineer approve this?"
- Run tests, check logs, prove correctness

### Pursue Elegance (Moderately)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "With everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before committing

### Autonomous Bug Fixing
- On bug reports: go fix it directly, don't wait for hand-holding
- Read logs, errors, failing tests — then resolve them
- No context-switching required from the user
- Fix failing CI tests on your own without being told how

## Task Management

- **Plan first**: Write plan to `tasks/todo.md` with checkable items
- **Validate plan**: Confirm before starting implementation
- **Track progress**: Mark completed items as done in real time
- **Explain changes**: Provide high-level summary for each step
- **Record results**: Add retrospective section to `tasks/todo.md`
- **Capture lessons**: Update `tasks/lessons.md` after every correction

## Core Principles

- **Simplicity first**: Make every change as simple as possible, touching minimal code
- **No shortcuts**: Find root causes, no temporary fixes, hold to senior developer standards
- **Minimal blast radius**: Only touch what's necessary, avoid introducing new bugs

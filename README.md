# Clhoria - Harness-Engineered Backend Template

English | [简体中文](./README.zh-CN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-6.0+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

Production-ready Hono backend template that doubles as an **AI agent harness** — providing feedforward guides, feedback sensors, and progressive specialization to make AI coding agents reliably produce architecture-conformant code.

> "The software engineering team's primary job is no longer to write code, but to design environments, specify intent, and build feedback loops." — [OpenAI](https://openai.com/index/harness-engineering/)

> Frontend admin panel based on Refine + Shadcn: [https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## Harness Engineering

> Agent = Model + Harness — [Birgitta Böckeler, Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)

An AI coding agent's reliability depends not on the model alone, but on the **harness** surrounding it: everything that steers the agent before it acts (**Guides / Feedforward**) and observes after it acts (**Sensors / Feedback**). This template is a **project-level specialization layer** — the bridge between generic AI capabilities and project-specific correctness.

### This Template as a Harness

| Harness Role            | Component                                                | What It Does                                               |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| **Guide** (Feedforward) | `CLAUDE.md`                                              | Context engineering: rules, conventions, response patterns |
| **Guide** (Feedforward) | Skills (`/crud`, `/db-schema`, `/bullmq`, `/drizzle-v1`) | Structured templates that pre-steer code generation        |
| **Guide** (Feedforward) | OpenSpec (`/opsx:propose` → `/opsx:apply`)               | Planning layer: specs become the primary artifact          |
| **Guide** (Feedforward) | Schema Pipeline (Drizzle → Zod → OpenAPI → Types)        | Architectural constraints that narrow the solution space   |
| **Guide** (Feedforward) | VSCode Snippets                                          | IDE-level feedforward for manual coding                    |
| **Sensor** (Feedback)   | TypeScript + tsgo                                        | Compile-time type checking catches structural errors       |
| **Sensor** (Feedback)   | ESLint + nano-staged                                     | Style and convention enforcement on every commit           |
| **Sensor** (Feedback)   | Vitest                                                   | Behavioral verification: does the code do what we intend?  |
| **Sensor** (Feedback)   | Casbin RBAC + Tier Routing                               | Permission guardrails: architecture-enforced boundaries    |

### Progressive Specialization > Generalization

Generic AI + blank project = high variance output. Specialized template + harness = **predictable, architecture-conformant output**.

- **Deeper project understanding** — agents reason within established patterns, not from scratch
- **Higher code quality** — narrower solution space = fewer hallucinations, more correct code
- **Consistent patterns** — every module follows the same structure, every schema the same layering
- **Better testability** — conventions enable templated, comprehensive test generation
- **More reliable output** — guides prevent common mistakes; sensors catch the rest

The more you invest in specializing the harness (adding skills, refining CLAUDE.md, expanding tests), the more reliably the AI agent produces correct code. This applies to any AI coding agent — not just Claude Code.

## Features

### Feedforward Guides (Steer Before Acting)

- **Schema-Driven Pipeline**: Drizzle ORM (v1) → Zod v4 → OpenAPI 3.1 → TypeScript types, single source of truth from database to API documentation
- **Structured Skills**: `/crud`, `/db-schema`, `/bullmq`, `/drizzle-v1` — pre-built templates that guide AI agents through standardized code generation
- **OpenSpec Workflow**: [OpenSpec](https://github.com/Fission-AI/OpenSpec) AI-native change management (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`), turning specifications into the primary development artifact
- **CLAUDE.md Context Engineering**: Comprehensive project rules, conventions, response patterns, and workflow orchestration for AI agent alignment
- **Declarative DSL Architecture**: `defineConfig` drives application assembly, `defineMiddleware` declares middleware chains, entry file stays minimal
- **VSCode Code Snippets**: IDE-level templates for rapid CRUD scaffolding

### Feedback Sensors (Observe After Acting)

- **Full-Chain Type Safety**: Hono + Zod + TypeScript + tsgo, compile-time error detection across the entire request-response pipeline
- **Vitest Test Infrastructure**: Unit tests and integration tests, co-located with route modules, AI-generated and AI-verifiable
- **ESLint + Pre-commit Hooks**: nano-staged enforces lint and typecheck on every commit
- **Multi-Layer Auth Sensors**: Dual JWT keys (Admin/Client isolation) + Casbin RBAC + KeyMatch3 RESTful path matching — architecture-enforced permission boundaries

### Production Infrastructure

- **Modern Tech Stack**: Hono + Node.js 25 + TypeScript 6.0+ + Vite + PostgreSQL
- **Progressive Layering**: Functional development standards, multi-tier routing structure, optional DDD for complex business logic
- **Automated Documentation**: OpenAPI 3.1 spec + Scalar UI, code as documentation with online debugging and type generation
- **Declarative Paginator**: Secure declarative queries based on Refine spec, extended Refine query with backend-only JOIN support
- **Complete Permission System**: User management + Role management + Casbin policies + Refine Resource compile-time menu routing, zero runtime overhead
- **Business + System Dictionary**: Business dictionaries support runtime dynamic configuration (JSONB + Redis cache), system dictionaries use PostgreSQL Enum for compile-time type checking
- **Logging Middleware**: Collects logs with support for multiple log storage backends (AWS CloudWatch, Loki, TimescaleDB, etc.)
- **High-performance Cache**: Redis caching + multi-layer rate limiting + permission caching + session management + distributed locks
- **Task Queue & Scheduling**: Background task queue management and scheduled tasks based on BullMQ + Redis (distributed-safe, supports repeatable jobs, Bull Board UI)
- **Functional Infrastructure**: Infrastructure layer built on Effect-TS with type-safe dependency injection, composable error handling, structured concurrency
- **Object Storage**: Integrated S3-compatible object storage (supports Cloudflare R2, AWS S3, MinIO, etc.)
- **Smart CAPTCHA**: Integrated Cap.js, lightweight modern CAPTCHA based on SHA-256 proof-of-work, privacy-friendly with zero tracking
- **Monitoring System**: Integrated Sentry error tracking, supports self-hosted or cloud-native solutions (cloud services recommended for small teams, maintenance-free)
- **Excel Processing**: High-performance Excel processing based on excelize-wasm, singleton lazy loading, powered by Go-native excelize via WASM
- **Instant Feedback Development**: Vite-powered hot-reload dev environment, millisecond-level code updates for ultimate development experience

## Drizzle ORM Version

This project provides two Drizzle ORM versions for you to choose from:

| Branch       | Drizzle Version     | Description                                                                  |
| ------------ | ------------------- | ---------------------------------------------------------------------------- |
| `main`       | **v1** (1.0.0-beta) | Latest version with Relations v2, `through` many-to-many, predefined filters |
| `drizzle-v0` | **v0** (0.x stable) | Stable version with classic Relations API, battle-tested                     |

```bash
# Use Drizzle v1 (default)
git clone https://github.com/zhe-qi/clhoria-template.git

# Use Drizzle v0 (stable)
git clone -b drizzle-v0 https://github.com/zhe-qi/clhoria-template.git
```

> **Migration Note**: Drizzle v1 introduces breaking changes in the Relations API. See the [Drizzle v1 migration guide](https://orm.drizzle.team/docs/migrations) for details.

## Quick Start

### Local Development Environment

- Node.js >= 24 (latest recommended)
- pnpm >= 10 (use the version specified in packageManager field of package.json)
- PostgreSQL >= 18 (if using 17, refer to the downgrade guide in this README for easy downgrade)
- Redis >= 7 (7 or latest both work)

#### Installation Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/zhe-qi/clhoria-template
   cd clhoria-template
   ```

2. **Install dependencies**

   ```bash
   npm i -g corepack
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

4. **Initialize database**

   ```bash
   # Start PostgreSQL service (optional, quickly set up PostgreSQL database in local Docker environment)
   docker compose --env-file .env run -d --service-ports postgres

   # Start Redis service (optional, quickly set up Redis in local Docker environment)
   docker compose --env-file .env run -d --service-ports redis
   ```

   > **Note**: If using Docker services above, update your `.env` to use `localhost` instead of container hostnames:
   >
   > - `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"`
   > - `REDIS_URL="redis://localhost:6379/0"`

   ```bash
   # Execute database migration (for rapid dev iteration use pnpm push directly, reserve generate and migrate for important milestones)
   pnpm migrate

   # Seed initial data (optional, app will auto-check and initialize on startup)
   pnpm seed
   ```

#### Production Deployment

For production deployment, use migration files instead of `pnpm push`:

```bash
pnpm generate  # Generate migration files
pnpm migrate   # Execute migrations
```

5. **Start development server**
   ```bash
   pnpm dev
   ```

Visit <http://localhost:9999> to view the API documentation.

## TypeScript 6.0+ and ts-go Support

This project supports using the experimental ts-go to enhance TypeScript type checking and language service performance. At the current project scale, ts-go provides very significant performance improvements and the language service is relatively stable, so it is recommended.

### Using ts-go (Recommended)

Install the VSCode extension: [TypeScript Native Preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)

> **Note**: Currently ts-go is only used for type checking and language service. Development and bundling are based on Vite (Rolldown).

> **Cache Issues**: If you encounter TS service errors or type cache anomalies, use `Cmd + Shift + P` to open the command palette, type `restart`, and find **TypeScript: Restart TS Server** to restart the TS service and restore normal operation.

> **Performance Tip**: Zod has significant performance overhead on type services. ts-go notably improves this. If you can tolerate occasional cache issues, it is still recommended to use ts-go for a better development experience.

### Not Using ts-go

If you prefer not to use ts-go, follow these steps to revert:

1. Remove `"js/ts.experimental.useTsgo": true` from `.vscode/settings.json`
2. Run `pnpm remove @typescript/native-preview`
3. Modify the `typecheck` command in `package.json`, changing `pnpm exec tsgo --noEmit` to `tsc --noEmit`

## Development Methodology: SDD + TDD

This project combines **Specification-Driven Development (SDD)** with **Test-Driven Development (TDD)**, orchestrated through the harness system. Specifications become the primary artifact; tests become the verification layer; code becomes an implementation detail.

> SDD inverts the traditional development hierarchy — specifications define _what_ before _how_. TDD adds a verification dimension — tests define _expected behavior_ before implementation. Together, they create a **double constraint** that dramatically narrows the AI agent's solution space.

### The Development Loop

```text
  ┌─────────────────────────────────┐
  │  1. SPEC (OpenSpec)             │
  │  Define what to build           │
  │  /opsx:propose                  │
  └───────────┬─────────────────────┘
              ▼
  ┌─────────────────────────────────┐
  │  2. SCHEMA                      │
  │  Drizzle table → Zod → OpenAPI  │
  │  /db-schema skill               │
  └───────────┬─────────────────────┘
              ▼
  ┌─────────────────────────────────┐
  │  3. TEST (Write First)          │
  │  Define expected behavior       │
  │  Vitest integration tests       │
  └───────────┬─────────────────────┘
              ▼
  ┌─────────────────────────────────┐
  │  4. IMPLEMENT                   │
  │  Routes + Handlers              │
  │  /crud skill                    │
  └───────────┬─────────────────────┘
              ▼
  ┌─────────────────────────────────┐
  │  5. VERIFY                      │
  │  pnpm typecheck && lint && test │
  └───────────┬─────────────────────┘
              │
     Pass? ───┼─── Yes ──→ 6. DOCUMENT
              │
              No
              │
              └──────────→ Back to 4
```

### Stage Details

| Stage     | Tool / Skill                                   | Output                                                         | Harness Role   |
| --------- | ---------------------------------------------- | -------------------------------------------------------------- | -------------- |
| Spec      | `/opsx:propose`                                | `openspec/changes/<name>/` (proposal, design, tasks)           | Guide          |
| Schema    | `/db-schema` skill                             | Drizzle tables + Zod schemas + OpenAPI types                   | Guide          |
| Test      | Manual / AI                                    | `__tests__/*.test.ts`                                          | Sensor         |
| Implement | `/crud` skill                                  | Routes, handlers, types, index                                 | —              |
| Verify    | `pnpm typecheck && pnpm lint:fix && pnpm test` | Pass / fail signals                                            | Sensor         |
| Document  | Module docs                                    | `docs/{feature}/module.md` (file index, functions, key points) | Guide (future) |

**Acceptance Criteria**: All tests pass + Complies with CLAUDE.md specs + No obvious performance issues

### OpenSpec Change Workflow

This project integrates [OpenSpec](https://github.com/Fission-AI/OpenSpec) for structured, AI-native change management. Each feature or fix gets its own artifact folder with proposal, specs, design, and tasks.

```text
/opsx:propose "add-user-export"    # Create change + generate all planning artifacts
/opsx:apply                        # Implement tasks from the change
/opsx:archive                      # Archive completed change
/opsx:explore                      # Think through ideas before committing to a change
```

Generated artifacts live in `openspec/changes/<name>/` (gitignored). Slash commands are available in both Claude Code and GitHub Copilot.

### Not Limited to Claude Code

While this template is deeply integrated with Claude Code (CLAUDE.md, skills, MCP), the SDD + TDD methodology and harness components work with any AI coding agent or custom-built harness system. The schema pipeline, test infrastructure, and architectural constraints benefit any development approach — human or AI-assisted.

---

### Route Module Structure

```text
routes/{tier}/{feature}/
├── {feature}.handlers.ts       # Business handlers (required)
├── {feature}.routes.ts         # Route definitions + OpenAPI (required)
├── {feature}.index.ts          # Unified exports (required)
├── {feature}.types.ts          # Type definitions (required)
├── {feature}.schema.ts         # Route-level Zod Schema (optional, for complex schemas)
├── {feature}.helpers.ts        # Helper functions (optional, for complex business logic or intra-module reuse)
└── __tests__/                  # Test directory (recommended)
```

Simple DB operations stay inline in handlers, complex business logic goes to helpers. Cross-tier shared services go in `src/services/{service}/`

### Database Schema

```text
src/db/schema/
├── _shard/                     # Shared base components
│   ├── base-columns.ts         # Common fields (id/createdAt/updatedAt, etc.)
│   └── enums.ts                # PostgreSQL enum definitions
├── {tier}/{feature}/           # Business table definitions (organized by tier and feature)
│   ├── {entity}.ts             # Drizzle table definitions
│   └── index.ts                # Feature module table exports
└── index.ts                    # Root exports (aggregate all schemas)
```

**Directory Notes:**

- **`_shard/` directory**: Stores shared base components across features
  - `base-columns.ts`: Exports `baseColumns` object, all tables extend via `...baseColumns`
  - `enums.ts`: Defines database enum types using `pgEnum()`

- **Business table organization**: Layered by `{tier}/{feature}` (e.g., `admin/system/users.ts`), corresponding to route structure

### Zod Schema Layering

- **DB Layer** (`db/schema/{entity}.ts`): Generate base schemas from Drizzle table definitions via `createSelectSchema` / `createInsertSchema`, `.meta({ description })` added only at this layer
- **Route Layer** (`routes/{tier}/{feature}/*.schema.ts`): Inherit DB schemas with pick/omit/extend composition, recommend using `z.ZodType<Interface>` for type safety
- Simple CRUD can use DB schemas directly in `routes.ts` without a separate schema file

```typescript
// DB Layer: Generate base schema
export const selectUserSchema = createSelectSchema(users, {
  username: schema => schema.meta({ description: "Username" }),
});
// Route Layer: Compose business schema
export const createUserRequestSchema: z.ZodType<CreateUserRequest>
  = insertUserSchema.pick({ username: true, email: true });
```

**PostgreSQL Version Notes**:

- **PostgreSQL 18 and above**: No modifications needed, works out of the box. The project uses PostgreSQL 18's `uuidv7()` function by default.
- **Below PostgreSQL 18**: You need to manually modify `src/db/schema/_shard/base-columns.ts`:
  1. Install the `uuid` library:
     ```bash
     pnpm add uuid
     pnpm add -D @types/uuid
     ```
  2. Add import at the top of `base-columns.ts`:
     ```typescript
     import { uuidV7 } from "uuid";
     ```
  3. Modify the `id` field definition:
     ```typescript
     // Change from
     uuid().primaryKey().notNull().default(sql`uuidv7()`);
     // To
     uuid().primaryKey().notNull().$defaultFn(() => uuidV7());
     ```

### Architecture Strategy

**This project defaults to Vertical Slice Architecture + Transaction Script pattern**: Code is organized by feature (`routes/{tier}/{feature}/`), each slice is self-contained with routes, handlers, types, and schema, Handlers directly operate Drizzle to fulfill business logic. This architecture is chosen because most admin management scenarios are essentially data in and out — layered architecture (Controller → Service → Repository) only adds pass-through boilerplate for simple CRUD. Vertical slices keep each feature module highly cohesive and loosely coupled, adding or removing features doesn't affect other modules, and it's more conducive to AI understanding and code generation. Complex logic is extracted to helpers as needed.

**Complex Business (~20%)** When business rules, state transitions, cross-module orchestration, etc. exceed the capacity of Transaction Script, choose the appropriate architecture pattern based on scenario:

| Scenario                         | Recommended      | Description                                                                                                                                                          |
| -------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Need Tech Decoupling             | Hexagonal        | Port/Adapter isolates external dependencies                                                                                                                          |
| Complex Business Rules           | DDD              | Domain model encapsulates business rules                                                                                                                             |
| Complex + Decoupling             | DDD + Hexagonal  | Combine both approaches                                                                                                                                              |
| Pure Functions First             | FCIS             | Functional Core for pure logic + Imperative Shell handles side effects, core independently testable                                                                  |
| Pure Functions + Decoupling      | FCIS + Hexagonal | Pure functional core + Port/Adapter isolates I/O, balancing testability and replaceability                                                                           |
| Type-safe Side Effect Management | Effect-TS        | Effect-based functional architecture with type-safe DI, error handling, structured concurrency, side effects trackable at the type level                             |
| Read/Write Model Asymmetry       | Monolith CQRS    | Separate read/write models within a single database, Query side uses flattened DTOs/views for optimized reads, Command side uses domain logic, no message bus needed |

**Core Ideas**: DDD focuses on domain modeling, Hexagonal on dependency isolation, FCIS on separating pure functions from side effects, Effect-TS elevates side effects into the type system, Monolith CQRS addresses read/write model asymmetry. Combine freely based on business complexity.

> **Monolith CQRS vs Database Read/Write Splitting**: Cloud PG cluster proxies (e.g., AWS RDS Proxy, PgBouncer) solve **database load** problems — the same SQL is automatically routed to primary/read-only nodes, transparent to application code. Monolith CQRS solves **application model** problems — writes go through rich domain models to ensure business consistency, queries use flattened DTOs/database views bypassing the domain layer to reach data directly, each with different data structures and code paths. The former is horizontal scaling at the infrastructure level, the latter is separation of concerns at the code level. They don't conflict and can be stacked together.

> **Effect-TS Deep Integration**: Effect's `Context.Tag` + `Layer` system is naturally hexagonal architecture — `Tag` declares the interface (Port), `Layer` provides the implementation (Adapter), business logic is orchestrated through `Effect.gen`, depending only on Tag abstractions rather than concrete implementations. Swap out a `Layer` in tests to inject mocks, no extra interface files needed. Meanwhile, Effect's type channel `Effect<Success, Error, Requirements>` makes dependencies, errors, and success values all explicitly declared in the function signature — the compiler forces you to handle every error path, missing one is a compile error. Compared to hand-written Port/Adapter + try/catch, Effect solves dependency injection, error handling, and concurrency control with a single mechanism, suitable for state machines, workflows, cross-service orchestration, and other truly complex business scenarios. This project already uses Effect at the infrastructure layer (distributed locks `withLock`, task queues, resource initialization), and the business layer can adopt it incrementally as needed.

```text
src/domain/[module]/                     # Domain layer (pure business logic)
├── [module].entity.ts                   # Domain entity
├── [module].service.ts                  # Domain service
└── [module].repository.port.ts          # Repository interface (Port)
src/infrastructure/persistence/          # Infrastructure layer (Adapter implementation)
```

## Core Architecture Features

### Auto Route Loading

Auto-scans and registers route modules from `routes/{tier}/**/*.index.ts` using `import.meta.glob`. Just create a directory to add new modules, HMR takes effect in milliseconds after saving. Each module must `export default` the route instance in `{feature}.index.ts`.

### Singleton Management System

Unified management for long-lived connections like PostgreSQL, Redis, and Casbin. Solves connection leak issues in Vite HMR mode with automatic resource cleanup.

### Three-Layer Dependency Injection

This project does not use a traditional DI container (e.g., InversifyJS), opting for a lighter and more direct three-layer injection strategy:

| Layer                | Mechanism                                                          | Scope      | Typical Usage                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Module Singleton** | `createSingleton` / `createAsyncSingleton` / `createLazySingleton` | Process    | DB connection pool, Redis client, Casbin Enforcer, Logger and other long-lived resources                                                                           |
| **Request Context**  | Hono `c.set()` / `c.get()` + `AppBindings` type constraint         | Request    | JWT payload, request ID, tierBasePath and other request-scoped data, written by middleware → read by handlers                                                      |
| **Effect Layer**     | `Context.Tag` + `Layer.mergeAll`                                   | Composable | Type-safe composition of infrastructure services (DB, Logger, BullMQ), used for distributed locks, task queues, and other scenarios requiring Effect orchestration |

**Why no DI container**: The dependency graph in admin management systems is inherently simple — long-lived resources are process-level singletons, request data flows through Hono Context, these two layers cover 90% of scenarios. Effect Layer supplements the remaining 10% that needs type-safe composition (e.g., `withLock` distributed locks). Introducing a DI container would only add indirection and registration ceremony, which is over-engineering for this scale of project.

#### Core Concepts

**Permission System**: Based on RESTful API paths + Casbin KeyMatch3, code as permissions, no database permission identifier storage needed
**Menu System**: Refine Resource compile-time routing, zero runtime overhead, code as menus
**Dictionary System**: TypeScript enum → PostgreSQL Enum → OpenAPI auto-generation, 100% frontend-backend sync

#### Comparison with Traditional Solutions

| Dimension       | This Project                                                            | Traditional Solution                                                                    |
| --------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Permission**  | OpenAPI route definition, Casbin policy matching, auto-sync             | Database permission tables + association tables, manual maintenance, easy inconsistency |
| **Menu**        | Compile-time route tree generation, type-safe, zero runtime overhead    | Database-stored menus, runtime query parsing, needs admin interface                     |
| **Dictionary**  | Single source of truth, compile-time type checking, 4-byte Enum storage | Database dictionary tables, runtime queries, needs JOIN, easy inconsistency             |
| **Maintenance** | Change once auto-sync everywhere, TypeScript compile-time errors        | Multiple manual syncs: database → backend → frontend → docs                             |

### Logging System

Built on pino transport architecture, supporting multi-target output (dev `pino-pretty` / production stdout JSON / optional custom transports). Three child loggers auto-inject `type` field: `logger` (system), `operationLogger` (CRUD audit, type: `OPERATION`), `loginLogger` (login records, type: `LOGIN`).

Operation log middleware is globally configured in admin tier (parameterless mode stores raw `urlPath`), also supports local mode with manually specified module names:

```typescript
router.use(operationLog({ moduleName: "Order Management", description: "Create Order" }));
```

Custom Transport integration: Create `transports/sls-transport.mjs` in project root, build with `pino-abstract-transport`, then uncomment the SLS target in `logger.ts`'s `buildTransportTargets()`. Operation log `urlPath` naturally corresponds to Casbin keymatch3 rules and Refine resources, frontend can directly use permission tree mapping to Chinese labels as log filter dimensions.

### Task Queue System (BullMQ)

Built on BullMQ + Redis, providing high-performance task queue management and scheduled task scheduling with Effect-TS functional encapsulation for type-safe operations.

**Access Bull Board UI**:

```bash
pnpm dev
# Visit http://localhost:9999/api/queue-board (non-production only)
```

**Basic Usage - Add Job**:

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// Add immediate job
const program = queueManager.addJob("email", "send-welcome", {
  email: "user@example.com",
  subject: "Welcome!",
});

await Effect.runPromise(program);
```

**Register Worker**:

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// Register worker to process jobs
const program = queueManager.registerWorker("email", async (job) => {
  console.log("Processing email:", job.data);
  // Email sending logic
  return { success: true };
});

Effect.runSync(program);
```

**Scheduled Jobs (Repeatable Jobs)**:

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure";

// Run daily cleanup at 3 AM
const program = queueManager.scheduleJob(
  "cleanup",
  "daily-cleanup",
  { type: "cleanup" },
  {
    pattern: "0 3 * * *",
    tz: "Asia/Shanghai",
  }
);

await Effect.runPromise(program);
```

**Redis Configuration Requirements**:

BullMQ requires specific Redis settings:

- **maxmemory-policy**: `noeviction` (prevents task data eviction)
- **Data Persistence**: Enable AOF or RDB

Local development (Docker Compose) is auto-configured. For Aliyun Redis, manually set `maxmemory-policy` in the console.

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t clhoria-template .

# Run container
docker run -p 9999:9999 --env-file .env clhoria-template
```

### Standalone Deployment (pm2 / Bare Metal)

Bundle all JS dependencies into a single file, copy native binaries to `dist/native/`, and deploy without `node_modules`.

```ts
// vite.config.ts
buildPluginNodejs({
  bundleDeps: true, // Bundle all JS deps into single file
  nativeDeps: ["@node-rs/argon2", "excelize-wasm"], // Extract .node/.wasm binaries to dist/native/
  targetPlatform: "linux-x64", // Cross-compile: install linux binaries on macOS
});
```

| Option           | Description                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `bundleDeps`     | `true` bundles all JS into `dist/index.js`; `false` (default) keeps `node_modules` external for Docker  |
| `nativeDeps`     | npm packages with `.node`/`.wasm` binaries — JS is bundled, binaries extracted to `dist/native/`        |
| `targetPlatform` | Cross-compilation target: `linux-x64` \| `linux-arm64` \| `darwin-arm64` \| `darwin-x64` \| `win32-x64` |

Output structure:

```
dist/
  index.js                        # Single-file bundle (all JS deps included)
  native/
    argon2.linux-x64-gnu.node     # Platform-specific native addon
    argon2.linux-x64-musl.node    # Alpine Linux variant
    excelize.wasm.gz              # WASM binary
```

```bash
# Deploy: just copy dist/ and .env
scp -r dist/ .env user@server:/app/
ssh user@server "cd /app && pm2 start dist/index.js"
```

### Native Assets (Custom Native Files)

`nativeAssets` copies your own `.wasm`/`.node` binaries to `dist/native/`. **Independent of `bundleDeps`** — works in both Docker and standalone modes.

```ts
// vite.config.ts — nativeAssets only (works in Docker mode too)
buildPluginNodejs({
  nativeAssets: ["src/workers/xxxxxx.wasm"],
});

// Combined with bundleDeps
buildPluginNodejs({
  bundleDeps: true,
  nativeDeps: ["@node-rs/argon2"],
  nativeAssets: ["src/workers/xxxxxx.wasm"],
});
```

Runtime loading example (prefer `native/` build output, fallback to source path):

```typescript
import fs from "node:fs";
import path from "node:path";

function getWasmPath(): string {
  // Prefer dist/native/ (nativeAssets build output)
  const nativePath = path.resolve(import.meta.dirname, "native", "xxxxxx.wasm");
  if (fs.existsSync(nativePath)) return nativePath;

  // Fallback to source path (development)
  const srcPath = path.join(process.cwd(), "src/workers/xxxxxx.wasm");
  if (fs.existsSync(srcPath)) return srcPath;

  throw new Error("xxxxxx.wasm not found");
}
```

## Deployment Features

**Optional SaaS Dependencies**: Sentry, Cloudflare R2 object storage and other third-party services are all optional, can be fully deployed in intranet environments. Supports migration to other PostgreSQL-compatible databases.

### Redis Cluster / Sentinel

This template uses standalone Redis. For Redis Cluster/Sentinel, replace initialization logic in `src/lib/services/redis.ts` or use cloud provider Proxy mode (Aliyun Redis, AWS ElastiCache, etc.).

## Harness System: Claude Code Integration

This template treats Claude Code not as an optional add-on, but as the **primary development interface**. The harness is built around it.

### Harness Components

| Component             | Path / Invocation                  | Purpose                                                                      |
| --------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| **CLAUDE.md**         | `./CLAUDE.md`                      | System prompt: rules, conventions, response patterns, workflow orchestration |
| **Skill: CRUD**       | `/crud`                            | CRUD module scaffolding with type-safe patterns                              |
| **Skill: DB Schema**  | `/db-schema`                       | Database schema design with Drizzle conventions                              |
| **Skill: BullMQ**     | `/bullmq`                          | Queue/worker setup with Effect-TS integration                                |
| **Skill: Drizzle v1** | `/drizzle-v1`                      | Relations v2 query guidance                                                  |
| **OpenSpec: Propose** | `/opsx:propose`                    | Create change with all planning artifacts                                    |
| **OpenSpec: Apply**   | `/opsx:apply`                      | Implement tasks from a change                                                |
| **OpenSpec: Explore** | `/opsx:explore`                    | Thinking partner for design exploration                                      |
| **OpenSpec: Archive** | `/opsx:archive`                    | Archive completed changes                                                    |
| **VSCode Snippets**   | `.vscode/crud.code-snippets`       | IDE-level code generation templates                                          |
| **Pre-commit Hooks**  | `simple-git-hooks` + `nano-staged` | Automated lint + typecheck on every commit                                   |

### VSCode Code Snippets

| Prefix          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `crud-schema`   | Complete schema.ts template                              |
| `crud-routes`   | Complete routes.ts template (with all 5 CRUD routes)     |
| `crud-handlers` | Complete handlers.ts template (with all 5 CRUD handlers) |
| `crud-index`    | Complete index.ts template                               |

### Recommended MCP Plugins

- **[Serena](https://github.com/SerenaAI/serena-mcp)**: Intelligent code analysis and refactoring suggestions
- **[Context7](https://github.com/context7/mcp-plugin)**: Real-time technical documentation queries and code examples

### CLAUDE.md as Context Engineering

The `CLAUDE.md` file is the most critical harness document. It contains:

- **Stack declaration** — so the agent knows what tools are available
- **Architecture rules** — route tiers, auto-loading patterns, naming conventions
- **Critical rules** — response format (`Resp.ok` / `Resp.fail`), logging format, status codes
- **Dev workflow** — the exact sequence of commands to validate changes
- **Workflow orchestration** — plan-first defaults, sub-agent strategy, self-improvement loops
- **Core principles** — simplicity first, no shortcuts, minimal blast radius

Every rule in CLAUDE.md is a feedforward constraint that prevents the AI agent from deviating into incorrect patterns.

## Testing

Tests serve as the primary **feedback sensor** in the harness system — they verify that AI-generated code actually behaves as specified.

### Test Infrastructure

- **Framework**: Vitest (integrated with Vite, shared config)
- **Location**: Co-located with modules at `routes/{tier}/{feature}/__tests__/`
- **Pattern**: Integration tests using `testClient` from `hono/testing` for type-safe endpoint testing

### Test Coverage

| Module       | Test File                                            | What It Verifies                  |
| ------------ | ---------------------------------------------------- | --------------------------------- |
| Users CRUD   | `admin/system/users/__tests__/users.test.ts`         | Full CRUD lifecycle, auth, RBAC   |
| Roles CRUD   | `admin/system/roles/__tests__/roles.test.ts`         | Role management, policy sync      |
| Dicts CRUD   | `admin/system/dicts/__tests__/dicts.test.ts`         | Dictionary operations             |
| Params CRUD  | `admin/system/params/__tests__/params.test.ts`       | Parameter management              |
| Public Dicts | `public/dicts/__tests__/dicts.test.ts`               | Public dictionary access          |
| Auth         | `admin/auth/__tests__/auth.test.ts`                  | Authentication flow               |
| Pagination   | `core/refine-query/__tests__/pagination.test.ts`     | Pagination logic                  |
| Converters   | `core/refine-query/__tests__/converters.test.ts`     | Query parameter conversion        |
| Query Exec   | `core/refine-query/__tests__/query-executor.test.ts` | Query execution engine            |
| Schemas      | `core/refine-query/__tests__/schemas.test.ts`        | Query schema validation           |
| BullMQ       | `infrastructure/__tests__/bullmq-adapter.test.ts`    | Queue type safety, Zod validation |

### Running Tests

```bash
pnpm test           # Run all tests (watch mode)
pnpm test -- --run  # Run once without watch mode
```

### TDD in the Harness Context

In the SDD + TDD workflow, tests are written **before** implementation:

1. AI agent generates test cases from the spec (expected inputs/outputs, edge cases)
2. Tests initially fail (red)
3. AI agent implements handlers to make tests pass (green)
4. Sensors (typecheck + lint + test) verify correctness
5. If any sensor fails, the agent loops back to fix

This creates a **closed feedback loop**: the spec tells the agent _what to build_, the tests tell the agent _whether it built correctly_. The agent self-corrects until all sensors pass.

Reference test patterns: `src/routes/admin/system/users/__tests__/users.test.ts`

## Development Experience Comparison

| Comparison           | This Project (Harness-Engineered)                                                             | Traditional Code Generators                                                             |
| -------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Efficiency**       | AI agents work within specialized harness, generating architecture-conformant code in seconds | Manual template configuration tedious, generates rigid code needing heavy modifications |
| **API Management**   | OpenAPI + Zod auto-sync, type-safe, docs never outdated                                       | Manual API documentation maintenance, easy inconsistency                                |
| **Code Quality**     | TypeScript full-chain type checking, catch issues at compile time                             | Generated code lacks type constraints, runtime errors frequent                          |
| **Maintenance Cost** | Unified code standards, AI understands project architecture, simple maintenance               | Large codebase not elegant enough, hard to maintain                                     |

## CAPTCHA System Comparison

### Cap.js vs svg-captcha

| Comparison          | Cap.js (Used in This Project)                                           | svg-captcha                                              |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| **Security**        | SHA-256 proof-of-work, no visual attack surface, anti-automation        | Image-based recognition, easily cracked by OCR tools     |
| **User Experience** | No visual puzzles, background silent computation, Widget/Invisible mode | Traditional image verification, recognize distorted text |
| **Privacy**         | Self-hosted, zero tracking & telemetry, full data control               | Memory storage, fixed functionality                      |

## Performance Comparison

### Hono vs Fastify Performance Analysis

In Node.js 22 environment, Fastify still maintains performance advantage, but the gap is small:

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

Detailed benchmark: [bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

### High Concurrency & Performance Optimization Solutions

**High Concurrency Solution**: K8s + load balancer (Nginx, AWS ALB, etc.) + PostgreSQL/Redis HA clusters + distributed sessions, enabling stateless horizontal scaling

**CPU-intensive Optimization**:

| Scenario                  | Recommended    | Use Case                                                           |
| ------------------------- | -------------- | ------------------------------------------------------------------ |
| **Repeated Calls**        | napi-rs        | Image processing, encryption/decryption, data compression          |
| **Single Intensive Calc** | WASM           | Complex algorithms, scientific computing, single heavy computation |
| **Parallel Multi-task**   | Worker Threads | Many independent tasks, concurrent data processing                 |

## References

### Harness Engineering

- [Harness engineering for coding agent users — Birgitta Böckeler (Martin Fowler)](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
- [Harness engineering: leveraging Codex in an agent-first world — OpenAI](https://openai.com/index/harness-engineering/)
- [Spec-Driven Development — GitHub](https://github.com/github/spec-kit/blob/main/spec-driven.md)

### Technical Foundations

- [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter)
- [stoker](https://github.com/w3cj/stoker)

## Support

For questions or suggestions, please open an [Issue](https://github.com/zhe-qi/clhoria-template/issues).

## Contributing Guidelines

Contributions welcome! Please follow [Conventional Commits](https://www.conventionalcommits.org/) specifications, ensure `pnpm test` and `pnpm lint` pass before submitting PR.

## License

MIT License - see [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) file for details.

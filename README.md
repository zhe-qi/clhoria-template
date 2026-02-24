# Clhoria - Hono-based Rapid Development Template

English | [简体中文](./README.zh-CN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

Production-ready Hono backend template with full-stack type safety, RBAC, and OpenAPI — optimized for AI-assisted development with Claude Code.

> Frontend admin panel based on Refine + Shadcn: [https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## Features

- **Modern Tech Stack**: Hono + TypeScript + Vite + Drizzle ORM + PostgreSQL
- **Progressive Layering**: Functional development standards, multi-tier routing structure, optional DDD for complex business logic
- **Automated Documentation**: OpenAPI 3.1 spec + Scalar UI, code as documentation with online debugging and type generation
- **Multi-layer Auth**: Dual JWT keys (Admin/Client isolation) + Casbin RBAC + KeyMatch3 RESTful path matching, no backend permission identifier storage needed
- **Declarative Paginator**: Secure declarative queries based on Refine spec, extended Refine query with backend-only JOIN support
- **Complete Permission System**: User management + Role management + Casbin policies + Refine Resource compile-time menu routing, zero runtime overhead
- **Business + System Dictionary**: Business dictionaries support runtime dynamic configuration (JSONB + Redis cache), system dictionaries use PostgreSQL Enum for compile-time type checking
- **Logging Middleware**: Collects logs with support for multiple storage solutions (Alibaba Cloud SLS, PostgreSQL TimescaleDB, Loki, etc.)
- **High-performance Cache**: Redis caching (cluster mode supported) + multi-layer rate limiting + permission caching + session management + distributed locks
- **Task Queue & Scheduling**: Background task queue management and scheduled tasks based on pg-boss (distributed-safe, single execution across nodes)
- **Functional Infrastructure**: Infrastructure layer built on Effect-TS with type-safe dependency injection, composable error handling, structured concurrency
- **Object Storage**: Integrated S3-compatible object storage (supports Cloudflare R2, Alibaba Cloud OSS, AWS S3, etc.)
- **Smart CAPTCHA**: Integrated Cap.js, lightweight modern CAPTCHA based on SHA-256 proof-of-work, privacy-friendly with zero tracking
- **Type-safe System**: Hono + Zod + TypeScript full-chain type inference, catch issues at compile time
- **Instant Feedback Development**: Vite-powered hot-reload dev environment, millisecond-level code updates for ultimate development experience
- **Declarative DSL Architecture**: `defineConfig` drives application assembly, `defineMiddleware` declares middleware chains, entry file stays minimal
- **AI-driven Development**: Claude Code + CLAUDE.md + MCP plugin ecosystem, AI understands project architecture, auto-generates test cases (Vitest)
- **Monitoring System**: Integrated Sentry error tracking, supports self-hosted or cloud-native solutions (cloud services recommended for small teams, maintenance-free)
- **Excel Processing**: High-performance Excel processing based on excelize-wasm, singleton lazy loading, same as the Go version

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

   # Execute database migration (for rapid dev iteration use pnpm push directly, reserve generate and migrate for important milestones)
   pnpm migrate

   # Seed initial data (optional, app will auto-check and initialize on startup)
   npm install -g bun
   pnpm seed
   ```

   **For production deployment**, verify migrations first:

   ```bash
   pnpm generate  # Generate migration files
   pnpm migrate   # Execute migrations
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

Visit <http://localhost:9999> to view the API documentation.

## TypeScript 5.9+ and ts-go Support

This project supports using the experimental ts-go to enhance TypeScript type checking and language service performance. At the current project scale, ts-go provides very significant performance improvements and the language service is relatively stable, so it is recommended.

### Using ts-go (Recommended)

Install the VSCode extension: [TypeScript Native Preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)

> **Note**: Currently ts-go is only used for type checking and language service. Development and bundling are based on Vite (Rolldown).

> **Cache Issues**: If you encounter TS service errors or type cache anomalies, use `Cmd + Shift + P` to open the command palette, type `restart`, and find **TypeScript: Restart TS Server** to restart the TS service and restore normal operation.

> **Performance Tip**: Zod has significant performance overhead on type services. ts-go notably improves this. If you can tolerate occasional cache issues, it is still recommended to use ts-go for a better development experience.

### Not Using ts-go

If you prefer not to use ts-go, follow these steps to revert:

1. Remove `"typescript.experimental.useTsgo": true` from `.vscode/settings.json`
2. Run `pnpm remove @typescript/native-preview`
3. Modify the `typecheck` command in `package.json`, changing `npx tsgo` to `tsc`

## Development Guidelines

This project adopts the **Spec-Driven Development (SDD)** methodology. SDD inverts the traditional development hierarchy—specifications become the primary artifact, and code becomes an implementation of the spec. Through AI capabilities, precise specifications can directly generate working code while structured processes prevent chaos.

> 📖 Further reading: [Spec-Driven Development](https://github.com/github/spec-kit/blob/main/spec-driven.md)

### Claude Code Development Workflow

Follow the 6-stage standard workflow: `Spec → Generate Code → Generate Tests → Iterative Optimization → Module Documentation`

| Stage                  | Output                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| Spec                   | `docs/{feature}/spec.md` (requirements, architecture, test strategy) |
| Generate Code          | Complete API code (Schema + Handlers) + migration                    |
| Generate Tests         | `__tests__/int.test.ts`                                              |
| Iterative Optimization | Continuously improve until acceptance criteria met                   |
| Module Documentation   | `docs/{feature}/module.md` (file index, functions, key points)       |

**Acceptance Criteria**: All tests pass + Complies with CLAUDE.md specs + No obvious performance issues

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

> **Monolith CQRS vs Database Read/Write Splitting**: Cloud PG cluster proxies (e.g., Alibaba Cloud PolarDB, RDS Proxy) solve **database load** problems — the same SQL is automatically routed to primary/read-only nodes, transparent to application code. Monolith CQRS solves **application model** problems — writes go through rich domain models to ensure business consistency, queries use flattened DTOs/database views bypassing the domain layer to reach data directly, each with different data structures and code paths. The former is horizontal scaling at the infrastructure level, the latter is separation of concerns at the code level. They don't conflict and can be stacked together.

> **Effect-TS Deep Integration**: Effect's `Context.Tag` + `Layer` system is naturally hexagonal architecture — `Tag` declares the interface (Port), `Layer` provides the implementation (Adapter), business logic is orchestrated through `Effect.gen`, depending only on Tag abstractions rather than concrete implementations. Swap out a `Layer` in tests to inject mocks, no extra interface files needed. Meanwhile, Effect's type channel `Effect<Success, Error, Requirements>` makes dependencies, errors, and success values all explicitly declared in the function signature — the compiler forces you to handle every error path, missing one is a compile error. Compared to hand-written Port/Adapter + try/catch, Effect solves dependency injection, error handling, and concurrency control with a single mechanism, suitable for state machines, workflows, cross-service orchestration, and other truly complex business scenarios. This project already uses Effect at the infrastructure layer (distributed locks `withLock`, task queues, resource initialization), and the business layer can adopt it incrementally as needed.

```text
src/domain/[module]/                     # Domain layer (pure business logic)
├── [module].entity.ts                   # Domain entity
├── [module].service.ts                  # Domain service
└── [module].repository.port.ts          # Repository interface (Port)
src/infrastructure/persistence/          # Infrastructure layer (Adapter implementation)
```

## Core Architecture Features

### 🔄 Auto Route Loading

Auto-scans and registers route modules from `routes/{tier}/**/*.index.ts` using `import.meta.glob`. Just create a directory to add new modules, HMR takes effect in milliseconds after saving. Each module must `export default` the route instance in `{feature}.index.ts`.

### 🧩 Singleton Management System

Unified management for long-lived connections like PostgreSQL, Redis, and Casbin. Solves connection leak issues in Vite HMR mode with automatic resource cleanup.

### 💉 Three-Layer Dependency Injection

This project does not use a traditional DI container (e.g., InversifyJS), opting for a lighter and more direct three-layer injection strategy:

| Layer                | Mechanism                                                          | Scope      | Typical Usage                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module Singleton** | `createSingleton` / `createAsyncSingleton` / `createLazySingleton` | Process    | DB connection pool, Redis client, Casbin Enforcer, Logger and other long-lived resources                                                                            |
| **Request Context**  | Hono `c.set()` / `c.get()` + `AppBindings` type constraint         | Request    | JWT payload, request ID, tierBasePath and other request-scoped data, written by middleware → read by handlers                                                       |
| **Effect Layer**     | `Context.Tag` + `Layer.mergeAll`                                   | Composable | Type-safe composition of infrastructure services (DB, Logger, pg-boss), used for distributed locks, task queues, and other scenarios requiring Effect orchestration |

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

### 📝 Logging System

Built on pino transport architecture, supporting multi-target output (dev `pino-pretty` / production stdout JSON / optional Alibaba Cloud SLS). Three child loggers auto-inject `type` field: `logger` (system), `operationLogger` (CRUD audit, type: `OPERATION`), `loginLogger` (login records, type: `LOGIN`).

Operation log middleware is globally configured in admin tier (parameterless mode stores raw `urlPath`), also supports local mode with manually specified module names:

```typescript
router.use(operationLog({ moduleName: "Order Management", description: "Create Order" }));
```

Custom Transport integration: Create `transports/sls-transport.mjs` in project root, build with `pino-abstract-transport`, then uncomment the SLS target in `logger.ts`'s `buildTransportTargets()`. Operation log `urlPath` naturally corresponds to Casbin keymatch3 rules and Refine resources, frontend can directly use permission tree mapping to Chinese labels as log filter dimensions.

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t clhoria-template .

# Run container
docker run -p 9999:9999 --env-file .env clhoria-template
```

## Deployment Features

**Optional SaaS Dependencies**: Sentry, Cloudflare R2 object storage and other third-party services are all optional, can be fully deployed in intranet environments. Tech stack meets localization requirements, supports migration to domestic databases (e.g., Kingbase, Huawei GaussDB, etc.).

## Development Experience Comparison

| Comparison           | This Project (AI + Modern Stack)                                                        | Traditional Code Generators                                                             |
| -------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Efficiency**       | Claude Code intelligently understands requirements, generates compliant code in seconds | Manual template configuration tedious, generates rigid code needing heavy modifications |
| **API Management**   | OpenAPI + Zod auto-sync, type-safe, docs never outdated                                 | Manual API documentation maintenance, easy inconsistency                                |
| **Code Quality**     | TypeScript full-chain type checking, catch issues at compile time                       | Generated code lacks type constraints, runtime errors frequent                          |
| **Maintenance Cost** | Unified code standards, AI understands project architecture, simple maintenance         | Large codebase not elegant enough, hard to maintain                                     |

## CAPTCHA System Comparison

### 🔐 Cap.js vs svg-captcha

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

### 🚀 High Concurrency & Performance Optimization Solutions

**High Concurrency Solution**: K8s/Alibaba Cloud SLB load balancing + PostgreSQL/Redis HA clusters + distributed sessions, enabling stateless horizontal scaling

**CPU-intensive Optimization**:

| Scenario                  | Recommended    | Use Case                                                           |
| ------------------------- | -------------- | ------------------------------------------------------------------ |
| **Repeated Calls**        | napi-rs        | Image processing, encryption/decryption, data compression          |
| **Single Intensive Calc** | WASM           | Complex algorithms, scientific computing, single heavy computation |
| **Parallel Multi-task**   | Worker Threads | Many independent tasks, concurrent data processing                 |

## Claude Code Deep Integration (Optional)

This project is designed for AI-driven development, providing complete CLAUDE.md configuration for deep AI understanding of project architecture.

**Recommended MCP Plugins**:

- **[Serena](https://github.com/SerenaAI/serena-mcp)**: Intelligent code analysis and refactoring suggestions
- **[Context7](https://github.com/context7/mcp-plugin)**: Real-time technical documentation queries and code examples

## VSCode Code Snippets

The project includes built-in code snippet templates for CRUD development (`.vscode/crud.code-snippets`). Type the prefix in a TypeScript file and press `Tab` to quickly generate code.

| Prefix          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `crud-schema`   | Complete schema.ts template                              |
| `crud-routes`   | Complete routes.ts template (with all 5 CRUD routes)     |
| `crud-handlers` | Complete handlers.ts template (with all 5 CRUD handlers) |
| `crud-index`    | Complete index.ts template                               |

## Testing

Uses Vitest testing framework, supports complete unit testing and integration testing, can add end-to-end tests under tests directory.

```bash
# Run tests
pnpm test
```

## References

- [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter)
- [stoker](https://github.com/w3cj/stoker)

## Support

For questions or suggestions, please open an [Issue](https://github.com/zhe-qi/clhoria-template/issues).

## Contributing Guidelines

Contributions welcome! Please follow [Conventional Commits](https://www.conventionalcommits.org/) specifications, ensure `pnpm test` and `pnpm lint` pass before submitting PR.

## License

MIT License - see [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) file for details.

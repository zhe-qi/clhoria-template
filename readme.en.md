# Clhoria - Hono-based Rapid Development Template

[简体中文](./README.md) | English

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

A modern enterprise-grade backend template built on the Hono framework. Designed with AI-driven development in mind, combining Hono + OpenAPI + Zod for complete type safety and enhanced development efficiency. Features Drizzle ORM + PostgreSQL data layer and comprehensive RBAC permission system, providing a more stable and efficient development experience than traditional backend management systems.

Clhoria simplifies complex technical architectures, making every coding session elegant and every feature bloom beautifully. Choose Clhoria, choose to move forward with the future.

> Frontend admin panel based on Refine + Shadcn: [https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## Features

- **Modern Tech Stack**: Hono + TypeScript + Vite + Drizzle ORM + PostgreSQL
- **Progressive Layering**: Functional development standards, multi-tier routing structure, optional DDD for complex business
- **Automated Documentation**: OpenAPI 3.1 spec + Scalar UI, code as documentation with online debugging and type generation
- **Multi-layer Auth**: Dual JWT keys (Admin/Client isolation) + Casbin RBAC + KeyMatch3 RESTful path matching, no backend permission identifier storage needed
- **Declarative Paginator**: Secure declarative queries based on Refine spec, extended Refine query with backend-only JOIN support
- **Complete Permission System**: User management + Role management + Casbin policies + Refine Resource compile-time menu routing, zero runtime overhead
- **Business + System Dictionary**: Business dictionaries support runtime dynamic configuration (JSONB + Redis cache), system dictionaries use PostgreSQL Enum for compile-time type checking
- **Logging Middleware**: Collects logs with support for multiple storage solutions (Alibaba Cloud SLS, PostgreSQL TimescaleDB, Loki, etc.)
- **High-performance Cache**: Redis caching (cluster mode supported) + multi-layer rate limiting + permission caching + session management + distributed locks
- **Task Queue & Scheduling**: Background task queue management and scheduled tasks based on pg-boss (distributed-safe, single execution across nodes)
- **Distributed Transactions**: pg-boss based Saga coordinator with multi-step transactions, automatic compensation rollback, retry strategies, timeout handling
- **Functional Infrastructure**: Infrastructure layer built on Effect-TS with type-safe dependency injection, composable error handling, structured concurrency
- **Object Storage**: Integrated S3-compatible object storage (supports Cloudflare R2, Alibaba Cloud OSS, AWS S3, etc.)
- **Smart CAPTCHA**: Integrated Cap.js, lightweight modern CAPTCHA based on SHA-256 proof-of-work, privacy-friendly with zero tracking
- **Type-safe System**: Hono + Zod + TypeScript full-chain type inference, catch issues at compile time
- **Instant Feedback Development**: Vite-powered hot-reload dev environment, millisecond-level code updates for ultimate development experience
- **Declarative DSL Architecture**: `defineConfig` drives application assembly, `defineMiddleware` declares middleware chains, entry file stays minimal
- **AI-driven Development**: Claude Code + CLAUDE.md + MCP plugin ecosystem, AI understands project architecture, auto-generates test cases (Vitest)
- **Monitoring System**: Integrated Sentry error tracking, supports self-hosted or cloud-native solutions (cloud services recommended for small teams, maintenance-free)
- **Excel Processing**: High-performance Excel import/export based on excelize-wasm, singleton lazy loading, Docker deployment compatible

## Project Preview

<div align="center">
  <img src="https://r2.promptez.cn/github/studio.png" width="45%" alt="Drizzle Studio">
  <img src="https://r2.promptez.cn/github/test.png" width="45%" alt="Swagger API Documentation">
  <img src="https://r2.promptez.cn/github/login.png" width="45%" alt="Swagger API Documentation">
  <img src="https://r2.promptez.cn/github/user.png" width="45%" alt="Swagger API Documentation">
  <img src="https://r2.promptez.cn/github/swagger.png" width="45%" alt="Swagger API Documentation">
  <img src="https://r2.promptez.cn/github/list.png" width="45%" alt="Swagger API Documentation">
</div>

## Quick Start

### Local Development Environment

- Node.js >= 24
- pnpm >= 10
- PostgreSQL >= 18
- Redis >= 7

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
   # Push database schema to development environment
   pnpm push

   # Seed initial data (optional, will auto-initialize on app startup)
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

This project supports using the experimental ts-go to enhance TypeScript type checking and language service performance. With the current project scale, ts-go provides significant performance improvements and the language service is relatively stable, so it is recommended.

### Using ts-go (Recommended)

Install the VSCode extension: [TypeScript Native Preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)

> **Note**: Currently ts-go is only used for type checking and language service. Development and bundling are based on Vite (Rolldown), runtime uses tsx.

### Not Using ts-go

If you prefer not to use ts-go, follow these steps to revert:

1. Remove `"typescript.experimental.useTsgo": true` from `.vscode/settings.json`
2. Run `pnpm remove @typescript/native-preview`
3. Modify the `typecheck` command in `package.json`, changing `npx tsgo` to `tsc`

## Development Guidelines

This project adopts the **Spec-Driven Development (SDD)** methodology. SDD inverts the traditional development hierarchy—specifications become the primary artifact, and code becomes an implementation of the spec. Through AI capabilities, precise specifications can directly generate working code while structured processes prevent chaos.

> 📖 Further reading: [Spec-Driven Development](https://github.com/github/spec-kit/blob/main/spec-driven.md)

### Claude Code Development Workflow

When developing features with Claude Code, follow this 6-stage standard workflow:

```
1. Spec (Requirements + Architecture + Test Planning) → 2. Generate Code →
3. Generate Tests → 4-5. Iterative Optimization → 6. Generate Module Docs
```

#### Core Points of Each Stage

| Stage                       | Goal                                               | Output                                                                  |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Spec                     | Requirements analysis, architecture, test planning | `docs/{feature}/spec.md` (requirements, architecture, test strategy)    |
| 2. Generate Code            | Generate complete code at once (Schema + Handlers) | Complete API code + migration                                           |
| 3. Generate Tests           | Generate executable tests based on API types       | `__tests__/int.test.ts`                                                 |
| 4-5. Iterative Optimization | Continuously improve until acceptance criteria met | Code passing acceptance                                                 |
| 6. Module Documentation     | Generate docs for future AI dev/maintenance        | `docs/{feature}/module.md` (related files, code functions, tech points) |

#### Acceptance Criteria (Done Criteria)

- ✅ All tests pass (**Required**)
- ✅ Complies with CLAUDE.md specs (**Required**)
- ✅ No obvious performance issues (**Required**)
- ✅ Code quality meets standards (**Optional**)

#### Documentation Output

After completing each feature module, should include the following docs:

```
docs/{feature}/
├── spec.md    # Spec document (requirements + architecture + test strategy)
└── module.md  # Module document (for future AI dev/maintenance)
```

<details>
<summary>📋 Document Template Examples (Click to expand)</summary>

**spec.md Template**

```markdown
# {Feature Name} Spec

## Requirements Analysis

### Feature Overview

{Brief description}

### Business Requirements

- {Requirement 1}
- {Requirement 2}

## Technical Architecture Design

### Database Design

- Table Structure: {table name, fields, types}
- Relations: {table relationships}
- Indexes: {indexing strategy}

### API Design

| Path                 | Method | Description | Permission |
| -------------------- | ------ | ----------- | ---------- |
| /api/admin/{feature} | GET    | List query  | admin      |
| /api/admin/{feature} | POST   | Create      | admin      |

### Tech Stack

- {Selected technologies and reasons}

### Key Technical Decisions

- {Important architectural decisions and rationale}

## Test Strategy

### Test Scenario Matrix

| API    | Normal Flow | Error Flow                | Edge Cases            |
| ------ | ----------- | ------------------------- | --------------------- |
| Create | ✓           | Duplicate, Invalid format | Field length limits   |
| Query  | ✓           | Non-existent ID           | Pagination boundaries |
```

**module.md Template**

> This document is for future AI to continue development or maintenance of this module, providing quick understanding of related files and code functions.

```markdown
# {Feature Name} - Module Documentation

## Module File Index

| File Path                                          | Purpose           |
| -------------------------------------------------- | ----------------- |
| `src/routes/admin/{feature}/{feature}.index.ts`    | Route entry       |
| `src/routes/admin/{feature}/{feature}.routes.ts`   | Route definition  |
| `src/routes/admin/{feature}/{feature}.handlers.ts` | Business handlers |
| `src/routes/admin/{feature}/{feature}.types.ts`    | Type definitions  |
| `src/routes/admin/{feature}/__tests__/int.test.ts` | Integration tests |
| `src/db/schema/admin/{feature}/{entity}.ts`        | Database Schema   |

## Related Modules

- **Dependencies**: {List modules this module depends on}
- **Dependents**: {List modules that depend on this module}

## Core Function Descriptions

### {Feature Point 1}

- **Entry Function**: `{function name}`
- **Implementation Logic**: {Brief description of logic}

## Data Flow Diagram

\`\`\`
Request → JWT Auth → RBAC → Zod Validation → Business Logic → Resp.ok()
\`\`\`

## Technical Notes & Pitfall Guide

- ⚠️ Responses must use `Resp.ok()` / `Resp.fail()` wrapper
- ⚠️ Use `logger.info()` not console.log
- ⚠️ DB Schema uses `snake_case`, TS uses `camelCase`
- {Other module-specific technical notes}
```

</details>

---

### Route Module Structure

```text
routes/{tier}/{feature}/
├── {feature}.handlers.ts    # Business logic handlers
├── {feature}.routes.ts      # Route definitions and OpenAPI schema
├── {feature}.schema.ts      # Zod validation schema (type constraints and API docs)
└── {feature}.index.ts       # Unified exports
```

### Database Schema

```text
src/db/schema/
├── {entity}.ts             # Drizzle table definitions
└── index.ts                # Unified exports
```

### Zod Schema Layering

| Layer  | Location             | Content                                  |
| ------ | -------------------- | ---------------------------------------- |
| db     | `db/schema/*.ts`     | `select*Schema` / `insert*Schema` (base) |
| routes | `routes/*/schema.ts` | `*PatchSchema` / `*Response` (business)  |

### Architecture Strategy

**Simple CRUD (80%)**: Handler directly operates database, functional design, extract service layer on demand

**Complex Business (20%)**: Choose architecture pattern based on scenario

| Scenario               | Recommended     | Description                         |
| ---------------------- | --------------- | ----------------------------------- |
| Simple CRUD            | 3-tier          | Handler directly operates Drizzle   |
| Need Tech Decoupling   | Hexagonal       | Port/Adapter isolates external deps |
| Complex Business Logic | DDD             | Domain model encapsulates rules     |
| Complex + Decoupling   | DDD + Hexagonal | Combine both                        |

**DDD / Hexagonal Architecture Directory Structure**:

```text
src/domain/[module]/                  # Domain layer (pure business, no external deps)
├── [module].entity.ts                # Domain entity: business rules, state changes
├── [module].service.ts               # Domain service: cross-entity logic, orchestration
└── [module].repository.port.ts       # Repository interface (Port)

src/infrastructure/persistence/       # Infrastructure layer (Adapter)
├── mappers/[module].mapper.ts        # Domain ↔ Drizzle mapping
└── repositories/[module].repository.ts  # Repository impl (Drizzle ORM)

src/routes/{tier}/{feature}/handlers.ts  # Presentation: HTTP + call domain services
```

**Core Principle**: Pure Domain (no Drizzle/Redis deps) → Port defines abstraction → Adapter implements details → Dependency Inversion

## Core Architecture Features

### 🔄 Auto Route Loading

Auto-scans and registers route modules using `import.meta.glob`. Just create a directory to add new modules. Supports HMR with millisecond-level hot updates.

### 🧩 Singleton Management System

Unified management for long-lived connections like PostgreSQL, Redis, and Casbin. Solves connection leak issues in Vite HMR mode with automatic resource cleanup.

### 🎯 Integrated Permission + Menu + Dictionary Solution

Modern architecture based on **Casbin + Refine + PostgreSQL Enum + OpenAPI**, thoroughly simplifying traditional backend management system complexity.

#### Core Concept

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

| Comparison          | Cap.js (Used in This Project)                                                  | svg-captcha                                              |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Security**        | SHA-256 proof-of-work, no visual attack surface, anti-automation               | Image-based recognition, easily cracked by OCR tools     |
| **User Experience** | No visual puzzles, background silent computation, Widget/Invisible mode        | Traditional image verification, recognize distorted text |
| **Privacy**         | Self-hosted, zero tracking & telemetry, full data control                      | Memory storage, fixed functionality                      |

## Performance Comparison

### Hono vs Fastify Performance Analysis

In Node.js 22 environment, Fastify still maintains performance advantage, but the gap is small:

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

Detailed benchmark: [bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

### 🚀 High Concurrency & Performance Optimization Solutions

**High Concurrency Solution**: K8s/Cloud SLB load balancing + PostgreSQL/Redis HA clusters + distributed sessions, enabling stateless horizontal scaling

**CPU-intensive Optimization**:

| Scenario                  | Recommended    | Use Case                                                       |
| ------------------------- | -------------- | -------------------------------------------------------------- |
| **Repeated Calls**        | napi-rs        | Image processing, encryption/decryption, data compression      |
| **Single Intensive Calc** | WASM           | Complex algorithms, scientific computing, single recalculation |
| **Parallel Multi-task**   | Worker Threads | Many independent tasks, concurrent data processing             |

## Claude Code Deep Integration (Optional)

This project is designed for AI-driven development, providing complete CLAUDE.md configuration for deep AI understanding of project architecture.

**Recommended MCP Plugins**:

- **[Serena](https://github.com/SerenaAI/serena-mcp)**: Intelligent code analysis and refactoring suggestions
- **[Context7](https://github.com/context7/mcp-plugin)**: Real-time technical documentation queries and code examples

## VSCode Code Snippets

The project includes built-in code snippet templates for CRUD development (`.vscode/crud.code-snippets`). Type the prefix in a TypeScript file and press `Tab` to quickly generate code.

### Complete Module Templates

| Prefix          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `crud-schema`   | Complete schema.ts template                              |
| `crud-routes`   | Complete routes.ts template (with all 5 CRUD routes)     |
| `crud-handlers` | Complete handlers.ts template (with all 5 CRUD handlers) |
| `crud-index`    | Complete index.ts template                               |

### Individual Route/Handler

| Prefix                                                    | Description                       |
| --------------------------------------------------------- | --------------------------------- |
| `r-list` / `r-create` / `r-get` / `r-update` / `r-remove` | Individual route definitions      |
| `h-list` / `h-create` / `h-get` / `h-update` / `h-remove` | Individual handler functions      |
| `r-custom` / `h-custom`                                   | Custom route or handler templates |

### Common Code Snippets

| Prefix                                     | Description                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| `ir` / `ih` / `is`                         | Import common dependencies for routes/handlers/schema |
| `rok` / `rcreated` / `rfail` / `rnotfound` | Response shortcuts                                    |
| `logi` / `loge`                            | Logger shortcuts                                      |
| `db-tx`                                    | Database transaction template                         |

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

For questions or suggestions, please create an [Issue](https://github.com/zhe-qi/clhoria-template/issues) or contact the maintainer.

**QQ Group**: 1076889416

## Contributing Guidelines

Contributions welcome! Please follow [Conventional Commits](https://www.conventionalcommits.org/) specifications, ensure `pnpm test` and `pnpm lint` pass before submitting PR.

## License

MIT License - see [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) file for details.

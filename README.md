# Clhoria - Hono-based Rapid Development Template

[简体中文](./readme.zh-CN.md) | English

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

A modern enterprise-grade backend template built on the Hono framework. Designed with AI-driven development in mind, combining Hono + OpenAPI + Zod for complete type safety and enhanced development efficiency. Features Drizzle ORM + PostgreSQL data layer and comprehensive RBAC permission system, providing a more stable and efficient development experience than traditional backend management systems.

Clhoria simplifies complex technical architectures, making every coding session elegant and every feature bloom beautifully. Choose Clhoria, choose to move forward with the future.

> Frontend admin panel based on Refine + Shadcn: [https://github.com/zhe-qi/refine-project](https://github.com/zhe-qi/refine-project)

## Features

- **Modern Tech Stack**: Hono + TypeScript + Drizzle ORM + PostgreSQL
- **Hybrid Architecture**: Functional development standards, multi-tier routing structure, optional DDD for complex business
- **Automated Documentation**: OpenAPI 3.1 spec + Scalar UI, code as documentation with online debugging and type generation
- **Multi-layer Auth**: Dual JWT keys (Admin/Client isolation) + Casbin RBAC
- **Declarative Paginator**: Secure declarative queries based on Refine spec, extended Refine query with backend-only JOIN support
- **Complete RBAC**: User management + Role management + Casbin policies + Refine Resource menus
- **Intelligent Permission System**: Casbin KeyMatch3 + RESTful + Refine Resource, no backend permission identifier storage needed
- **High-performance Menu**: Based on Refine best practices for menus and routing, better performance than traditional dynamic routing
- **Type-safe Dictionary**: PostgreSQL Enum + Drizzle-Zod + OpenAPI manual frontend enum sync, compile-time type checking
- **Logging Middleware**: Collects logs with support for multiple storage solutions (Alibaba Cloud SLS, PostgreSQL TimescaleDB, Loki, etc.)
- **High-performance Cache**: Redis caching + multi-layer rate limiting + permission caching + session management + distributed locks
- **Task Queue**: BullMQ-based scheduled tasks and background task queue management
- **Object Storage**: Integrated S3-compatible object storage (supports Cloudflare R2, Alibaba Cloud OSS, AWS S3, etc.)
- **Smart CAPTCHA**: Integrated Cap.js with modern CAPTCHA system supporting multiple challenge types
- **AI-native Development**: Claude Code + OpenAPI auto-generation, say goodbye to manual API documentation maintenance
- **Type-safe System**: Hono + Zod + TypeScript full-chain type inference, catch issues at compile time
- **Smart Test Coverage**: Vitest + AI assistance, auto-generate test cases ensuring API stability
- **Instant Feedback Development**: Hot-reload dev environment, code changes take effect instantly without restart
- **Claude Code Optimized**: Complete CLAUDE.md configuration, MCP plugin ecosystem, AI understands project architecture
- **Monitoring System**: Integrated Sentry error tracking, supports self-hosted or cloud-native solutions (cloud services recommended for small teams, maintenance-free)

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

## Development Guidelines

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

**Architecture Principles**:

- **Extract on Demand**: Only create service layer when business logic is reused across multiple routes, avoid over-abstraction
- **Functional Design**: Use named exports with pure/async functions, support standard prefixes like `create*`, `get*`, `update*`, `delete*`
- **Hybrid Implementation**: Simple CRUD operations directly in handlers, complex business logic extracted as service functions
- **Transaction Management**: Complex business operations use `db.transaction()` to ensure data consistency
- **Cache Integration**: Service layer integrates Redis caching for data caching and permission cache management

### Hybrid Architecture Strategy (Optional)

**Simple CRUD (80%)**: Implement directly in handlers, keep it lightweight

```typescript
// routes/admin/posts/handlers.ts
export const list: PostRouteHandlerType<"list"> = async (c) => {
  const result = await db.select().from(posts).limit(10);
  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};
```

**Complex Business (20%)**: Adopt lightweight DDD layering

```text
src/domain/user/                      # Domain layer
├── user.application.ts               # Application service: orchestrates multiple domain services
├── user.entity.ts                    # Domain entity: core business logic and rule validation
└── user.repository.ts                # Repository interface: defines data access abstraction

src/infrastructure/persistence/       # Infrastructure layer
└── user.repository.impl.ts           # Repository implementation: Drizzle ORM data access

src/routes/admin/users/handlers.ts   # Presentation layer: calls application service orchestration
```

**Layer Responsibilities**:

- **Handler**: HTTP request/response, parameter validation, call application services, error code mapping
- **Application**: Business process orchestration, transaction boundary control, cross-aggregate coordination
- **Entity**: Domain object modeling, business rule validation, state change logic
- **Repository**: Separation of data access abstraction and implementation

## Core Architecture Features

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
| **Security**        | Multiple challenge types, hard to break by automated tools                     | Image-based recognition, easily cracked by OCR tools     |
| **User Experience** | Modern interactive interface, quick verification, far superior user experience | Traditional image verification, recognize distorted text |
| **Extensibility**   | Database storage, supports distributed deployment and custom challenge types   | Memory storage, fixed functionality                      |

## Performance Comparison

### Hono vs Fastify Performance Analysis

In Node.js 22 environment, Fastify still maintains performance advantage, but the gap is small:

- **Fastify (Node.js)**: 142,695 req/s
- **Hono (Node.js)**: 129,234 req/s

Detailed benchmark: [bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark)

### 🚀 High Concurrency & Performance Optimization Solutions

**High Concurrency Solution**: K8s cluster + load balancing + Redis distributed sessions + database master-slave read-write separation, enabling stateless horizontal scaling

**CPU-intensive Optimization**:

| Scenario                  | Recommended Solution  | Use Case                                                       |
| ------------------------- | --------------------- | -------------------------------------------------------------- |
| **Repeated Calls**        | N-API (Native Module) | Image processing, encryption/decryption, data compression      |
| **Single Intensive Calc** | WASM                  | Complex algorithms, scientific computing, single recalculation |
| **Parallel Multi-task**   | Worker Threads        | Many independent tasks, concurrent data processing             |

## Claude Code Deep Integration (Optional)

This project is designed for AI-driven development, providing complete CLAUDE.md configuration for deep AI understanding of project architecture.

**Recommended MCP Plugins**:

- **[Serena](https://github.com/SerenaAI/serena-mcp)**: Intelligent code analysis and refactoring suggestions
- **[Context7](https://github.com/context7/mcp-plugin)**: Real-time technical documentation queries and code examples

## Testing

Uses Vitest testing framework, supports complete unit testing and integration testing, can add end-to-end tests under tests directory.

```bash
# Run tests
pnpm test
```

## Support

For questions or suggestions, please create an [Issue](https://github.com/zhe-qi/clhoria-template/issues) or contact the maintainer.

## Contributing Guidelines

Contributions welcome! Please follow [Conventional Commits](https://www.conventionalcommits.org/) specifications, ensure `pnpm test` and `pnpm lint` pass before submitting PR.

## License

MIT License - see [LICENSE](https://github.com/zhe-qi/clhoria-template/blob/main/LICENSE) file for details.

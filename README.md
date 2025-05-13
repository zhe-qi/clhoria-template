# Hono 模板

这是一个基于 [Hono](https://hono.dev/) 框架的 API 开发模板，灵感来源于 [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter)。

## 特性

- 🚀 使用 [Hono](https://hono.dev/) 构建高性能 API
- 📝 集成 OpenAPI 文档（通过 [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)）
- 🔍 API 参考文档（使用 [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)）
- 🛢️ 数据库集成（使用 [Drizzle ORM](https://orm.drizzle.team/) 和 [PostgreSQL](https://www.postgresql.org/)）
- 🔒 密码加密（使用 [@node-rs/argon2](https://github.com/napi-rs/node-rs/tree/main/packages/argon2)）
- 🔐 权限控制（使用 [Casbin](https://casbin.org/)）
- 📅 日期处理（使用 [date-fns](https://date-fns.org/) 和 [date-fns-tz](https://github.com/marnusw/date-fns-tz)）
- 📊 请求日志（使用 [hono-pino](https://github.com/honojs/middleware/tree/main/packages/pino) 和 [pino](https://getpino.io/)）
- 🧪 测试框架（使用 [Vitest](https://vitest.dev/)）
- 🔧 代码质量工具（使用 [ESLint](https://eslint.org/) 和 [TypeScript](https://www.typescriptlang.org/)）

## 快速开始

### 安装依赖

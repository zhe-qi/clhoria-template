# 项目概述

## 项目简介
基于 Hono 框架的后端模板项目，使用 TypeScript、Drizzle ORM 和 PostgreSQL，实现严格的路由分离多层架构（公共、客户端、管理端）。

## 核心技术栈
- **Web 框架**: Hono + OpenAPI 支持
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: JWT + @node-rs/argon2 密码哈希
- **授权**: Casbin RBAC
- **缓存**: Redis + ioredis
- **文档**: OpenAPI 3.0 + Scalar API Reference
- **测试**: Vitest
- **构建**: tsdown（生产）+ tsx（开发）
- **代码质量**: ESLint + @antfu/eslint-config

## 架构特点
- 三层路由结构：公共路由（无认证）、客户端路由（JWT认证）、管理端路由（JWT + Casbin授权）
- 严格的代码分层：routes -> handlers -> services -> database
- 多租户支持，完整的 RBAC 权限系统
- 完善的缓存机制和数据隔离

## 项目结构
```
src/
├── app.ts                 # 应用入口和路由配置
├── routes/               # 路由层（按 public/client/admin 分层）
├── services/             # 业务逻辑层
├── db/schema/           # 数据库架构定义
├── lib/                 # 工具库和配置
├── middlewares/         # 中间件
└── scripts/            # 脚本工具
```
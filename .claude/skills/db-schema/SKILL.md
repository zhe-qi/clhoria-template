---
name: db-schema
description: 创建或修改数据库 Schema。当需要创建新表、修改表结构、定义字段、设置索引约束、或涉及 Drizzle ORM / drizzle-zod 操作时使用
argument-hint: [tier/category/feature-name]
---

# 数据库 Schema 开发指南

## 技术栈

- **ORM**: Drizzle ORM (postgres.js driver)
- **Schema 验证**: drizzle-zod + Zod v4
- **数据库**: PostgreSQL

## 文件结构

```
src/db/schema/
├── _shard/              # 共享定义
│   ├── base-columns.ts  # 基础列（id/createdAt/updatedAt/createdBy/updatedBy）
│   ├── enums.ts         # 数据库枚举定义
│   └── types/           # 共享类型
├── _infra/              # 基础设施表（非业务表）
│   └── saga/            # Saga 分布式事务
├── admin/               # 管理端表
│   ├── system/          # 系统管理
│   └── auth/            # 认证相关
├── client/              # 客户端表
└── index.ts             # 统一导出
```

> **注意**: `_infra` 目录使用下划线前缀，存放基础设施相关的表（如 Saga、审计日志、定时任务记录等），与业务表分开管理。

## 核心规则

### 导入方式

```typescript
import db from "@/db";  // 数据库实例（default export）
import { users } from "@/db/schema";  // Schema 定义
```

### 命名约定

- TS 属性名：camelCase（自动转换为 snake_case）
- 表名：`{tier}_{feature}s`（如 `system_users`）
- 索引名：`{表名}_{字段名}_idx`
- 主键：统一命名为 `id`

### 批量插入

```typescript
// 正确：批量插入
db.insert(table).values([...items])

// 错误：循环单条插入
for (const item of items) {
  db.insert(table).values(item)  // 不要这样做
}
```

## 模板参考

### 数据库 Schema

参考 [db-schema.md](../_shared/templates/db-schema.md)

包含：
- 标准表定义
- 字段类型参考
- 约束定义语法
- 主键设计规则
- 索引设计原则
- 枚举定义流程
- Relations 定义
- JSONB 使用规范
- Drizzle-kit 工作流程

### Zod Schema

参考 [zod-schema.md](../_shared/templates/zod-schema.md)

包含：
- 标准 Schema 文件结构
- Schema 派生规则
- 最佳实践
- Zod v4 注意事项

### PostgreSQL 表设计最佳实践

参考 [postgresql-design.md](templates/postgresql-design.md)

包含：
- 数据类型选择（避免使用的类型、推荐类型）
- 约束设计（PK、FK、UNIQUE、CHECK、EXCLUDE）
- 索引类型（B-tree、GIN、GiST、BRIN）
- 分区策略（RANGE、LIST、HASH）
- 特殊场景优化（更新密集、插入密集、Upsert）
- 安全 Schema 演进
- JSONB 使用指南
- 常用扩展（pgcrypto、pg_trgm、timescaledb、postgis、pgvector）

### 数据库迁移指南

参考 [migration.md](templates/migration.md)

包含：
- Drizzle 工作流程（push vs generate vs migrate）
- 迁移最佳实践（小单位迁移、安全添加/删除列）
- 生产检查清单（迁移前/中/后）
- 回滚策略
- 常见问题解答

## 开发流程

### 创建新表

1. 在 `src/db/schema/{tier}/{category}/` 下创建文件
2. 定义表结构（继承 baseColumns）
3. 创建 selectSchema 和 insertSchema
4. 在 `src/db/schema/index.ts` 中导出
5. 运行 `pnpm push`（开发环境）

### 修改现有表

1. 修改 schema 文件中的表定义
2. 运行 `pnpm push`（开发环境）
3. 如果需要迁移数据，编写迁移脚本

### 生产部署

```bash
pnpm generate  # 生成迁移文件
pnpm migrate   # 执行迁移
```

## 重要提醒

- **永远不要** 手动修改 `migrations/` 和 `meta/` 文件夹
- 使用枚举时确保 TS 枚举和 DB 枚举保持同步
- 外键选择：物理外键（需级联）vs 逻辑外键（应用层维护）
- 索引设计：不确定时先询问，避免过度设计

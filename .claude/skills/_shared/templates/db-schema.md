# 数据库 Schema 模板

## 技术栈

- **ORM**: Drizzle ORM (postgres.js driver)
- **Schema 验证**: drizzle-zod + Zod v4
- **数据库**: PostgreSQL

## 核心规则

### 列名自动转换

新版 Drizzle 不需要显式指定列名，TS camelCase 自动转换为数据库 snake_case：

```typescript
// 正确写法（新版）
export const users = pgTable("users", {
  createdAt: timestamp({ mode: "string" }),  // → created_at
  updatedBy: varchar({ length: 64 }),        // → updated_by
});

// 旧版写法（已废弃，不要使用）
createdAt: timestamp("created_at", { mode: "string" }),
```

### 主键设计规则

所有主键统一命名为 `id`：

```typescript
// 情况1：使用 baseColumns 的自动 UUID（默认）
// 适用于：id 无业务含义，如 dicts、users、orders
export const systemDicts = pgTable("system_dicts", {
  ...baseColumns,  // 包含 id: uuid().primaryKey()
  code: varchar({ length: 64 }).notNull().unique(),
});

// 情况2：覆盖 id 为有意义的 code
// 适用于：id 有业务含义，如 roles、permissions
// 这种情况下不允许修改 id，只能删除后重建
export const systemRoles = pgTable("system_roles", {
  ...baseColumns,
  id: varchar({ length: 64 }).notNull().primaryKey(),  // 覆盖 uuid
  name: varchar({ length: 64 }).notNull(),
});
```

### baseColumns 选择使用

不是所有表都需要完整的 `...baseColumns`，根据场景选择：

```typescript
// 情况1：业务表 - 使用完整 baseColumns（需要审计字段）
export const orders = pgTable("orders", {
  ...baseColumns,  // id, createdAt, createdBy, updatedAt, updatedBy
  // ...
});

// 情况2：基础设施表 - 只需要部分字段（无需审计）
// 如：Saga、队列任务、系统日志等
export const sagas = pgTable("sagas", {
  id: baseColumns.id,           // 只要 id
  createdAt: baseColumns.createdAt,  // 只要创建时间
  // 不需要 createdBy, updatedAt, updatedBy
  // ...
});

// 情况3：关联表 - 无需 baseColumns
export const userRoles = pgTable("user_roles", {
  userId: uuid().notNull(),
  roleId: varchar({ length: 64 }).notNull(),
}, (table) => [
  primaryKey({ name: "user_roles_pkey", columns: [table.userId, table.roleId] }),
]);
```

**选择原则**：
- 业务实体表：使用 `...baseColumns`（需要审计谁创建/修改了数据）
- 基础设施表：使用 `baseColumns.id` + `baseColumns.createdAt`（系统自动管理）
- 关联表/无主键表：不使用 baseColumns

## 标准表定义

```typescript
// src/db/schema/{tier}/{category}/{feature}.ts
import { relations } from "drizzle-orm";
import { index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { statusEnum } from "@/db/schema/_shard/enums";
import { Status } from "@/lib/enums";
import { StatusDescriptions } from "@/lib/schemas";

/**
 * {Feature} 表
 */
export const {feature}s = pgTable("{tier}_{feature}s", {
  ...baseColumns,
  /** 名称 */
  name: varchar({ length: 128 }).notNull(),
  /** 编码（唯一） */
  code: varchar({ length: 64 }).notNull().unique(),
  /** 描述 */
  description: text(),
  /** 状态 */
  status: statusEnum().default(Status.ENABLED).notNull(),
}, (table) => [
  // 索引定义
  index("{tier}_{feature}s_status_idx").on(table.status),
]);

/**
 * Select Schema
 */
export const select{Feature}sSchema = createSelectSchema({feature}s, {
  id: schema => schema.meta({ description: "ID" }),
  name: schema => schema.meta({ description: "名称" }),
  code: schema => schema.meta({ description: "编码" }),
  description: schema => schema.meta({ description: "描述" }),
  status: schema => schema.meta({ description: StatusDescriptions.SYSTEM }),
  createdAt: schema => schema.meta({ description: "创建时间" }),
  createdBy: schema => schema.meta({ description: "创建人" }),
  updatedAt: schema => schema.meta({ description: "更新时间" }),
  updatedBy: schema => schema.meta({ description: "更新人" }),
});

/**
 * Insert Schema
 */
export const insert{Feature}sSchema = createInsertSchema({feature}s).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
```

## 字段类型参考

```typescript
// 字符串 - 必须指定长度
varchar({ length: 64 })           // 短文本
varchar({ length: 128 })          // 中等文本
varchar({ length: 255 })          // 较长文本
text()                            // 长文本（无长度限制）

// 数字
integer()
bigint({ mode: "number" })
real()                            // 浮点数

// 布尔
boolean().default(false)

// 时间
timestamp({ mode: "string" })     // 返回字符串格式

// JSON
jsonb().$type<MyType[]>().default([])

// UUID 外键
// 物理外键（数据量 < 10万，需要级联删除）
uuid().references(() => otherTable.id, { onDelete: "cascade" })
// 逻辑外键（数据量可能超过数十万，或不需要级联操作）
uuid().notNull()  // 应用层维护引用完整性
```

## 约束定义语法

新版 Drizzle 使用数组形式，必须显式指定 snake_case name：

```typescript
export const users = pgTable("users", {
  id: uuid().primaryKey(),
  email: text(),
  name: text(),
}, (table) => [
  index("users_email_idx").on(table.email),
  uniqueIndex("users_name_idx").on(table.name),
  unique("users_email_name_unique").on(table.email, table.name),
]);

// 支持的约束类型
index("name_idx").on(table.field)                              // 普通索引
uniqueIndex("name_idx").on(table.field)                        // 唯一索引
unique("name_unique").on(table.f1, table.f2)                   // 唯一约束
primaryKey({ name: "pk_name", columns: [table.f1, table.f2] }) // 复合主键
foreignKey({ ... })                                            // 外键约束
check("check_name", sql`...`)                                  // 检查约束
```

## 索引设计原则

- 不过度设计，也不完全不设计
- 唯一约束字段（`.unique()`）自动包含索引，无需额外添加
- 状态字段（status）：数据量可能较大时建议添加索引
- 外键字段：关联表的 xxxId 字段建议添加索引
- 排序字段：常用于 ORDER BY 的字段考虑添加索引
- **不确定时：询问用户再决定是否添加**

## 枚举定义三步流程

### Step 1: 定义 TS 枚举

```typescript
// src/lib/enums/common.ts
export const MyStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type MyStatusType = (typeof MyStatus)[keyof typeof MyStatus];
```

### Step 2: 创建 DB 枚举

```typescript
// src/db/schema/_shard/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";
import { MyStatus } from "@/lib/enums";

export const myStatusEnum = pgEnum("my_status", Object.values(MyStatus));
```

### Step 3: 表中使用

```typescript
status: myStatusEnum().default(MyStatus.ACTIVE).notNull()
```

> 注意：修改枚举值需要数据库迁移，新增值用 `ALTER TYPE ... ADD VALUE`

## Relations 定义

### 一对多关系

```typescript
import { relations } from "drizzle-orm";

// 父表
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// 子表
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));
```

### 多对多关系（关联表）

```typescript
export const userRoles = pgTable("user_roles", {
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar({ length: 64 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ name: "user_roles_pkey", columns: [table.userId, table.roleId] }),
  index("user_roles_user_id_idx").on(table.userId),
]);

// 关联表的 relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));
```

## JSONB 使用规范

```typescript
// 定义类型
type DictItem = {
  label: string;
  value: string;
  sort: number;
  disabled?: boolean;
};

// 表中使用
items: jsonb().$type<DictItem[]>().default([]).notNull(),
```

使用规则：
- 必须使用 `$type<T>()` 指定 TypeScript 类型
- 数组类型建议设置 `.default([])`
- 根据业务需要决定是否 `.notNull()`
- **适用于**：配置项、元数据、不需要单独查询的嵌套数据
- **不适用于**：需要单独查询、索引、关联的数据

## Drizzle-kit 工作流程

```bash
# 开发环境
pnpm push          # 直接推送 schema 变更到数据库

# 生产环境
pnpm generate      # 生成迁移文件
pnpm migrate       # 执行迁移
```

**重要规则**：
- 不要修改已执行的迁移文件和 `meta/` 文件夹；未执行的迁移文件可以修改或删除后重新生成
- 开发环境只用 `push`，生产环境用 `generate` + `migrate`

## 数据库操作（无 MCP 时）

如果没有数据库 MCP：
1. 查看 `.env` 获取数据库连接信息
2. 使用 Python + psycopg2 执行 SQL 查询
3. 修改数据后需同步执行 drizzle-kit 命令

## 导出到 schema/index.ts

```typescript
// src/db/schema/index.ts
export * from "./{tier}/{category}/{feature}";
```

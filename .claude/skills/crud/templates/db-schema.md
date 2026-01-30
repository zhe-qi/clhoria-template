# 数据库 Schema 模板

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
export const {feature}s = pgTable("{feature}s", {
  ...baseColumns,
  /** 名称 */
  name: varchar({ length: 128 }).notNull(),
  /** 编码（唯一） */
  code: varchar({ length: 64 }).notNull().unique(),
  /** 描述 */
  description: text(),
  /** 状态 */
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  // 索引定义
  index("{feature}s_status_idx").on(table.status),
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
// 字符串
varchar({ length: 64 })           // 短文本，必须指定长度
varchar({ length: 128 })          // 中等文本
text()                            // 长文本

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

## 枚举三步流程

### 1. 定义 TS 枚举

```typescript
// src/lib/enums/common.ts
export const MyStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type MyStatusType = (typeof MyStatus)[keyof typeof MyStatus];
```

### 2. 创建 DB 枚举

```typescript
// src/db/schema/_shard/enums.ts
import { MyStatus } from "@/lib/enums";

export const myStatusEnum = pgEnum("my_status", Object.values(MyStatus));
```

### 3. 表中使用

```typescript
status: myStatusEnum().default(MyStatus.ACTIVE).notNull()
```

## 关系定义

### 一对多

```typescript
// 父表
export const {feature}sRelations = relations({feature}s, ({ many }) => ({
  children: many(childTable),
}));

// 子表
export const childTableRelations = relations(childTable, ({ one }) => ({
  parent: one({feature}s, {
    fields: [childTable.{feature}Id],
    references: [{feature}s.id],
  }),
}));
```

### 多对多（关联表）

```typescript
export const {feature}Roles = pgTable("{feature}_roles", {
  {feature}Id: uuid().notNull().references(() => {feature}s.id, { onDelete: "cascade" }),
  roleId: varchar({ length: 64 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
}, table => [
  primaryKey({ columns: [table.{feature}Id, table.roleId] }),
  index("idx_{feature}_roles_{feature}_id").on(table.{feature}Id),
]);
```

## 约束定义

```typescript
}, table => [
  // 唯一约束
  unique().on(table.code),
  unique().on(table.field1, table.field2),  // 复合唯一

  // 索引
  index("{feature}s_status_idx").on(table.status),
  index("{feature}s_created_at_idx").on(table.createdAt),
]);
```

## 导出到 schema/index.ts

```typescript
// src/db/schema/index.ts
export * from "./{tier}/{category}/{feature}";
```

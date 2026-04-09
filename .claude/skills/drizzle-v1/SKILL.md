---
name: drizzle-v1
description: Drizzle ORM v1 关系查询指南。当需要定义 Relations v2、编写关系查询、使用 through 多对多、预定义过滤器、或从旧版 Drizzle 迁移时使用
argument-hint: 关系定义/查询写法/迁移指导
---

# Drizzle ORM v1 (Relations Query v2) 指南

## 版本信息

- **当前版本**: `drizzle-orm@1.0.0-beta.21`（已进入 RC 阶段）
- **官方文档**: 所有 drizzle 官方文档已更新为 v1 写法
- **关键变化**: Relations 定义方式、查询 API、多对多 through 支持

## 核心概念

### drizzle() 初始化

传入 `relations` 而非 `schema`：

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { relations } from "./relations";

const db = drizzle({
  client: getQueryClient(),
  relations,
  casing: "snake_case",
});
```

## Relations 定义

### 基本结构

使用 `defineRelations` 在一处定义所有关系：

```typescript
// src/db/relations/index.ts
import { defineRelations } from "drizzle-orm";
import * as schema from "@/db/schema";

export const relations = defineRelations(schema, (r) => ({
  // 每个表的关系定义
  users: {
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

### 本项目的分片模式

本项目使用 `defineRelationsPart` + spread 方式拆分关系定义：

```typescript
// src/db/relations/index.ts
import { defineRelations } from "drizzle-orm";
import * as schema from "@/db/schema";
import { userRolesRelations } from "./admin/user-roles";

export const relations = defineRelations(schema, (r) => ({
  ...userRolesRelations(r),
}));
```

```typescript
// src/db/relations/admin/user-roles.ts
import type { ExtractTablesFromSchema, RelationsBuilder } from "drizzle-orm";
import type * as schema from "@/db/schema";

type Schema = ExtractTablesFromSchema<typeof schema>;

export const userRolesRelations = (r: RelationsBuilder<Schema>) => ({
  systemUsers: {
    roles: r.many.systemRoles({
      from: r.systemUsers.id.through(r.systemUserRoles.userId),
      to: r.systemRoles.id.through(r.systemUserRoles.roleId),
    }),
    enabledRoles: r.many.systemRoles({
      from: r.systemUsers.id.through(r.systemUserRoles.userId),
      to: r.systemRoles.id.through(r.systemUserRoles.roleId),
      where: { status: Status.ENABLED },
    }),
  },
  systemRoles: {
    users: r.many.systemUsers(),
  },
});
```

**关键模式**：
- 类型使用 `ExtractTablesFromSchema<typeof schema>` + `RelationsBuilder<Schema>`
- 返回对象直接 spread 到 `defineRelations` 中
- 按 `src/db/relations/{tier}/{feature}.ts` 组织文件

### 一对一 / 一对多

```typescript
// one: 指定 from → to 映射
posts: {
  author: r.one.users({
    from: r.posts.authorId,
    to: r.users.id,
  }),
},

// many: 可以只定义 many 侧（无需在对端定义 one）
users: {
  posts: r.many.posts({
    from: r.users.id,
    to: r.posts.authorId,
  }),
},
```

### 多对多 (through)

使用 `.through()` 指定连接表，无需手动查询连接表再映射：

```typescript
users: {
  groups: r.many.groups({
    from: r.users.id.through(r.usersToGroups.userId),
    to: r.groups.id.through(r.usersToGroups.groupId),
  }),
},
groups: {
  participants: r.many.users(), // 反向可省略 from/to
},
```

### 预定义过滤器 (where)

在关系定义中预设过滤条件，查询时直接使用：

```typescript
systemUsers: {
  enabledRoles: r.many.systemRoles({
    from: r.systemUsers.id.through(r.systemUserRoles.userId),
    to: r.systemRoles.id.through(r.systemUserRoles.roleId),
    where: { status: Status.ENABLED },
  }),
},
```

### optional 选项

`optional: false` 使关系成为必填（TypeScript 类型非 nullable）：

```typescript
posts: {
  author: r.one.users({
    from: r.posts.authorId,
    to: r.users.id,
    optional: false, // author 不会是 null
  }),
},
```

### alias（替代旧版 relationName）

自引用或同表多关系时使用 `alias` 区分：

```typescript
posts: {
  author: r.one.users({
    from: r.posts.authorId,
    to: r.users.id,
    alias: "author_post",
  }),
  reviewer: r.one.users({
    from: r.posts.reviewerId,
    to: r.users.id,
    alias: "reviewer_post",
  }),
},
```

## 查询 API

### where（对象语法）

```typescript
// 简单等值
db.query.users.findFirst({
  where: { id: userId },
});

// 多条件（AND）
db.query.users.findMany({
  where: { status: Status.ENABLED, username: "admin" },
});

// 操作符
db.query.users.findMany({
  where: {
    id: { gt: 10 },
    name: { like: "M%" },
  },
});

// 按关系过滤（v1 新增！）
db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: {
      content: { like: "M%" },
    },
  },
});

// 关系存在性过滤：获取至少有 1 篇 post 的用户
db.query.users.findMany({
  with: { posts: true },
  where: { posts: true },
});
```

#### where 完整操作符参考

```typescript
where: {
  // 逻辑组合
  OR: [],        // 或
  AND: [],       // 与
  NOT: {},       // 非

  // RAW SQL
  RAW: (table) => sql`${table.id} = 1`,

  // 按关系过滤
  [relation]: {},  // 如 posts: { content: { like: "M%" } }

  // 列操作符
  [column]: {
    eq: 1,                     // =
    ne: 1,                     // !=
    gt: 1,                     // >
    gte: 1,                    // >=
    lt: 1,                     // <
    lte: 1,                    // <=
    in: [1, 2],                // IN
    notIn: [1, 2],             // NOT IN
    like: "M%",                // LIKE
    ilike: "m%",               // ILIKE（不区分大小写）
    notLike: "M%",             // NOT LIKE
    notIlike: "m%",            // NOT ILIKE
    isNull: true,              // IS NULL
    isNotNull: true,           // IS NOT NULL
    arrayOverlaps: [1, 2],     // 数组重叠
    arrayContained: [1, 2],    // 数组被包含
    arrayContains: [1, 2],     // 数组包含

    // 列级逻辑组合
    OR: [],
    AND: [],
    NOT: {},
  },
}
```

### orderBy（对象语法）

```typescript
db.query.users.findMany({
  orderBy: { id: "asc" },
});

// 多字段排序
db.query.users.findMany({
  orderBy: { createdAt: "desc", name: "asc" },
});

// 自定义 SQL 排序
db.query.posts.findMany({
  orderBy: (t) => sql`${t.id} asc`,
});

// 关系内排序
db.query.posts.findMany({
  orderBy: { id: "asc" },
  with: {
    comments: {
      orderBy: { id: "desc" },
    },
  },
});
```

### with（关系加载）

```typescript
// 加载全部列
db.query.users.findFirst({
  where: { id: userId },
  with: { roles: true },
});

// 选择部分列
db.query.users.findFirst({
  where: { id: userId },
  with: {
    roles: {
      columns: { id: true, name: true },
    },
  },
});

// 预定义过滤关系
db.query.users.findFirst({
  where: { id: userId },
  with: { enabledRoles: { columns: { id: true } } },
});
```

### columns（选择列）

```typescript
db.query.users.findFirst({
  where: { id: userId },
  columns: { id: true, username: true, avatar: true },
});
```

### offset（支持关系对象）

```typescript
// v1 新增：关系内也支持 offset
db.query.posts.findMany({
  limit: 5,
  offset: 2,
  with: {
    comments: {
      offset: 3,
      limit: 3,
    },
  },
});
```

### extras（自定义计算字段）

在查询中添加自定义 SQL 计算字段：

```typescript
import { sql } from "drizzle-orm";

// 简单 extras
db.query.users.findMany({
  extras: {
    loweredName: sql`lower(${users.name})`,
  },
});

// 回调语法
db.query.users.findMany({
  extras: {
    loweredName: (users, { sql }) => sql`lower(${users.name})`,
  },
});

// 嵌套关系中也支持 extras
db.query.posts.findMany({
  extras: {
    contentLength: (table, { sql }) => sql<number>`length(${table.content})`,
  },
  with: {
    comments: {
      extras: {
        commentSize: (table, { sql }) => sql<number>`length(${table.content})`,
      },
    },
  },
});
```

> **注意**：extras 目前不支持聚合函数，需要聚合请使用 core queries。

### extras 子查询

```typescript
import { posts } from "./schema";
import { eq } from "drizzle-orm";

// 获取用户及其 post 总数
db.query.users.findMany({
  with: { posts: true },
  extras: {
    totalPostsCount: (table) => db.$count(posts, eq(posts.authorId, table.id)),
  },
});
```

### Prepared Statements（预编译查询）

使用 placeholder 提升重复查询性能：

```typescript
import { sql } from "drizzle-orm";

// where 中使用 placeholder
const prepared = db.query.users.findMany({
  where: { id: { eq: sql.placeholder("id") } },
  with: {
    posts: {
      where: { id: 1 },
    },
  },
}).prepare("query_name");

const result = await prepared.execute({ id: 1 });

// limit/offset 中使用 placeholder
const prepared2 = db.query.users.findMany({
  limit: sql.placeholder("uLimit"),
  offset: sql.placeholder("uOffset"),
  where: {
    OR: [{ id: { eq: sql.placeholder("id") } }, { id: 3 }],
  },
  with: {
    posts: {
      where: { id: { eq: sql.placeholder("pid") } },
      limit: sql.placeholder("pLimit"),
    },
  },
}).prepare("query_name");

const result2 = await prepared2.execute({
  pLimit: 1, uLimit: 3, uOffset: 1, id: 2, pid: 6,
});
```

## defineRelationsPart 规则

使用 `defineRelationsPart` 拆分关系定义时的重要规则：

**规则 1**：spread 时主 relations 必须在前：

```typescript
// ✅ 正确
const db = drizzle(url, { relations: { ...relations, ...part } })
// ❌ 错误
const db = drizzle(url, { relations: { ...part, ...relations } })
```

**规则 2**：必须有一个 main relations（使用 `defineRelations`），让 drizzle 能推断所有表。如果只想用 parts，可以创建一个空的 main：

```typescript
export const mainPart = defineRelationsPart(schema); // 空 main，用于推断所有表
```

## 多对多查询对比

### v1 之前（绕过连接表）

```typescript
// 旧版：必须嵌套查询连接表再映射
const response = await db.query.users.findMany({
  with: {
    usersToGroups: {
      columns: {},
      with: { group: true },
    },
  },
});
// 还需要手动 map: response.map(u => ({ ...u, groups: u.usersToGroups.map(utg => utg.group) }))
```

### v1 新版（through 直查）

```typescript
// 新版：直接查多对多，无需映射
const response = await db.query.users.findMany({
  with: { groups: true },
});
```

## 新增 Relations 文件步骤

1. **创建关系文件** `src/db/relations/{tier}/{feature}.ts`
2. **定义类型化函数**，返回关系对象
3. **在 `src/db/relations/index.ts` 注册**：spread 到 `defineRelations` 中

```typescript
// 1. src/db/relations/{tier}/{feature}.ts
import type { ExtractTablesFromSchema, RelationsBuilder } from "drizzle-orm";
import type * as schema from "@/db/schema";

type Schema = ExtractTablesFromSchema<typeof schema>;

export const {feature}Relations = (r: RelationsBuilder<Schema>) => ({
  {parentTable}: {
    {relName}: r.many.{childTable}({
      from: r.{parentTable}.id,
      to: r.{childTable}.{parentTable}Id,
    }),
  },
  {childTable}: {
    {parentRef}: r.one.{parentTable}({
      from: r.{childTable}.{parentTable}Id,
      to: r.{parentTable}.id,
    }),
  },
});

// 2. src/db/relations/index.ts
import { {feature}Relations } from "./{tier}/{feature}";

export const relations = defineRelations(schema, (r) => ({
  ...userRolesRelations(r),
  ...{feature}Relations(r),  // 新增
}));
```

> **注意**：同一个表的关系在多个 part 中定义时，后 spread 的会覆盖前面同名的 key。确保不同 part 中同一表的关系 key 名不冲突，或在 index.ts 中手动合并。

## 从旧版迁移速查

| v1 旧版 | v1 新版 (Relations v2) |
|---------|----------------------|
| `import { relations } from "drizzle-orm"` | `import { relations } from "drizzle-orm/_relations"` ← 旧版移到这 |
| `fields: [posts.authorId]` | `from: r.posts.authorId` |
| `references: [users.id]` | `to: r.users.id` |
| `relationName: "xxx"` | `alias: "xxx"` |
| 每表单独 `relations()` | 统一 `defineRelations()` |
| `db.query.xxx` (旧语法) | `db._query.xxx` (可继续用旧语法) |
| `where: (t, { eq }) => eq(t.id, 1)` | `where: { id: 1 }` |
| `orderBy: (t, { asc }) => [asc(t.id)]` | `orderBy: { id: "asc" }` |
| `drizzle(url, { schema })` | `drizzle(url, { relations })` |
| MySQL `mode: "planetscale"` | 不再需要 `mode` |

## 渐进迁移策略

如果需要逐步迁移而非一次性切换：

1. 将旧版 `import { relations } from "drizzle-orm"` 改为 `import { relations } from "drizzle-orm/_relations"`
2. 旧查询用 `db._query.xxx` 替代 `db.query.xxx`
3. 新查询用 `db.query.xxx`（新语法）
4. 逐个迁移旧查询

## drizzle-kit pull 自动迁移

```bash
pnpm drizzle-kit pull
```

会在 `drizzle/relations.ts` 生成新语法的关系定义，可直接复制到项目的 `src/db/relations/` 中使用。注意修改导入路径。

## 常见陷阱

1. **不要混用新旧 relations 定义**：`defineRelations` (v2) 和旧版 `relations()` (v1) 不兼容
2. **from/to 不再用数组**：单列时直接传值 `from: r.posts.authorId`，多列时才用数组 `from: [r.posts.a, r.posts.b]`
3. **spread 覆盖**：多个 part spread 时，同表同 key 会被后者覆盖
4. **through 需要连接表已在 schema 中定义**：`r.usersToGroups.userId` 前提是 `usersToGroups` 表已导出
5. **where 预定义过滤器只能过滤目标表**：`where` 子句只能包含 `to` 端表的列
6. **extras 不支持 `.as()` 别名**：drizzle 会忽略 extras 字段上的 `.as("<alias>")`

## 升级步骤（从旧版到 v1 RC）

1. **运行 `pnpm drizzle-kit up`**：更新 migrations 文件夹结构（移除 journal.json，按文件夹分组）
2. **更新 validator 包导入**：
   - `drizzle-zod` → `drizzle-orm/zod`
   - `drizzle-valibot` → `drizzle-orm/valibot`
   - `drizzle-typebox` → `drizzle-orm/typebox`
   - `drizzle-arktype` → `drizzle-orm/arktype`
3. **迁移 Relations 和查询**：参照本文档的迁移速查表

## 官方文档参考

- [Relations v2 定义](https://orm.drizzle.team/docs/relations-v2)
- [Relational Queries](https://orm.drizzle.team/docs/rqb-v2)
- [从 v1 迁移到 v2](https://orm.drizzle.team/docs/relations-v1-v2)
- [升级到 v1 RC](https://orm.drizzle.team/docs/upgrade-v1)

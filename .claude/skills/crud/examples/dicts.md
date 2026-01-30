# Dicts 模块完整示例

业务字典管理模块，展示标准 CRUD 实现。

## 目录结构

```
src/routes/admin/system/dicts/
├── dicts.index.ts
├── dicts.routes.ts
├── dicts.handlers.ts
├── dicts.types.ts
└── dicts.schema.ts

src/db/schema/admin/system/
└── dicts.ts
```

## 1. 数据库 Schema

```typescript
// src/db/schema/admin/system/dicts.ts
import { index, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { statusEnum } from "@/db/schema/_shard/enums";
import { Status } from "@/lib/enums";
import { StatusDescriptions } from "@/lib/schemas";

export type DictItem = {
  label: string;
  value: string;
  sort: number;
  disabled?: boolean;
  color?: string;
};

export const systemDicts = pgTable("system_dicts", {
  ...baseColumns,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 128 }).notNull(),
  description: text(),
  items: jsonb().$type<DictItem[]>().default([]).notNull(),
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  index("system_dicts_status_idx").on(table.status),
]);

export const selectSystemDictsSchema = createSelectSchema(systemDicts, {
  id: schema => schema.meta({ description: "字典ID" }),
  code: schema => schema.meta({ description: "字典编码" }),
  name: schema => schema.meta({ description: "字典名称" }),
  description: schema => schema.meta({ description: "字典描述" }),
  items: schema => schema.meta({ description: "字典项列表" }),
  status: schema => schema.meta({ description: StatusDescriptions.SYSTEM }),
  createdAt: schema => schema.meta({ description: "创建时间" }),
  createdBy: schema => schema.meta({ description: "创建人" }),
  updatedAt: schema => schema.meta({ description: "更新时间" }),
  updatedBy: schema => schema.meta({ description: "更新人" }),
});

export const insertSystemDictsSchema = createInsertSchema(systemDicts).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
```

## 2. 类型定义

```typescript
// dicts.types.ts
import type { z } from "zod";
import type * as routes from "./dicts.routes";
import type { systemDictResponseSchema } from "./dicts.schema";
import type { AppRouteHandler } from "@/types/lib";

export type Dict = z.infer<typeof systemDictResponseSchema>;

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemDictRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
```

## 3. Zod Schema

```typescript
// dicts.schema.ts
import { z } from "zod";
import { insertSystemDictsSchema, selectSystemDictsSchema } from "@/db/schema";
import { Status } from "@/lib/enums";

export const dictItemSchema = z.object({
  label: z.string().min(1, "显示文本不能为空").max(64).meta({ description: "显示文本" }),
  value: z.string().min(1, "字典值不能为空").max(64).meta({ description: "字典值" }),
  sort: z.number().int().min(0).meta({ description: "排序序号" }),
  disabled: z.boolean().optional().meta({ description: "是否禁用" }),
  color: z.string().max(32).optional().meta({ description: "标签颜色" }),
});

export const dictCodeField = z.string()
  .min(1, "字典编码不能为空")
  .max(64)
  .regex(/^[a-z0-9_]+$/, "字典编码只能包含小写字母、数字和下划线")
  .meta({ description: "字典编码" });

export const systemDictCreateSchema = insertSystemDictsSchema.extend({
  code: dictCodeField,
  name: z.string().min(1).max(128).meta({ description: "字典名称" }),
  description: z.string().optional().meta({ description: "字典描述" }),
  items: z.array(dictItemSchema).default([]).meta({ description: "字典项列表" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
});

export const systemDictPatchSchema = insertSystemDictsSchema.extend({
  code: dictCodeField,
  name: z.string().min(1).max(128).meta({ description: "字典名称" }),
  items: z.array(dictItemSchema).default([]).meta({ description: "字典项列表" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
}).partial().refine(
  data => Object.keys(data).length > 0,
  { message: "至少需要提供一个字段进行更新" },
);

export const systemDictQuerySchema = z.object({
  code: z.string().optional().meta({ description: "字典编码（模糊搜索）" }),
  name: z.string().optional().meta({ description: "字典名称（模糊搜索）" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
});

export const systemDictIdParams = z.object({
  id: z.uuid("ID 必须是有效的 UUID").meta({ description: "字典ID" }),
});

export const systemDictResponseSchema = selectSystemDictsSchema;
export const systemDictListResponse = z.array(systemDictResponseSchema);
```

## 4. 路由定义

```typescript
// dicts.routes.ts
import { createRoute } from "@hono/zod-openapi";
import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";
import {
  systemDictCreateSchema,
  systemDictIdParams,
  systemDictListResponse,
  systemDictPatchSchema,
  systemDictQuerySchema,
  systemDictResponseSchema,
} from "./dicts.schema";

const routePrefix = "/system/dicts";
const tags = [`${routePrefix}（业务字典管理）`];

export const list = createRoute({
  tags,
  summary: "获取字典列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema.extend(systemDictQuerySchema.shape),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictListResponse), "列表响应成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "服务器内部错误"),
  },
});

export const create = createRoute({
  tags,
  summary: "创建字典",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(systemDictCreateSchema, "创建字典参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RefineResultSchema(systemDictResponseSchema), "创建成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

export const get = createRoute({
  tags,
  summary: "获取字典详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: { params: systemDictIdParams },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});

export const update = createRoute({
  tags,
  summary: "更新字典",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: systemDictIdParams,
    body: jsonContentRequired(systemDictPatchSchema, "更新字典参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictResponseSchema), "更新成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});

export const remove = createRoute({
  tags,
  summary: "删除字典",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: { params: systemDictIdParams },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictIdParams), "删除成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});
```

## 5. 处理器

```typescript
// dicts.handlers.ts
import type { z } from "zod";
import type { systemDictResponseSchema } from "./dicts.schema";
import type { SystemDictRouteHandlerType } from "./dicts.types";

import { eq } from "drizzle-orm";
import db from "@/db";
import { systemDicts } from "@/db/schema";
import logger from "@/lib/logger";
import redisClient from "@/lib/redis";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";

const DICT_CACHE_PREFIX = "dict:";

export const list: SystemDictRouteHandlerType<"list"> = async (c) => {
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await executeRefineQuery<z.infer<typeof systemDictResponseSchema>>({
    table: systemDicts,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  c.header("x-total-count", result.total.toString());
  return c.json(Resp.ok(result.data), HttpStatusCodes.OK);
};

export const create: SystemDictRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [created] = await db.insert(systemDicts).values({
    ...body,
    createdBy: sub,
  }).returning();

  return c.json(Resp.ok(created), HttpStatusCodes.CREATED);
};

export const get: SystemDictRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const dict = await db.query.systemDicts.findFirst({
    where: eq(systemDicts.id, id),
  });

  if (!dict) {
    return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
  }
  return c.json(Resp.ok(dict), HttpStatusCodes.OK);
};

export const update: SystemDictRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update(systemDicts)
    .set({ ...body, updatedBy: sub })
    .where(eq(systemDicts.id, id))
    .returning();

  if (!updated) {
    return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
  }

  void redisClient.del(`${DICT_CACHE_PREFIX}${updated.code}`)
    .catch(error => logger.warn({ error, code: updated.code }, "[字典]: 清除缓存失败"));

  return c.json(Resp.ok(updated), HttpStatusCodes.OK);
};

export const remove: SystemDictRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemDicts)
    .where(eq(systemDicts.id, id))
    .returning({ id: systemDicts.id, code: systemDicts.code });

  if (!deleted) {
    return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
  }

  void redisClient.del(`${DICT_CACHE_PREFIX}${deleted.code}`)
    .catch(error => logger.warn({ error, code: deleted.code }, "[字典]: 清除缓存失败"));

  return c.json(Resp.ok({ id: deleted.id }), HttpStatusCodes.OK);
};
```

## 6. 入口文件

```typescript
// dicts.index.ts
import { createRouter } from "@/lib/internal/create-app";
import * as handlers from "./dicts.handlers";
import * as routes from "./dicts.routes";

const systemDictRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default systemDictRouter;
```

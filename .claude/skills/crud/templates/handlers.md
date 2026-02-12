# Handlers 模板

## 标准处理器文件

```typescript
// {feature}.handlers.ts
import type { z } from "zod";
import type { {feature}ResponseSchema } from "./{feature}.schema";
import type { {Feature}RouteHandlerType } from "./{feature}.types";

import { eq } from "drizzle-orm";
import db from "@/db";
import { {feature}s } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Resp } from "@/utils";

// ============================================================
// 列表查询
// ============================================================
export const list: {Feature}RouteHandlerType<"list"> = async (c) => {
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await executeRefineQuery<z.infer<typeof {feature}ResponseSchema>>({
    table: {feature}s,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  c.header("x-total-count", result.total.toString());
  return c.json(Resp.ok(result.data), HttpStatusCodes.OK);
};

// ============================================================
// 创建
// ============================================================
export const create: {Feature}RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [created] = await db.insert({feature}s).values({
    ...body,
    createdBy: sub,
  }).returning();

  return c.json(Resp.ok(created), HttpStatusCodes.CREATED);
};

// ============================================================
// 获取详情
// ============================================================
export const get: {Feature}RouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const item = await db.query.{feature}s.findFirst({
    where: eq({feature}s.id, id),
  });

  if (!item) {
    return c.json(Resp.fail("数据不存在"), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(item), HttpStatusCodes.OK);
};

// ============================================================
// 更新
// ============================================================
export const update: {Feature}RouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update({feature}s)
    .set({
      ...body,
      updatedBy: sub,
    })
    .where(eq({feature}s.id, id))
    .returning();

  if (!updated) {
    return c.json(Resp.fail("数据不存在"), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(updated), HttpStatusCodes.OK);
};

// ============================================================
// 删除
// ============================================================
export const remove: {Feature}RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete({feature}s)
    .where(eq({feature}s.id, id))
    .returning({ id: {feature}s.id });

  if (!deleted) {
    return c.json(Resp.fail("数据不存在"), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok({ id: deleted.id }), HttpStatusCodes.OK);
};
```

## 带 Redis 缓存版本（仅 Update/Delete 需要清缓存）

```typescript
import logger from "@/lib/services/logger";
import redisClient from "@/lib/services/redis";

const CACHE_PREFIX = "{feature}:";

// 注意：创建操作不需要清缓存（新记录之前不存在缓存）

// 更新后清缓存
void redisClient.del(`${CACHE_PREFIX}${updated.code}`)
  .catch(error => logger.warn({ error }, "[{Feature}]: 清除缓存失败"));

// 删除后清缓存
void redisClient.del(`${CACHE_PREFIX}${deleted.code}`)
  .catch(error => logger.warn({ error }, "[{Feature}]: 清除缓存失败"));
```

## 带关联查询版本

```typescript
// 使用 with 关联查询
const item = await db.query.{feature}s.findFirst({
  where: eq({feature}s.id, id),
  with: {
    relations: {
      with: {
        relatedEntity: true,
      },
    },
  },
});

// 转换关联数据
const formatted = {
  ...item,
  relatedItems: item.relations.map(r => r.relatedEntity),
};
```

## 带 JOIN 聚合的列表查询

```typescript
const [error, result] = await executeRefineQuery<z.infer<typeof responseSchema>>({
  table: {feature}s,
  queryParams: parseResult.data,
  joinConfig: {
    joins: [
      {
        table: relatedTable,
        type: "left",
        on: eq({feature}s.id, relatedTable.{feature}Id),
      },
    ],
    selectFields: {
      id: {feature}s.id,
      name: {feature}s.name,
      relatedData: sql`json_agg(json_build_object('id', ${relatedTable.id}))`,
    },
    groupBy: [{feature}s.id],
  },
});
```

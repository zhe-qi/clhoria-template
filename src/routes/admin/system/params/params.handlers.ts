import type { z } from "zod";
import type { systemParamResponseSchema } from "./params.schema";
import type { SystemParamRouteHandlerType } from "./params.types";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemParams } from "@/db/schema";
import logger from "@/lib/logger";
import redisClient from "@/lib/redis";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";

/** Redis 缓存 Key 前缀 */
const PARAM_CACHE_PREFIX = "param:";

/** 列表查询 */
export const list: SystemParamRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof systemParamResponseSchema>>({
    table: systemParams,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(result.data), HttpStatusCodes.OK);
};

/** 创建参数 */
export const create: SystemParamRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [created] = await db.insert(systemParams).values({
    ...body,
    createdBy: sub,
  }).returning();

  // 异步清除可能存在的缓存
  void redisClient.del(`${PARAM_CACHE_PREFIX}${created.key}`)
    .catch(error => logger.warn({ error, key: created.key }, "[参数]: 清除缓存失败"));

  return c.json(Resp.ok(created), HttpStatusCodes.CREATED);
};

/** 获取参数详情 */
export const get: SystemParamRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const param = await db.query.systemParams.findFirst({
    where: eq(systemParams.id, id),
  });

  if (!param) {
    return c.json(Resp.fail("参数不存在"), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(param), HttpStatusCodes.OK);
};

/** 更新参数 */
export const update: SystemParamRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update(systemParams)
    .set({
      ...body,
      updatedBy: sub,
    })
    .where(eq(systemParams.id, id))
    .returning();

  // 如果没有更新任何记录，说明参数不存在
  if (!updated) {
    return c.json(Resp.fail("参数不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // 清除缓存（无论 key 是否修改，都清除当前 key 的缓存）
  // 注意：如果修改了 key，旧的缓存 key 不会被清除，但会自然过期
  void redisClient.del(`${PARAM_CACHE_PREFIX}${updated.key}`)
    .catch(error => logger.warn({ error, key: updated.key }, "[参数]: 清除缓存失败"));

  return c.json(Resp.ok(updated), HttpStatusCodes.OK);
};

/** 删除参数 */
export const remove: SystemParamRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // 直接删除，通过 returning 获取被删除的记录
  const [deleted] = await db
    .delete(systemParams)
    .where(eq(systemParams.id, id))
    .returning({ id: systemParams.id, key: systemParams.key });

  // 如果没有删除任何记录，说明参数不存在
  if (!deleted) {
    return c.json(Resp.fail("参数不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // 清除缓存
  void redisClient.del(`${PARAM_CACHE_PREFIX}${deleted.key}`)
    .catch(error => logger.warn({ error, key: deleted.key }, "[参数]: 清除缓存失败"));

  return c.json(Resp.ok({ id: deleted.id }), HttpStatusCodes.OK);
};

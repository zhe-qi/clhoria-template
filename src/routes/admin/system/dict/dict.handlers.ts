import type { z } from "zod";
import type { systemDictResponseSchema } from "./dict.schema";
import type { SystemDictRouteHandlerType } from "./dict.types";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemDict } from "@/db/schema";
import logger from "@/lib/logger";
import redisClient from "@/lib/redis";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";
import { mapDbError } from "@/utils/db-errors";

/** Redis 缓存 Key 前缀 */
const DICT_CACHE_PREFIX = "dict:";

/** 列表查询 */
export const list: SystemDictRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof systemDictResponseSchema>>({
    table: systemDict,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(result.data), HttpStatusCodes.OK);
};

/** 创建字典 */
export const create: SystemDictRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  try {
    const [created] = await db.insert(systemDict).values({
      ...body,
      createdBy: sub,
    }).returning();

    // 异步清除可能存在的缓存
    void redisClient.del(`${DICT_CACHE_PREFIX}${created.code}`)
      .catch(error => logger.warn({ error, code: created.code }, "[字典]: 清除缓存失败"));

    return c.json(Resp.ok(created), HttpStatusCodes.CREATED);
  }
  catch (error) {
    const pgError = mapDbError(error);

    if (pgError?.type === "UniqueViolation" && pgError.constraint?.includes("code")) {
      return c.json(Resp.fail("字典编码已存在"), HttpStatusCodes.CONFLICT);
    }

    throw error;
  }
};

/** 获取字典详情 */
export const get: SystemDictRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const dict = await db.query.systemDict.findFirst({
    where: eq(systemDict.id, id),
  });

  if (!dict) {
    return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(dict), HttpStatusCodes.OK);
};

/** 更新字典 */
export const update: SystemDictRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  try {
    const [updated] = await db
      .update(systemDict)
      .set({
        ...body,
        updatedBy: sub,
      })
      .where(eq(systemDict.id, id))
      .returning();

    // 如果没有更新任何记录，说明字典不存在
    if (!updated) {
      return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 清除缓存（无论 code 是否修改，都清除当前 code 的缓存）
    // 注意：如果修改了 code，旧的缓存 key 不会被清除，但会自然过期
    void redisClient.del(`${DICT_CACHE_PREFIX}${updated.code}`)
      .catch(error => logger.warn({ error, code: updated.code }, "[字典]: 清除缓存失败"));

    return c.json(Resp.ok(updated), HttpStatusCodes.OK);
  }
  catch (error) {
    const pgError = mapDbError(error);

    if (pgError?.type === "UniqueViolation" && pgError.constraint?.includes("code")) {
      return c.json(Resp.fail("字典编码已存在"), HttpStatusCodes.CONFLICT);
    }

    throw error;
  }
};

/** 删除字典 */
export const remove: SystemDictRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // 直接删除，通过 returning 获取被删除的记录
  const [deleted] = await db
    .delete(systemDict)
    .where(eq(systemDict.id, id))
    .returning({ id: systemDict.id, code: systemDict.code });

  // 如果没有删除任何记录，说明字典不存在
  if (!deleted) {
    return c.json(Resp.fail("字典不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // 清除缓存
  void redisClient.del(`${DICT_CACHE_PREFIX}${deleted.code}`)
    .catch(error => logger.warn({ error, code: deleted.code }, "[字典]: 清除缓存失败"));

  return c.json(Resp.ok({ id: deleted.id }), HttpStatusCodes.OK);
};

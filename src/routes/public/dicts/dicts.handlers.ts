import type { DictRouteHandlerType } from "./dicts.types";
import type { DictItem } from "@/db/schema/admin/system/dicts";

import { and, eq } from "drizzle-orm";

import db from "@/db";
import { systemDicts } from "@/db/schema";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Status } from "@/lib/enums";
import logger from "@/lib/services/logger";
import redisClient from "@/lib/services/redis";
import { Resp } from "@/utils";

/** Redis cache key prefix / Redis 缓存 Key 前缀 */
const DICT_CACHE_PREFIX = "dict:";

/** Cache expiration time (seconds) / 缓存过期时间（秒） */
const DICT_CACHE_TTL = 300; // 5 minutes / 5 分钟

/** Get dict items by code / 根据编码查询字典项 */
export const getByCode: DictRouteHandlerType<"getByCode"> = async (c) => {
  const { code } = c.req.valid("param");

  const cacheKey = `${DICT_CACHE_PREFIX}${code}`;

  try {
    // Try to get from Redis cache / 尝试从 Redis 缓存获取
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug({ code, cacheKey }, "[字典]: 从缓存获取字典项");
      return c.json(Resp.ok(JSON.parse(cached)), HttpStatusCodes.OK);
    }
  }
  catch (error) {
    // Redis error does not affect main flow, log and continue querying database / Redis 错误不影响主流程，记录日志后继续查询数据库
    logger.warn({ error, code }, "[字典]: Redis 缓存读取失败");
  }

  // Query dict (only enabled ones) / 查询字典（只查询启用状态的字典）
  const dict = await db.query.systemDicts.findFirst({
    where: and(
      eq(systemDicts.code, code),
      eq(systemDicts.status, Status.ENABLED),
    ),
    columns: {
      code: true,
      name: true,
      items: true,
    },
  });

  if (!dict) {
    return c.json(Resp.fail("字典不存在或已禁用"), HttpStatusCodes.NOT_FOUND);
  }

  // Filter out disabled dict items / 过滤掉禁用的字典项
  const items = (dict.items as DictItem[]).filter(item => !item.disabled);

  const result = {
    code: dict.code,
    name: dict.name,
    items,
  };

  // Async write to Redis cache (non-blocking) / 异步写入 Redis 缓存（不阻塞响应）
  void redisClient.setex(cacheKey, DICT_CACHE_TTL, JSON.stringify(result))
    .catch(error => logger.warn({ error, code }, "[字典]: Redis 缓存写入失败"));

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

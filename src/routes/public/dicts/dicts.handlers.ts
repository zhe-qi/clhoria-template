import type { DictRouteHandlerType } from "./dicts.types";
import type { DictItem } from "@/db/schema/admin/system/dicts";

import db from "@/db";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Status } from "@/lib/enums";
import logger from "@/lib/services/logger";
import redisClient from "@/lib/services/redis";
import { Resp } from "@/utils";

/** Redis cache key prefix / Redis 缓存 Key 前缀 */
const DICT_CACHE_PREFIX = "dict:";

/** Redis list cache key / Redis 列表缓存 Key */
const DICT_LIST_CACHE_KEY = "dicts:all";

/** Cache expiration time (seconds) / 缓存过期时间（秒） */
const DICT_CACHE_TTL = 300; // 5 minutes / 5 分钟

/** List all enabled dicts / 获取所有启用字典 */
export const list: DictRouteHandlerType<"list"> = async (c) => {
  try {
    const cached = await redisClient.get(DICT_LIST_CACHE_KEY);
    if (cached) {
      logger.debug({ cacheKey: DICT_LIST_CACHE_KEY }, "[字典]: 从缓存获取字典列表");
      return c.json(Resp.ok(JSON.parse(cached)), HttpStatusCodes.OK);
    }
  }
  catch (error) {
    logger.warn({ error }, "[字典]: Redis 列表缓存读取失败");
  }

  const dicts = await db.query.systemDicts.findMany({
    where: { status: Status.ENABLED },
    columns: {
      code: true,
      name: true,
      items: true,
    },
    orderBy: { code: "asc" },
  });

  const result = dicts.map(dict => ({
    code: dict.code,
    name: dict.name,
    items: (dict.items as DictItem[]).filter(item => !item.disabled),
  }));

  void redisClient.setex(DICT_LIST_CACHE_KEY, DICT_CACHE_TTL, JSON.stringify(result))
    .catch(error => logger.warn({ error }, "[字典]: Redis 列表缓存写入失败"));

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

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
    where: { code, status: Status.ENABLED },
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

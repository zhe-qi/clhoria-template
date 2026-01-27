import type { DictRouteHandlerType } from "./dicts.types";
import type { DictItem } from "@/db/schema/admin/system/dicts";

import { and, eq } from "drizzle-orm";

import db from "@/db";
import { systemDicts } from "@/db/schema";
import { Status } from "@/lib/enums";
import logger from "@/lib/logger";
import redisClient from "@/lib/redis";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";

/** Redis 缓存 Key 前缀 */
const DICT_CACHE_PREFIX = "dict:";

/** 缓存过期时间（秒） */
const DICT_CACHE_TTL = 300; // 5 分钟

/** 根据编码查询字典项 */
export const getByCode: DictRouteHandlerType<"getByCode"> = async (c) => {
  const { code } = c.req.valid("param");

  const cacheKey = `${DICT_CACHE_PREFIX}${code}`;

  try {
    // 尝试从 Redis 缓存获取
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug({ code, cacheKey }, "[字典]: 从缓存获取字典项");
      return c.json(Resp.ok(JSON.parse(cached)), HttpStatusCodes.OK);
    }
  }
  catch (error) {
    // Redis 错误不影响主流程，记录日志后继续查询数据库
    logger.warn({ error, code }, "[字典]: Redis 缓存读取失败");
  }

  // 查询字典（只查询启用状态的字典）
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

  // 过滤掉禁用的字典项
  const items = (dict.items as DictItem[]).filter(item => !item.disabled);

  const result = {
    code: dict.code,
    name: dict.name,
    items,
  };

  // 异步写入 Redis 缓存（不阻塞响应）
  void redisClient.setex(cacheKey, DICT_CACHE_TTL, JSON.stringify(result))
    .catch(error => logger.warn({ error, code }, "[字典]: Redis 缓存写入失败"));

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

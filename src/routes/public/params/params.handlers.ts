import type { ParamRouteHandlerType } from "./params.types";

import { and, eq } from "drizzle-orm";

import db from "@/db";
import { systemParams } from "@/db/schema";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Status } from "@/lib/enums";
import logger from "@/lib/services/logger";
import redisClient from "@/lib/services/redis";
import { Resp } from "@/utils";

/** Redis cache key prefix / Redis 缓存 Key 前缀 */
const PARAM_CACHE_PREFIX = "param:";

/** Cache expiration time (seconds) / 缓存过期时间（秒） */
const PARAM_CACHE_TTL = 300; // 5 minutes / 5 分钟

/** Get param by key / 根据键查询参数 */
export const getByKey: ParamRouteHandlerType<"getByKey"> = async (c) => {
  const { key } = c.req.valid("param");

  const cacheKey = `${PARAM_CACHE_PREFIX}${key}`;

  try {
    // Try to get from Redis cache / 尝试从 Redis 缓存获取
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug({ key, cacheKey }, "[参数]: 从缓存获取参数");
      return c.json(Resp.ok(JSON.parse(cached)), HttpStatusCodes.OK);
    }
  }
  catch (error) {
    // Redis error does not affect main flow, log and continue querying database / Redis 错误不影响主流程，记录日志后继续查询数据库
    logger.warn({ error, key }, "[参数]: Redis 缓存读取失败");
  }

  // Query param (only enabled ones) / 查询参数（只查询启用状态的参数）
  const param = await db.query.systemParams.findFirst({
    where: and(
      eq(systemParams.key, key),
      eq(systemParams.status, Status.ENABLED),
    ),
    columns: {
      key: true,
      value: true,
      valueType: true,
      name: true,
    },
  });

  if (!param) {
    return c.json(Resp.fail("参数不存在或已禁用"), HttpStatusCodes.NOT_FOUND);
  }

  const result = {
    key: param.key,
    value: param.value,
    valueType: param.valueType,
    name: param.name,
  };

  // Async write to Redis cache (non-blocking) / 异步写入 Redis 缓存（不阻塞响应）
  void redisClient.setex(cacheKey, PARAM_CACHE_TTL, JSON.stringify(result))
    .catch(error => logger.warn({ error, key }, "[参数]: Redis 缓存写入失败"));

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

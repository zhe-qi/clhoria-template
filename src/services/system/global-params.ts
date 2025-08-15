import type z from "zod/v4";

import { and, eq } from "drizzle-orm";

import type { insertGlobalParamsSchema, patchGlobalParamsSchema, selectGlobalParamsSchema } from "@/db/schema";

import db from "@/db";
import { globalParams } from "@/db/schema";
import { Status } from "@/lib/enums";
import { CacheConfig, getGlobalParamKey, getGlobalParamsAllKey } from "@/lib/enums/cache";
import logger from "@/lib/logger";
import paginatedQuery from "@/lib/pagination";
import redisClient from "@/lib/redis";
import { formatDate } from "@/utils/tools/formatter";

export interface GlobalParamsListOptions {
  domain?: string;
  params: {
    skip?: number;
    take?: number;
    where?: Record<string, any> | Record<string, never> | null;
    orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[] | Record<string, never> | null;
    join?: Record<string, any> | Record<string, never> | null;
  };
}

export interface GlobalParamsPublicOptions {
  publicOnly?: "true" | "false";
}

export interface GlobalParamsBatchOptions {
  publicOnly?: "true" | "false";
}

type SelectGlobalParamsData = z.infer<typeof selectGlobalParamsSchema>;
type UpdateGlobalParamsData = z.infer<typeof patchGlobalParamsSchema>;
type InsertGlobalParamsData = z.infer<typeof insertGlobalParamsSchema>;

/**
 * 从 Redis 缓存中获取全局参数
 */
export async function getCachedParam(key: string) {
  try {
    const cached = await redisClient.get(getGlobalParamKey(key));
    if (!cached) {
      return null;
    }
    const parsed = JSON.parse(cached);
    // 检查是否为空值缓存标记
    return parsed === CacheConfig.NULL_CACHE_VALUE ? undefined : parsed as SelectGlobalParamsData;
  }
  catch (error) {
    logger.warn({ error, key }, "全局参数缓存获取失败");
    return null;
  }
}

/**
 * 设置全局参数到 Redis 缓存
 */
export async function setCachedParam(key: string, data: InsertGlobalParamsData) {
  try {
    await redisClient.setex(
      getGlobalParamKey(key),
      CacheConfig.CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch (error) {
    logger.error({ error, key }, "设置全局参数缓存失败");
  }
}

/**
 * 设置空值缓存（防止缓存穿透）
 */
export async function setCachedNullParam(key: string) {
  try {
    await redisClient.setex(
      getGlobalParamKey(key),
      CacheConfig.NULL_CACHE_TTL,
      JSON.stringify(CacheConfig.NULL_CACHE_VALUE),
    );
  }
  catch (error) {
    logger.error({ error, key }, "设置空值全局参数缓存失败");
  }
}

/**
 * 删除缓存的全局参数
 */
export async function deleteCachedParam(key: string) {
  try {
    await redisClient.del(getGlobalParamKey(key));
    await redisClient.del(getGlobalParamsAllKey());
  }
  catch (error) {
    logger.error({ error, key }, "删除全局参数缓存失败");
  }
}

/**
 * 清除所有全局参数缓存
 */
export async function clearAllCache() {
  try {
    const pattern = getGlobalParamKey("*");
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getGlobalParamsAllKey());
  }
  catch (error) {
    logger.error({ error }, "清除所有全局参数缓存失败");
  }
}

/**
 * 获取全局参数列表（简单模式，用于公开API）
 */
export async function getPublicList(options: GlobalParamsPublicOptions = {}) {
  const { publicOnly = "true" } = options;

  // 尝试从缓存获取
  if (publicOnly === "true") {
    const cacheKey = getGlobalParamsAllKey();
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SelectGlobalParamsData[];
    }
  }

  // 构建查询条件
  let whereCondition = eq(globalParams.status, Status.ENABLED);

  if (publicOnly === "true") {
    whereCondition = and(whereCondition, eq(globalParams.isPublic, Status.ENABLED))!;
  }

  const result = await db
    .select()
    .from(globalParams)
    .where(whereCondition);

  // 如果是公开参数，缓存结果
  if (publicOnly === "true") {
    await redisClient.setex(
      getGlobalParamsAllKey(),
      CacheConfig.CACHE_TTL,
      JSON.stringify(result),
    );
  }

  return result;
}

/**
 * 获取全局参数列表（分页模式，用于管理API）
 */
export async function getAdminList(options: GlobalParamsListOptions) {
  const { domain, params } = options;

  const [error, result] = await paginatedQuery<z.infer<typeof selectGlobalParamsSchema>>({
    table: globalParams,
    params: {
      skip: params.skip ?? 0,
      take: params.take ?? 10,
      where: params.where,
      orderBy: params.orderBy,
      join: params.join,
    },
    domain,
  });

  if (error) {
    throw new Error(`全局参数列表查询失败: ${error.message}`);
  }

  return result;
}

/**
 * 获取单个全局参数（公开访问）
 */
export async function getPublicParam(key: string) {
  // 尝试从缓存获取
  const cached = await getCachedParam(key);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [param] = await db
    .select()
    .from(globalParams)
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.status, Status.ENABLED),
      eq(globalParams.isPublic, Status.ENABLED), // 只允许访问公开参数
    ));

  if (param) {
    // 缓存结果
    await setCachedParam(key, param);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullParam(key);
  }

  return param;
}

/**
 * 获取单个全局参数（管理访问）
 */
export async function getAdminParam(key: string) {
  const cached = await getCachedParam(key);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [param] = await db
    .select()
    .from(globalParams)
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.status, Status.ENABLED),
    ));

  if (param) {
    await setCachedParam(key, param);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullParam(key);
  }

  return param;
}

/**
 * 创建全局参数
 */
export async function createParam(data: InsertGlobalParamsData, userId: string) {
  const [created] = await db
    .insert(globalParams)
    .values({
      ...data,
      createdBy: userId,
    })
    .returning();

  await setCachedParam(created.key, created);
  await clearAllCache();

  return created;
}

/**
 * 更新全局参数
 */
export async function updateParam(key: string, data: UpdateGlobalParamsData, userId: string) {
  const [updated] = await db
    .update(globalParams)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: formatDate(new Date()),
    })
    .where(eq(globalParams.key, key))
    .returning();

  if (updated) {
    await setCachedParam(key, updated);
    await clearAllCache();
  }

  return updated;
}

/**
 * 删除全局参数
 */
export async function deleteParam(key: string) {
  const [deleted] = await db
    .delete(globalParams)
    .where(eq(globalParams.key, key))
    .returning({ key: globalParams.key });

  if (deleted) {
    await deleteCachedParam(key);
  }

  return deleted;
}

/**
 * 批量获取全局参数
 */
export async function batchGetParams(keys: string[], options: GlobalParamsBatchOptions = {}) {
  const { publicOnly = "true" } = options;
  const result: Record<string, SelectGlobalParamsData | null> = {};

  // 尝试从缓存批量获取
  const cacheKeys = keys.map(key => getGlobalParamKey(key));
  const cached = await redisClient.mget(...cacheKeys);

  const missingKeys: string[] = [];

  // 处理缓存结果
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cachedValue = cached[i];

    if (cachedValue) {
      const parsed = JSON.parse(cachedValue);
      if (parsed === CacheConfig.NULL_CACHE_VALUE) {
        // 空值缓存命中，直接设为null
        result[key] = null;
      }
      else {
        result[key] = parsed;
      }
    }
    else {
      missingKeys.push(key);
      result[key] = null;
    }
  }

  // 从数据库获取未缓存的参数
  if (missingKeys.length > 0) {
    let whereCondition = eq(globalParams.status, Status.ENABLED);

    if (publicOnly === "true") {
      whereCondition = and(whereCondition, eq(globalParams.isPublic, Status.ENABLED))!;
    }

    const dbParams = await db
      .select()
      .from(globalParams)
      .where(whereCondition);

    // 更新结果和缓存
    for (const param of dbParams) {
      if (missingKeys.includes(param.key)) {
        result[param.key] = param;
        await setCachedParam(param.key, param);
      }
    }

    // 为不存在的key缓存空值
    const foundKeys = dbParams.map(p => p.key);
    for (const missingKey of missingKeys) {
      if (!foundKeys.includes(missingKey)) {
        await setCachedNullParam(missingKey);
      }
    }
  }

  return result;
}

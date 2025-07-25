import type { InferSelectModel } from "drizzle-orm";

import { and, eq, ilike, or } from "drizzle-orm";

import db from "@/db";
import { globalParams } from "@/db/schema";
import { CacheConfig, getGlobalParamKey, getGlobalParamsAllKey } from "@/lib/enums/cache";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";

export interface GlobalParamsListOptions {
  search?: string;
  isPublic?: "0" | "1";
  publicOnly?: "true" | "false";
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface GlobalParamsBatchOptions {
  publicOnly?: "true" | "false";
}

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
    return parsed === CacheConfig.NULL_CACHE_VALUE ? undefined : parsed;
  }
  catch {
    return null;
  }
}

/**
 * 设置全局参数到 Redis 缓存
 */
export async function setCachedParam(key: string, data: any) {
  try {
    await redisClient.setex(
      getGlobalParamKey(key),
      CacheConfig.CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch {
    // Redis错误不影响业务流程，静默处理
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
  catch {
    // Redis错误不影响业务流程，静默处理
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
  catch {
    // Redis错误不影响业务流程，静默处理
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
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 获取全局参数列表（简单模式，用于公开API）
 */
export async function getPublicList(options: GlobalParamsListOptions = {}) {
  const { publicOnly = "true" } = options;

  // 尝试从缓存获取
  if (publicOnly === "true") {
    const cacheKey = getGlobalParamsAllKey();
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // 构建查询条件
  let whereCondition = eq(globalParams.status, 1);

  if (publicOnly === "true") {
    whereCondition = and(whereCondition, eq(globalParams.isPublic, 1))!;
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
export async function getAdminList(options: GlobalParamsListOptions = {}) {
  const {
    search,
    isPublic,
    pagination: paginationOptions = { page: 1, limit: 20 },
  } = options;

  let whereCondition = eq(globalParams.status, 1);

  if (search) {
    whereCondition = and(
      whereCondition,
      or(
        ilike(globalParams.key, `%${search}%`),
        ilike(globalParams.description, `%${search}%`),
      ),
    )!;
  }

  if (isPublic !== undefined) {
    whereCondition = and(
      whereCondition,
      eq(globalParams.isPublic, Number(isPublic)),
    )!;
  }

  return await pagination<InferSelectModel<typeof globalParams>>(
    globalParams,
    whereCondition,
    paginationOptions,
  );
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
      eq(globalParams.status, 1),
      eq(globalParams.isPublic, 1), // 只允许访问公开参数
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
      eq(globalParams.status, 1),
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
export async function createParam(data: any, userId: string) {
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
export async function updateParam(key: string, data: any, userId: string) {
  const [updated] = await db
    .update(globalParams)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
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
  const result: Record<string, any> = {};

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
    let whereCondition = eq(globalParams.status, 1);

    if (publicOnly === "true") {
      whereCondition = and(whereCondition, eq(globalParams.isPublic, 1))!;
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

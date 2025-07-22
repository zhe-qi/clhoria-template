import { and, eq, ilike, or } from "drizzle-orm";

import db from "@/db";
import { globalParams } from "@/db/schema";
import { getGlobalParamKey, getGlobalParamsAllKey } from "@/lib/enums/cache";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";

export const DEFAULT_DOMAIN = "default";
export const CACHE_TTL = 3600; // 1小时

export interface GlobalParamsListOptions {
  domain?: string;
  search?: string;
  isPublic?: "0" | "1";
  publicOnly?: "true" | "false";
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface GlobalParamsBatchOptions {
  domain?: string;
  publicOnly?: "true" | "false";
}

/**
 * 从 Redis 缓存中获取全局参数
 */
export async function getCachedParam(key: string, domain: string) {
  try {
    const cached = await redisClient.get(getGlobalParamKey(key, domain));
    return cached ? JSON.parse(cached) : null;
  }
  catch {
    return null;
  }
}

/**
 * 设置全局参数到 Redis 缓存
 */
export async function setCachedParam(key: string, domain: string, data: any) {
  try {
    await redisClient.setex(
      getGlobalParamKey(key, domain),
      CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 删除缓存的全局参数
 */
export async function deleteCachedParam(key: string, domain: string) {
  try {
    await redisClient.del(getGlobalParamKey(key, domain));
    await redisClient.del(getGlobalParamsAllKey(domain));
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 清除域的所有缓存
 */
export async function clearDomainCache(domain: string) {
  try {
    const pattern = getGlobalParamKey("*", domain);
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getGlobalParamsAllKey(domain));
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 获取全局参数列表（简单模式，用于公开API）
 */
export async function getPublicList(options: GlobalParamsListOptions = {}) {
  const { domain = DEFAULT_DOMAIN, publicOnly = "true" } = options;

  // 尝试从缓存获取
  if (publicOnly === "true") {
    const cacheKey = getGlobalParamsAllKey(domain);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // 构建查询条件
  let whereCondition = eq(globalParams.domain, domain);

  if (publicOnly === "true") {
    whereCondition = and(whereCondition, eq(globalParams.isPublic, 1))!;
  }

  const result = await db
    .select()
    .from(globalParams)
    .where(and(whereCondition, eq(globalParams.status, 1)));

  // 如果是公开参数，缓存结果
  if (publicOnly === "true") {
    await redisClient.setex(
      getGlobalParamsAllKey(domain),
      CACHE_TTL,
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
    domain = DEFAULT_DOMAIN,
    search,
    isPublic,
    pagination: paginationOptions = { page: 1, limit: 20 },
  } = options;

  let whereCondition = and(
    eq(globalParams.domain, domain),
    eq(globalParams.status, 1),
  );

  if (search) {
    whereCondition = and(
      whereCondition,
      or(
        ilike(globalParams.key, `%${search}%`),
        ilike(globalParams.description, `%${search}%`),
      ),
    );
  }

  if (isPublic !== undefined) {
    whereCondition = and(
      whereCondition,
      eq(globalParams.isPublic, Number(isPublic)),
    );
  }

  return await pagination(
    globalParams,
    whereCondition,
    paginationOptions,
  );
}

/**
 * 获取单个全局参数（公开访问）
 */
export async function getPublicParam(key: string, domain: string = DEFAULT_DOMAIN) {
  // 尝试从缓存获取
  const cached = await getCachedParam(key, domain);
  if (cached) {
    return cached;
  }

  const [param] = await db
    .select()
    .from(globalParams)
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.domain, domain),
      eq(globalParams.status, 1),
      eq(globalParams.isPublic, 1), // 只允许访问公开参数
    ));

  if (param) {
    // 缓存结果
    await setCachedParam(key, domain, param);
  }

  return param;
}

/**
 * 获取单个全局参数（管理访问）
 */
export async function getAdminParam(key: string, domain: string = DEFAULT_DOMAIN) {
  const cached = await getCachedParam(key, domain);
  if (cached) {
    return cached;
  }

  const [param] = await db
    .select()
    .from(globalParams)
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.domain, domain),
      eq(globalParams.status, 1),
    ));

  if (param) {
    await setCachedParam(key, domain, param);
  }

  return param;
}

/**
 * 创建全局参数
 */
export async function createParam(data: any, domain: string = DEFAULT_DOMAIN, userId: string) {
  const [created] = await db
    .insert(globalParams)
    .values({
      ...data,
      domain,
      createdBy: userId,
    })
    .returning();

  await setCachedParam(created.key, domain, created);
  await clearDomainCache(domain);

  return created;
}

/**
 * 更新全局参数
 */
export async function updateParam(key: string, data: any, domain: string = DEFAULT_DOMAIN, userId: string) {
  const [updated] = await db
    .update(globalParams)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.domain, domain),
    ))
    .returning();

  if (updated) {
    await setCachedParam(key, domain, updated);
    await clearDomainCache(domain);
  }

  return updated;
}

/**
 * 删除全局参数
 */
export async function deleteParam(key: string, domain: string = DEFAULT_DOMAIN) {
  const [deleted] = await db
    .delete(globalParams)
    .where(and(
      eq(globalParams.key, key),
      eq(globalParams.domain, domain),
    ))
    .returning({ key: globalParams.key });

  if (deleted) {
    await deleteCachedParam(key, domain);
  }

  return deleted;
}

/**
 * 批量获取全局参数
 */
export async function batchGetParams(keys: string[], options: GlobalParamsBatchOptions = {}) {
  const { domain = DEFAULT_DOMAIN, publicOnly = "true" } = options;
  const result: Record<string, any> = {};

  // 尝试从缓存批量获取
  const cacheKeys = keys.map(key => getGlobalParamKey(key, domain));
  const cached = await redisClient.mget(...cacheKeys);

  const missingKeys: string[] = [];

  // 处理缓存结果
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cachedValue = cached[i];

    if (cachedValue) {
      result[key] = JSON.parse(cachedValue);
    }
    else {
      missingKeys.push(key);
      result[key] = null;
    }
  }

  // 从数据库获取未缓存的参数
  if (missingKeys.length > 0) {
    let whereCondition = and(
      eq(globalParams.domain, domain),
      eq(globalParams.status, 1),
    );

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
        await setCachedParam(param.key, domain, param);
      }
    }
  }

  return result;
}

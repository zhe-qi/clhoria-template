import type { InferSelectModel } from "drizzle-orm";

import { and, eq, ilike, or } from "drizzle-orm";

import type { DictionaryItem } from "@/db/schema";

import db from "@/db";
import { sysDictionaries } from "@/db/schema";
import { CacheConfig, getDictionariesAllKey, getDictionaryKey } from "@/lib/enums/cache";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";

export interface DictionariesListOptions {
  domain?: string;
  search?: string;
  status?: 0 | 1;
  enabledOnly?: boolean;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface DictionariesBatchOptions {
  domain?: string;
  enabledOnly?: boolean;
}

/**
 * 从 Redis 缓存中获取字典
 */
export async function getCachedDictionary(code: string, domain: string) {
  try {
    const cached = await redisClient.get(getDictionaryKey(code, domain));
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
 * 设置字典到 Redis 缓存
 */
export async function setCachedDictionary(code: string, domain: string, data: any) {
  try {
    await redisClient.setex(
      getDictionaryKey(code, domain),
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
export async function setCachedNullDictionary(code: string, domain: string) {
  try {
    await redisClient.setex(
      getDictionaryKey(code, domain),
      CacheConfig.NULL_CACHE_TTL,
      JSON.stringify(CacheConfig.NULL_CACHE_VALUE),
    );
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 删除缓存的字典
 */
export async function deleteCachedDictionary(code: string, domain: string) {
  try {
    await redisClient.del(getDictionaryKey(code, domain));
    await redisClient.del(getDictionariesAllKey(domain));
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 清除域的所有字典缓存
 */
export async function clearDomainDictionaryCache(domain: string) {
  try {
    const pattern = getDictionaryKey("*", domain);
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getDictionariesAllKey(domain));
  }
  catch {
    // Redis错误不影响业务流程，静默处理
  }
}

/**
 * 获取字典列表（简单模式，用于公开API）
 */
export async function getPublicDictionaries(options: DictionariesListOptions = {}) {
  const { domain = CacheConfig.DEFAULT_DOMAIN, enabledOnly = true } = options;

  // 尝试从缓存获取
  if (enabledOnly) {
    const cacheKey = getDictionariesAllKey(domain);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // 构建查询条件
  let whereCondition = eq(sysDictionaries.domain, domain);

  if (enabledOnly) {
    whereCondition = and(whereCondition, eq(sysDictionaries.status, 1))!;
  }

  const result = await db
    .select()
    .from(sysDictionaries)
    .where(whereCondition)
    .orderBy(sysDictionaries.sortOrder, sysDictionaries.createdAt);

  // 如果是启用的字典，缓存结果
  if (enabledOnly) {
    await redisClient.setex(
      getDictionariesAllKey(domain),
      CacheConfig.CACHE_TTL,
      JSON.stringify(result),
    );
  }

  return result;
}

/**
 * 获取字典列表（分页模式，用于管理API）
 */
export async function getAdminDictionaries(options: DictionariesListOptions = {}) {
  const {
    domain = CacheConfig.DEFAULT_DOMAIN,
    search,
    status,
    pagination: paginationOptions = { page: 1, limit: 20 },
  } = options;

  let whereCondition = eq(sysDictionaries.domain, domain);

  if (search) {
    whereCondition = and(
      whereCondition,
      or(
        ilike(sysDictionaries.code, `%${search}%`),
        ilike(sysDictionaries.name, `%${search}%`),
        ilike(sysDictionaries.description, `%${search}%`),
      ),
    )!;
  }

  if (status !== undefined) {
    whereCondition = and(
      whereCondition,
      eq(sysDictionaries.status, status),
    )!;
  }

  return await pagination<InferSelectModel<typeof sysDictionaries>>(
    sysDictionaries,
    whereCondition!,
    paginationOptions,
  );
}

/**
 * 获取单个字典（公开访问）
 */
export async function getPublicDictionary(code: string, domain: string = CacheConfig.DEFAULT_DOMAIN) {
  // 尝试从缓存获取
  const cached = await getCachedDictionary(code, domain);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [dictionary] = await db
    .select()
    .from(sysDictionaries)
    .where(and(
      eq(sysDictionaries.code, code),
      eq(sysDictionaries.domain, domain),
      eq(sysDictionaries.status, 1), // 只允许访问启用的字典
    ));

  if (dictionary) {
    // 缓存结果
    await setCachedDictionary(code, domain, dictionary);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullDictionary(code, domain);
  }

  return dictionary;
}

/**
 * 获取单个字典（管理访问）
 */
export async function getAdminDictionary(code: string, domain: string = CacheConfig.DEFAULT_DOMAIN) {
  const cached = await getCachedDictionary(code, domain);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [dictionary] = await db
    .select()
    .from(sysDictionaries)
    .where(and(
      eq(sysDictionaries.code, code),
      eq(sysDictionaries.domain, domain),
    ));

  if (dictionary) {
    await setCachedDictionary(code, domain, dictionary);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullDictionary(code, domain);
  }

  return dictionary;
}

/**
 * 创建字典
 */
export async function createDictionary(data: any, domain: string = CacheConfig.DEFAULT_DOMAIN, userId: string) {
  const [created] = await db
    .insert(sysDictionaries)
    .values({
      ...data,
      domain,
      createdBy: userId,
    })
    .returning();

  await setCachedDictionary(created.code, domain, created);
  await clearDomainDictionaryCache(domain);

  return created;
}

/**
 * 更新字典
 */
export async function updateDictionary(code: string, data: any, domain: string = CacheConfig.DEFAULT_DOMAIN, userId: string) {
  const [updated] = await db
    .update(sysDictionaries)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(
      eq(sysDictionaries.code, code),
      eq(sysDictionaries.domain, domain),
    ))
    .returning();

  if (updated) {
    await setCachedDictionary(code, domain, updated);
    await clearDomainDictionaryCache(domain);
  }

  return updated;
}

/**
 * 删除字典
 */
export async function deleteDictionary(code: string, domain: string = CacheConfig.DEFAULT_DOMAIN) {
  const [deleted] = await db
    .delete(sysDictionaries)
    .where(and(
      eq(sysDictionaries.code, code),
      eq(sysDictionaries.domain, domain),
    ))
    .returning({ code: sysDictionaries.code });

  if (deleted) {
    await deleteCachedDictionary(code, domain);
  }

  return deleted;
}

/**
 * 批量获取字典
 */
export async function batchGetDictionaries(codes: string[], options: DictionariesBatchOptions = {}) {
  const { domain = CacheConfig.DEFAULT_DOMAIN, enabledOnly = true } = options;
  const result: Record<string, any> = {};

  // 尝试从缓存批量获取
  const cacheKeys = codes.map(code => getDictionaryKey(code, domain));
  const cached = await redisClient.mget(...cacheKeys);

  const missingCodes: string[] = [];

  // 处理缓存结果
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const cachedValue = cached[i];

    if (cachedValue) {
      const parsed = JSON.parse(cachedValue);
      if (parsed === CacheConfig.NULL_CACHE_VALUE) {
        // 空值缓存命中，直接设为null
        result[code] = null;
      }
      else {
        result[code] = parsed;
      }
    }
    else {
      missingCodes.push(code);
      result[code] = null;
    }
  }

  // 从数据库获取未缓存的字典
  if (missingCodes.length > 0) {
    let whereCondition = and(
      eq(sysDictionaries.domain, domain),
    );

    if (enabledOnly) {
      whereCondition = and(whereCondition, eq(sysDictionaries.status, 1))!;
    }

    const dbDictionaries = await db
      .select()
      .from(sysDictionaries)
      .where(whereCondition);

    // 更新结果和缓存
    for (const dictionary of dbDictionaries) {
      if (missingCodes.includes(dictionary.code)) {
        result[dictionary.code] = dictionary;
        await setCachedDictionary(dictionary.code, domain, dictionary);
      }
    }

    // 为不存在的code缓存空值
    const foundCodes = dbDictionaries.map(d => d.code);
    for (const missingCode of missingCodes) {
      if (!foundCodes.includes(missingCode)) {
        await setCachedNullDictionary(missingCode, domain);
      }
    }
  }

  return result;
}

/**
 * 获取字典项（从字典的items字段中提取）
 */
export function getDictionaryItems(dictionary: InferSelectModel<typeof sysDictionaries>): DictionaryItem[] {
  if (!dictionary || !dictionary.items) {
    return [];
  }

  // 过滤启用的字典项并按排序排列
  return dictionary.items
    .filter(item => item.status === 1)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 通过编码获取字典项
 */
export function getDictionaryItemByCode(dictionary: InferSelectModel<typeof sysDictionaries>, itemCode: string): DictionaryItem | null {
  const items = getDictionaryItems(dictionary);
  return items.find(item => item.code === itemCode) || null;
}

/**
 * 检查字典编码是否存在
 */
export async function isDictionaryCodeExists(code: string, domain: string = CacheConfig.DEFAULT_DOMAIN, excludeId?: string): Promise<boolean> {
  let whereCondition = and(
    eq(sysDictionaries.code, code),
    eq(sysDictionaries.domain, domain),
  );

  if (excludeId) {
    whereCondition = and(whereCondition, eq(sysDictionaries.id, excludeId))!;
  }

  const [existing] = await db
    .select({ id: sysDictionaries.id })
    .from(sysDictionaries)
    .where(whereCondition)
    .limit(1);

  return !!existing;
}

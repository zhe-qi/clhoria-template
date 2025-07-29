import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type z from "zod/v4";

import { and, eq, ilike, or } from "drizzle-orm";

import type { DictionaryItem, insertSystemDictionariesSchema, patchSystemDictionariesSchema, selectSystemDictionariesSchema } from "@/db/schema";
import type { StatusType } from "@/lib/enums";

import db from "@/db";
import { systemDictionaries } from "@/db/schema";
import { Status } from "@/lib/enums";
import { CacheConfig, getDictionariesAllKey, getDictionaryKey } from "@/lib/enums/cache";
import { logger } from "@/lib/logger";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";

export interface DictionariesListOptions {
  search?: string;
  status?: StatusType;
  enabledOnly?: boolean;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface DictionariesBatchOptions {
  enabledOnly?: boolean;
}

type UpdateDictionaryData = z.infer<typeof patchSystemDictionariesSchema>;
type SelectDictionaryData = z.infer<typeof selectSystemDictionariesSchema>;
type InsertDictionaryData = z.infer<typeof insertSystemDictionariesSchema>;

/**
 * 从 Redis 缓存中获取字典
 */
export async function getCachedDictionary(code: string) {
  try {
    const cached = await redisClient.get(getDictionaryKey(code));
    if (!cached) {
      return null;
    }
    const parsed = JSON.parse(cached);
    // 检查是否为空值缓存标记
    return parsed === CacheConfig.NULL_CACHE_VALUE ? undefined : parsed;
  }
  catch (error) {
    logger.warn({ error, code }, "字典缓存获取失败");
    return null;
  }
}

/**
 * 设置字典到 Redis 缓存
 */
export async function setCachedDictionary(code: string, data: InsertDictionaryData) {
  try {
    await redisClient.setex(
      getDictionaryKey(code),
      CacheConfig.CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch (error) {
    logger.error({ error, code }, "设置字典缓存失败");
  }
}

/**
 * 设置空值缓存（防止缓存穿透）
 */
export async function setCachedNullDictionary(code: string) {
  try {
    await redisClient.setex(
      getDictionaryKey(code),
      CacheConfig.NULL_CACHE_TTL,
      JSON.stringify(CacheConfig.NULL_CACHE_VALUE),
    );
  }
  catch (error) {
    logger.error({ error, code }, "设置空值字典缓存失败");
  }
}

/**
 * 删除缓存的字典
 */
export async function deleteCachedDictionary(code: string) {
  try {
    await redisClient.del(getDictionaryKey(code));
    await redisClient.del(getDictionariesAllKey());
  }
  catch (error) {
    logger.error({ error, code }, "删除字典缓存失败");
  }
}

/**
 * 清除所有字典缓存
 */
export async function clearAllDictionaryCache() {
  try {
    const pattern = getDictionaryKey("*");
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getDictionariesAllKey());
  }
  catch (error) {
    logger.error({ error }, "清除所有字典缓存失败");
  }
}

/**
 * 获取字典列表（简单模式，用于公开API）
 */
export async function getPublicDictionaries(options: DictionariesListOptions = {}) {
  const { enabledOnly = true } = options;

  // 尝试从缓存获取
  if (enabledOnly) {
    const cacheKey = getDictionariesAllKey();
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // 构建查询条件
  const whereCondition = enabledOnly ? eq(systemDictionaries.status, Status.ENABLED) : undefined;

  const result = await db
    .select()
    .from(systemDictionaries)
    .where(whereCondition)
    .orderBy(systemDictionaries.sortOrder, systemDictionaries.createdAt);

  // 如果是启用的字典，缓存结果
  if (enabledOnly) {
    await redisClient.setex(
      getDictionariesAllKey(),
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
    search,
    status,
    pagination: paginationOptions = { page: 1, limit: 20 },
  } = options;

  let whereCondition = eq(systemDictionaries.status, Status.ENABLED);

  if (search) {
    whereCondition = and(
      whereCondition,
      or(
        ilike(systemDictionaries.code, `%${search}%`),
        ilike(systemDictionaries.name, `%${search}%`),
        ilike(systemDictionaries.description, `%${search}%`),
      ),
    )!;
  }

  if (status !== undefined) {
    whereCondition = and(
      whereCondition,
      eq(systemDictionaries.status, status),
    )!;
  }

  return await pagination<InferSelectModel<typeof systemDictionaries>>(
    systemDictionaries,
    whereCondition!,
    paginationOptions,
  );
}

/**
 * 获取单个字典（公开访问）
 */
export async function getPublicDictionary(code: string) {
  // 尝试从缓存获取
  const cached = await getCachedDictionary(code);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [dictionary] = await db
    .select()
    .from(systemDictionaries)
    .where(and(
      eq(systemDictionaries.code, code),
      eq(systemDictionaries.status, Status.ENABLED), // 只允许访问启用的字典
    ));

  if (dictionary) {
    // 缓存结果
    await setCachedDictionary(code, dictionary);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullDictionary(code);
  }

  return dictionary;
}

/**
 * 获取单个字典（管理访问）
 */
export async function getAdminDictionary(code: string) {
  const cached = await getCachedDictionary(code);
  if (cached !== null) {
    return cached; // 如果是undefined表示空值缓存命中
  }

  const [dictionary] = await db
    .select()
    .from(systemDictionaries)
    .where(eq(systemDictionaries.code, code));

  if (dictionary) {
    await setCachedDictionary(code, dictionary);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullDictionary(code);
  }

  return dictionary;
}

/**
 * 创建字典
 */
export async function createDictionary(data: InferInsertModel<typeof systemDictionaries>, userId: string) {
  const [created] = await db
    .insert(systemDictionaries)
    .values({
      ...data,
      createdBy: userId,
    })
    .returning();

  await setCachedDictionary(created.code, created);
  await clearAllDictionaryCache();

  return created;
}

/**
 * 更新字典
 */
export async function updateDictionary(code: string, data: UpdateDictionaryData, userId: string) {
  const [updated] = await db
    .update(systemDictionaries)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(systemDictionaries.code, code))
    .returning();

  if (updated) {
    await setCachedDictionary(code, updated);
    await clearAllDictionaryCache();
  }

  return updated;
}

/**
 * 删除字典
 */
export async function deleteDictionary(code: string) {
  const [deleted] = await db
    .delete(systemDictionaries)
    .where(eq(systemDictionaries.code, code))
    .returning({ code: systemDictionaries.code });

  if (deleted) {
    await deleteCachedDictionary(code);
  }

  return deleted;
}

/**
 * 批量获取字典
 */
export async function batchGetDictionaries(codes: string[], options: DictionariesBatchOptions = {}) {
  const { enabledOnly = true } = options;
  const result: Record<string, InferSelectModel<typeof systemDictionaries> | null> = {};

  // 尝试从缓存批量获取
  const cacheKeys = codes.map(code => getDictionaryKey(code));
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
    const whereCondition = enabledOnly ? eq(systemDictionaries.status, 1) : undefined;

    const dbDictionaries = await db
      .select()
      .from(systemDictionaries)
      .where(whereCondition);

    // 更新结果和缓存
    for (const dictionary of dbDictionaries) {
      if (missingCodes.includes(dictionary.code)) {
        result[dictionary.code] = dictionary;
        await setCachedDictionary(dictionary.code, dictionary);
      }
    }

    // 为不存在的code缓存空值
    const foundCodes = dbDictionaries.map(d => d.code);
    for (const missingCode of missingCodes) {
      if (!foundCodes.includes(missingCode)) {
        await setCachedNullDictionary(missingCode);
      }
    }
  }

  return result;
}

/**
 * 获取字典项（从字典的items字段中提取）
 */
export function getDictionaryItems(dictionary: SelectDictionaryData): DictionaryItem[] {
  if (!dictionary || !dictionary.items) {
    return [];
  }

  // 过滤启用的字典项并按排序排列
  return dictionary.items
    .filter(item => item.status === Status.ENABLED)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 通过编码获取字典项
 */
export function getDictionaryItemByCode(dictionary: SelectDictionaryData, itemCode: string): DictionaryItem | null {
  const items = getDictionaryItems(dictionary);
  return items.find(item => item.code === itemCode) || null;
}

/**
 * 检查字典编码是否存在
 */
export async function isDictionaryCodeExists(code: string, excludeId?: string): Promise<boolean> {
  let whereCondition = eq(systemDictionaries.code, code);

  if (excludeId) {
    whereCondition = and(whereCondition, eq(systemDictionaries.id, excludeId))!;
  }

  const [existing] = await db
    .select({ id: systemDictionaries.id })
    .from(systemDictionaries)
    .where(whereCondition)
    .limit(1);

  return !!existing;
}

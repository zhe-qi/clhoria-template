import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type z from "zod/v4";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import type {
  NoticeTypeValue,
  patchSystemNoticesSchema,
  selectSystemNoticesSchema,
} from "@/db/schema";
import type { StatusType } from "@/lib/enums";

import db from "@/db";
import { systemNotices } from "@/db/schema";
import { Status } from "@/lib/enums";
import { CacheConfig, getNoticeKey, getNoticesAllKey } from "@/lib/enums/cache";
import { logger } from "@/lib/logger";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";
import { formatDate } from "@/utils";

export interface NoticesListOptions {
  search?: string;
  type?: NoticeTypeValue;
  status?: StatusType;
  domain: string;
  enabledOnly?: boolean;
  pagination?: {
    page: number;
    limit: number;
  };
}

type UpdateNoticeData = z.infer<typeof patchSystemNoticesSchema>;
type SelectNoticeData = z.infer<typeof selectSystemNoticesSchema>;

/**
 * 从 Redis 缓存中获取通知公告
 */
export async function getCachedNotice(id: string) {
  try {
    const cached = await redisClient.get(getNoticeKey(id));
    if (!cached) {
      return null;
    }
    const parsed = JSON.parse(cached);
    // 检查是否为空值缓存标记
    return parsed === CacheConfig.NULL_CACHE_VALUE ? undefined : parsed as SelectNoticeData;
  }
  catch (error) {
    logger.warn({ error, id }, "通知公告缓存获取失败");
    return null;
  }
}

/**
 * 设置通知公告到 Redis 缓存
 */
export async function setCachedNotice(id: string, data: SelectNoticeData) {
  try {
    await redisClient.setex(
      getNoticeKey(id),
      CacheConfig.CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch (error) {
    logger.error({ error, id }, "设置通知公告缓存失败");
  }
}

/**
 * 设置空值缓存（防止缓存穿透）
 */
export async function setCachedNullNotice(id: string) {
  try {
    await redisClient.setex(
      getNoticeKey(id),
      CacheConfig.NULL_CACHE_TTL,
      JSON.stringify(CacheConfig.NULL_CACHE_VALUE),
    );
  }
  catch (error) {
    logger.error({ error, id }, "设置空值通知公告缓存失败");
  }
}

/**
 * 删除缓存的通知公告
 */
export async function deleteCachedNotice(id: string, domain: string) {
  try {
    await redisClient.del(getNoticeKey(id));
    await redisClient.del(getNoticesAllKey(domain));
  }
  catch (error) {
    logger.error({ error, id, domain }, "删除通知公告缓存失败");
  }
}

/**
 * 清除所有通知公告缓存
 */
export async function clearAllNoticeCache(domain: string) {
  try {
    const pattern = getNoticeKey("*");
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getNoticesAllKey(domain));
  }
  catch (error) {
    logger.error({ error, domain }, "清除所有通知公告缓存失败");
  }
}

/**
 * 获取通知公告列表（简单模式，用于公开API）
 */
export async function getPublicNotices(options: NoticesListOptions) {
  const { domain, enabledOnly = true, type, pagination: paginationOptions } = options;

  // 尝试从缓存获取
  if (enabledOnly && !type && !paginationOptions) {
    const cacheKey = getNoticesAllKey(domain);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SelectNoticeData[];
    }
  }

  // 构建查询条件
  let whereCondition = and(
    eq(systemNotices.domain, domain),
    enabledOnly ? eq(systemNotices.status, Status.ENABLED) : undefined,
  );

  if (type) {
    whereCondition = and(whereCondition, eq(systemNotices.type, type))!;
  }

  const query = db
    .select()
    .from(systemNotices)
    .where(whereCondition)
    .orderBy(desc(systemNotices.sortOrder), desc(systemNotices.createdAt));

  let result;
  if (paginationOptions) {
    result = await pagination<InferSelectModel<typeof systemNotices>>(
      systemNotices,
      whereCondition!,
      {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
        orderBy: [desc(systemNotices.sortOrder), desc(systemNotices.createdAt)],
      },
    );
  }
  else {
    const data = await query;
    result = data;
  }

  // 如果是启用的通知公告且无分页，缓存结果
  if (enabledOnly && !type && !paginationOptions) {
    await redisClient.setex(
      getNoticesAllKey(domain),
      CacheConfig.CACHE_TTL,
      JSON.stringify(result),
    );
  }

  return result;
}

/**
 * 获取通知公告列表（分页模式，用于管理API）
 */
export async function getAdminNotices(options: NoticesListOptions) {
  const {
    domain,
    search,
    type,
    status,
    pagination: paginationOptions = { page: 1, limit: 20 },
  } = options;

  let whereCondition = eq(systemNotices.domain, domain);

  if (search) {
    whereCondition = and(
      whereCondition,
      or(
        ilike(systemNotices.title, `%${search}%`),
        ilike(systemNotices.content, `%${search}%`),
      ),
    )!;
  }

  if (type) {
    whereCondition = and(whereCondition, eq(systemNotices.type, type))!;
  }

  if (status !== undefined) {
    whereCondition = and(whereCondition, eq(systemNotices.status, status))!;
  }

  return await pagination<InferSelectModel<typeof systemNotices>>(
    systemNotices,
    whereCondition!,
    {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      orderBy: [desc(systemNotices.sortOrder), desc(systemNotices.createdAt)],
    },
  );
}

/**
 * 获取单个通知公告（公开访问）
 */
export async function getPublicNotice(id: string, domain: string) {
  // 尝试从缓存获取
  const cached = await getCachedNotice(id);
  if (cached !== null) {
    // 检查域是否匹配
    if (cached && cached.domain === domain && cached.status === Status.ENABLED) {
      return cached;
    }
    return undefined;
  }

  const [notice] = await db
    .select()
    .from(systemNotices)
    .where(and(
      eq(systemNotices.id, id),
      eq(systemNotices.domain, domain),
      eq(systemNotices.status, Status.ENABLED), // 只允许访问启用的通知公告
    ));

  if (notice) {
    // 缓存结果
    await setCachedNotice(id, notice);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullNotice(id);
  }

  return notice;
}

/**
 * 获取单个通知公告（管理访问）
 */
export async function getAdminNotice(id: string, domain: string) {
  const cached = await getCachedNotice(id);
  if (cached !== null) {
    // 检查域是否匹配
    if (cached && cached.domain === domain) {
      return cached;
    }
    return undefined;
  }

  const [notice] = await db
    .select()
    .from(systemNotices)
    .where(and(
      eq(systemNotices.id, id),
      eq(systemNotices.domain, domain),
    ));

  if (notice) {
    await setCachedNotice(id, notice);
  }
  else {
    // 缓存空值防止穿透
    await setCachedNullNotice(id);
  }

  return notice;
}

/**
 * 创建通知公告
 */
export async function createNotice(data: InferInsertModel<typeof systemNotices>, userId: string) {
  const [created] = await db
    .insert(systemNotices)
    .values({
      ...data,
      createdBy: userId,
    })
    .returning();

  await setCachedNotice(created.id, created);
  await clearAllNoticeCache(created.domain);

  return created;
}

/**
 * 更新通知公告
 */
export async function updateNotice(id: string, domain: string, data: UpdateNoticeData, userId: string) {
  const [updated] = await db
    .update(systemNotices)
    .set({
      ...data,
      updatedBy: userId,
      updatedAt: formatDate(new Date()),
    })
    .where(and(
      eq(systemNotices.id, id),
      eq(systemNotices.domain, domain),
    ))
    .returning();

  if (updated) {
    await setCachedNotice(id, updated);
    await clearAllNoticeCache(domain);
  }

  return updated;
}

/**
 * 删除通知公告
 */
export async function deleteNotice(id: string, domain: string) {
  const [deleted] = await db
    .delete(systemNotices)
    .where(and(
      eq(systemNotices.id, id),
      eq(systemNotices.domain, domain),
    ))
    .returning({ id: systemNotices.id });

  if (deleted) {
    await deleteCachedNotice(id, domain);
  }

  return deleted;
}

/**
 * 检查通知公告是否存在
 */
export async function isNoticeExists(id: string, domain?: string): Promise<boolean> {
  let whereCondition = eq(systemNotices.id, id);

  if (domain) {
    whereCondition = and(whereCondition, eq(systemNotices.domain, domain))!;
  }

  const [existing] = await db
    .select({ id: systemNotices.id })
    .from(systemNotices)
    .where(whereCondition)
    .limit(1);

  return !!existing;
}

import type { Context, MiddlewareHandler } from "hono";

import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { apiKey } from "@/db/schema";
import { redisClient } from "@/lib/redis";

/**
 * 从 Redis 获取 API Key 缓存
 */
async function getApiKeyFromCache(keyValue: string): Promise<boolean> {
  try {
    const cacheKey = `api_key:${keyValue}`;
    const cached = await redisClient.get(cacheKey);

    if (cached !== null) {
      return cached === "1";
    }

    // 从数据库查询
    const result = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.key, keyValue))
      .limit(1);

    const isValid = result.length > 0
      && result[0].enabled
      && (!result[0].expiresAt || result[0].expiresAt > new Date());

    // 缓存结果 5 分钟
    await redisClient.setex(cacheKey, 300, isValid ? "1" : "0");

    // 更新最后使用时间
    if (isValid) {
      await db
        .update(apiKey)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKey.key, keyValue));
    }

    return isValid;
  }
  catch (error) {
    console.error("API Key validation error:", error);
    return false;
  }
}

/**
 * API Key 验证中间件
 */
export function apiKeyAuth(options: {
  headerName?: string;
  queryName?: string;
  required?: boolean;
} = {}): MiddlewareHandler {
  const {
    headerName = "x-api-key",
    queryName = "api_key",
    required = true,
  } = options;

  return async (c: Context, next) => {
    // 从 header 或 query 中获取 API Key
    const apiKeyValue = c.req.header(headerName) || c.req.query(queryName);

    if (!apiKeyValue) {
      if (required) {
        return c.json(
          { message: "API Key is required" },
          HttpStatusCodes.UNAUTHORIZED,
        );
      }
      await next();
      return;
    }

    // 验证 API Key
    const isValid = await getApiKeyFromCache(apiKeyValue);

    if (!isValid) {
      return c.json(
        { message: "Invalid or expired API Key" },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // 将 API Key 信息存入上下文
    c.set("apiKey", apiKeyValue);

    await next();
  };
}

/**
 * 清理 API Key 缓存
 */
export async function clearApiKeyCache(keyValue: string) {
  const cacheKey = `api_key:${keyValue}`;
  await redisClient.del(cacheKey);
}

/**
 * 批量清理所有 API Key 缓存
 */
export async function clearAllApiKeyCache() {
  const pattern = "api_key:*";
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}

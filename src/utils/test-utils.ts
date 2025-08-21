import { addDays, getUnixTime } from "date-fns";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";

import db from "@/db";
import { systemUser } from "@/db/schema";
import env from "@/env";

/** 缓存的token信息 */
interface CachedToken {
  token: string;
  userId: string;
}

/** 单例缓存 */
let adminTokenCache: CachedToken | null = null;
let userTokenCache: CachedToken | null = null;

/**
 * 生成测试用的JWT token
 */
async function generateTestToken(username: string): Promise<CachedToken> {
  // 查询用户信息
  const user = await db.query.systemUser.findFirst({
    where: eq(systemUser.username, username),
    columns: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error(`测试用户 ${username} 不存在`);
  }

  // 生成token payload
  const now = getUnixTime(new Date());
  const accessTokenExp = getUnixTime(addDays(new Date(), 7));
  const jti = crypto.randomUUID();

  const tokenPayload = {
    userId: user.id,
    iat: now,
    exp: accessTokenExp,
    jti,
    roles: [],
  };

  // 生成token
  const token = await sign({ ...tokenPayload, type: "access" }, env.ADMIN_JWT_SECRET, "HS256");

  return {
    token,
    userId: user.id,
  };
}

/**
 * 获取admin测试token（单例模式）
 */
export async function getAdminToken(): Promise<string> {
  if (!adminTokenCache) {
    adminTokenCache = await generateTestToken("admin");
  }
  return adminTokenCache.token;
}

/**
 * 获取普通用户测试token（单例模式）
 */
export async function getUserToken(): Promise<string> {
  if (!userTokenCache) {
    userTokenCache = await generateTestToken("user");
  }
  return userTokenCache.token;
}

/**
 * 生成认证请求头
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * 清除缓存的token（测试结束时调用）
 */
export function clearTokenCache(): void {
  adminTokenCache = null;
  userTokenCache = null;
}

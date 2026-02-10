import type { UserTokenInfo } from "../auth.types";

import redisClient from "@/lib/redis";

import { generateAccessToken, generateRefreshToken, refreshIndexKey, refreshKey } from "../auth.helpers";

/**
 * 登录/注册时生成一对 Token
 */
export async function generateTokens(user: UserTokenInfo) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);
  return { accessToken, refreshToken };
}

/**
 * 刷新 Access Token
 */
export async function refreshAccessToken(refreshToken: string) {
  // 解析 token 获取 userId
  const separatorIndex = refreshToken.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error("Invalid refresh token format");
  }

  const userId = refreshToken.slice(0, separatorIndex);
  const randomPart = refreshToken.slice(separatorIndex + 1);

  if (!userId || !randomPart) {
    throw new Error("Invalid refresh token format");
  }

  const userDataStr = await redisClient.get(refreshKey(userId, randomPart));
  if (!userDataStr) {
    throw new Error("Invalid refresh token");
  }

  const user: UserTokenInfo = JSON.parse(userDataStr);

  // 验证 token 中的 userId 与存储的一致
  if (String(user.id) !== userId) {
    throw new Error("Token user mismatch");
  }

  // 轮换：删除旧 refresh，发新 refresh
  await redisClient.del(refreshKey(userId, randomPart));
  await redisClient.srem(refreshIndexKey(userId), randomPart);

  const [newAccessToken, newRefreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * 登出：吊销用户所有 Refresh Token
 */
export async function logout(userId: string | number) {
  const tokens = await redisClient.smembers(refreshIndexKey(userId));

  if (tokens.length === 0) {
    return;
  }

  const pipeline = redisClient.pipeline();
  // 所有 key 都带有相同的 Hash Tag {user.${userId}}，确保在同一 slot
  tokens.forEach(t => pipeline.del(refreshKey(userId, t)));
  pipeline.del(refreshIndexKey(userId));
  await pipeline.exec();
}

import crypto from "node:crypto";
import { addDays, addMinutes, differenceInSeconds, getUnixTime } from "date-fns";
import { sign } from "hono/jwt";

import env from "@/env";
import { ACCESS_TOKEN_EXPIRES_MINUTES, REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import redisClient from "@/lib/redis";

// ===== 配置 =====
const ACCESS_TOKEN_SECRET = env.ADMIN_JWT_SECRET;
const ACCESS_TOKEN_DURATION = { minutes: ACCESS_TOKEN_EXPIRES_MINUTES };
const REFRESH_TOKEN_DURATION = { days: REFRESH_TOKEN_EXPIRES_DAYS };

// 工具: 根据配置计算过期时间
function calculateExpiration(duration: { minutes?: number; days?: number; hours?: number }) {
  const now = new Date();

  switch (true) {
    case !!duration.minutes:
      return addMinutes(now, duration.minutes);
    case !!duration.days:
      return addDays(now, duration.days);
    case !!duration.hours:
      return addMinutes(now, duration.hours * 60);
  }

  throw new Error("Invalid duration configuration");
}

type UserTokenInfo = {
  id: string | number;
  roles: string[];
};

// 计算 TTL 秒数
const REFRESH_TTL_SECONDS = differenceInSeconds(
  calculateExpiration(REFRESH_TOKEN_DURATION),
  new Date(),
);

// ===== Redis Key 约定（使用 Hash Tag 确保同一用户的 key 在同一 slot） =====
const refreshKey = (userId: string | number, token: string) => `{user:${userId}}:rt:${token}`;
const refreshIndexKey = (userId: string | number) => `{user:${userId}}:rtidx`;

// ===== Access Token 生成 =====
async function generateAccessToken(user: UserTokenInfo) {
  const expirationDate = calculateExpiration(ACCESS_TOKEN_DURATION);

  const iat = getUnixTime(new Date());
  const exp = getUnixTime(expirationDate);

  return await sign(
    {
      roles: user.roles,
      sub: user.id,
      iat, // 签发时间（Unix 秒级时间戳）
      exp, // 过期时间（Unix 秒级时间戳）
    },
    ACCESS_TOKEN_SECRET,
  );
}

// ===== Refresh Token 生成 =====
async function generateRefreshToken(user: UserTokenInfo) {
  const randomPart = crypto.randomBytes(32).toString("hex"); // 256 bit
  const token = `${user.id}:${randomPart}`; // 包含 userId 便于解析

  const pipeline = redisClient.pipeline();
  pipeline.set(refreshKey(user.id, randomPart), JSON.stringify(user), "EX", REFRESH_TTL_SECONDS);
  pipeline.sadd(refreshIndexKey(user.id), randomPart);
  await pipeline.exec();

  return token;
}

/**
 * 登录/注册时生成一对 Token
 */
export async function generateTokens(user: UserTokenInfo) {
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
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

  const newAccessToken = await generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user);

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
  // 所有 key 都带有相同的 Hash Tag {user:${userId}}，确保在同一 slot
  tokens.forEach(t => pipeline.del(refreshKey(userId, t)));
  pipeline.del(refreshIndexKey(userId));
  await pipeline.exec();
}

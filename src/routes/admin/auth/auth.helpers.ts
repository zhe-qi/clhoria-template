import type { UserTokenInfo, ValidateLoginResult } from "./auth.types";
import crypto from "node:crypto";

import { verify } from "@node-rs/argon2";
import { addDays, addMinutes, differenceInSeconds, getUnixTime } from "date-fns";
import { eq } from "drizzle-orm";

import { sign } from "hono/jwt";

import db from "@/db";

import { systemUserRoles, systemUsers } from "@/db/schema";
import env from "@/env";

import { ACCESS_TOKEN_EXPIRES_MINUTES, REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import { Status } from "@/lib/enums";
import cap from "@/lib/services/cap";
import { enforcerPromise } from "@/lib/services/casbin";
import redisClient from "@/lib/services/redis";
import { toColumns } from "@/utils";

// ===== Configuration / 配置 =====
const ACCESS_TOKEN_SECRET = env.ADMIN_JWT_SECRET;
const ACCESS_TOKEN_DURATION = { minutes: ACCESS_TOKEN_EXPIRES_MINUTES };
const REFRESH_TOKEN_DURATION = { days: REFRESH_TOKEN_EXPIRES_DAYS };

// Utility: calculate expiration based on config / 工具: 根据配置计算过期时间
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

// Calculate TTL in seconds / 计算 TTL 秒数
const REFRESH_TTL_SECONDS = differenceInSeconds(
  calculateExpiration(REFRESH_TOKEN_DURATION),
  new Date(),
);

// ===== Redis Key convention (using Hash Tag to ensure same user's keys are in the same slot) / Redis Key 约定（使用 Hash Tag 确保同一用户的 key 在同一 slot） =====
export const refreshKey = (userId: string | number, token: string) => `{user.${userId}}:rt:${token}`;
export const refreshIndexKey = (userId: string | number) => `{user.${userId}}:rtidx`;

// ===== Access Token generation / Access Token 生成 =====
export async function generateAccessToken(user: UserTokenInfo) {
  const expirationDate = calculateExpiration(ACCESS_TOKEN_DURATION);

  const iat = getUnixTime(new Date());
  const exp = getUnixTime(expirationDate);

  return await sign(
    {
      roles: user.roles,
      sub: user.id,
      iat, // Issued at (Unix seconds timestamp) / 签发时间（Unix 秒级时间戳）
      exp, // Expiration time (Unix seconds timestamp) / 过期时间（Unix 秒级时间戳）
    },
    ACCESS_TOKEN_SECRET,
  );
}

// ===== Refresh Token generation / Refresh Token 生成 =====
export async function generateRefreshToken(user: UserTokenInfo) {
  const randomPart = crypto.randomBytes(32).toString("hex"); // 256 bit
  const token = `${user.id}:${randomPart}`; // Contains userId for easy parsing / 包含 userId 便于解析

  const pipeline = redisClient.pipeline();
  pipeline.set(refreshKey(user.id, randomPart), JSON.stringify(user), "EX", REFRESH_TTL_SECONDS);
  pipeline.sadd(refreshIndexKey(user.id), randomPart);
  await pipeline.exec();

  return token;
}

/**
 * Generate a pair of tokens during login/registration
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
 * Refresh access token
 * 刷新 Access Token
 */
export async function refreshAccessToken(refreshToken: string) {
  // Parse token to get userId / 解析 token 获取 userId
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

  // Verify userId in token matches stored data / 验证 token 中的 userId 与存储的一致
  if (String(user.id) !== userId) {
    throw new Error("Token user mismatch");
  }

  // Rotation: delete old refresh, issue new refresh / 轮换：删除旧 refresh，发新 refresh
  await redisClient.del(refreshKey(userId, randomPart));
  await redisClient.srem(refreshIndexKey(userId), randomPart);

  const [newAccessToken, newRefreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout: revoke all user's refresh tokens
 * 登出：吊销用户所有 Refresh Token
 */
export async function logout(userId: string | number) {
  const tokens = await redisClient.smembers(refreshIndexKey(userId));

  if (tokens.length === 0) {
    return;
  }

  const pipeline = redisClient.pipeline();
  // All keys share the same Hash Tag {user.${userId}}, ensuring they are in the same slot / 所有 key 都带有相同的 Hash Tag {user.${userId}}，确保在同一 slot
  tokens.forEach(t => pipeline.del(refreshKey(userId, t)));
  pipeline.del(refreshIndexKey(userId));
  await pipeline.exec();
}

/**
 * Validate captcha
 * @returns null if validation passes, otherwise returns error message / null 表示验证通过，否则返回错误信息
 * 验证验证码
 */
export async function validateCaptcha(captchaToken: string): Promise<string | null> {
  const { success } = await cap.validateToken(captchaToken);
  if (!success && env.NODE_ENV === "production") {
    return "验证码错误";
  }
  return null;
}

/**
 * Login validation
 * @returns On success returns user info, on failure returns { error, status } / 成功返回用户信息，失败返回 { error, status }
 * 登录验证
 */
export async function validateLogin(username: string, password: string): Promise<ValidateLoginResult> {
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.username, username),
    columns: {
      id: true,
      username: true,
      password: true,
      status: true,
    },
  });

  if (!user) {
    return { success: false, error: "用户名或密码错误", status: "unauthorized" };
  }

  if (user.status !== Status.ENABLED) {
    return { success: false, error: "用户已被禁用", status: "forbidden" };
  }

  const isPasswordValid = await verify(user.password, password);
  if (!isPasswordValid) {
    return { success: false, error: "用户名或密码错误", status: "unauthorized" };
  }

  const userRoles = await db.query.systemUserRoles.findMany({
    where: eq(systemUserRoles.userId, user.id),
  });

  return {
    success: true,
    user: {
      id: user.id,
      roles: userRoles.map(({ roleId }) => roleId),
    },
  };
}

/**
 * Get user identity info
 * 获取用户身份信息
 */
export async function getIdentityById(userId: string) {
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, userId),
    columns: toColumns(["id", "username", "avatar", "nickName"]),
    with: {
      systemUserRoles: {
        columns: {
          roleId: true,
        },
      },
    },
  });

  if (!user) return null;

  const { systemUserRoles, ...userWithoutRoles } = user;
  const roles = systemUserRoles.map(({ roleId }) => roleId);

  return { ...userWithoutRoles, roles };
}

/**
 * Get user permissions (role-based Casbin policies)
 * 获取用户权限（基于角色的 Casbin 策略）
 */
export async function getPermissionsByRoles(roles: string[]) {
  const casbinEnforcer = await enforcerPromise;
  const permissionsSet = new Set<string>();
  const groupingsSet = new Set<string>();

  const allPermsArrays = await Promise.all(
    roles.map(role => casbinEnforcer.getImplicitPermissionsForUser(role)),
  );

  // Process permissions for all roles / 处理所有角色的权限
  for (const perms of allPermsArrays) {
    for (const perm of perms) {
      if (!perm || perm.length === 0) continue;

      const filteredPerm = perm.filter(item => item && item.trim() !== "");
      if (filteredPerm.length === 0) continue;

      const permStr = `p, ${filteredPerm.join(", ")}`;
      permissionsSet.add(permStr);
    }
  }

  // Get all role inheritance relationships / 获取所有角色继承关系
  const allGroupings = await casbinEnforcer.getGroupingPolicy();
  for (const grouping of allGroupings) {
    if (!grouping || grouping.length === 0) continue;

    const filteredGrouping = grouping.filter(item => item && item.trim() !== "");
    if (filteredGrouping.length === 0) continue;

    const groupingStr = `g, ${filteredGrouping.join(", ")}`;
    groupingsSet.add(groupingStr);
  }

  return {
    permissions: Array.from(permissionsSet),
    groupings: Array.from(groupingsSet),
  };
}

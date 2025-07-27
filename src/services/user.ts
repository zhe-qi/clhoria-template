import type { InferInsertModel } from "drizzle-orm";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { sysTokens, sysUser, sysUserRole } from "@/db/schema";
import { CacheConfig, getPermissionResultKey, getUserRolesKey, TokenStatus } from "@/lib/enums";
import { clearUserCache } from "@/lib/permissions";
import * as rbac from "@/lib/permissions/casbin/rbac";
import { redisClient } from "@/lib/redis";

type CreateUserParams = InferInsertModel<typeof sysUser>;

/**
 * 创建用户
 */
export async function createUser(params: CreateUserParams) {
  const hashedPassword = await hash(params.password);

  const [user] = await db.insert(sysUser).values({
    ...params,
    password: hashedPassword,
  }).returning();

  return user;
}

/**
 * 用户登出
 */
export async function logout(userId: string, domain: string, accessToken: string) {
  // 更新令牌状态
  await db
    .update(sysTokens)
    .set({ status: TokenStatus.REVOKED })
    .where(eq(sysTokens.accessToken, accessToken));

  // 清理 Redis 缓存
  await clearUserPermissionCache(userId, domain);
}

/**
 * 更新用户密码
 */
export async function updatePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  const [user] = await db
    .select({ password: sysUser.password })
    .from(sysUser)
    .where(eq(sysUser.id, userId));

  if (!user) {
    throw new Error("用户不存在");
  }

  // 验证旧密码
  const isValidPassword = await verify(user.password, oldPassword);
  if (!isValidPassword) {
    throw new Error("旧密码错误");
  }

  // 更新密码
  const hashedPassword = await hash(newPassword);
  await db
    .update(sysUser)
    .set({ password: hashedPassword })
    .where(eq(sysUser.id, userId));
}

/**
 * 为用户分配角色
 */
export async function assignRolesToUser(
  userId: string,
  roleIds: string[],
  domain: string,
  _operatorId: string,
) {
  return db.transaction(async (tx) => {
    // 获取当前用户的角色
    const currentRoles = await rbac.getRolesForUser(userId, domain);
    const currentRoleSet = new Set(currentRoles);
    const newRoleSet = new Set(roleIds);

    // 找出需要添加的角色
    const toAdd = roleIds.filter(roleId => !currentRoleSet.has(roleId));
    // 找出需要删除的角色
    const toRemove = currentRoles.filter(roleId => !newRoleSet.has(roleId));

    // 更新 Casbin
    const casbinOps = await Promise.all([
      ...toAdd.map(roleId => rbac.addRoleForUser(userId, roleId, domain)),
      ...toRemove.map(roleId => rbac.deleteRoleForUser(userId, roleId, domain)),
    ]);

    // 更新数据库
    if (toRemove.length > 0) {
      await tx
        .delete(sysUserRole)
        .where(and(
          eq(sysUserRole.userId, userId),
          inArray(sysUserRole.roleId, toRemove),
        ));
    }

    if (toAdd.length > 0) {
      await tx.insert(sysUserRole).values(
        toAdd.map(roleId => ({
          userId,
          roleId,
        })),
      );
    }

    // 更新 Redis 缓存
    await clearUserPermissionCache(userId, domain);
    await setUserRolesToCache(userId, domain, roleIds);

    return {
      success: casbinOps.every(Boolean),
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
}

/**
 * 从缓存获取用户角色，包含fallback逻辑
 */
export async function getUserRolesFromCache(userId: string, domain: string): Promise<string[]> {
  const key = getUserRolesKey(userId, domain);
  const cachedRoles = await redisClient.smembers(key);
  const roles = cachedRoles.filter(role => role !== "__no_roles__");

  // 如果缓存为空且没有"__no_roles__"标记，从数据库查询并重建缓存
  if (roles.length === 0 && !cachedRoles.includes("__no_roles__")) {
    return await refreshUserRoleCache(userId, domain);
  }

  return roles;
}

/**
 * 设置用户角色到缓存
 */
export async function setUserRolesToCache(userId: string, domain: string, roles: string[]): Promise<void> {
  const key = getUserRolesKey(userId, domain);
  await redisClient.del(key);

  if (roles.length > 0) {
    await redisClient.sadd(key, ...roles);
  }
  else {
    // 即使没有角色，也要设置一个标记表示已经处理过该用户
    await redisClient.sadd(key, "__no_roles__");
  }

  await redisClient.expire(key, CacheConfig.CACHE_TTL);
}

/**
 * 从数据库刷新用户角色缓存
 */
export async function refreshUserRoleCache(userId: string, domain: string): Promise<string[]> {
  // 从数据库查询用户角色
  const userRoles = await db
    .select({ roleId: sysUserRole.roleId })
    .from(sysUserRole)
    .where(eq(sysUserRole.userId, userId));

  const roles = userRoles.map(ur => ur.roleId);

  // 更新缓存
  await setUserRolesToCache(userId, domain, roles);

  return roles;
}

/**
 * 清理用户权限相关缓存
 */
export async function clearUserPermissionCache(userId: string, domain: string): Promise<void> {
  // 清理用户基础缓存
  await clearUserCache(userId, domain);

  // 清理权限验证结果缓存
  const pattern = getPermissionResultKey(userId, domain, "*", "*");
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}

/**
 * 缓存权限验证结果
 */
export async function cachePermissionResult(
  userId: string,
  domain: string,
  method: string,
  path: string,
  result: boolean,
): Promise<void> {
  const key = getPermissionResultKey(userId, domain, method, path);
  await redisClient.setex(key, CacheConfig.NULL_CACHE_TTL, result ? "1" : "0");
}

/**
 * 获取权限验证结果缓存
 */
export async function getPermissionResult(
  userId: string,
  domain: string,
  method: string,
  path: string,
): Promise<boolean | null> {
  const key = getPermissionResultKey(userId, domain, method, path);
  const result = await redisClient.get(key);

  if (result === null) {
    return null;
  }

  return result === "1";
}

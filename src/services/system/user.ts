import type { InferInsertModel } from "drizzle-orm";
import type { Context } from "hono";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { systemTokens, systemUser, systemUserRole } from "@/db/schema";
import { CacheConfig, getPermissionResultKey, getUserMenusKey, getUserRolesKey, getUserStatusKey, TokenStatus } from "@/lib/enums";
import * as rbac from "@/lib/permissions/casbin/rbac";
import redisClient from "@/lib/redis";
import { getIPAddress } from "@/services/ip";
import { formatDate } from "@/utils/tools/formatter";

type CreateUserParams = InferInsertModel<typeof systemUser>;

/**
 * 日志收集工具接口
 */
interface LogContext {
  logFailure: (userId?: string) => Promise<void>;
  logSuccess: (userId: string) => Promise<void>;
  getTokenData: () => {
    ip: string;
    address: string;
    userAgent: string;
    requestId: string;
  };
}

/**
 * 创建登录日志收集上下文
 */
export async function createLoginLogContext(c: Context, username: string, domain: string): Promise<LogContext> {
  const clientIP = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";
  const address = await getIPAddress(clientIP);
  const requestId = c.get("requestId") || uuidV7();
  const currentTime = formatDate(new Date());

  // eslint-disable-next-line unused-imports/no-unused-vars
  const baseLogData = {
    id: uuidV7(),
    username,
    domain,
    loginTime: currentTime,
    ip: clientIP,
    address,
    userAgent,
    requestId,
    createdBy: "system" as const,
    createdAt: currentTime,
  };

  return {
    // 记录失败日志
    logFailure: (_userId: string = "00000000-0000-0000-0000-000000000000") => {
      // TODO: 你可以选择你自己的日志写入方式 比如 阿里云 sls
      return Promise.resolve();
    },

    // 记录成功日志
    logSuccess: (_userId: string) => {
      // TODO: 你可以选择你自己的日志写入方式 比如 阿里云 sls
      return Promise.resolve();
    },
    // 获取 token 数据
    getTokenData: () => ({
      ip: clientIP,
      address,
      userAgent,
      requestId,
    }),
  };
}

/**
 * 创建用户
 */
export async function createUser(params: CreateUserParams) {
  const hashedPassword = await hash(params.password);

  const [user] = await db.insert(systemUser).values({
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
    .update(systemTokens)
    .set({ status: TokenStatus.REVOKED })
    .where(eq(systemTokens.accessToken, accessToken));

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
    .select({ password: systemUser.password })
    .from(systemUser)
    .where(eq(systemUser.id, userId));

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
    .update(systemUser)
    .set({ password: hashedPassword })
    .where(eq(systemUser.id, userId));
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
        .delete(systemUserRole)
        .where(and(
          eq(systemUserRole.userId, userId),
          eq(systemUserRole.domain, domain),
          inArray(systemUserRole.roleId, toRemove),
        ));
    }

    if (toAdd.length > 0) {
      await tx.insert(systemUserRole).values(
        toAdd.map(roleId => ({
          userId,
          roleId,
          domain,
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
    .select({ roleId: systemUserRole.roleId })
    .from(systemUserRole)
    .where(and(
      eq(systemUserRole.userId, userId),
      eq(systemUserRole.domain, domain),
    ));

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
  await clearUserBasicCache(userId, domain);

  // 清理用户状态缓存
  await clearUserStatusCache(userId, domain);

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

/**
 * 从缓存获取用户状态
 */
export async function getUserStatusFromCache(userId: string, domain: string): Promise<boolean | null> {
  const key = getUserStatusKey(userId, domain);
  const result = await redisClient.get(key);

  if (result === null) {
    return result;
  }

  return result === "1";
}

/**
 * 设置用户状态到缓存
 */
export async function setUserStatusToCache(userId: string, domain: string, isValid: boolean): Promise<void> {
  const key = getUserStatusKey(userId, domain);
  await redisClient.setex(key, CacheConfig.USER_STATUS_TTL, isValid ? "1" : "0");
}

/**
 * 清理用户状态缓存
 */
export async function clearUserStatusCache(userId: string, domain: string): Promise<void> {
  const key = getUserStatusKey(userId, domain);
  await redisClient.del(key);
}

/**
 * 清理用户的基础 Redis 缓存（用户角色和菜单）
 */
export async function clearUserBasicCache(userId: string, domain: string): Promise<void> {
  const userRolesKey = getUserRolesKey(userId, domain);
  const userMenusKey = getUserMenusKey(userId, domain);

  await redisClient.del(userRolesKey, userMenusKey);
}

/**
 * 清理角色相关用户的权限结果缓存
 */
export async function clearRoleUsersPermissionCache(roleId: string, domain: string): Promise<void> {
  // 获取拥有该角色的所有用户
  const users = await rbac.getUsersForRole(roleId, domain);

  if (users.length < 1) {
    return;
  }

  // 清理每个用户的权限结果缓存
  const clearTasks = users.map(async (userId) => {
    const pattern = getPermissionResultKey(userId, domain, "*", "*");
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  await Promise.all(clearTasks);
}

/**
 * 从缓存获取用户角色和权限
 */
export async function getUserRolesAndPermissionsFromCache(userId: string, domain: string): Promise<{
  roles: string[];
  permissions: string[];
}> {
  // 先从缓存获取用户角色
  const roles = await getUserRolesFromCache(userId, domain);

  if (roles.length === 0) {
    return { roles: [], permissions: [] };
  }

  // 并行获取所有角色的权限
  const rolePermissionPromises = roles.map(roleId => rbac.getImplicitPermissionsForUser(roleId, domain));
  const rolePermissionsArrays = await Promise.all(rolePermissionPromises);

  // 收集和去重所有权限
  const permissionSet = new Set<string>();

  for (const rolePermissions of rolePermissionsArrays) {
    // 将权限格式化为 "resource:action" 格式并添加到集合中
    for (const perm of rolePermissions) {
      const permissionString = `${perm[1]}:${perm[2]}`;
      permissionSet.add(permissionString);
    }
  }

  return { roles, permissions: Array.from(permissionSet) };
}

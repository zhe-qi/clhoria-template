import type { InferInsertModel } from "drizzle-orm";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { sysTokens, sysUser, sysUserRole } from "@/db/schema";
import { TokenStatus } from "@/lib/enums";
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
  await clearUserCache(userId, domain);
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
    await clearUserCache(userId, domain);
    if (roleIds.length > 0) {
      const key = `user:${domain}:${userId}:roles`;
      await redisClient.sadd(key, ...roleIds);
      await redisClient.expire(key, 86400);
    }

    return {
      success: casbinOps.every(Boolean),
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
}

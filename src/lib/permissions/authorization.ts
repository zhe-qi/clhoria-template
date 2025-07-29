import { and, eq, inArray } from "drizzle-orm";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import db from "@/db";
import { systemEndpoint, systemRoleMenu, systemUserRole } from "@/db/schema";
import { getPermissionResultKey, getUserMenusKey, getUserRolesKey } from "@/lib/enums";
import { redisClient } from "@/lib/redis";
import { compareObjects } from "@/utils/tools/object";

import * as rbac from "./casbin/rbac";

/**
 * 为角色分配权限
 */
export async function assignPermissionsToRole(
  roleId: string,
  permissions: Array<{ resource: PermissionResourceType; action: PermissionActionType }>,
  domain: string,
) {
  // 获取现有权限
  const existingPerms = await rbac.getPermissionsForUserInDomain(roleId, domain);
  const existingPermMap = new Set(
    existingPerms.map(p => `${p[1]}:${p[2]}`),
  );

  // 计算需要添加和删除的权限
  const newPermMap = new Set(
    permissions.map(p => `${p.resource}:${p.action}`),
  );

  const toAdd: Array<[string, string, string, string, string]> = [];
  const toRemove: Array<[string, string, string, string, string]> = [];

  // 找出需要添加的权限
  for (const perm of permissions) {
    const key = `${perm.resource}:${perm.action}`;
    if (!existingPermMap.has(key)) {
      toAdd.push([roleId, perm.resource, perm.action, domain, "allow"]);
    }
  }

  // 找出需要删除的权限
  for (const perm of existingPerms) {
    const key = `${perm[1]}:${perm[2]}`;
    if (!newPermMap.has(key)) {
      toRemove.push([perm[0], perm[1], perm[2], perm[3], perm[4] || "allow"]);
    }
  }

  // 执行批量操作
  const results = await Promise.all([
    toAdd.length > 0 ? rbac.addPolicies(toAdd) : Promise.resolve(true),
    toRemove.length > 0 ? rbac.removePolicies(toRemove) : Promise.resolve(true),
  ]);

  // 清理角色相关用户的权限结果缓存
  if (toAdd.length > 0 || toRemove.length > 0) {
    await clearRoleUsersPermissionCache(roleId, domain);
  }

  return {
    success: results.every(Boolean),
    added: toAdd.length,
    removed: toRemove.length,
  };
}

/**
 * 为角色分配菜单
 */
export async function assignMenusToRole(
  roleId: string,
  menuIds: string[],
  domain: string,
) {
  return db.transaction(async (tx) => {
    // 删除现有的菜单分配
    await tx
      .delete(systemRoleMenu)
      .where(and(
        eq(systemRoleMenu.roleId, roleId),
        eq(systemRoleMenu.domain, domain),
      ));

    // 添加新的菜单分配
    if (menuIds.length > 0) {
      await tx.insert(systemRoleMenu).values(
        menuIds.map(menuId => ({
          roleId,
          menuId,
          domain,
        })),
      );
    }

    return { success: true, count: menuIds.length };
  });
}

/**
 * 为角色分配用户
 */
export async function assignUsersToRole(
  roleId: string,
  userIds: string[],
  domain: string,
) {
  return db.transaction(async (tx) => {
    // 获取当前角色的所有用户
    const currentUsers = await rbac.getUsersForRole(roleId, domain);
    const currentUserSet = new Set(currentUsers);
    const newUserSet = new Set(userIds);

    // 找出需要添加的用户
    const toAdd = userIds.filter(userId => !currentUserSet.has(userId));
    // 找出需要删除的用户
    const toRemove = currentUsers.filter(userId => !newUserSet.has(userId));

    // 更新 Casbin
    const casbinOps = await Promise.all([
      ...toAdd.map(userId => rbac.addRoleForUser(userId, roleId, domain)),
      ...toRemove.map(userId => rbac.deleteRoleForUser(userId, roleId, domain)),
    ]);

    // 更新数据库
    if (toRemove.length > 0) {
      await tx
        .delete(systemUserRole)
        .where(and(
          eq(systemUserRole.roleId, roleId),
          inArray(systemUserRole.userId, toRemove),
        ));
    }

    if (toAdd.length > 0) {
      await tx.insert(systemUserRole).values(
        toAdd.map(userId => ({
          userId,
          roleId,
        })),
      );
    }

    // 更新 Redis 缓存
    await Promise.all([
      ...toAdd.map(userId =>
        redisClient.sadd(
          getUserRolesKey(userId, domain),
          roleId,
        ),
      ),
      ...toRemove.map(userId =>
        redisClient.srem(
          getUserRolesKey(userId, domain),
          roleId,
        ),
      ),
    ]);

    // 清理用户权限结果缓存
    const allAffectedUsers = [...toAdd, ...toRemove];
    const clearCacheTasks = allAffectedUsers.map(async (userId) => {
      const pattern = getPermissionResultKey(userId, domain, "*", "*");
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    });
    await Promise.all(clearCacheTasks);

    return {
      success: casbinOps.every(Boolean),
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
}

/**
 * 同步端点到数据库
 */
export async function syncEndpoints(
  endpoints: Array<{
    path: string;
    method: string;
    action: PermissionActionType;
    resource: PermissionResourceType;
    controller: string;
    summary?: string;
  }>,
) {
  return db.transaction(async (tx) => {
    // 获取现有端点
    const existing = await tx.select().from(systemEndpoint);
    const existingMap = new Map(
      existing.map(e => [`${e.method}:${e.path}`, e]),
    );

    const toInsert = [];
    const toUpdate = [];

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      const existing = existingMap.get(key);

      if (!existing) {
        toInsert.push({ ...endpoint, createdBy: "system" });
      }
      else if (!compareObjects(existing, endpoint, ["action", "resource", "controller", "summary"])) {
        toUpdate.push({ id: existing.id, ...endpoint });
      }
    }

    // 执行插入
    if (toInsert.length > 0) {
      await tx.insert(systemEndpoint).values(toInsert);
    }

    // 执行更新
    for (const update of toUpdate) {
      await tx
        .update(systemEndpoint)
        .set(update)
        .where(eq(systemEndpoint.id, update.id));
    }

    return {
      inserted: toInsert.length,
      updated: toUpdate.length,
    };
  });
}

/**
 * 获取用户的所有菜单ID
 */
export async function getUserMenuIds(userId: string, domain: string): Promise<string[]> {
  // 获取用户的所有角色（包括隐式角色）
  const roles = await rbac.getImplicitRolesForUser(userId, domain);

  if (roles.length < 1) {
    return [];
  }

  // 使用关联查询获取菜单ID
  const roleMenus = await db.query.systemRoleMenu.findMany({
    where: and(
      inArray(systemRoleMenu.roleId, roles),
      eq(systemRoleMenu.domain, domain),
    ),
    columns: {
      menuId: true,
    },
  });

  return roleMenus.map(rm => rm.menuId);
}

/**
 * 清理用户的 Redis 缓存
 */
export async function clearUserCache(userId: string, domain: string) {
  const userRolesKey = getUserRolesKey(userId, domain);
  const userMenusKey = getUserMenusKey(userId, domain);

  await redisClient.del(userRolesKey, userMenusKey);
}

/**
 * 清理角色相关用户的权限结果缓存
 */
export async function clearRoleUsersPermissionCache(roleId: string, domain: string) {
  // 获取拥有该角色的所有用户
  const users = await rbac.getUsersForRole(roleId, domain);

  if (users.length === 0) {
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

import { and, eq, inArray } from "drizzle-orm";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import db from "@/db";
import { systemEndpoint, systemRoleMenu } from "@/db/schema";
import { assignRolesToUser, clearRoleUsersPermissionCache } from "@/services/system/user";
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
 * 为角色分配用户（基于 assignRolesToUser 实现，避免重复逻辑）
 */
export async function assignUsersToRole(
  roleId: string,
  userIds: string[],
  domain: string,
) {
  // 获取当前角色的所有用户
  const currentUsers = await rbac.getUsersForRole(roleId, domain);
  const currentUserSet = new Set(currentUsers);
  const newUserSet = new Set(userIds);

  // 找出需要添加的用户
  const toAdd = userIds.filter(userId => !currentUserSet.has(userId));
  // 找出需要删除的用户
  const toRemove = currentUsers.filter(userId => !newUserSet.has(userId));

  // 为每个用户分配/移除角色（复用 assignRolesToUser 逻辑）
  const results = await Promise.all([
    // 为新增用户添加角色
    ...toAdd.map(async (userId) => {
      const currentRoles = await rbac.getRolesForUser(userId, domain);
      const newRoles = [...currentRoles, roleId];
      return assignRolesToUser(userId, newRoles, domain, "system");
    }),
    // 为移除用户删除角色
    ...toRemove.map(async (userId) => {
      const currentRoles = await rbac.getRolesForUser(userId, domain);
      const newRoles = currentRoles.filter(r => r !== roleId);
      return assignRolesToUser(userId, newRoles, domain, "system");
    }),
  ]);

  return {
    success: results.every(r => r.success),
    added: toAdd.length,
    removed: toRemove.length,
  };
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

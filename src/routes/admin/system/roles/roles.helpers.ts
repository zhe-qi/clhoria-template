import type { Role, RoleWithParents, SavePermissionsError, SavePermissionsResult, UpdateRoleParentsResult } from "./roles.types";

import { eq, inArray } from "drizzle-orm";

import { Effect } from "effect";

import db from "@/db";
import { systemRoles } from "@/db/schema";

import { withLock } from "@/lib/infrastructure";
import { enforcerPromise } from "@/lib/services/casbin";

/**
 * 获取角色的所有上级角色
 * @param roleId 角色ID
 * @returns 上级角色ID数组
 */
export async function getRoleParents(roleId: string): Promise<string[]> {
  const enforcer = await enforcerPromise;
  return enforcer.getRolesForUser(roleId);
}

/**
 * 设置角色的上级角色（会先清除原有关系）
 * @param roleId 角色ID
 * @param parentIds 新的上级角色ID数组
 */
export async function setRoleParents(roleId: string, parentIds: string[]): Promise<void> {
  await Effect.runPromise(withLock(
    `role:${roleId}:inheritance`,
    Effect.promise(async () => {
      const enforcer = await enforcerPromise;

      // 先移除所有现有的上级角色关系
      await enforcer.removeFilteredGroupingPolicy(0, roleId);

      // 如果有新的上级角色，批量添加
      if (parentIds.length > 0) {
        const rules = parentIds.map(parentId => [roleId, parentId]);
        await enforcer.addGroupingPolicies(rules);
      }
    }),
  ));
}

/**
 * 检查是否会产生循环继承
 * @param roleId 当前角色ID
 * @param parentIds 要设置的上级角色ID数组
 * @returns true表示会产生循环，false表示正常
 */
export async function checkCircularInheritance(roleId: string, parentIds: string[]): Promise<boolean> {
  const enforcer = await enforcerPromise;

  // 一次性获取所有角色继承关系，避免递归中多次调用 enforcer
  const allGroupingPolicies = await enforcer.getGroupingPolicy();

  // 构建本地图：child -> parents
  const parentMap = new Map<string, string[]>();
  for (const [child, parent] of allGroupingPolicies) {
    if (!parentMap.has(child)) {
      parentMap.set(child, []);
    }
    parentMap.get(child)!.push(parent);
  }

  // 使用本地图进行 DFS 检查循环
  const hasCycle = (currentId: string, visited: Set<string>): boolean => {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const parents = parentMap.get(currentId) || [];
    for (const parent of parents) {
      if (parent === roleId) return true;
      if (hasCycle(parent, visited)) return true;
    }
    return false;
  };

  // 检查每个要设置的上级角色
  for (const parentId of parentIds) {
    // 自己不能是自己的上级
    if (parentId === roleId) return true;
    // 检查祖先链中是否包含 roleId
    if (hasCycle(parentId, new Set<string>())) return true;
  }

  return false;
}

/**
 * 为单个角色对象添加上级角色信息
 * @param role 角色对象
 * @returns 包含上级角色信息的角色对象
 */
export async function enrichRoleWithParents(role: Role): Promise<RoleWithParents> {
  const parentRoles = await getRoleParents(role.id);
  return { ...role, parentRoles };
}

/**
 * 批量为角色列表添加上级角色信息
 * @param roles 角色列表
 * @returns 包含上级角色信息的角色列表
 */
export async function enrichRolesWithParents(roles: Role[]): Promise<RoleWithParents[]> {
  const enforcer = await enforcerPromise;

  // 获取所有的角色继承关系
  const allGroupingPolicies = await enforcer.getGroupingPolicy();

  // 构建角色ID到上级角色的映射
  const parentMap = new Map<string, string[]>();
  for (const [child, parent] of allGroupingPolicies) {
    if (!parentMap.has(child)) {
      parentMap.set(child, []);
    }
    parentMap.get(child)!.push(parent);
  }

  // 为每个角色添加上级角色信息
  return roles.map(role => ({
    ...role,
    parentRoles: parentMap.get(role.id) || [],
  }));
}

/**
 * 清理角色的所有继承关系（删除角色时使用）
 * @param roleId 角色ID
 */
export async function cleanRoleInheritance(roleId: string): Promise<void> {
  const enforcer = await enforcerPromise;

  // 删除作为子角色的关系（roleId继承自其他角色）
  await enforcer.removeFilteredGroupingPolicy(0, roleId);

  // 删除作为父角色的关系（其他角色继承自roleId）
  await enforcer.removeFilteredGroupingPolicy(1, roleId);
}

/**
 * 验证父角色是否存在
 * @returns null 表示验证通过，否则返回不存在的角色 ID 列表
 */
export async function validateParentRolesExist(parentRoleIds: string[]): Promise<string[] | null> {
  if (parentRoleIds.length === 0) return null;

  const existingParents = await db
    .select({ id: systemRoles.id })
    .from(systemRoles)
    .where(inArray(systemRoles.id, parentRoleIds));

  if (existingParents.length === parentRoleIds.length) return null;

  const existingIds = new Set(existingParents.map(r => r.id));
  return parentRoleIds.filter(pid => !existingIds.has(pid));
}

/**
 * 更新角色的父角色关系
 * @returns { success: true } 或 { success: false, error: string }
 */
export async function updateRoleParents(roleId: string, parentRoleIds: string[]): Promise<UpdateRoleParentsResult> {
  if (parentRoleIds.length > 0) {
    const hasCircular = await checkCircularInheritance(roleId, parentRoleIds);
    if (hasCircular) {
      return { success: false, error: "设置的上级角色会产生循环继承" };
    }

    const invalidIds = await validateParentRolesExist(parentRoleIds);
    if (invalidIds) {
      return { success: false, error: `上级角色不存在: ${invalidIds.join(", ")}` };
    }
  }

  await setRoleParents(roleId, parentRoleIds);
  return { success: true };
}

/**
 * 根据 ID 获取角色
 */
export async function getRoleById(id: string) {
  const [role] = await db.select().from(systemRoles).where(eq(systemRoles.id, id));
  return role ?? null;
}

/**
 * 检查角色是否存在
 */
export async function roleExists(id: string): Promise<boolean> {
  const [role] = await db.select({ id: systemRoles.id }).from(systemRoles).where(eq(systemRoles.id, id)).limit(1);
  return !!role;
}

/**
 * 保存角色权限
 */
export async function saveRolePermissions(roleId: string, permissions: Array<[string, string]>): Promise<SavePermissionsResult | SavePermissionsError> {
  return Effect.runPromise(withLock(
    `role:${roleId}:permissions`,
    Effect.promise(async () => {
      const enforcer = await enforcerPromise;

      // 获取角色的直接权限（不包括继承的）
      const directPermissions = await enforcer.getPermissionsForUser(roleId.toString());

      // 获取所有隐式权限（包括继承的）
      const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(roleId.toString());
      const directPermSet = new Set(
        directPermissions.map(p => `${p[1]}:${p[2]}`),
      );
      const inheritedPermSet = new Set(
        allImplicitPermissions
          .filter(p => !directPermSet.has(`${p[1]}:${p[2]}`))
          .map(p => `${p[1]}:${p[2]}`),
      );

      // 检查是否尝试添加已经继承的权限
      const duplicateInheritedPerms: string[] = [];
      for (const [resource, action] of permissions) {
        const key = `${resource}:${action}`;
        if (inheritedPermSet.has(key)) {
          duplicateInheritedPerms.push(key);
        }
      }

      if (duplicateInheritedPerms.length > 0) {
        return {
          success: false,
          error: `不能重复添加已继承的权限: ${duplicateInheritedPerms.join(", ")}`,
        } as SavePermissionsError;
      }

      // 构建新权限的数组格式
      const oldPolicies = directPermissions;
      const newPolicies = permissions.map(([resource, action]) => [roleId.toString(), resource, action]);

      let removedCount = 0;
      let addedCount = 0;

      // 删除所有现有直接权限
      if (oldPolicies.length > 0) {
        const removeSuccess = await enforcer.removePolicies(oldPolicies);
        if (!removeSuccess) {
          return { success: false, error: "删除旧权限失败" } as SavePermissionsError;
        }
        removedCount = oldPolicies.length;
      }

      // 添加新权限
      if (newPolicies.length > 0) {
        try {
          const addSuccess = await enforcer.addPolicies(newPolicies);
          if (!addSuccess) {
            // 添加失败，尝试回滚
            if (oldPolicies.length > 0) {
              await enforcer.addPolicies(oldPolicies);
            }
            return { success: false, error: "添加新权限失败" } as SavePermissionsError;
          }
          addedCount = newPolicies.length;
        }
        catch {
          // 添加异常，尝试回滚
          if (oldPolicies.length > 0) {
            try {
              await enforcer.addPolicies(oldPolicies);
            }
            catch {
              // 回滚也失败
            }
          }
          throw new Error("添加新权限时发生异常");
        }
      }

      return { success: true, added: addedCount, removed: removedCount, total: newPolicies.length } as SavePermissionsResult;
    }),
  ));
}

/**
 * 获取角色的权限和继承关系
 */
export async function getRolePermissionsAndGroupings(roleId: string) {
  const enforcer = await enforcerPromise;

  // 获取所有隐式权限（包括继承的）
  const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(roleId.toString());

  const permissions = allImplicitPermissions.map(p => ({
    resource: p[1],
    action: p[2],
  }));

  // 获取所有角色继承关系
  const allGroupings = await enforcer.getGroupingPolicy();
  const groupings = allGroupings.map(g => ({
    child: g[0],
    parent: g[1],
  }));

  return { permissions, groupings };
}

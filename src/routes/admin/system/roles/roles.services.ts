import type { SavePermissionsError, SavePermissionsResult } from "./roles.types";

import { eq, inArray } from "drizzle-orm";

import db from "@/db";
import { systemRoles } from "@/db/schema";
import { withLock } from "@/lib/infrastructure";
import { enforcerPromise } from "@/lib/internal/casbin";

import { checkCircularInheritance, setRoleParents } from "./roles.helpers";

/**
 * 验证父角色是否存在
 * @returns null 表示验证通过，否则返回不存在的角色 ID 列表
 */
export async function validateParentRolesExist(parentRoleIds: string[]): Promise<string[] | null> {
  if (parentRoleIds.length === 0) {
    return null;
  }

  const existingParents = await db
    .select({ id: systemRoles.id })
    .from(systemRoles)
    .where(inArray(systemRoles.id, parentRoleIds));

  if (existingParents.length === parentRoleIds.length) {
    return null;
  }

  const existingIds = new Set(existingParents.map(r => r.id));
  return parentRoleIds.filter(pid => !existingIds.has(pid));
}

/**
 * 更新角色的父角色关系
 * @returns { success: true } 或 { success: false, error: string }
 */
export async function updateRoleParents(
  roleId: string,
  parentRoleIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
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
  const [role] = await db
    .select()
    .from(systemRoles)
    .where(eq(systemRoles.id, id));
  return role ?? null;
}

/**
 * 检查角色是否存在
 */
export async function roleExists(id: string): Promise<boolean> {
  const [role] = await db
    .select({ id: systemRoles.id })
    .from(systemRoles)
    .where(eq(systemRoles.id, id))
    .limit(1);
  return !!role;
}

/**
 * 保存角色权限
 */
export async function saveRolePermissions(
  roleId: string,
  permissions: Array<[string, string]>,
): Promise<SavePermissionsResult | SavePermissionsError> {
  return withLock(`role:${roleId}:permissions`, async () => {
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
      };
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
        return { success: false, error: "删除旧权限失败" };
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
          return { success: false, error: "添加新权限失败" };
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

    return {
      success: true,
      added: addedCount,
      removed: removedCount,
      total: newPolicies.length,
    };
  });
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

import type { Role, RoleWithParents } from "./roles.types";

import { withLock } from "@/lib/infrastructure";
import { enforcerPromise } from "@/lib/internal/casbin";

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
  await withLock(`role:${roleId}:inheritance`, async () => {
    const enforcer = await enforcerPromise;

    // 先移除所有现有的上级角色关系
    await enforcer.removeFilteredGroupingPolicy(0, roleId);

    // 如果有新的上级角色，批量添加
    if (parentIds.length > 0) {
      const rules = parentIds.map(parentId => [roleId, parentId]);
      await enforcer.addGroupingPolicies(rules);
    }
  });
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
    if (visited.has(currentId))
      return false;
    visited.add(currentId);

    const parents = parentMap.get(currentId) || [];
    for (const parent of parents) {
      if (parent === roleId)
        return true;
      if (hasCycle(parent, visited))
        return true;
    }
    return false;
  };

  // 检查每个要设置的上级角色
  for (const parentId of parentIds) {
    // 自己不能是自己的上级
    if (parentId === roleId)
      return true;
    // 检查祖先链中是否包含 roleId
    if (hasCycle(parentId, new Set<string>()))
      return true;
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
  return {
    ...role,
    parentRoles,
  };
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

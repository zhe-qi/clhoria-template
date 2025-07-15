import { enforcerLaunchedPromise } from "./index";

/**
 * 为用户添加角色
 */
export async function addRoleForUser(user: string, role: string, domain: string): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.addRoleForUser(user, role, domain);
}

/**
 * 删除用户的角色
 */
export async function deleteRoleForUser(user: string, role: string, domain: string): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.deleteRoleForUser(user, role, domain);
}

/**
 * 删除用户的所有角色
 */
export async function deleteRolesForUser(user: string, domain?: string): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    // Casbin 没有 deleteRolesForUserInDomain，需要手动实现
    const roles = await enforcer.getRolesForUserInDomain(user, domain);
    const results = await Promise.all(
      roles.map(role => enforcer.deleteRoleForUser(user, role, domain)),
    );
    return results.some(Boolean);
  }
  return enforcer.deleteRolesForUser(user);
}

/**
 * 获取用户的所有角色
 */
export async function getRolesForUser(user: string, domain?: string): Promise<string[]> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    return enforcer.getRolesForUserInDomain(user, domain);
  }
  return enforcer.getRolesForUser(user);
}

/**
 * 获取角色的所有用户
 */
export async function getUsersForRole(role: string, domain?: string): Promise<string[]> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    return enforcer.getUsersForRoleInDomain(role, domain);
  }
  return enforcer.getUsersForRole(role);
}

/**
 * 判断用户是否拥有角色
 */
export async function hasRoleForUser(user: string, role: string, domain?: string): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    const roles = await getRolesForUser(user, domain);
    return roles.includes(role);
  }
  return enforcer.hasRoleForUser(user, role);
}

/**
 * 添加权限策略
 */
export async function addPolicy(
  sub: string,
  obj: string,
  act: string,
  dom: string,
  eft: string = "allow",
): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.addPolicy(sub, obj, act, dom, eft);
}

/**
 * 批量添加权限策略
 */
export async function addPolicies(
  policies: Array<[string, string, string, string, string]>,
): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.addPolicies(policies);
}

/**
 * 删除权限策略
 */
export async function removePolicy(
  sub: string,
  obj: string,
  act: string,
  dom: string,
  eft?: string,
): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  if (eft) {
    return enforcer.removePolicy(sub, obj, act, dom, eft);
  }
  // 删除所有匹配的策略（不管效果）
  const removed1 = await enforcer.removePolicy(sub, obj, act, dom, "allow");
  const removed2 = await enforcer.removePolicy(sub, obj, act, dom, "deny");
  return removed1 || removed2;
}

/**
 * 批量删除权限策略
 */
export async function removePolicies(
  policies: Array<[string, string, string, string, string]>,
): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.removePolicies(policies);
}

/**
 * 获取角色的所有权限
 */
export async function getPermissionsForUser(user: string): Promise<string[][]> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.getPermissionsForUser(user);
}

/**
 * 获取角色在特定域的权限
 */
export async function getPermissionsForUserInDomain(user: string, domain: string): Promise<string[][]> {
  const enforcer = await enforcerLaunchedPromise;
  const allPerms = await enforcer.getPermissionsForUser(user);
  return allPerms.filter(perm => perm[3] === domain);
}

/**
 * 判断是否有权限
 */
export async function hasPermissionForUser(
  user: string,
  obj: string,
  act: string,
  dom: string,
): Promise<boolean> {
  const enforcer = await enforcerLaunchedPromise;
  return enforcer.hasPermissionForUser(user, obj, act, dom);
}

/**
 * 获取隐式角色（包括继承的角色）
 */
export async function getImplicitRolesForUser(user: string, domain?: string): Promise<string[]> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    return enforcer.getImplicitRolesForUser(user, domain);
  }
  return enforcer.getImplicitRolesForUser(user);
}

/**
 * 获取隐式权限（包括角色继承的权限）
 */
export async function getImplicitPermissionsForUser(user: string, domain?: string): Promise<string[][]> {
  const enforcer = await enforcerLaunchedPromise;
  if (domain) {
    const allPerms = await enforcer.getImplicitPermissionsForUser(user);
    return allPerms.filter(perm => perm[3] === domain);
  }
  return enforcer.getImplicitPermissionsForUser(user);
}

/**
 * 重新加载策略
 */
export async function reloadPolicy(): Promise<void> {
  const enforcer = await enforcerLaunchedPromise;
  await enforcer.loadPolicy();
}

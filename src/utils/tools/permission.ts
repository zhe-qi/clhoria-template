import type { PermissionActionType, PermissionResourceType } from "@/lib/enums/permissions";

/**
 * 权限配置对象
 */
export interface PermissionConfig {
  resource: PermissionResourceType;
  action: PermissionActionType;
}

/**
 * 解析权限字符串为权限配置对象
 * @param permissionString 权限字符串，格式为 "resource:action"
 * @returns 权限配置对象
 * @throws Error 当权限字符串格式不正确时
 */
export function parsePermission(permissionString: string): PermissionConfig {
  const [resource, action] = permissionString.split(":");

  if (!resource || !action) {
    throw new Error(`权限字符串格式无效: ${permissionString}。期望格式为 "resource:action"`);
  }

  return {
    resource: resource as PermissionResourceType,
    action: action as PermissionActionType,
  };
}

/**
 * 批量解析权限字符串数组
 * @param permissions 权限字符串数组
 * @returns 权限配置对象数组
 */
export function parsePermissions(permissions: string[]): PermissionConfig[] {
  return permissions.map(parsePermission);
}

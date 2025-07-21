import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import { PermissionAction, PermissionResource } from "@/lib/enums";

export interface PermissionConfig {
  resource: PermissionResourceType;
  action: PermissionActionType;
}

/**
 * 将 camelCase 或 PascalCase 转换为 kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * 标准化动作名称
 * 将常见的操作名称映射到标准权限动作
 */
export function normalizeAction(action: string): PermissionActionType {
  const actionMap: Record<string, PermissionActionType> = {
    // 基础 CRUD 操作
    "list": PermissionAction.READ,
    "get": PermissionAction.READ,
    "read": PermissionAction.READ,
    "view": PermissionAction.READ,
    "show": PermissionAction.READ,

    "create": PermissionAction.CREATE,
    "add": PermissionAction.CREATE,
    "new": PermissionAction.CREATE,
    "post": PermissionAction.CREATE,

    "update": PermissionAction.UPDATE,
    "edit": PermissionAction.UPDATE,
    "patch": PermissionAction.UPDATE,
    "put": PermissionAction.UPDATE,

    "delete": PermissionAction.DELETE,
    "remove": PermissionAction.DELETE,
    "destroy": PermissionAction.DELETE,

    // 特殊操作
    "assignPermissions": PermissionAction.ASSIGN_PERMISSIONS,
    "assign-permissions": PermissionAction.ASSIGN_PERMISSIONS,

    "assignRoutes": PermissionAction.ASSIGN_ROUTES,
    "assign-routes": PermissionAction.ASSIGN_ROUTES,
    "assignMenus": PermissionAction.ASSIGN_ROUTES, // 菜单即路由
    "assign-menus": PermissionAction.ASSIGN_ROUTES,

    "assignUsers": PermissionAction.ASSIGN_USERS,
    "assign-users": PermissionAction.ASSIGN_USERS,

    "getUserRoutes": PermissionAction.GET_USER_ROUTES,
    "get-user-routes": PermissionAction.GET_USER_ROUTES,

    "getRolePermissions": PermissionAction.GET_ROLE_PERMISSIONS,
    "get-role-permissions": PermissionAction.GET_ROLE_PERMISSIONS,

    "getRoleMenus": PermissionAction.GET_ROLE_MENUS,
    "get-role-menus": PermissionAction.GET_ROLE_MENUS,

    "enable": PermissionAction.ENABLE,
    "disable": PermissionAction.DISABLE,

    "resetPassword": PermissionAction.RESET_PASSWORD,
    "reset-password": PermissionAction.RESET_PASSWORD,

    "changeStatus": PermissionAction.CHANGE_STATUS,
    "change-status": PermissionAction.CHANGE_STATUS,
    "toggle": PermissionAction.CHANGE_STATUS,
  };

  return actionMap[action] || action as PermissionActionType;
}

/**
 * 标准化资源名称
 * 将常见的资源名称映射到标准权限资源
 */
export function normalizeResource(resource: string): PermissionResourceType {
  const kebabResource = toKebabCase(resource);

  const resourceMap: Record<string, PermissionResourceType> = {
    "sys-users": PermissionResource.SYS_USERS,
    "sysUsers": PermissionResource.SYS_USERS,
    "users": PermissionResource.SYS_USERS,

    "sys-roles": PermissionResource.SYS_ROLES,
    "sysRoles": PermissionResource.SYS_ROLES,
    "roles": PermissionResource.SYS_ROLES,

    "sys-menus": PermissionResource.SYS_MENUS,
    "sysMenus": PermissionResource.SYS_MENUS,
    "menus": PermissionResource.SYS_MENUS,

    "sys-domains": PermissionResource.SYS_DOMAINS,
    "sysDomains": PermissionResource.SYS_DOMAINS,
    "domains": PermissionResource.SYS_DOMAINS,

    "sys-endpoints": PermissionResource.SYS_ENDPOINTS,
    "sysEndpoints": PermissionResource.SYS_ENDPOINTS,
    "endpoints": PermissionResource.SYS_ENDPOINTS,

    "sys-access-keys": PermissionResource.SYS_ACCESS_KEYS,
    "sysAccessKeys": PermissionResource.SYS_ACCESS_KEYS,
    "access-keys": PermissionResource.SYS_ACCESS_KEYS,
    "accessKeys": PermissionResource.SYS_ACCESS_KEYS,

    "authorization": PermissionResource.AUTHORIZATION,

    "login-log": PermissionResource.LOGIN_LOG,
    "loginLog": PermissionResource.LOGIN_LOG,

    "operation-log": PermissionResource.OPERATION_LOG,
    "operationLog": PermissionResource.OPERATION_LOG,

    "api-keys": PermissionResource.API_KEYS,
    "apiKeys": PermissionResource.API_KEYS,
  };

  return resourceMap[kebabResource] || resourceMap[resource] || kebabResource as PermissionResourceType;
}

/**
 * 从 operationId 推断权限配置
 *
 * 支持的格式：
 * 1. "resourceName:action" (推荐) - 如 "sysUsers:read", "sysRoles:create"
 * 2. "actionResourceName" (传统) - 如 "listSysUsers", "createSysRole"
 */
export function inferPermissionFromOperationId(operationId: string): PermissionConfig {
  if (!operationId) {
    throw new Error("operationId is required for permission inference");
  }

  // 格式1: resourceName:action
  if (operationId.includes(":")) {
    const [resource, action] = operationId.split(":");

    if (!resource || !action) {
      throw new Error(`Invalid operationId format: ${operationId}. Expected "resource:action"`);
    }

    return {
      resource: normalizeResource(resource),
      action: normalizeAction(action),
    };
  }

  // 格式2: actionResourceName (传统格式，用于向后兼容)
  // 匹配模式: list|get|create|update|delete|assign + ResourceName
  const actionPatterns = [
    { pattern: /^list(.+)$/, action: "read" },
    { pattern: /^get(.+)$/, action: "read" },
    { pattern: /^create(.+)$/, action: "create" },
    { pattern: /^update(.+)$/, action: "update" },
    { pattern: /^delete(.+)$/, action: "delete" },
    { pattern: /^remove(.+)$/, action: "delete" },
    { pattern: /^assign(.+)Permissions$/, action: "assign-permissions" },
    { pattern: /^assign(.+)Routes$/, action: "assign-routes" },
    { pattern: /^assign(.+)Menus$/, action: "assign-routes" },
    { pattern: /^assign(.+)Users$/, action: "assign-users" },
  ];

  for (const { pattern, action } of actionPatterns) {
    const match = operationId.match(pattern);
    if (match) {
      const resourceName = match[1];
      return {
        resource: normalizeResource(resourceName),
        action: normalizeAction(action),
      };
    }
  }

  // 如果无法推断，抛出错误
  throw new Error(
    `Cannot infer permission from operationId: ${operationId}. `
    + `Please use format "resource:action" or add explicit permission configuration.`,
  );
}

/**
 * 验证权限配置是否有效
 */
export function validatePermissionConfig(config: PermissionConfig): boolean {
  const validResources = Object.values(PermissionResource);
  const validActions = Object.values(PermissionAction);

  return (
    validResources.includes(config.resource)
    && validActions.includes(config.action)
  );
}

/**
 * 从路由定义中提取权限配置
 * 优先级：显式配置 > operationId 推断
 */
export function extractPermissionFromRoute(route: any): PermissionConfig | null {
  try {
    // 1. 检查显式权限配置
    if (route["x-permission"]) {
      const explicitPermission = route["x-permission"] as PermissionConfig;
      if (validatePermissionConfig(explicitPermission)) {
        return explicitPermission;
      }
    }

    // 2. 从 operationId 推断
    if (route.operationId) {
      const inferredPermission = inferPermissionFromOperationId(route.operationId);
      if (validatePermissionConfig(inferredPermission)) {
        return inferredPermission;
      }
    }

    return null;
  }
  catch (error) {
    console.warn(`Failed to extract permission from route:`, error);
    return null;
  }
}

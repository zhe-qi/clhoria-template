import type { RouteConfig } from "@hono/zod-openapi";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import { PermissionAction, PermissionResource } from "@/lib/enums";

export interface PermissionConfig {
  resource: PermissionResourceType;
  action: PermissionActionType;
}

/**
 * 从 operationId 推断权限配置
 *
 * 支持的格式："resourceName:action" - 如 "sys-users:read", "sys-roles:create"
 */
export function inferPermissionFromOperationId(operationId: string): PermissionConfig {
  if (!operationId) {
    throw new Error("operationId is required for permission inference");
  }

  if (!operationId.includes(":")) {
    throw new Error(`Invalid operationId format: ${operationId}. Expected "resource:action"`);
  }

  const [resource, action] = operationId.split(":");

  if (!resource || !action) {
    throw new Error(`Invalid operationId format: ${operationId}. Expected "resource:action"`);
  }

  return {
    resource: resource as PermissionResourceType,
    action: action as PermissionActionType,
  };
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
export function extractPermissionFromRoute(route: RouteConfig): PermissionConfig | null {
  try {
    // 1. 检查显式权限配置
    if (route.permission) {
      const explicitPermission = route.permission as PermissionConfig;
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

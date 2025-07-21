import type { MiddlewareHandler } from "hono";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";
import type { AppRouteHandler } from "@/types/lib";

import type { PermissionConfigOptions, RouteWithPermission } from "./permission-config";
import type { PermissionConfig } from "./permission-inference";

import { createPermissionConfig } from "./permission-config";

/**
 * 权限中间件工厂函数
 * 用于为特定权限需求创建中间件
 */
export function createPermissionMiddleware(permission: PermissionConfig): MiddlewareHandler {
  return async (c, next) => {
    // 将权限信息存储到上下文中，供后续中间件使用
    c.set("requiredPermission", permission);
    await next();
  };
}

/**
 * 权限装饰器工厂函数
 * 为路由处理器添加权限要求
 */
export function withPermission<T extends AppRouteHandler<any>>(
  handler: T,
  permission?: PermissionConfig,
): T {
  // 在函数式编程中，我们通过属性附加权限信息
  if (permission) {
    (handler as any).__permission = permission;
  }
  return handler;
}

/**
 * 创建带权限的路由处理器
 */
export function createPermissionHandler<T extends AppRouteHandler<any>>(
  resource: PermissionResourceType,
  action: PermissionActionType,
  handler: T,
): T {
  const permission = createPermissionConfig(resource, action);
  return withPermission(handler, permission);
}

/**
 * 公开接口标记函数
 * 标记不需要权限验证的接口
 */
export function markAsPublic<T extends AppRouteHandler<any>>(handler: T): T {
  (handler as any).__isPublic = true;
  return handler;
}

/**
 * 权限路由工厂函数
 * 为路由定义添加权限配置
 */
export function withRoutePermission(
  route: any,
  permission: PermissionConfig,
  options?: PermissionConfigOptions,
): RouteWithPermission {
  return {
    ...route,
    "x-permission": permission,
    "x-permission-options": options,
  } as RouteWithPermission;
}

/**
 * 公开路由工厂函数
 * 标记路由为公开接口
 */
export function markRouteAsPublic(
  route: any,
  options?: PermissionConfigOptions,
): RouteWithPermission {
  return {
    ...route,
    "x-permission-options": {
      ...options,
      public: true,
    },
  } as RouteWithPermission;
}

/**
 * 权限路由构建器
 * 提供链式调用的路由权限配置
 */
export class PermissionRouteBuilder {
  private route: any;
  private permissionConfig?: PermissionConfig;
  private options: PermissionConfigOptions = {};

  constructor(route: any) {
    this.route = { ...route };
  }

  /**
   * 设置权限要求
   */
  requirePermission(resource: PermissionResourceType, action: PermissionActionType): this {
    this.permissionConfig = createPermissionConfig(resource, action);
    return this;
  }

  /**
   * 设置为公开接口
   */
  asPublic(): this {
    this.options.public = true;
    return this;
  }

  /**
   * 设置权限验证选项
   */
  withOptions(options: PermissionConfigOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * 构建最终的路由定义
   */
  build(): RouteWithPermission {
    const result: RouteWithPermission = { ...this.route };

    if (this.permissionConfig) {
      result["x-permission"] = this.permissionConfig;
    }

    if (Object.keys(this.options).length > 0) {
      result["x-permission-options"] = this.options;
    }

    return result;
  }
}

/**
 * 创建权限路由构建器
 */
export function createPermissionRoute(route: any): PermissionRouteBuilder {
  return new PermissionRouteBuilder(route);
}

/**
 * 批量处理路由权限配置
 *
 * @param routes 路由定义对象
 * @param permissionMap 权限映射表
 * @returns 处理后的路由对象
 */
export function applyPermissionMapping<T extends Record<string, any>>(
  routes: T,
  permissionMap: Record<string, PermissionConfig>,
): T {
  const result = { ...routes } as T;

  Object.entries(permissionMap).forEach(([routeName, permission]) => {
    if (result[routeName]) {
      (result as any)[routeName] = withRoutePermission(result[routeName], permission);
    }
  });

  return result;
}

/**
 * 从处理器中提取权限信息
 */
export function extractHandlerPermission(handler: any): PermissionConfig | undefined {
  return handler?.__permission;
}

/**
 * 检查处理器是否为公开接口
 */
export function isPublicHandler(handler: any): boolean {
  return handler?.__isPublic === true;
}

/**
 * 权限配置合并函数
 * 合并多个权限配置，后者覆盖前者
 */
export function mergePermissionConfigs(
  ...configs: (PermissionConfig | undefined)[]
): PermissionConfig | undefined {
  return configs.filter(Boolean).pop();
}

/**
 * 权限验证辅助函数
 * 用于在业务逻辑中进行细粒度权限检查
 */
export function checkPermissionInHandler(
  userPermissions: PermissionConfig[],
  requiredPermission: PermissionConfig,
): boolean {
  return userPermissions.some(
    perm =>
      perm.resource === requiredPermission.resource
      && perm.action === requiredPermission.action,
  );
}

/**
 * 权限装饰器组合函数
 * 将多个权限要求组合为一个
 */
export function combinePermissions(
  ...permissions: PermissionConfig[]
): PermissionConfig[] {
  // 去重
  const unique = permissions.filter((perm, index, arr) =>
    arr.findIndex(p =>
      p.resource === perm.resource && p.action === perm.action,
    ) === index,
  );

  return unique;
}

/**
 * 权限级别比较函数
 * 用于判断权限的层级关系
 */
export function comparePermissionLevel(
  perm1: PermissionConfig,
  perm2: PermissionConfig,
): number {
  // 简单的权限级别比较，可以根据业务需求扩展
  const actionLevels: Record<string, number> = {
    "read": 1,
    "create": 2,
    "update": 3,
    "delete": 4,
    "assign-permissions": 5,
    "assign-routes": 5,
    "assign-users": 5,
  };

  const level1 = actionLevels[perm1.action] || 0;
  const level2 = actionLevels[perm2.action] || 0;

  return level1 - level2;
}

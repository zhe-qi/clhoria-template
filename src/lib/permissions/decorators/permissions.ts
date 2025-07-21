import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

/**
 * 权限定义接口
 */
export interface Permission {
  resource: PermissionResourceType;
  action: PermissionActionType;
}

/**
 * 使用示例:
 *
 * 1. 使用 withPermissions 高阶函数:
 * ```typescript
 * const getUsersHandler = withPermissions(
 *   [
 *     { resource: PermissionResource.SYS_USERS, action: PermissionAction.READ }
 *   ],
 *   async (c) => {
 *     // 处理器逻辑
 *     return c.json({ users: [] });
 *   }
 * );
 * ```
 *
 * 2. 使用路由键定义权限:
 * ```typescript
 * // 在路由定义时
 * definePermissions("/admin/users",
 *   { resource: PermissionResource.SYS_USERS, action: PermissionAction.READ }
 * );
 *
 * definePermissions("/admin/users/:id",
 *   { resource: PermissionResource.SYS_USERS, action: PermissionAction.UPDATE }
 * );
 *
 * // 在中间件中使用
 * const permissions = getPermissions("/admin/users");
 * if (permissions.length > 0) {
 *   // 执行权限检查逻辑
 * }
 * ```
 *
 * 3. 在路由定义中集成:
 * ```typescript
 * export function createPermissionAwareRoute(path: string, permissions: Permission[]) {
 *   // 定义路由权限
 *   definePermissions(path, ...permissions);
 *
 *   // 返回路由配置
 *   return {
 *     path,
 *     permissions,
 *     // 其他路由配置...
 *   };
 * }
 * ```
 */

/**
 * 权限配置接口
 */
export interface PermissionConfig {
  permissions: Permission[];
}

/**
 * 路由权限映射存储
 * 使用 Map 代替 Reflect.defineMetadata
 */
const routePermissionsMap = new Map<string, Permission[]>();

/**
 * 定义路由权限
 * 函数式方式设置路由权限
 * @param routeKey 路由唯一标识（通常是路由路径）
 * @param permissions 权限列表
 */
export function definePermissions(routeKey: string, ...permissions: Permission[]): void {
  routePermissionsMap.set(routeKey, permissions);
}

/**
 * 获取路由权限
 * @param routeKey 路由唯一标识
 * @returns 权限列表，如果没有则返回空数组
 */
export function getPermissions(routeKey: string): Permission[] {
  return routePermissionsMap.get(routeKey) || [];
}

/**
 * 检查路由是否需要权限验证
 * @param routeKey 路由唯一标识
 * @returns 是否需要权限验证
 */
export function hasPermissions(routeKey: string): boolean {
  return routePermissionsMap.has(routeKey) && routePermissionsMap.get(routeKey)!.length > 0;
}

/**
 * 清除指定路由的权限配置
 * @param routeKey 路由唯一标识
 */
export function clearPermissions(routeKey: string): void {
  routePermissionsMap.delete(routeKey);
}

/**
 * 清除所有权限配置
 */
export function clearAllPermissions(): void {
  routePermissionsMap.clear();
}

/**
 * 创建带权限的路由处理器
 * 这是一个高阶函数，用于包装原始处理器并附加权限信息
 * @param permissions 权限列表
 * @param handler 原始处理器
 * @returns 带权限信息的处理器
 */
export function withPermissions<T extends (...args: any[]) => any>(
  permissions: Permission[],
  handler: T,
): T & PermissionConfig {
  const wrappedHandler = handler as T & PermissionConfig;
  wrappedHandler.permissions = permissions;
  return wrappedHandler;
}

/**
 * 从处理器获取权限
 * @param handler 处理器函数
 * @returns 权限列表
 */
export function getHandlerPermissions(handler: any): Permission[] {
  if (handler && typeof handler === "function" && "permissions" in handler) {
    return (handler as PermissionConfig).permissions;
  }
  return [];
}

/**
 * 检查处理器是否有权限配置
 * @param handler 处理器函数
 * @returns 是否有权限配置
 */
export function hasHandlerPermissions(handler: any): boolean {
  return handler && typeof handler === "function" && "permissions" in handler && Array.isArray(handler.permissions);
}

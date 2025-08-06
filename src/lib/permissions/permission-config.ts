import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import type { PermissionConfig } from "./permission-inference";

/**
 * 端点权限信息
 */
export interface EndpointPermission {
  /** 端点唯一标识 */
  id: string;
  /** 路径 */
  path: string;
  /** HTTP 方法 */
  method: string;
  /** 权限资源 */
  resource: PermissionResourceType;
  /** 权限动作 */
  action: PermissionActionType;
  /** 控制器名称 */
  controller: string;
  /** 操作描述 */
  summary?: string;
  /** 操作ID */
  operationId?: string;
}

/**
 * 权限配置选项
 */
export interface PermissionConfigOptions {
  /** 是否启用权限验证 */
  enabled?: boolean;
  /** 是否为公开接口 */
  public?: boolean;
  /** 自定义权限配置 */
  permission?: PermissionConfig;
  /** 是否允许权限推断失败时跳过验证 */
  skipOnInferenceFailure?: boolean;
}

/**
 * 权限规则缓存
 */
export class PermissionCache {
  private static instance: PermissionCache;
  private endpointPermissions = new Map<string, EndpointPermission>();
  private routePermissions = new Map<string, PermissionConfig>();

  static getInstance(): PermissionCache {
    if (!PermissionCache.instance) {
      PermissionCache.instance = new PermissionCache();
    }
    return PermissionCache.instance;
  }

  /**
   * 生成端点缓存键
   */
  private getEndpointKey(method: string, path: string): string {
    return `${method.toUpperCase()}:${path}`;
  }

  /**
   * 设置端点权限
   */
  setEndpointPermission(endpointPermission: EndpointPermission): void {
    const key = this.getEndpointKey(endpointPermission.method, endpointPermission.path);
    this.endpointPermissions.set(key, endpointPermission);

    // 同时缓存权限配置
    this.routePermissions.set(key, {
      resource: endpointPermission.resource,
      action: endpointPermission.action,
    });
  }

  /**
   * 获取端点权限
   */
  getEndpointPermission(method: string, path: string): EndpointPermission | undefined {
    const key = this.getEndpointKey(method, path);
    return this.endpointPermissions.get(key);
  }

  /**
   * 获取路由权限配置
   */
  getRoutePermission(method: string, path: string): PermissionConfig | undefined {
    const key = this.getEndpointKey(method, path);
    return this.routePermissions.get(key);
  }

  /**
   * 批量设置端点权限
   */
  setEndpointPermissions(permissions: EndpointPermission[]): void {
    permissions.forEach(permission => this.setEndpointPermission(permission));
  }

  /**
   * 获取所有端点权限
   */
  getAllEndpointPermissions(): EndpointPermission[] {
    return Array.from(this.endpointPermissions.values());
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.endpointPermissions.clear();
    this.routePermissions.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      endpointCount: this.endpointPermissions.size,
      routeCount: this.routePermissions.size,
    };
  }
}

/**
 * 权限配置管理器
 */
export class PermissionConfigManager {
  private static instance: PermissionConfigManager;
  private cache = PermissionCache.getInstance();

  static getInstance(): PermissionConfigManager {
    if (!PermissionConfigManager.instance) {
      PermissionConfigManager.instance = new PermissionConfigManager();
    }
    return PermissionConfigManager.instance;
  }

  /**
   * 注册端点权限
   */
  registerEndpointPermission(permission: EndpointPermission): void {
    this.cache.setEndpointPermission(permission);
  }

  /**
   * 批量注册端点权限
   */
  registerEndpointPermissions(permissions: EndpointPermission[]): void {
    this.cache.setEndpointPermissions(permissions);
  }

  /**
   * 查找端点权限
   */
  findEndpointPermission(method: string, path: string): EndpointPermission | undefined {
    return this.cache.getEndpointPermission(method, path);
  }

  /**
   * 查找路由权限配置
   */
  findRoutePermission(method: string, path: string): PermissionConfig | undefined {
    return this.cache.getRoutePermission(method, path);
  }

  /**
   * 获取所有注册的端点权限
   */
  getAllEndpointPermissions(): EndpointPermission[] {
    return this.cache.getAllEndpointPermissions();
  }

  /**
   * 清空所有权限配置
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * 检查权限配置是否匹配
 */
export function isPermissionMatch(
  required: PermissionConfig,
  provided: PermissionConfig,
): boolean {
  return required.resource === provided.resource && required.action === provided.action;
}

/**
 * 权限配置转字符串
 */
export function permissionToString(permission: PermissionConfig): string {
  return `${permission.resource}:${permission.action}`;
}

/**
 * 字符串转权限配置
 */
export function stringToPermission(str: string): PermissionConfig {
  const [resource, action] = str.split(":");
  if (!resource || !action) {
    throw new Error(`Invalid permission string format: ${str}`);
  }
  return {
    resource: resource as PermissionResourceType,
    action: action as PermissionActionType,
  };
}

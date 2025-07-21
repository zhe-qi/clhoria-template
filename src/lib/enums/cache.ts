/** Redis 缓存键前缀枚举，定义系统中所有缓存键的前缀规则 */
export const CacheConstant = {
  /** 认证token前缀 */
  AUTH_TOKEN_PREFIX: "auth:token:",

  /** 用户角色前缀 */
  USER_ROLES_PREFIX: "user:roles:",

  /** 角色权限前缀 */
  ROLE_PERMISSIONS_PREFIX: "role:permissions:",

  /** 用户菜单前缀 */
  USER_MENUS_PREFIX: "user:menus:",

  /** 菜单树缓存 */
  MENU_TREE_PREFIX: "menu:tree:",

  /** 端点权限缓存 */
  ENDPOINT_PERMISSIONS: "endpoint:permissions",

  /** 全局参数前缀 */
  GLOBAL_PARAMS_PREFIX: "global:params:",
} as const;

/** 缓存常量类型 */
export type CacheConstantType = (typeof CacheConstant)[keyof typeof CacheConstant];

/**
 * 生成用户角色缓存Key
 */
export function getUserRolesKey(userId: string, domain: string): string {
  return `${CacheConstant.USER_ROLES_PREFIX}${domain}:${userId}`;
}

/**
 * 生成角色权限缓存Key
 */
export function getRolePermissionsKey(roleId: string, domain: string): string {
  return `${CacheConstant.ROLE_PERMISSIONS_PREFIX}${domain}:${roleId}`;
}

/**
 * 生成用户菜单缓存Key
 */
export function getUserMenusKey(userId: string, domain: string): string {
  return `${CacheConstant.USER_MENUS_PREFIX}${domain}:${userId}`;
}

/**
 * 生成菜单树缓存Key
 */
export function getMenuTreeKey(domain: string): string {
  return `${CacheConstant.MENU_TREE_PREFIX}${domain}`;
}

/**
 * 生成全局参数缓存Key
 */
export function getGlobalParamKey(key: string, domain: string): string {
  return `${CacheConstant.GLOBAL_PARAMS_PREFIX}${domain}:${key}`;
}

/**
 * 生成全局参数列表缓存Key
 */
export function getGlobalParamsAllKey(domain: string): string {
  return `${CacheConstant.GLOBAL_PARAMS_PREFIX}${domain}:all`;
}

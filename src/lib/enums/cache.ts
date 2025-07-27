/** 通用缓存配置常量 */
export const CacheConfig = {
  /** 默认域 */
  DEFAULT_DOMAIN: "default",

  /** 标准缓存过期时间(秒) - 1小时 */
  CACHE_TTL: 3600,

  /** 空值缓存过期时间(秒) - 5分钟，用于防止缓存穿透 */
  NULL_CACHE_TTL: 300,

  /** 空值缓存标记，用于区分真正的空值和缓存未命中 */
  NULL_CACHE_VALUE: "__NULL__",
} as const;

/** 缓存配置类型 */
export type CacheConfigType = (typeof CacheConfig)[keyof typeof CacheConfig];

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

  /** 字典前缀 */
  DICTIONARIES_PREFIX: "dict:",

  /** 权限验证结果前缀 */
  PERMISSION_RESULT_PREFIX: "perm:result:",
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
export function getGlobalParamKey(key: string): string {
  return `${CacheConstant.GLOBAL_PARAMS_PREFIX}${key}`;
}

/**
 * 生成全局参数列表缓存Key
 */
export function getGlobalParamsAllKey(): string {
  return `${CacheConstant.GLOBAL_PARAMS_PREFIX}all`;
}

/**
 * 生成字典缓存Key
 */
export function getDictionaryKey(code: string): string {
  return `${CacheConstant.DICTIONARIES_PREFIX}${code}`;
}

/**
 * 生成字典列表缓存Key
 */
export function getDictionariesAllKey(): string {
  return `${CacheConstant.DICTIONARIES_PREFIX}all`;
}

/**
 * 生成权限验证结果缓存Key
 */
export function getPermissionResultKey(userId: string, domain: string, method: string, path: string): string {
  return `${CacheConstant.PERMISSION_RESULT_PREFIX}${domain}:${userId}:${method}:${path}`;
}

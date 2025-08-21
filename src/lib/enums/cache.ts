/** 通用缓存配置常量 */
export const CacheConfig = {
  /** 默认租户 */
  DEFAULT_TENANT_ID: "default",

  /** 标准缓存过期时间(秒) - 1小时 */
  CACHE_TTL: 3600,

  /** 空值缓存过期时间(秒) - 5分钟，用于防止缓存穿透 */
  NULL_CACHE_TTL: 300,

  /** 空值缓存标记，用于区分真正的空值和缓存未命中 */
  NULL_CACHE_VALUE: "__NULL__",
} as const;

/** 缓存配置类型 */
export type CacheConfigType = (typeof CacheConfig)[keyof typeof CacheConfig];

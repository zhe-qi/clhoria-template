/** 默认租户 ID */
export const DEFAULT_TENANT_ID = "default";

/** 标准缓存过期时间(秒) - 1小时 */
export const CACHE_TTL = 3600;

/** 空值缓存过期时间(秒) - 5分钟，用于防止缓存穿透 */
export const NULL_CACHE_TTL = 300;

/** 空值缓存标记，用于区分真正的空值和缓存未命中 */
export const NULL_CACHE_VALUE = "__NULL__";

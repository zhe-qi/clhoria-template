/** Standard cache TTL (seconds) - 1 hour / 标准缓存过期时间(秒) - 1小时 */
export const CACHE_TTL = 3600;

/** Null value cache TTL (seconds) - 5 minutes, prevents cache penetration / 空值缓存过期时间(秒) - 5分钟，用于防止缓存穿透 */
export const NULL_CACHE_TTL = 300;

/** Null cache marker, distinguishes real null from cache miss / 空值缓存标记，用于区分真正的空值和缓存未命中 */
export const NULL_CACHE_VALUE = "__NULL__";

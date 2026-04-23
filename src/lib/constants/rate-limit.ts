/** Rate limit time window (milliseconds) - 1 minute / 限流时间窗口(毫秒) - 1分钟 */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Rate limit maximum requests / 限流最大请求数 */
export const RATE_LIMIT_MAX_REQUESTS = 500;

// ── 敏感端点专用限流 ──
// 全局桶对凭证类接口太宽，需要单独的严格桶（防爆破/枚举）

/** auth login / refresh / redeem 等凭证端点：1 分钟 30 次 */
export const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 30;

/** SSE 事件流端点：1 分钟内同一 IP 最多 60 个新连接（避免 ddos worker） */
export const SSE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const SSE_RATE_LIMIT_MAX_REQUESTS = 60;

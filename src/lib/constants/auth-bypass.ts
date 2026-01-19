/**
 * 跳过全局 JWT 认证的路径（登录前操作）
 * 这些路径在 auth 模块中自行处理认证
 */
export const SKIP_JWT_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/challenge",
  "/auth/redeem",
];

/**
 * 跳过全局权限检查和操作日志的路由前缀
 * auth 模块不需要 Casbin 权限检查
 */
export const SKIP_AUTH_PREFIXES = [
  "/auth",
];

/** Token 状态枚举 */
export const TokenStatus = {
  /** 活跃状态 */
  ACTIVE: 1,

  /** 已撤销 */
  REVOKED: 0,

  /** 已过期 */
  EXPIRED: -1,
} as const;

/** Token 状态类型 */
export type TokenStatusType = (typeof TokenStatus)[keyof typeof TokenStatus];

/** Token 类型枚举 */
export const TokenType = {
  /** Web 登录 */
  WEB: "WEB",

  /** 移动端登录 */
  MOBILE: "MOBILE",

  /** API 访问 */
  API: "API",

  /** 第三方登录 */
  THIRD_PARTY: "THIRD_PARTY",
} as const;

/** Token 类型 */
export type TokenTypeType = (typeof TokenType)[keyof typeof TokenType];

/** JWT 令牌类型枚举 */
export const JwtTokenType = {
  /** 访问令牌 */
  ACCESS: "access",

  /** 刷新令牌 */
  REFRESH: "refresh",
} as const;

/** JWT 令牌类型 */
export type JwtTokenTypeType = (typeof JwtTokenType)[keyof typeof JwtTokenType];

/** 登录日志类型枚举 */
export const LoginLogType = {
  /** 登录成功 */
  SUCCESS: "SUCCESS",

  /** 登录失败 */
  FAILURE: "FAILURE",
} as const;

/** 登录日志类型 */
export type LoginLogTypeType = (typeof LoginLogType)[keyof typeof LoginLogType];

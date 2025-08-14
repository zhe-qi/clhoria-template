/** 通用状态枚举，用于表示实体的启用/禁用状态 */
export const Status = {
  /** 启用状态 */
  ENABLED: 1,

  /** 禁用状态 */
  DISABLED: 0,

  /** 封禁状态 */
  BANNED: -1,
} as const;

/** 状态类型 */
export type StatusType = (typeof Status)[keyof typeof Status];

/** 认证类型枚举，定义不同的认证方式 */
export const AuthType = {
  /** 密码认证 */
  PASSWORD: "PASSWORD",

  /** 短信验证码 */
  SMS: "SMS",

  /** 邮箱验证码 */
  EMAIL: "EMAIL",

  /** 第三方OAuth */
  OAUTH: "OAUTH",

  /** 生物识别 */
  BIOMETRIC: "BIOMETRIC",
} as const;

/** 认证类型 */
export type AuthTypeType = (typeof AuthType)[keyof typeof AuthType];

/** 性别枚举 */
export const Gender = {
  /** 未知 */
  UNKNOWN: 0,

  /** 男性 */
  MALE: 1,

  /** 女性 */
  FEMALE: 2,
} as const;

/** 性别类型 */
export type GenderType = (typeof Gender)[keyof typeof Gender];

/** 用户状态枚举 */
export const UserStatus = {
  /** 正常 */
  NORMAL: 0,

  /** 禁用 */
  DISABLED: 1,

  /** 审核中 */
  PENDING: 2,

  /** 审核拒绝 */
  REJECTED: 3,
} as const;

/** 用户状态类型 */
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

/** 验证状态枚举 */
export const VerificationStatus = {
  /** 未验证 */
  UNVERIFIED: 0,

  /** 已验证 */
  VERIFIED: 1,
} as const;

/** 验证状态类型 */
export type VerificationStatusType = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** 实名认证类型枚举 */
export const RealNameAuthType = {
  /** 个人用户 */
  INDIVIDUAL: 0,

  /** 企业用户 */
  ENTERPRISE: 1,
} as const;

/** 实名认证类型 */
export type RealNameAuthTypeType = (typeof RealNameAuthType)[keyof typeof RealNameAuthType];

/** 实名认证状态枚举 */
export const RealNameAuthStatus = {
  /** 未认证 */
  UNAUTHENTICATED: 0,

  /** 等待认证 */
  PENDING: 1,

  /** 认证通过 */
  VERIFIED: 2,

  /** 认证失败 */
  FAILED: 3,
} as const;

/** 实名认证状态类型 */
export type RealNameAuthStatusType = (typeof RealNameAuthStatus)[keyof typeof RealNameAuthStatus];

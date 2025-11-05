/** 通用状态枚举，用于表示实体的启用/禁用状态 */
export const Status = {
  /** 启用状态 */
  ENABLED: "ENABLED",

  /** 禁用状态 */
  DISABLED: "DISABLED",
} as const;

/** 状态类型 */
export type StatusType = (typeof Status)[keyof typeof Status];

/** 性别枚举 */
export const Gender = {
  /** 未知 */
  UNKNOWN: "UNKNOWN",

  /** 男性 */
  MALE: "MALE",

  /** 女性 */
  FEMALE: "FEMALE",
} as const;

/** 性别类型 */
export type GenderType = (typeof Gender)[keyof typeof Gender];

/** 用户状态枚举 */
export const UserStatus = {
  /** 正常 */
  NORMAL: "NORMAL",

  /** 禁用 */
  DISABLED: "DISABLED",

  /** 审核中 */
  PENDING: "PENDING",

  /** 审核拒绝 */
  REJECTED: "REJECTED",
} as const;

/** 用户状态类型 */
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

/** 验证状态枚举 */
export const VerificationStatus = {
  /** 未验证 */
  UNVERIFIED: "UNVERIFIED",

  /** 已验证 */
  VERIFIED: "VERIFIED",
} as const;

/** 验证状态类型 */
export type VerificationStatusType = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** 实名认证类型枚举 */
export const RealNameAuthType = {
  /** 个人用户 */
  INDIVIDUAL: "INDIVIDUAL",

  /** 企业用户 */
  ENTERPRISE: "ENTERPRISE",
} as const;

/** 实名认证类型 */
export type RealNameAuthTypeType = (typeof RealNameAuthType)[keyof typeof RealNameAuthType];

/** 实名认证状态枚举 */
export const RealNameAuthStatus = {
  /** 未认证 */
  UNAUTHENTICATED: "UNAUTHENTICATED",

  /** 等待认证 */
  PENDING: "PENDING",

  /** 认证通过 */
  VERIFIED: "VERIFIED",

  /** 认证失败 */
  FAILED: "FAILED",
} as const;

/** 实名认证状态类型 */
export type RealNameAuthStatusType = (typeof RealNameAuthStatus)[keyof typeof RealNameAuthStatus];

/** 应用名称枚举, 用于标识不同的应用程序路由 */
export const AppNameMenu = {
  /** 后台管理路由 */
  ADMIN_APP: "adminApp",

  /** 客户端路由 */
  CLIENT_APP: "clientApp",

  /** 公共路由 */
  PUBLIC_APP: "publicApp",
} as const;

/** 应用名称类型 */
export type AppNameType = (typeof AppNameMenu)[keyof typeof AppNameMenu];

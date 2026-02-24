/** Common status enum for entity enabled/disabled state / 通用状态枚举，用于表示实体的启用/禁用状态 */
export const Status = {
  /** Enabled / 启用状态 */
  ENABLED: "ENABLED",

  /** Disabled / 禁用状态 */
  DISABLED: "DISABLED",
} as const;

/** Status type / 状态类型 */
export type StatusType = (typeof Status)[keyof typeof Status];

/** Log type enum / 日志类型枚举 */
export const LogType = {
  /** Operation log / 操作日志 */
  OPERATION: "OPERATION",

  /** Login log / 登录日志 */
  LOGIN: "LOGIN",
} as const;

/** Log type / 日志类型类型 */
export type LogTypeType = (typeof LogType)[keyof typeof LogType];

/** Gender enum / 性别枚举 */
export const Gender = {
  /** Unknown / 未知 */
  UNKNOWN: "UNKNOWN",

  /** Male / 男性 */
  MALE: "MALE",

  /** Female / 女性 */
  FEMALE: "FEMALE",
} as const;

/** Gender type / 性别类型 */
export type GenderType = (typeof Gender)[keyof typeof Gender];

/** User status enum / 用户状态枚举 */
export const UserStatus = {
  /** Normal / 正常 */
  NORMAL: "NORMAL",

  /** Disabled / 禁用 */
  DISABLED: "DISABLED",

  /** Pending review / 审核中 */
  PENDING: "PENDING",

  /** Review rejected / 审核拒绝 */
  REJECTED: "REJECTED",
} as const;

/** User status type / 用户状态类型 */
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

/** Verification status enum / 验证状态枚举 */
export const VerificationStatus = {
  /** Unverified / 未验证 */
  UNVERIFIED: "UNVERIFIED",

  /** Verified / 已验证 */
  VERIFIED: "VERIFIED",
} as const;

/** Verification status type / 验证状态类型 */
export type VerificationStatusType = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Real name authentication type enum / 实名认证类型枚举 */
export const RealNameAuthType = {
  /** Individual user / 个人用户 */
  INDIVIDUAL: "INDIVIDUAL",

  /** Enterprise user / 企业用户 */
  ENTERPRISE: "ENTERPRISE",
} as const;

/** Real name authentication type / 实名认证类型 */
export type RealNameAuthTypeType = (typeof RealNameAuthType)[keyof typeof RealNameAuthType];

/** Real name authentication status enum / 实名认证状态枚举 */
export const RealNameAuthStatus = {
  /** Unauthenticated / 未认证 */
  UNAUTHENTICATED: "UNAUTHENTICATED",

  /** Pending authentication / 等待认证 */
  PENDING: "PENDING",

  /** Verified / 认证通过 */
  VERIFIED: "VERIFIED",

  /** Failed / 认证失败 */
  FAILED: "FAILED",
} as const;

/** Real name authentication status type / 实名认证状态类型 */
export type RealNameAuthStatusType = (typeof RealNameAuthStatus)[keyof typeof RealNameAuthStatus];

/** Login result enum / 登录结果枚举 */
export const LoginResult = {
  /** Login success / 登录成功 */
  SUCCESS: "SUCCESS",

  /** Login failure / 登录失败 */
  FAILURE: "FAILURE",
} as const;

/** Login result type / 登录结果类型 */
export type LoginResultType = (typeof LoginResult)[keyof typeof LoginResult];

/** Parameter value type enum / 参数值类型枚举 */
export const ParamValueType = {
  /** String / 字符串 */
  STRING: "STRING",

  /** Number / 数字 */
  NUMBER: "NUMBER",

  /** Boolean / 布尔值 */
  BOOLEAN: "BOOLEAN",

  /** JSON object / JSON 对象 */
  JSON: "JSON",
} as const;

/** Parameter value type / 参数值类型 */
export type ParamValueTypeType = (typeof ParamValueType)[keyof typeof ParamValueType];

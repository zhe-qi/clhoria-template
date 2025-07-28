/** 通用状态枚举，用于表示实体的启用/禁用状态 */
export const Status = {
  /** 启用状态 */
  ENABLED: 1,

  /** 禁用状态 */
  DISABLED: 0,

  /** 封禁状态 */
  BANNED: -1,
} as const;
/** 定时任务状态枚举 */
export const JobStatus = {
  /** 启用状态 */
  ENABLED: 1,

  /** 禁用状态 */
  DISABLED: 0,

  /** 暂停状态 */
  PAUSED: 2,
} as const;

/** 定时任务状态类型 */
export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

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

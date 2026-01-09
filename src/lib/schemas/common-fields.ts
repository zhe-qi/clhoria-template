import { z } from "zod";

// ============ 基础字段 ============

/** 用户名字段 */
export const usernameField = z.string()
  .min(4, "用户名最少4个字符")
  .max(32, "用户名最多32个字符")
  .regex(/^\w+$/, "用户名只能包含字母、数字和下划线")
  .meta({ description: "用户名" });

/** 密码字段 */
export const passwordField = z.string()
  .min(6, "密码最少6个字符")
  .max(20, "密码最多20个字符")
  .meta({ description: "密码" });

/** 昵称字段 */
export const nicknameField = z.string()
  .min(1, "昵称不能为空")
  .max(32, "昵称最多32个字符")
  .meta({ description: "用户昵称" });

/** 邮箱字段 */
export const emailField = z.email("邮箱格式不正确")
  .meta({ description: "邮箱地址" });

/** 手机号字段 */
export const mobileField = z.string()
  .regex(/^\+?[0-9-]{3,20}$/, "手机号格式不正确")
  .meta({ description: "手机号码" });

/** IP地址字段 */
export const ipAddressField = z.string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$|^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i,
    "IP地址格式不正确",
  )
  .meta({ description: "IP地址" });

// ============ ID 字段 ============

/** 角色ID字段（小写字母、数字、下划线） */
export const roleIdField = z.string()
  .min(1, "角色ID不能为空")
  .regex(/^[a-z0-9_]+$/, "角色ID只能包含小写字母、数字和下划线")
  .meta({ description: "角色ID" });

// ============ 复合对象 ============

/** 角色简要信息（用于用户详情中的角色列表） */
export const roleBriefSchema = z.object({
  id: z.string().min(1).max(64).meta({ description: "角色ID" }),
  name: z.string().min(1).max(64).meta({ description: "角色名称" }),
});

/** 权限项 */
export const permissionItemSchema = z.object({
  resource: z.string().min(1).meta({ description: "资源路径" }),
  action: z.string().min(1).meta({ description: "操作" }),
});

// ============ 状态描述常量 ============

export const StatusDescriptions = {
  /** 系统状态（ENABLED/DISABLED） */
  SYSTEM: "状态 (ENABLED=启用, DISABLED=禁用)",
  /** 用户状态 */
  USER: "用户状态 (NORMAL=正常, DISABLED=禁用, PENDING=审核中, REJECTED=审核拒绝)",
  /** 验证状态 */
  VERIFICATION: "验证状态 (UNVERIFIED=未验证, VERIFIED=已验证)",
  /** 性别 */
  GENDER: "性别 (UNKNOWN=未知, MALE=男性, FEMALE=女性)",
} as const;

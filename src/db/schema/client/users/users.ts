import { index, integer, jsonb, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import type { Identity, QqOpenId, RealNameAuth, RegisterEnv, ThirdPartyInfo, WxOpenId } from "@/db/schema/_shard/types/app-user";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { Gender, UserStatus, VerificationStatus } from "@/lib/enums";

export const clientUsers = pgTable("client_users", {
  ...baseColumns,
  /** 用户名 */
  username: varchar({ length: 64 }).notNull(),
  /** 密码，加密存储 */
  password: varchar({ length: 128 }).notNull(),
  /** 密码密钥版本 */
  passwordSecretVersion: integer().default(1),
  /** 用户昵称 */
  nickname: varchar({ length: 64 }),
  /** 性别：0 未知 1 男性 2 女性 */
  gender: integer().default(Gender.UNKNOWN),
  /** 用户状态：0 正常 1 禁用 2 审核中 3 审核拒绝 */
  status: integer().default(UserStatus.NORMAL),
  /** 手机号码 */
  mobile: varchar({ length: 20 }),
  /** 手机号验证状态：0 未验证 1 已验证 */
  mobileConfirmed: integer().default(VerificationStatus.UNVERIFIED),
  /** 邮箱地址 */
  email: varchar({ length: 128 }),
  /** 邮箱验证状态：0 未验证 1 已验证 */
  emailConfirmed: integer().default(VerificationStatus.UNVERIFIED),
  /** 头像地址 */
  avatar: text(),
  /** 部门ID列表 */
  departmentIds: jsonb().$type<string[]>().default([]),
  /** 企业ID列表 */
  enterpriseIds: jsonb().$type<string[]>().default([]),
  /** 角色ID列表 */
  roleIds: jsonb().$type<string[]>().default([]),
  /** 微信 unionid */
  wxUnionid: varchar({ length: 64 }),
  /** 微信各平台 openid */
  wxOpenid: jsonb().$type<WxOpenId>(),
  /** QQ各平台 openid */
  qqOpenid: jsonb().$type<QqOpenId>(),
  /** QQ unionid */
  qqUnionid: varchar({ length: 64 }),
  /** 支付宝 openid */
  aliOpenid: varchar({ length: 64 }),
  /** 苹果登录 openid */
  appleOpenid: varchar({ length: 64 }),
  /** 允许登录的客户端 appid 列表 */
  dcloudAppids: jsonb().$type<string[]>().default([]),
  /** 备注 */
  comment: text(),
  /** 第三方平台token等信息 */
  thirdParty: jsonb().$type<ThirdPartyInfo>(),
  /** 注册环境信息 */
  registerEnv: jsonb().$type<RegisterEnv>(),
  /** 实名认证信息 */
  realnameAuth: jsonb().$type<RealNameAuth>(),
  /** 用户积分 */
  score: integer().default(0),
  /** 注册时间 */
  registerDate: timestamp({ mode: "string" }),
  /** 注册时 IP 地址 */
  registerIp: varchar({ length: 45 }),
  /** 最后登录时间 */
  lastLoginDate: timestamp({ mode: "string" }),
  /** 最后登录时 IP 地址 */
  lastLoginIp: varchar({ length: 45 }),
  /** 用户token列表 */
  tokens: jsonb().$type<string[]>().default([]),
  /** 用户全部上级邀请者 */
  inviterUids: jsonb().$type<string[]>().default([]),
  /** 受邀时间 */
  inviteTime: timestamp({ mode: "string" }),
  /** 用户自身邀请码 */
  myInviteCode: varchar({ length: 32 }),
  /** 第三方平台身份信息 */
  identities: jsonb().$type<Identity[]>().default([]),
}, table => [
  // 唯一约束
  unique().on(table.username),
  unique().on(table.mobile),
  unique().on(table.email),
  unique().on(table.wxUnionid),
  unique().on(table.qqUnionid),
  unique().on(table.aliOpenid),
  unique().on(table.appleOpenid),
  unique().on(table.myInviteCode),

  // 查询索引
  index("client_users_username_idx").on(table.username),
  index("client_users_mobile_idx").on(table.mobile),
  index("client_users_email_idx").on(table.email),
  index("client_users_status_idx").on(table.status),
  index("client_users_register_date_idx").on(table.registerDate.desc()),
  index("client_users_last_login_date_idx").on(table.lastLoginDate.desc()),
]);

export const selectClientUsersSchema = createSelectSchema(clientUsers, {
  username: z.string().meta({ description: "用户名" }),
  password: z.string().meta({ description: "密码" }),
  passwordSecretVersion: z.number().meta({ description: "密码密钥版本" }),
  nickname: z.string().optional().meta({ description: "用户昵称" }),
  gender: z.number().meta({ description: "性别：0 未知 1 男性 2 女性" }),
  status: z.number().meta({ description: "用户状态：0 正常 1 禁用 2 审核中 3 审核拒绝" }),
  mobile: z.string().optional().meta({ description: "手机号码" }),
  mobileConfirmed: z.number().meta({ description: "手机号验证状态：0 未验证 1 已验证" }),
  email: z.string().optional().meta({ description: "邮箱地址" }),
  emailConfirmed: z.number().meta({ description: "邮箱验证状态：0 未验证 1 已验证" }),
  avatar: z.string().optional().meta({ description: "头像地址" }),
  score: z.number().meta({ description: "用户积分" }),
  comment: z.string().optional().meta({ description: "备注" }),
  registerDate: z.string().optional().meta({ description: "注册时间" }),
  registerIp: z.string().optional().meta({ description: "注册时 IP 地址" }),
  lastLoginDate: z.string().optional().meta({ description: "最后登录时间" }),
  lastLoginIp: z.string().optional().meta({ description: "最后登录时 IP 地址" }),
  myInviteCode: z.string().optional().meta({ description: "用户自身邀请码" }),
  inviteTime: z.string().optional().meta({ description: "受邀时间" }),
});

export const insertClientUsersSchema = createInsertSchema(
  clientUsers,
  {
    username: z.string()
      .min(4, "用户名最少4个字符")
      .max(32, "用户名最多32个字符")
      .regex(/^\w+$/, "用户名只能包含字母、数字和下划线")
      .meta({ description: "用户名" }),
    password: z.string()
      .min(6, "密码最少6个字符")
      .max(20, "密码最多20个字符")
      .meta({ description: "密码" }),
    nickname: z.string()
      .min(1, "昵称不能为空")
      .max(32, "昵称最多32个字符")
      .optional()
      .meta({ description: "用户昵称" }),
    mobile: z.string()
      .regex(/^\+?[0-9-]{3,20}$/, "手机号格式不正确")
      .optional()
      .meta({ description: "手机号码" }),
    email: z
      .email("邮箱格式不正确")
      .optional()
      .meta({ description: "邮箱地址" }),
    gender: z.number()
      .min(0)
      .max(2)
      .optional()
      .meta({ description: "性别：0 未知 1 男性 2 女性" }),
    status: z.number()
      .min(0)
      .max(3)
      .optional()
      .meta({ description: "用户状态：0 正常 1 禁用 2 审核中 3 审核拒绝" }),
    score: z.number()
      .min(0)
      .optional()
      .meta({ description: "用户积分" }),
    comment: z.string()
      .max(500, "备注最多500个字符")
      .optional()
      .meta({ description: "备注" }),
    registerIp: z.string()
      .regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$|^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i, "IP地址格式不正确")
      .optional()
      .meta({ description: "注册时 IP 地址" }),
    lastLoginIp: z.string()
      .regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$|^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i, "IP地址格式不正确")
      .optional()
      .meta({ description: "最后登录时 IP 地址" }),
    myInviteCode: z.string()
      .max(32, "邀请码最多32个字符")
      .optional()
      .meta({ description: "用户自身邀请码" }),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  passwordSecretVersion: true,
  mobileConfirmed: true,
  emailConfirmed: true,
  registerDate: true,
  lastLoginDate: true,
  tokens: true,
});

export const patchClientUsersSchema = insertClientUsersSchema.partial();

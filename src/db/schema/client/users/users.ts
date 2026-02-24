import type { Identity, QqOpenId, RealNameAuth, RegisterEnv, ThirdPartyInfo, WxOpenId } from "@/db/schema/_shard/types/app-user";
import { index, integer, jsonb, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { z } from "zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { genderEnum, userStatusEnum, verificationStatusEnum } from "@/db/schema/_shard/enums";
import { Gender, UserStatus, VerificationStatus } from "@/lib/enums";
import { emailField, ipAddressField, mobileField, nicknameField, passwordField, StatusDescriptions, usernameField } from "@/lib/schemas";

export const clientUsers = pgTable("client_users", {
  ...baseColumns,
  /** Username / 用户名 */
  username: varchar({ length: 64 }).notNull(),
  /** Password, stored encrypted / 密码，加密存储 */
  password: varchar({ length: 128 }).notNull(),
  /** Password secret version / 密码密钥版本 */
  passwordSecretVersion: integer().default(1),
  /** User nickname / 用户昵称 */
  nickname: varchar({ length: 64 }),
  /** Gender / 性别 */
  gender: genderEnum().default(Gender.UNKNOWN),
  /** User status / 用户状态 */
  status: userStatusEnum().default(UserStatus.NORMAL),
  /** Mobile number / 手机号码 */
  mobile: varchar({ length: 20 }),
  /** Mobile verification status / 手机号验证状态 */
  mobileConfirmed: verificationStatusEnum().default(VerificationStatus.UNVERIFIED),
  /** Email address / 邮箱地址 */
  email: varchar({ length: 128 }),
  /** Email verification status / 邮箱验证状态 */
  emailConfirmed: verificationStatusEnum().default(VerificationStatus.UNVERIFIED),
  /** Avatar URL / 头像地址 */
  avatar: text(),
  /** Department ID list / 部门ID列表 */
  departmentIds: jsonb().$type<string[]>().default([]),
  /** Enterprise ID list / 企业ID列表 */
  enterpriseIds: jsonb().$type<string[]>().default([]),
  /** Role ID list / 角色ID列表 */
  roleIds: jsonb().$type<string[]>().default([]),
  /** WeChat unionid / 微信 unionid */
  wxUnionid: varchar({ length: 64 }),
  /** WeChat openid for each platform / 微信各平台 openid */
  wxOpenid: jsonb().$type<WxOpenId>(),
  /** QQ openid for each platform / QQ各平台 openid */
  qqOpenid: jsonb().$type<QqOpenId>(),
  /** QQ unionid / QQ unionid */
  qqUnionid: varchar({ length: 64 }),
  /** Alipay openid / 支付宝 openid */
  aliOpenid: varchar({ length: 64 }),
  /** Apple Sign-In openid / 苹果登录 openid */
  appleOpenid: varchar({ length: 64 }),
  /** Allowed client appid list for login / 允许登录的客户端 appid 列表 */
  dcloudAppids: jsonb().$type<string[]>().default([]),
  /** Remark / 备注 */
  comment: text(),
  /** Third-party platform token info / 第三方平台token等信息 */
  thirdParty: jsonb().$type<ThirdPartyInfo>(),
  /** Registration environment info / 注册环境信息 */
  registerEnv: jsonb().$type<RegisterEnv>(),
  /** Real-name authentication info / 实名认证信息 */
  realnameAuth: jsonb().$type<RealNameAuth>(),
  /** User score / 用户积分 */
  score: integer().default(0),
  /** Registration time / 注册时间 */
  registerDate: timestamp({ mode: "string" }),
  /** IP address at registration / 注册时 IP 地址 */
  registerIp: varchar({ length: 45 }),
  /** Last login time / 最后登录时间 */
  lastLoginDate: timestamp({ mode: "string" }),
  /** IP address at last login / 最后登录时 IP 地址 */
  lastLoginIp: varchar({ length: 45 }),
  /** User token list / 用户token列表 */
  tokens: jsonb().$type<string[]>().default([]),
  /** All upstream inviter UIDs / 用户全部上级邀请者 */
  inviterUids: jsonb().$type<string[]>().default([]),
  /** Invitation time / 受邀时间 */
  inviteTime: timestamp({ mode: "string" }),
  /** User's own invite code / 用户自身邀请码 */
  myInviteCode: varchar({ length: 32 }),
  /** Third-party platform identity info / 第三方平台身份信息 */
  identities: jsonb().$type<Identity[]>().default([]),
}, table => [
  // Unique constraints / 唯一约束
  unique().on(table.username),
  unique().on(table.mobile),
  unique().on(table.email),
  unique().on(table.wxUnionid),
  unique().on(table.qqUnionid),
  unique().on(table.aliOpenid),
  unique().on(table.appleOpenid),
  unique().on(table.myInviteCode),

  // Query indexes / 查询索引
  index("client_users_username_idx").on(table.username),
  index("client_users_mobile_idx").on(table.mobile),
  index("client_users_email_idx").on(table.email),
  index("client_users_status_idx").on(table.status),
  index("client_users_register_date_idx").on(table.registerDate.desc()),
  index("client_users_last_login_date_idx").on(table.lastLoginDate.desc()),
]);

export const selectClientUsersSchema = createSelectSchema(clientUsers, {
  username: schema => schema.meta({ description: "用户名" }),
  password: schema => schema.meta({ description: "密码" }),
  passwordSecretVersion: schema => schema.meta({ description: "密码密钥版本" }),
  nickname: schema => schema.meta({ description: "用户昵称" }),
  gender: schema => schema.meta({ description: StatusDescriptions.GENDER }),
  status: schema => schema.meta({ description: StatusDescriptions.USER }),
  mobile: schema => schema.meta({ description: "手机号码" }),
  mobileConfirmed: schema => schema.meta({ description: StatusDescriptions.VERIFICATION }),
  email: schema => schema.meta({ description: "邮箱地址" }),
  emailConfirmed: schema => schema.meta({ description: StatusDescriptions.VERIFICATION }),
  avatar: schema => schema.meta({ description: "头像地址" }),
  score: schema => schema.meta({ description: "用户积分" }),
  comment: schema => schema.meta({ description: "备注" }),
  registerDate: schema => schema.meta({ description: "注册时间" }),
  registerIp: schema => schema.meta({ description: "注册时 IP 地址" }),
  lastLoginDate: schema => schema.meta({ description: "最后登录时间" }),
  lastLoginIp: schema => schema.meta({ description: "最后登录时 IP 地址" }),
  myInviteCode: schema => schema.meta({ description: "用户自身邀请码" }),
  inviteTime: schema => schema.meta({ description: "受邀时间" }),
});

export const insertClientUsersSchema = createInsertSchema(
  clientUsers,
  {
    username: () => usernameField,
    password: () => passwordField,
    nickname: () => nicknameField.optional(),
    mobile: () => mobileField.optional(),
    email: () => emailField.optional(),
    gender: schema => schema.optional().meta({ description: StatusDescriptions.GENDER }),
    status: schema => schema.optional().meta({ description: StatusDescriptions.USER }),
    score: z.number().min(0).optional().meta({ description: "用户积分" }),
    comment: z.string().max(500, "备注最多500个字符").optional().meta({ description: "备注" }),
    registerIp: () => ipAddressField.optional().meta({ description: "注册时 IP 地址" }),
    lastLoginIp: () => ipAddressField.optional().meta({ description: "最后登录时 IP 地址" }),
    myInviteCode: z.string().max(32, "邀请码最多32个字符").optional().meta({ description: "用户自身邀请码" }),
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

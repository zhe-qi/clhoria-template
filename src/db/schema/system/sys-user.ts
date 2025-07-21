import { relations } from "drizzle-orm";
import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "./enums";
import { sysUserRole } from "./sys-user-role";

export const sysUser = pgTable("sys_user", {
  ...defaultColumns,
  username: varchar({ length: 64 }).notNull().unique(),
  password: text().notNull(),
  domain: varchar({ length: 64 }).notNull(),
  builtIn: boolean().default(false),
  avatar: text(),
  email: varchar({ length: 128 }).unique(),
  phoneNumber: varchar({ length: 32 }).unique(),
  nickName: varchar({ length: 64 }).notNull(),
  status: statusEnum().notNull().default("ENABLED"),
});

export const sysUserRelations = relations(sysUser, ({ many }) => ({
  userRoles: many(sysUserRole),
}));

export const selectSysUserSchema = createSelectSchema(sysUser, {
  id: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  password: schema => schema.describe("密码"),
  domain: schema => schema.describe("域/租户"),
  builtIn: schema => schema.describe("是否内置用户"),
  avatar: schema => schema.describe("头像"),
  email: schema => schema.describe("邮箱"),
  phoneNumber: schema => schema.describe("手机号"),
  nickName: schema => schema.describe("昵称"),
  status: schema => schema.describe("状态: ENABLED=启用 DISABLED=禁用 BANNED=封禁"),
});

export const insertSysUserSchema = createInsertSchema(sysUser, {
  username: schema => schema.min(4).max(15).regex(/^\w+$/),
  password: schema => schema.min(6).max(20),
  domain: schema => schema.min(1),
  nickName: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});

export const patchSysUserSchema = insertSysUserSchema.partial();

// 用于响应的 schema（不包含密码）
export const responseSysUserSchema = selectSysUserSchema.omit({ password: true });

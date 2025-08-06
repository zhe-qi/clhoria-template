import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemUserPost } from "./user-post";
import { systemUserRole } from "./user-role";

export const systemUser = pgTable("system_user", {
  ...defaultColumns,
  username: varchar({ length: 64 }).notNull().unique(),
  password: text().notNull(),
  domain: varchar({ length: 64 }).notNull(),
  builtIn: boolean().default(false),
  avatar: text(),
  nickName: varchar({ length: 64 }).notNull(),
  status: statusEnum().notNull(),
}, table => [
  index("system_user_domain_status_idx").on(table.domain, table.status),
  index("system_user_username_idx").on(table.username),
]);

export const systemUserRelations = relations(systemUser, ({ many }) => ({
  userRoles: many(systemUserRole),
  userPosts: many(systemUserPost),
}));

export const selectSystemUserSchema = createSelectSchema(systemUser, {
  id: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  password: schema => schema.describe("密码"),
  domain: schema => schema.describe("域/租户"),
  builtIn: schema => schema.describe("是否内置用户"),
  avatar: schema => schema.describe("头像"),
  nickName: schema => schema.describe("昵称"),
  status: schema => schema.describe("状态: 1=启用 0=禁用 -1=封禁"),
});

export const insertSystemUserSchema = createInsertSchema(systemUser, {
  username: schema => schema.min(4).max(15).regex(/^\w+$/).describe("用户名"),
  password: schema => schema.min(6).max(20).describe("密码"),
  domain: schema => schema.min(1).default("default").describe("域/租户"),
  nickName: schema => schema.min(1).describe("昵称"),
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});

export const patchSystemUserSchema = insertSystemUserSchema.partial();

// 用于响应的 schema（不包含密码）
export const responseSystemUserSchema = selectSystemUserSchema.omit({ password: true });

// 用于登录的 schema（仅包含 username，password，domain ）
export const loginSystemUserSchema = insertSystemUserSchema.pick({
  username: true,
  password: true,
  domain: true,
});

import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemUserRole } from "./user-role";

export const systemUser = pgTable("system_user", {
  ...defaultColumns,
  username: varchar({ length: 64 }).notNull().unique(),
  password: text().notNull(),
  builtIn: boolean().default(false),
  avatar: text(),
  nickName: varchar({ length: 64 }).notNull(),
  status: statusEnum().notNull(),
}, table => [
  index("system_user_username_idx").on(table.username),
]);

export const systemUserRelations = relations(systemUser, ({ many }) => ({
  userRoles: many(systemUserRole),
}));

export const selectSystemUserSchema = createSelectSchema(systemUser, {
  id: schema => schema.meta({ description: "用户ID" }),
  username: schema => schema.meta({ description: "用户名" }),
  password: schema => schema.meta({ description: "密码" }),
  builtIn: schema => schema.meta({ description: "是否内置用户" }),
  avatar: schema => schema.meta({ description: "头像" }),
  nickName: schema => schema.meta({ description: "昵称" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用 -1=封禁" }),
});

export const insertSystemUserSchema = createInsertSchema(systemUser, {
  username: schema => schema.min(4).max(15).regex(/^\w+$/).meta({ description: "用户名" }),
  password: schema => schema.min(6).max(20).meta({ description: "密码" }),
  nickName: schema => schema.min(1).meta({ description: "昵称" }),
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
}).extend({
  captchaToken: z.string().min(1).meta({ description: "验证码token" }),
});

// 用于获取用户信息的 schema，支持拓展，如果后续新增或者联表可以继续拓展
export const getUserInfoSchema = responseSystemUserSchema.pick({
  id: true,
  username: true,
  avatar: true,
  nickName: true,
});

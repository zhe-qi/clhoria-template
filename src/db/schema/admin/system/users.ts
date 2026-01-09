import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { Status } from "@/lib/enums";
import { nicknameField, passwordField, StatusDescriptions, usernameField } from "@/lib/schemas";

import { statusEnum } from "../../_shard/enums";
import { systemUserRoles } from "./user-roles";

export const systemUsers = pgTable("system_users", {
  ...baseColumns,
  username: varchar({ length: 64 }).notNull().unique(),
  password: text().notNull(),
  builtIn: boolean().default(false),
  avatar: text(),
  nickName: varchar({ length: 64 }).notNull(),
  status: statusEnum().default(Status.ENABLED).notNull(),
}, table => [
  index("system_user_username_idx").on(table.username),
]);

export const systemUsersRelations = relations(systemUsers, ({ many }) => ({
  systemUserRoles: many(systemUserRoles),
}));

export const selectSystemUsersSchema = createSelectSchema(systemUsers, {
  id: schema => schema.meta({ description: "用户ID" }),
  username: schema => schema.meta({ description: "用户名" }),
  password: schema => schema.meta({ description: "密码" }),
  builtIn: schema => schema.meta({ description: "是否内置用户" }),
  avatar: schema => schema.meta({ description: "头像" }),
  nickName: schema => schema.meta({ description: "昵称" }),
  status: schema => schema.meta({ description: StatusDescriptions.SYSTEM }),
});

export const insertSystemUsersSchema = createInsertSchema(systemUsers, {
  username: () => usernameField,
  password: () => passwordField,
  nickName: () => nicknameField,
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  builtIn: true,
});

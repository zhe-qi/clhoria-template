import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { Status } from "@/lib/enums";

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

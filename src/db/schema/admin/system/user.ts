import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";

import { baseColumns } from "@/db/schema/_shard/base-columns";

import { statusEnum } from "../../_shard/enums";
import { adminSystemUserRole } from "./user-role";

export const adminSystemUser = pgTable("admin_system_user", {
  ...baseColumns,
  username: varchar({ length: 64 }).notNull().unique(),
  password: text().notNull(),
  builtIn: boolean().default(false),
  avatar: text(),
  nickName: varchar({ length: 64 }).notNull(),
  status: statusEnum().notNull(),
}, table => [
  index("system_user_username_idx").on(table.username),
]);

export const adminSystemUserRelations = relations(adminSystemUser, ({ many }) => ({
  userRoles: many(adminSystemUserRole),
}));

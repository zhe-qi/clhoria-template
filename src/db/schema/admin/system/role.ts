import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";

import { baseColumns } from "@/db/schema/_shard/base-columns";

import { statusEnum } from "../../_shard/enums";
import { adminSystemUserRole } from "./user-role";

export const adminSystemRole = pgTable("admin_system_role", {
  ...baseColumns,
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  status: statusEnum().notNull(),
});

export const adminSystemRoleRelations = relations(adminSystemRole, ({ many }) => ({
  userRoles: many(adminSystemUserRole),
}));

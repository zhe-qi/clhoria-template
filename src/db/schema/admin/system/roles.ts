import { relations } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";

import { baseColumns } from "@/db/schema/_shard/base-columns";

import { statusEnum } from "../../_shard/enums";
import { systemUserRoles } from "./user-roles";

export const systemRoles = pgTable("system_roles", {
  ...baseColumns,
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
  description: text(),
  status: statusEnum().notNull(),
});

export const systemRolesRelations = relations(systemRoles, ({ many }) => ({
  systemUserRoles: many(systemUserRoles),
}));

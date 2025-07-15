import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "./enums";

export const sysOrganization = pgTable("sys_organization", {
  id: defaultColumns.id,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 128 }).notNull(),
  description: text(),
  pid: varchar({ length: 64 }).notNull().default("0"),
  status: statusEnum().notNull().default("ENABLED"),
  createdAt: defaultColumns.createdAt,
  createdBy: varchar({ length: 64 }).notNull(),
  updatedAt: defaultColumns.updatedAt,
  updatedBy: varchar({ length: 64 }),
});

export const selectSysOrganizationSchema = createSelectSchema(sysOrganization, {
  id: schema => schema.describe("组织ID"),
  code: schema => schema.describe("组织代码"),
  name: schema => schema.describe("组织名称"),
  description: schema => schema.describe("组织描述"),
  pid: schema => schema.describe("父组织ID"),
  status: schema => schema.describe("状态: ENABLED=启用 DISABLED=禁用"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
  updatedAt: schema => schema.describe("更新时间"),
  updatedBy: schema => schema.describe("更新人"),
});

export const insertSysOrganizationSchema = createInsertSchema(sysOrganization, {
  code: schema => schema.min(1).regex(/^[\w-]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSysOrganizationSchema = insertSysOrganizationSchema.partial();

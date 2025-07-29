import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";

export const systemOrganization = pgTable("system_organization", {
  ...defaultColumns,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 128 }).notNull(),
  description: text(),
  pid: uuid(),
  status: statusEnum().notNull(),
});

export const selectSystemOrganizationSchema = createSelectSchema(systemOrganization, {
  id: schema => schema.describe("组织ID"),
  code: schema => schema.describe("组织代码"),
  name: schema => schema.describe("组织名称"),
  description: schema => schema.describe("组织描述"),
  pid: schema => schema.describe("父组织ID"),
  status: schema => schema.describe("状态: 1=启用 0=禁用"),
});

export const insertSystemOrganizationSchema = createInsertSchema(systemOrganization, {
  code: schema => schema.min(1).regex(/^[\w-]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSystemOrganizationSchema = insertSystemOrganizationSchema.partial();

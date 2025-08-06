import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";

export const systemDomain = pgTable("system_domain", {
  ...defaultColumns,
  code: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 128 }).notNull(),
  description: text(),
  status: statusEnum().notNull(),
});

export const selectSystemDomainSchema = createSelectSchema(systemDomain, {
  id: schema => schema.meta({ describe: "域ID" }),
  code: schema => schema.meta({ describe: "域代码" }),
  name: schema => schema.meta({ describe: "域名称" }),
  description: schema => schema.meta({ describe: "域描述" }),
  status: schema => schema.meta({ describe: "状态: 1=启用 0=禁用" }),
});

export const insertSystemDomainSchema = createInsertSchema(systemDomain, {
  code: schema => schema.min(1).regex(/^[\w-]+$/),
  name: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchSystemDomainSchema = insertSystemDomainSchema.partial();

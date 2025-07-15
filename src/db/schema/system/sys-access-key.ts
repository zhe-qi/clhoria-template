import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { statusEnum } from "./enums";

export const sysAccessKey = pgTable("sys_access_key", {
  id: uuid().primaryKey().defaultRandom(),
  domain: varchar({ length: 64 }).notNull(),
  accessKeyId: varchar({ length: 128 }).notNull().unique(),
  accessKeySecret: varchar({ length: 256 }).notNull().unique(),
  status: statusEnum().notNull().default("ENABLED"),
  description: text(),
  createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
  createdBy: varchar({ length: 64 }).notNull(),
});

export const selectSysAccessKeySchema = createSelectSchema(sysAccessKey, {
  id: schema => schema.describe("密钥ID"),
  domain: schema => schema.describe("域"),
  accessKeyId: schema => schema.describe("访问密钥ID"),
  accessKeySecret: schema => schema.describe("访问密钥密码"),
  status: schema => schema.describe("状态: ENABLED=启用 DISABLED=禁用"),
  description: schema => schema.describe("描述"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
});

export const insertSysAccessKeySchema = createInsertSchema(sysAccessKey, {
  domain: schema => schema.min(1),
  accessKeyId: schema => schema.min(1),
  accessKeySecret: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
});

export const patchSysAccessKeySchema = insertSysAccessKeySchema.partial();

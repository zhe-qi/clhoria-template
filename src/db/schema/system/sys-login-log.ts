import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sysLoginLog = pgTable("sys_login_log", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull(),
  username: varchar({ length: 64 }).notNull(),
  domain: varchar({ length: 64 }).notNull(),
  loginTime: timestamp({ mode: "date" }).notNull().defaultNow(),
  ip: varchar({ length: 64 }).notNull(),
  port: integer(),
  address: varchar({ length: 255 }).notNull(),
  userAgent: varchar({ length: 512 }).notNull(),
  requestId: varchar({ length: 64 }).notNull(),
  type: varchar({ length: 32 }).notNull(),
  createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
  createdBy: varchar({ length: 64 }).notNull(),
});

export const selectSysLoginLogSchema = createSelectSchema(sysLoginLog, {
  id: schema => schema.describe("日志ID"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域"),
  loginTime: schema => schema.describe("登录时间"),
  ip: schema => schema.describe("IP地址"),
  port: schema => schema.describe("端口"),
  address: schema => schema.describe("地址"),
  userAgent: schema => schema.describe("用户代理"),
  requestId: schema => schema.describe("请求ID"),
  type: schema => schema.describe("登录类型"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
});

export const insertSysLoginLogSchema = createInsertSchema(sysLoginLog, {
  username: schema => schema.min(1),
  domain: schema => schema.min(1),
  ip: schema => schema.min(1),
  address: schema => schema.min(1),
  userAgent: schema => schema.min(1),
  requestId: schema => schema.min(1),
  type: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  loginTime: true,
  createdAt: true,
});

export const patchSysLoginLogSchema = insertSysLoginLogSchema.partial();

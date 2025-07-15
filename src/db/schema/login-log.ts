import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const loginLogs = pgTable("sys_login_log", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  userId: varchar({ length: 36 }).notNull(),
  username: varchar({ length: 50 }).notNull(),
  domain: varchar({ length: 100 }).notNull(),
  loginTime: timestamp().defaultNow().notNull(),
  ip: varchar({ length: 45 }).notNull(),
  port: integer(),
  address: varchar({ length: 255 }).notNull(),
  userAgent: varchar({ length: 500 }).notNull(),
  requestId: varchar({ length: 36 }).notNull(),
  type: varchar({ length: 20 }).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  createdBy: varchar({ length: 36 }).notNull(),
});

export const selectLoginLogSchema = createSelectSchema(loginLogs, {
  id: schema => schema.describe("登录日志ID"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域名"),
  loginTime: schema => schema.describe("登录时间"),
  ip: schema => schema.describe("IP地址"),
  port: schema => schema.describe("端口号"),
  address: schema => schema.describe("物理或虚拟地址"),
  userAgent: schema => schema.describe("用户代理"),
  requestId: schema => schema.describe("请求ID"),
  type: schema => schema.describe("登录事件类型"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
});

export const insertLoginLogSchema = createInsertSchema(loginLogs, {
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域名"),
  loginTime: schema => schema.describe("登录时间"),
  ip: schema => schema.describe("IP地址"),
  port: schema => schema.describe("端口号"),
  address: schema => schema.describe("物理或虚拟地址"),
  userAgent: schema => schema.describe("用户代理"),
  requestId: schema => schema.describe("请求ID"),
  type: schema => schema.describe("登录事件类型"),
  createdBy: schema => schema.describe("创建人"),
}).omit({
  id: true,
  createdAt: true,
});

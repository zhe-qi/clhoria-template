import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sysTokens = pgTable("sys_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  accessToken: varchar({ length: 512 }).notNull().unique(),
  refreshToken: varchar({ length: 512 }).notNull().unique(),
  status: varchar({ length: 32 }).notNull(),
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

export const selectSysTokensSchema = createSelectSchema(sysTokens, {
  id: schema => schema.describe("令牌ID"),
  accessToken: schema => schema.describe("访问令牌"),
  refreshToken: schema => schema.describe("刷新令牌"),
  status: schema => schema.describe("状态"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域"),
  loginTime: schema => schema.describe("登录时间"),
  ip: schema => schema.describe("IP地址"),
  port: schema => schema.describe("端口"),
  address: schema => schema.describe("地址"),
  userAgent: schema => schema.describe("用户代理"),
  requestId: schema => schema.describe("请求ID"),
  type: schema => schema.describe("类型"),
  createdAt: schema => schema.describe("创建时间"),
  createdBy: schema => schema.describe("创建人"),
});

export const insertSysTokensSchema = createInsertSchema(sysTokens, {
  accessToken: schema => schema.min(1),
  refreshToken: schema => schema.min(1),
  status: schema => schema.min(1),
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

export const patchSysTokensSchema = insertSysTokensSchema.partial();

import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sysOperationLog = pgTable("sys_operation_log", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  username: varchar({ length: 64 }).notNull(),
  domain: varchar({ length: 64 }).notNull(),
  moduleName: varchar("module_name", { length: 128 }).notNull(),
  description: varchar({ length: 512 }).notNull(),
  requestId: varchar("request_id", { length: 64 }).notNull(),
  method: varchar({ length: 16 }).notNull(),
  url: varchar({ length: 512 }).notNull(),
  ip: varchar({ length: 64 }).notNull(),
  userAgent: varchar("user_agent", { length: 512 }),
  params: jsonb(),
  body: jsonb(),
  response: jsonb(),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }).notNull(),
  duration: integer().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const selectSysOperationLogSchema = createSelectSchema(sysOperationLog, {
  id: schema => schema.describe("日志ID"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域"),
  moduleName: schema => schema.describe("模块名称"),
  description: schema => schema.describe("操作描述"),
  requestId: schema => schema.describe("请求ID"),
  method: schema => schema.describe("HTTP方法"),
  url: schema => schema.describe("URL"),
  ip: schema => schema.describe("IP地址"),
  userAgent: schema => schema.describe("用户代理"),
  params: schema => schema.describe("查询参数"),
  body: schema => schema.describe("请求体"),
  response: schema => schema.describe("响应"),
  startTime: schema => schema.describe("开始时间"),
  endTime: schema => schema.describe("结束时间"),
  duration: schema => schema.describe("持续时间(ms)"),
  createdAt: schema => schema.describe("创建时间"),
});

export const insertSysOperationLogSchema = createInsertSchema(sysOperationLog, {
  userId: schema => schema.uuid(),
  username: schema => schema.min(1),
  domain: schema => schema.min(1),
  moduleName: schema => schema.min(1),
  description: schema => schema.min(1),
  requestId: schema => schema.min(1),
  method: schema => schema.regex(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/),
  url: schema => schema.min(1),
  ip: schema => schema.min(1),
  startTime: schema => schema,
  endTime: schema => schema,
  duration: schema => schema.min(0),
}).omit({
  id: true,
  createdAt: true,
});

export const patchSysOperationLogSchema = insertSysOperationLogSchema.partial();

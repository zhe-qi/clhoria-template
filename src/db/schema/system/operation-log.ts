import { integer, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const operationLogs = pgTable("sys_operation_log", {
  id: defaultColumns.id,
  userId: varchar({ length: 36 }),
  username: varchar({ length: 50 }),
  domain: varchar({ length: 100 }),
  moduleName: varchar({ length: 100 }),
  description: varchar({ length: 500 }),
  requestId: varchar({ length: 36 }),
  method: varchar({ length: 10 }),
  url: varchar({ length: 500 }),
  ip: varchar({ length: 45 }),
  userAgent: varchar({ length: 500 }),
  params: json(),
  body: json(),
  response: json(),
  startTime: timestamp(),
  endTime: timestamp(),
  duration: integer(),
  createdAt: defaultColumns.createdAt,
});

export const selectOperationLogSchema = createSelectSchema(operationLogs, {
  id: schema => schema.describe("操作日志ID"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域名"),
  moduleName: schema => schema.describe("模块名称"),
  description: schema => schema.describe("操作描述"),
  requestId: schema => schema.describe("请求ID"),
  method: schema => schema.describe("HTTP方法"),
  url: schema => schema.describe("访问URL"),
  ip: schema => schema.describe("IP地址"),
  userAgent: schema => schema.describe("用户代理"),
  params: schema => schema.describe("请求参数"),
  body: schema => schema.describe("请求体"),
  response: schema => schema.describe("响应内容"),
  startTime: schema => schema.describe("开始时间"),
  endTime: schema => schema.describe("结束时间"),
  duration: schema => schema.describe("持续时间(毫秒)"),
  createdAt: schema => schema.describe("创建时间"),
});

export const insertOperationLogSchema = createInsertSchema(operationLogs, {
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域名"),
  moduleName: schema => schema.describe("模块名称"),
  description: schema => schema.describe("操作描述"),
  requestId: schema => schema.describe("请求ID"),
  method: schema => schema.describe("HTTP方法"),
  url: schema => schema.describe("访问URL"),
  ip: schema => schema.describe("IP地址"),
  userAgent: schema => schema.describe("用户代理"),
  params: schema => schema.describe("请求参数"),
  body: schema => schema.describe("请求体"),
  response: schema => schema.describe("响应内容"),
  startTime: schema => schema.describe("开始时间"),
  endTime: schema => schema.describe("结束时间"),
  duration: schema => schema.describe("持续时间(毫秒)"),
}).omit({
  id: true,
  createdAt: true,
});

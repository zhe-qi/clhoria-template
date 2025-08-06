import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tsLoginLog = pgTable("ts_login_log", {
  id: uuid().$defaultFn(() => crypto.randomUUID()),
  userId: uuid().notNull(),
  username: text().notNull(),
  domain: text().notNull(),
  loginTime: timestamp({ mode: "string", withTimezone: true }).notNull(), // 时间分区键
  ip: text().notNull(),
  port: integer(),
  address: text().notNull(),
  userAgent: text().notNull(),
  requestId: text().notNull(),
  type: text().notNull(),
  createdBy: text().notNull(),
  createdAt: timestamp({ mode: "string", withTimezone: true }).$defaultFn(() => new Date().toISOString()),
}, table => [
  // 复合主键：id + loginTime（满足 TimescaleDB 分区要求）
  primaryKey({ columns: [table.id, table.loginTime] }),
  // 优化时序查询的索引，减少索引数量以提升写入性能
  index("ts_login_log_time_idx").on(table.loginTime.desc()),
  index("ts_login_log_user_time_idx").on(table.userId, table.loginTime.desc()),
  index("ts_login_log_domain_time_idx").on(table.domain, table.loginTime.desc()),
]);

export const selectTsLoginLogSchema = createSelectSchema(tsLoginLog, {
  id: schema => schema.meta({ describe: "日志ID" }),
  userId: schema => schema.meta({ describe: "用户ID" }),
  username: schema => schema.meta({ describe: "用户名" }),
  domain: schema => schema.meta({ describe: "域" }),
  loginTime: schema => schema.meta({ describe: "登录时间" }),
  ip: schema => schema.meta({ describe: "IP地址" }),
  port: schema => schema.meta({ describe: "端口" }),
  address: schema => schema.meta({ describe: "地址" }),
  userAgent: schema => schema.meta({ describe: "用户代理" }),
  requestId: schema => schema.meta({ describe: "请求ID" }),
  type: schema => schema.meta({ describe: "登录类型" }),
});

export const insertTsLoginLogSchema = createInsertSchema(tsLoginLog, {
  username: schema => schema.min(1),
  domain: schema => schema.min(1),
  loginTime: schema => schema,
  ip: schema => schema.min(1),
  address: schema => schema.min(1),
  userAgent: schema => schema.min(1),
  requestId: schema => schema.min(1),
  type: schema => schema.min(1),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  createdAt: true,
});

export const patchTsLoginLogSchema = insertTsLoginLogSchema.partial();

import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { defaultColumns } from "@/db/common/default-columns";
import { TokenType } from "@/lib/enums";
import { formatDate } from "@/utils/tools/formatter";

import { tokenStatusEnum } from "../../common/enums";

export const systemTokens = pgTable("system_tokens", {
  id: defaultColumns.id,
  accessToken: varchar({ length: 512 }).notNull().unique(),
  refreshToken: varchar({ length: 512 }).notNull().unique(),
  status: tokenStatusEnum().notNull(),
  userId: uuid().notNull(),
  username: varchar({ length: 64 }).notNull(),
  domain: varchar({ length: 64 }).notNull(),
  loginTime: timestamp({ mode: "string" }).notNull().$defaultFn(() => formatDate(new Date())),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  ip: varchar({ length: 64 }).notNull(),
  port: integer(),
  address: varchar({ length: 255 }).notNull(),
  userAgent: varchar({ length: 512 }).notNull(),
  requestId: varchar({ length: 64 }).notNull(),
  type: varchar({ length: 32 }).notNull(),
  createdBy: defaultColumns.createdBy,
  createdAt: defaultColumns.createdAt,
});

export const selectSystemTokensSchema = createSelectSchema(systemTokens, {
  id: schema => schema.describe("令牌ID"),
  accessToken: schema => schema.describe("访问令牌"),
  refreshToken: schema => schema.describe("刷新令牌"),
  status: schema => schema.describe("状态: 1=活跃 0=已撤销 -1=已过期"),
  userId: schema => schema.describe("用户ID"),
  username: schema => schema.describe("用户名"),
  domain: schema => schema.describe("域"),
  loginTime: schema => schema.describe("登录时间"),
  expiresAt: schema => schema.describe("过期时间"),
  ip: schema => schema.describe("IP地址"),
  port: schema => schema.describe("端口"),
  address: schema => schema.describe("地址"),
  userAgent: schema => schema.describe("用户代理"),
  requestId: schema => schema.describe("请求ID"),
  type: schema => schema.describe("类型: WEB=网页登录 MOBILE=移动端 API=API访问 THIRD_PARTY=第三方"),
});

export const insertSystemTokensSchema = createInsertSchema(systemTokens, {
  accessToken: schema => schema.min(1),
  refreshToken: schema => schema.min(1),
  status: () => z.number().int(),
  username: schema => schema.min(1),
  domain: schema => schema.min(1),
  ip: schema => schema.min(1),
  address: schema => schema.min(1),
  userAgent: schema => schema.min(1),
  requestId: schema => schema.min(1),
  type: () => z.enum(Object.values(TokenType) as [string, ...string[]]),
  createdBy: schema => schema.min(1),
}).omit({
  id: true,
  loginTime: true,
  expiresAt: true,
  createdAt: true,
});

export const patchSystemTokensSchema = insertSystemTokensSchema.partial();

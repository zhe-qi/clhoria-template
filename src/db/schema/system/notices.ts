import { z } from "@hono/zod-openapi";
import { index, integer, pgEnum, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/**
 * 通知公告类型枚举
 */
export const noticeTypeEnum = pgEnum("notice_type", ["NOTIFICATION", "ANNOUNCEMENT"]);

/**
 * 系统通知公告表
 */
export const systemNotices = pgTable("system_notices", {
  ...defaultColumns,
  /** 公告标题 */
  title: varchar({ length: 200 }).notNull(),
  /** 公告类型：通知或公告 */
  type: noticeTypeEnum().notNull().default("NOTIFICATION"),
  /** 公告内容 */
  content: text(),
  /** 状态: 1=启用 0=禁用 */
  status: integer().default(1).notNull(),
  /** 多租户域 */
  domain: varchar({ length: 100 }).notNull(),
  /** 排序 */
  sortOrder: integer().default(0).notNull(),
}, table => [
  index("notices_domain_idx").on(table.domain),
  index("notices_type_idx").on(table.type),
  index("notices_status_idx").on(table.status),
  index("notices_created_at_idx").on(table.createdAt.desc()),
]);

/**
 * 查询通知公告Schema
 */
export const selectSystemNoticesSchema = createSelectSchema(systemNotices, {
  id: _schema => _schema.describe("公告ID"),
  title: _schema => _schema.describe("公告标题"),
  type: _schema => _schema.describe("公告类型: NOTIFICATION=通知 ANNOUNCEMENT=公告"),
  content: _schema => _schema.describe("公告内容"),
  status: _schema => _schema.describe("状态: 1=启用 0=禁用"),
  domain: _schema => _schema.describe("所属域"),
  sortOrder: _schema => _schema.describe("排序"),
  createdAt: _schema => _schema.describe("创建时间"),
  updatedAt: _schema => _schema.describe("更新时间"),
  createdBy: _schema => _schema.describe("创建人"),
  updatedBy: _schema => _schema.describe("更新人"),
});

/**
 * 创建通知公告Schema
 */
export const insertSystemNoticesSchema = createInsertSchema(systemNotices, {
  title: _schema => _schema.min(1, "公告标题不能为空").max(200, "公告标题不能超过200字符").describe("公告标题"),
  type: _schema => _schema.describe("公告类型: NOTIFICATION=通知 ANNOUNCEMENT=公告"),
  content: _schema => _schema.optional().describe("公告内容"),
  status: _schema => _schema.default(1).describe("状态: 1=启用 0=禁用"),
  domain: _schema => _schema.min(1, "域不能为空").describe("所属域"),
  sortOrder: _schema => _schema.default(0).describe("排序"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

/**
 * 更新通知公告Schema
 */
export const patchSystemNoticesSchema = insertSystemNoticesSchema.partial().omit({
  domain: true, // 不允许修改域
});

/**
 * 响应通知公告Schema（用于API响应）
 */
export const responseSystemNoticesSchema = selectSystemNoticesSchema;

/**
 * 通知公告类型常量
 */
export const NoticeType = {
  NOTIFICATION: "NOTIFICATION",
  ANNOUNCEMENT: "ANNOUNCEMENT",
} as const;

export type NoticeTypeValue = typeof NoticeType[keyof typeof NoticeType];

/**
 * 通知公告类型Schema
 */
export const noticeTypeSchema = z.enum(["NOTIFICATION", "ANNOUNCEMENT"]).describe("公告类型");

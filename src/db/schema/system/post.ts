import { relations } from "drizzle-orm";
import { integer, pgTable, text, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";
import { systemUserPost } from "./user-post";

export const systemPost = pgTable("system_post", {
  ...defaultColumns,
  postCode: varchar({ length: 64 }).notNull(),
  postName: varchar({ length: 50 }).notNull(),
  postSort: integer().notNull().default(0),
  status: statusEnum().notNull(),
  domain: varchar({ length: 64 }).notNull(),
  remark: text(),
}, table => [
  // 域内岗位编码唯一
  unique().on(table.domain, table.postCode),
]);

export const systemPostRelations = relations(systemPost, ({ many }) => ({
  userPosts: many(systemUserPost),
}));

export const selectSystemPostSchema = createSelectSchema(systemPost, {
  id: schema => schema.describe("岗位ID"),
  postCode: schema => schema.describe("岗位编码"),
  postName: schema => schema.describe("岗位名称"),
  postSort: schema => schema.describe("显示顺序"),
  status: schema => schema.describe("状态: 1=启用 0=禁用 -1=封禁"),
  domain: schema => schema.describe("所属域ID"),
  remark: schema => schema.describe("备注"),
});

export const insertSystemPostSchema = createInsertSchema(systemPost, {
  postCode: schema => schema.min(1).max(64).regex(/^[\w-]+$/),
  postName: schema => schema.min(1).max(50),
  postSort: schema => schema.min(0),
  domain: schema => schema.min(1).default("default"),
  remark: schema => schema.max(500).optional(),
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});

export const patchSystemPostSchema = insertSystemPostSchema.partial();

// 用于响应的 schema
export const responseSystemPostSchema = selectSystemPostSchema;

// 用于简化列表的 schema（下拉选择等场景）
export const simpleSystemPostSchema = selectSystemPostSchema.pick({
  id: true,
  postCode: true,
  postName: true,
  postSort: true,
  status: true,
});

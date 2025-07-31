import { relations } from "drizzle-orm";
import { pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";

import { systemPost } from "./post";
import { systemUser } from "./user";

export const systemUserPost = pgTable("system_user_post", {
  userId: varchar({ length: 64 }).notNull(),
  postId: varchar({ length: 64 }).notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.postId] }),
]);

export const systemUserPostRelations = relations(systemUserPost, ({ one }) => ({
  user: one(systemUser, {
    fields: [systemUserPost.userId],
    references: [systemUser.id],
  }),
  post: one(systemPost, {
    fields: [systemUserPost.postId],
    references: [systemPost.id],
  }),
}));

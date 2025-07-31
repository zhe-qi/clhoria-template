import type { InferSelectModel } from "drizzle-orm";

import { and, count, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { systemPost, systemUser, systemUserPost } from "@/db/schema";

export type PostRecord = InferSelectModel<typeof systemPost>;

interface CreatePostParams {
  postCode: string;
  postName: string;
  postSort: number;
  status: number;
  domain: string;
  remark?: string | null;
  createdBy: string;
}

interface UpdatePostParams {
  postCode?: string;
  postName?: string;
  postSort?: number;
  status?: number;
  remark?: string | null;
  updatedBy: string;
}

interface AssignUsersParams {
  postId: string;
  userIds: string[];
  domain: string;
}

/** 创建岗位 */
export async function createPost(params: CreatePostParams): Promise<PostRecord> {
  const [post] = await db
    .insert(systemPost)
    .values(params)
    .returning();

  return post;
}

/** 根据ID获取岗位 */
export async function getPostById(
  id: string,
  domain: string,
): Promise<PostRecord | null> {
  const [post] = await db
    .select()
    .from(systemPost)
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ));

  return post || null;
}

/** 更新岗位 */
export async function updatePost(
  id: string,
  domain: string,
  params: UpdatePostParams,
): Promise<PostRecord | null> {
  const [updated] = await db
    .update(systemPost)
    .set({
      ...params,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ))
    .returning();

  return updated || null;
}

/** 删除岗位 */
export async function deletePost(
  id: string,
  domain: string,
): Promise<boolean> {
  // 检查是否有用户关联此岗位
  const [postUsageCount] = await db
    .select({ count: count() })
    .from(systemUserPost)
    .where(eq(systemUserPost.postId, id));

  if (postUsageCount.count > 0) {
    throw new Error("岗位已分配给用户，无法删除");
  }

  const [deleted] = await db
    .delete(systemPost)
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ))
    .returning({ id: systemPost.id });

  return !!deleted;
}

/** 检查岗位编码是否在域内唯一 */
export async function isPostCodeUnique(
  postCode: string,
  domain: string,
  excludeId?: string,
): Promise<boolean> {
  let whereCondition = and(
    eq(systemPost.postCode, postCode),
    eq(systemPost.domain, domain),
  );

  if (excludeId) {
    whereCondition = and(whereCondition, eq(systemPost.id, excludeId));
  }

  const [existing] = await db
    .select({ id: systemPost.id })
    .from(systemPost)
    .where(whereCondition);

  return !existing;
}

/** 为岗位分配用户 */
export async function assignUsersToPost(params: AssignUsersParams): Promise<{
  success: boolean;
  added: number;
  removed: number;
}> {
  return db.transaction(async (tx) => {
    const { postId, userIds, domain } = params;

    // 验证岗位是否存在
    const [post] = await tx
      .select({ id: systemPost.id })
      .from(systemPost)
      .where(and(
        eq(systemPost.id, postId),
        eq(systemPost.domain, domain),
      ));

    if (!post) {
      throw new Error("岗位不存在");
    }

    // 验证用户是否存在且在同一域
    if (userIds.length > 0) {
      const users = await tx
        .select({ id: systemUser.id })
        .from(systemUser)
        .where(and(
          inArray(systemUser.id, userIds),
          eq(systemUser.domain, domain),
        ));

      if (users.length !== userIds.length) {
        throw new Error("部分用户不存在或不在同一域中");
      }
    }

    // 删除现有的用户岗位关联
    const deletedResult = await tx
      .delete(systemUserPost)
      .where(eq(systemUserPost.postId, postId))
      .returning();

    let addedCount = 0;

    // 添加新的用户岗位关联
    if (userIds.length > 0) {
      const insertData = userIds.map(userId => ({
        userId,
        postId,
      }));

      const inserted = await tx
        .insert(systemUserPost)
        .values(insertData)
        .returning();

      addedCount = inserted.length;
    }

    return {
      success: true,
      added: addedCount,
      removed: deletedResult.length,
    };
  });
}

/** 获取岗位的用户列表 */
export async function getPostUsers(postId: string, domain: string) {
  const users = await db
    .select({
      id: systemUser.id,
      username: systemUser.username,
      nickName: systemUser.nickName,
      status: systemUser.status,
    })
    .from(systemUserPost)
    .innerJoin(systemUser, eq(systemUserPost.userId, systemUser.id))
    .where(and(
      eq(systemUserPost.postId, postId),
      eq(systemUser.domain, domain),
    ))
    .orderBy(systemUser.username);

  return users;
}

/** 获取用户的岗位列表 */
export async function getUserPosts(userId: string, domain: string) {
  const posts = await db
    .select({
      id: systemPost.id,
      postCode: systemPost.postCode,
      postName: systemPost.postName,
      postSort: systemPost.postSort,
      status: systemPost.status,
    })
    .from(systemUserPost)
    .innerJoin(systemPost, eq(systemUserPost.postId, systemPost.id))
    .where(and(
      eq(systemUserPost.userId, userId),
      eq(systemPost.domain, domain),
    ))
    .orderBy(systemPost.postSort);

  return posts;
}

/** 批量删除用户岗位关联 */
export async function removeUserFromPosts(userId: string, postIds: string[]) {
  if (postIds.length === 0)
    return 0;

  const deleted = await db
    .delete(systemUserPost)
    .where(and(
      eq(systemUserPost.userId, userId),
      inArray(systemUserPost.postId, postIds),
    ))
    .returning();

  return deleted.length;
}

/** 批量删除岗位用户关联 */
export async function removeUsersFromPost(postId: string, userIds: string[]) {
  if (userIds.length === 0)
    return 0;

  const deleted = await db
    .delete(systemUserPost)
    .where(and(
      eq(systemUserPost.postId, postId),
      inArray(systemUserPost.userId, userIds),
    ))
    .returning();

  return deleted.length;
}

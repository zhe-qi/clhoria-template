import type { z } from "zod";

import { and, count, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { selectSystemPostSchema } from "@/db/schema";

import db from "@/db";
import { systemPost, systemUserPost } from "@/db/schema";
import { getDuplicateKeyError, Status } from "@/lib/enums";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import { pickContext } from "@/utils";

import type { SystemPostsRouteHandlerType } from "./posts.index";

export const list: SystemPostsRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemPostSchema>>({
    table: systemPost,
    params: query,
    domain,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json({ data: result.data, meta: result.meta }, HttpStatusCodes.OK);
};

export const simpleList: SystemPostsRouteHandlerType<"simpleList"> = async (c) => {
  const domain = c.get("userDomain");

  const posts = await db
    .select({
      id: systemPost.id,
      postCode: systemPost.postCode,
      postName: systemPost.postName,
      postSort: systemPost.postSort,
      status: systemPost.status,
    })
    .from(systemPost)
    .where(and(
      eq(systemPost.domain, domain),
      eq(systemPost.status, Status.ENABLED),
    ))
    .orderBy(systemPost.postSort, systemPost.postName);

  return c.json(posts, HttpStatusCodes.OK);
};

export const create: SystemPostsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const [post] = await db.insert(systemPost).values({
      ...body,
      domain,
      createdBy: userId,
    }).returning();

    return c.json(post, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    // PostgreSQL unique constraint violation error code is 23505
    // The error structure from postgres-js has the actual PostgreSQL error in error.cause
    const isHandlerExists = error.cause?.code === "23505"
      || error.message?.includes("duplicate key")
      || error.message?.includes("unique constraint")
      || error.cause?.detail?.includes("already exists")
      || error.message?.includes("已存在");

    if (isHandlerExists) {
      return c.json(getDuplicateKeyError("postCode", "岗位编码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SystemPostsRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const [post] = await db
    .select()
    .from(systemPost)
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ));

  if (!post) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(post, HttpStatusCodes.OK);
};

export const update: SystemPostsRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const [updated] = await db
      .update(systemPost)
      .set({
        ...body,
        updatedBy: userId,
      })
      .where(and(
        eq(systemPost.id, id),
        eq(systemPost.domain, domain),
      ))
      .returning();

    if (!updated) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(updated, HttpStatusCodes.OK);
  }
  catch (error: any) {
    const isHandlerExists = error.cause?.code === "23505"
      || error.message?.includes("duplicate key")
      || error.message?.includes("unique constraint")
      || error.cause?.detail?.includes("already exists")
      || error.message?.includes("已存在");

    if (isHandlerExists) {
      return c.json(getDuplicateKeyError("postCode", "岗位编码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const remove: SystemPostsRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  // 检查是否有用户关联此岗位
  const [postUsageCount] = await db
    .select({ count: count() })
    .from(systemUserPost)
    .where(eq(systemUserPost.postId, id));

  if (postUsageCount.count > 0) {
    return c.json(
      { message: "岗位已分配给用户，无法删除" },
      HttpStatusCodes.CONFLICT,
    );
  }

  const [deleted] = await db
    .delete(systemPost)
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ))
    .returning({ id: systemPost.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const assignUsers: SystemPostsRouteHandlerType<"assignUsers"> = async (c) => {
  const { id } = c.req.valid("param");
  const { userIds } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查岗位是否存在
  const [post] = await db
    .select({ id: systemPost.id })
    .from(systemPost)
    .where(and(
      eq(systemPost.id, id),
      eq(systemPost.domain, domain),
    ));

  if (!post) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return db.transaction(async (tx) => {
    // 删除现有的用户岗位关联
    const deletedCount = await tx
      .delete(systemUserPost)
      .where(eq(systemUserPost.postId, id));

    let addedCount = 0;

    // 添加新的用户岗位关联
    if (userIds.length > 0) {
      const insertData = userIds.map(userId => ({
        userId,
        postId: id,
      }));

      const inserted = await tx
        .insert(systemUserPost)
        .values(insertData)
        .returning();

      addedCount = inserted.length;
    }

    return c.json({
      success: true,
      added: addedCount,
      removed: deletedCount.length || 0,
    }, HttpStatusCodes.OK);
  });
};

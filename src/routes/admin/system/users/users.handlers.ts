import type { z } from "zod";

import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { responseSystemUserSchema, selectSystemUserSchema } from "@/db/schema";

import db from "@/db";
import { systemUser } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import { clearUserPermissionCache, createUser } from "@/services/system/user";
import { omit, pickContext } from "@/utils";

import type { SystemUsersRouteHandlerType } from "./users.index";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemUserSchema>>({
    table: systemUser,
    params: query,
    domain,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 移除密码字段
  const data: z.infer<typeof responseSystemUserSchema>[] = result.data.map(user => omit(user, ["password"]));

  return c.json({ data, meta: result.meta }, HttpStatusCodes.OK);
};

export const create: SystemUsersRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const user = await createUser({
      ...body,
      domain,
      createdBy: userId,
      // 处理可选字段
      avatar: body.avatar || undefined,
    });

    const userWithoutPassword = omit(user, ["password"]);
    return c.json(userWithoutPassword, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(getDuplicateKeyError("username", "用户名已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SystemUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const [user] = await db
    .select()
    .from(systemUser)
    .where(and(
      eq(systemUser.id, id),
      eq(systemUser.domain, domain),
    ));

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(user, ["password"]);
  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  // 不允许直接更新密码
  const updateData = omit(body as any, ["password"]);

  const [updated] = await db
    .update(systemUser)
    .set({
      ...updateData,
      updatedBy: userId,
    })
    .where(and(
      eq(systemUser.id, id),
      eq(systemUser.domain, domain),
    ))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 如果状态字段发生变化，清理用户缓存
  if ("status" in updateData) {
    void await clearUserPermissionCache(id, domain);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const [deleted] = await db
    .delete(systemUser)
    .where(and(
      eq(systemUser.id, id),
      eq(systemUser.domain, domain),
    ))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 清理用户相关缓存
  void await clearUserPermissionCache(id, domain);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

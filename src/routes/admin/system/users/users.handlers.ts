import type { z } from "zod";

import { and, eq } from "drizzle-orm";

import type { responseSystemUserSchema, selectSystemUserSchema } from "@/db/schema";

import db from "@/db";
import { systemUser } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { clearUserPermissionCache, createUser } from "@/services/system/user";
import { omit } from "@/utils";

import type { SystemUsersRouteHandlerType } from "./users.index";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const { tenantId } = c.get("jwtPayload");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemUserSchema>>({
    table: systemUser,
    params: query,
    tenantId,
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
  const { tenantId, userId } = c.get("jwtPayload");

  try {
    const user = await createUser({
      ...body,
      tenantId,
      createdBy: userId,
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
  const { tenantId } = c.get("jwtPayload");

  const [user] = await db
    .select()
    .from(systemUser)
    .where(and(
      eq(systemUser.id, id),
      eq(systemUser.tenantId, tenantId),
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
  const { tenantId, userId } = c.get("jwtPayload");

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
      eq(systemUser.tenantId, tenantId),
    ))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 如果状态字段发生变化，清理用户缓存
  if ("status" in updateData) {
    void await clearUserPermissionCache(id, tenantId);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const { tenantId } = c.get("jwtPayload");

  const [deleted] = await db
    .delete(systemUser)
    .where(and(
      eq(systemUser.id, id),
      eq(systemUser.tenantId, tenantId),
    ))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 清理用户相关缓存
  void await clearUserPermissionCache(id, tenantId);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

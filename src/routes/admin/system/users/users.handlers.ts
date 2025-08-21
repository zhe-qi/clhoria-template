import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { responseSystemUserSchema, selectSystemUserSchema } from "@/db/schema";

import db from "@/db";
import { systemUser } from "@/db/schema";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { omit } from "@/utils";

import type { SystemUsersRouteHandlerType } from "./users.index";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemUserSchema>>({
    table: systemUser,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 移除密码字段
  const data: z.infer<typeof responseSystemUserSchema>[] = result.data.map(user => omit(user, ["password"]));

  return c.json({ data, meta: result.meta }, HttpStatusCodes.OK);
};

// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const create: SystemUsersRouteHandlerType<"create"> = async (c) => {

};

export const get: SystemUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [user] = await db
    .select()
    .from(systemUser)
    .where(eq(systemUser.id, id));

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(user, ["password"]);
  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { userId } = c.get("jwtPayload");

  // 不允许直接更新密码
  const updateData = omit(body as any, ["password"]);

  const [updated] = await db
    .update(systemUser)
    .set({
      ...updateData,
      updatedBy: userId,
    })
    .where(eq(systemUser.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemUser)
    .where(eq(systemUser.id, id))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

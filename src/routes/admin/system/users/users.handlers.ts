import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectSystemUserSchema } from "@/db/schema";

import db from "@/db";
import { systemUser } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { omit, parseTextToZodError } from "@/utils";

import type { SystemUsersRouteHandlerType } from "./users.index";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const rawParams = c.req.query();
  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);

  if (!parseResult.success) {
    return c.json(parseResult.error, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const queryParams = parseResult.data;

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof selectSystemUserSchema>>(systemUser, queryParams);

  if (error) {
    return c.json(parseTextToZodError(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 移除密码字段
  const safeData = result.data.map(({ password, ...user }) => user);

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json({ data: safeData }, HttpStatusCodes.OK);
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
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(user, ["password"]);

  return c.json({ data: userWithoutPassword }, HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // 不允许直接更新密码
  const updateData = omit(body, ["password"]);

  const [updated] = await db
    .update(systemUser)
    .set({
      ...updateData,
      updatedBy: sub,
    })
    .where(eq(systemUser.id, id))
    .returning();

  if (!updated) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json({ data: userWithoutPassword }, HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemUser)
    .where(eq(systemUser.id, id))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: deleted }, HttpStatusCodes.OK);
};

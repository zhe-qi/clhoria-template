import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectSystemRoleSchema } from "@/db/schema";

import db from "@/db";
import { systemRole } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { parseTextToZodError } from "@/utils";

import type { SystemRolesRouteHandlerType } from "./roles.index";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const rawParams = c.req.query();
  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);

  if (!parseResult.success) {
    return c.json(parseResult.error, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const queryParams = parseResult.data;

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof selectSystemRoleSchema>>(systemRole, queryParams);

  if (error) {
    return c.json(parseTextToZodError(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json({ data: result.data }, HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  try {
    const [role] = await db.insert(systemRole).values({
      ...body,
      createdBy: sub,
    }).returning();

    return c.json({ data: role }, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(parseTextToZodError("角色代码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SystemRolesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [role] = await db
    .select()
    .from(systemRole)
    .where(eq(systemRole.id, id));

  if (!role) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: role }, HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update(systemRole)
    .set({
      ...body,
      updatedBy: sub,
    })
    .where(eq(systemRole.id, id))
    .returning();

  if (!updated) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: updated }, HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemRole)
    .where(eq(systemRole.id, id))
    .returning({ id: systemRole.id });

  if (!deleted) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: deleted }, HttpStatusCodes.OK);
};

import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectSystemRoleSchema } from "@/db/schema";

import db from "@/db";
import { systemRole } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";

import type { SystemRolesRouteHandlerType } from "./roles.index";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemRoleSchema>>({
    table: systemRole,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { userId } = c.get("jwtPayload");

  try {
    const [role] = await db.insert(systemRole).values({
      ...body,
      createdBy: userId,
    }).returning();

    return c.json(role, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(
        getDuplicateKeyError("code", "角色代码已存在"),
        HttpStatusCodes.CONFLICT,
      );
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
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(role, HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { userId } = c.get("jwtPayload");

  const [updated] = await db
    .update(systemRole)
    .set({
      ...body,
      updatedBy: userId,
    })
    .where(eq(systemRole.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemRole)
    .where(eq(systemRole.id, id))
    .returning({ id: systemRole.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

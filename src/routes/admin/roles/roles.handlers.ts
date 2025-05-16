import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectRolesSchema } from "@/db/schema";

import db from "@/db";
import { roles } from "@/db/schema";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { RoleRouteHandlerType as RouteHandlerType } from "./roles.index";

type PaginatedResult = z.infer<typeof selectRolesSchema>;

export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<PaginatedResult>({
    table: roles,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const create: RouteHandlerType<"create"> = async (c) => {
  const role = c.req.valid("json");

  const [inserted] = await db.insert(roles).values(role).returning();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: RouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");

  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(role, HttpStatusCodes.OK);
};

export const patch: RouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [role] = await db.update(roles)
    .set(updates)
    .where(eq(roles.id, id))
    .returning();

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(role, HttpStatusCodes.OK);
};

export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db.delete(roles)
    .where(eq(roles.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

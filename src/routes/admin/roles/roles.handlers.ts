import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { roles } from "@/db/schema";
import { updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";

import type { RoleRouteHandlerType as RouteHandlerType } from "./roles.index";

export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const result = await paginatedQuery<typeof roles.$inferSelect>({
    table: roles,
    params: query,
  });

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

  if (Object.keys(updates).length === 0) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [task] = await db.update(roles)
    .set(updates)
    .where(eq(roles.id, id))
    .returning();

  if (!task) {
    return c.json({ message: "任务不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(task, HttpStatusCodes.OK);
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

import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { adminUsers } from "@/db/schema";
import { updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";

import type { AdminUserRouteHandlerType } from "./admin-users.index";

export const list: AdminUserRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const result = await paginatedQuery<typeof adminUsers.$inferSelect>({
    table: adminUsers,
    params: query,
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const create: AdminUserRouteHandlerType<"create"> = async (c) => {
  const user = c.req.valid("json");

  const [inserted] = await db.insert(adminUsers).values(user).returning();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AdminUserRouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.query.adminUsers.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: AdminUserRouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [user] = await db.update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, id))
    .returning();

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const remove: AdminUserRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db.delete(adminUsers)
    .where(eq(adminUsers.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

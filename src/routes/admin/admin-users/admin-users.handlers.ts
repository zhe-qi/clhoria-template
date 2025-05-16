import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectAdminUsersSchema } from "@/db/schema";

import db from "@/db";
import { adminUsers, usersToRoles } from "@/db/schema";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { AdminUserRouteHandlerType as RouteHandlerType } from "./admin-users.index";

type PaginatedResult = z.infer<typeof selectAdminUsersSchema> & {
  roles: typeof usersToRoles.$inferSelect;
};

export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<PaginatedResult>({
    table: adminUsers,
    params: {
      ...query,
      join: { usersToRoles: { type: "left", on: { id: "userId" }, as: "roles" } },
    },
    joinTables: {
      usersToRoles,
    },
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const create: RouteHandlerType<"create"> = async (c) => {
  const user = c.req.valid("json");

  const [inserted] = await db.insert(adminUsers).values(user).returning();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: RouteHandlerType<"getOne"> = async (c) => {
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

export const patch: RouteHandlerType<"patch"> = async (c) => {
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

export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db.delete(adminUsers)
    .where(eq(adminUsers.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

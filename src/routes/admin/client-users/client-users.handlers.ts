import { eq } from "drizzle-orm";

import type { AppRouteHandler } from "@/types/lib";

import db from "@/db";
import { clientUsers } from "@/db/schema";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./client-users.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<typeof clientUsers.$inferSelect>({
    table: clientUsers,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = c.req.valid("json");

  const [inserted] = await db.insert(clientUsers).values(user).returning();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.query.clientUsers.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [user] = await db.update(clientUsers)
    .set(updates)
    .where(eq(clientUsers.id, id))
    .returning();

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db.delete(clientUsers)
    .where(eq(clientUsers.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

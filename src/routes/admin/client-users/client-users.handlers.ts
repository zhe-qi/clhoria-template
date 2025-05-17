import { eq } from "drizzle-orm";

import db from "@/db";
import { clientUsers } from "@/db/schema";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { ClientUsersRouteHandlerType as RouteHandlerType } from "./client-users.index";

export const list: RouteHandlerType<"list"> = async (c) => {
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

export const create: RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  const [result] = await db.insert(clientUsers).values(body).returning();

  return c.json(result, HttpStatusCodes.OK);
};

export const getOne: RouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");

  const result = await db.query.clientUsers.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!result) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const patch: RouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [result] = await db.update(clientUsers)
    .set(updates)
    .where(eq(clientUsers.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [result] = await db.delete(clientUsers)
    .where(eq(clientUsers.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

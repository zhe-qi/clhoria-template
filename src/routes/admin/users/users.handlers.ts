import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { users } from "@/db/schema";
import { updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";

import type { UserRouteHandlerType } from "./users.index";

export const list: UserRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const result = await paginatedQuery<typeof users.$inferSelect>({
    table: users,
    params: query,
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const create: UserRouteHandlerType<"create"> = async (c) => {
  const user = c.req.valid("json");

  const [inserted] = await db.insert(users).values(user).returning();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: UserRouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.query.users.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: UserRouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [user] = await db.update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const remove: UserRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db.delete(users)
    .where(eq(users.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

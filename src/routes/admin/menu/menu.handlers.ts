import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectMenuSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/types/lib";

import db from "@/db";
import { menu, roles } from "@/db/schema";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./menu.routes";

type PaginatedResult = z.infer<typeof selectMenuSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
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

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");

  const [result] = await db.insert(menu).values(body).returning();

  return c.json(result, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const result = await db.query.menu.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!result) {
    return c.json({ message: "菜单不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [result] = await db.update(menu)
    .set(updates)
    .where(eq(menu.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "菜单不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const [result] = await db.delete(menu)
    .where(eq(menu.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "菜单不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { users } from "@/db/schema";
import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";
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
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: UserRouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: ZOD_ERROR_CODES.INVALID_UPDATES,
              path: [],
              message: ZOD_ERROR_MESSAGES.NO_UPDATES,
            },
          ],
          name: "ZodError",
        },
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const [user] = await db.update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();

  if (!user) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const remove: UserRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const [deleted] = await db.delete(users)
    .where(eq(users.id, id))
    .returning();

  if (!deleted) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

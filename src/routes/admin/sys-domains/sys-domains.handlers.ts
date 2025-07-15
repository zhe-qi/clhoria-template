import type { JWTPayload } from "hono/utils/jwt/types";

import { eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysDomain } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/constants";
import { formatDate } from "@/utils";

import type { SysDomainsRouteHandlerType } from "./sys-domains.index";

export const list: SysDomainsRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  const query = db
    .select()
    .from(sysDomain)
    .$dynamic();

  // 搜索条件
  if (params.search) {
    const searchCondition = or(
      ilike(sysDomain.code, `%${params.search}%`),
      ilike(sysDomain.name, `%${params.search}%`),
      sysDomain.description ? ilike(sysDomain.description, `%${params.search}%`) : undefined,
    );
    if (searchCondition) {
      query.where(searchCondition);
    }
  }

  const domains = await query;
  return c.json(domains, HttpStatusCodes.OK);
};

export const create: SysDomainsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const operatorId = payload.sub as string;

  try {
    const [domain] = await db
      .insert(sysDomain)
      .values({
        ...body,
        createdBy: operatorId,
      })
      .returning();

    return c.json(domain, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(
        getDuplicateKeyError("code", "域代码已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }
    throw error;
  }
};

export const get: SysDomainsRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [domain] = await db
    .select()
    .from(sysDomain)
    .where(eq(sysDomain.id, id));

  if (!domain) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(domain, HttpStatusCodes.OK);
};

export const update: SysDomainsRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const operatorId = payload.sub as string;

  const [updated] = await db
    .update(sysDomain)
    .set({
      ...body,
      updatedBy: operatorId,
      updatedAt: formatDate(new Date()),
    })
    .where(eq(sysDomain.id, id))
    .returning();

  if (!updated) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: SysDomainsRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(sysDomain)
    .where(eq(sysDomain.id, id))
    .returning({ id: sysDomain.id });

  if (!deleted) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

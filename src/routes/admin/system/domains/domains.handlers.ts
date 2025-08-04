import type { InferSelectModel } from "drizzle-orm";

import { eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemDomain } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import { formatDate } from "@/utils";

import type { SystemDomainsRouteHandlerType } from "./domains.index";

export const list: SystemDomainsRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(systemDomain.code, `%${params.search}%`),
      ilike(systemDomain.name, `%${params.search}%`),
      systemDomain.description ? ilike(systemDomain.description, `%${params.search}%`) : undefined,
    );
  }

  const result = await pagination<InferSelectModel<typeof systemDomain>>(
    systemDomain,
    searchCondition,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const create: SystemDomainsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId");

  try {
    const [domain] = await db
      .insert(systemDomain)
      .values({
        ...body,
        createdBy: userId,
      })
      .returning();

    return c.json(domain, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    const isHandlerExists = error.code === "23505"
      || error.cause?.code === "23505"
      || error.original?.code === "23505"
      || error.message?.includes("duplicate key")
      || error.message?.includes("unique constraint")
      || error.message?.includes("violates unique constraint");

    // PostgreSQL 唯一约束错误代码 23505 或包含相关错误文本
    if (isHandlerExists) {
      return c.json(getDuplicateKeyError("code", "域代码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SystemDomainsRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [domain] = await db
    .select()
    .from(systemDomain)
    .where(eq(systemDomain.id, id));

  if (!domain) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(domain, HttpStatusCodes.OK);
};

export const update: SystemDomainsRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const userId = c.get("userId");

  const [updated] = await db
    .update(systemDomain)
    .set({
      ...body,
      updatedBy: userId,
      updatedAt: formatDate(new Date()),
    })
    .where(eq(systemDomain.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: SystemDomainsRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemDomain)
    .where(eq(systemDomain.id, id))
    .returning({ id: systemDomain.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

import { and, desc, eq, ilike } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { apiKey } from "@/db/schema";
import { pagination } from "@/lib/pagination";
import { clearApiKeyCache } from "@/middlewares/api-key-auth";

import type { ApiKeysRouteHandlerType } from "./api-keys.index";

export const list: ApiKeysRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  const conditions = [];
  if (params.name) {
    conditions.push(ilike(apiKey.name, `%${params.name}%`));
  }
  if (params.enabled !== undefined) {
    conditions.push(eq(apiKey.enabled, params.enabled));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await pagination(
    apiKey,
    whereClause,
    { page: params.page, limit: params.limit, orderBy: [desc(apiKey.createdAt)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const create: ApiKeysRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  // 生成 API Key
  const keyValue = createHash("sha256")
    .update(randomBytes(32).toString("hex") + Date.now().toString())
    .digest("hex")
    .substring(0, 32);

  const payload = c.get("jwtPayload");

  const [created] = await db
    .insert(apiKey)
    .values({
      ...body,
      key: keyValue,
      createdBy: payload.sub as string,
    })
    .returning();

  return c.json(created, HttpStatusCodes.CREATED);
};

export const getById: ApiKeysRouteHandlerType<"getById"> = async (c) => {
  const { id } = c.req.valid("param");

  const [found] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.id, id))
    .limit(1);

  if (!found) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(found, HttpStatusCodes.OK);
};

export const deleteById: ApiKeysRouteHandlerType<"deleteById"> = async (c) => {
  const { id } = c.req.valid("param");

  const [found] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.id, id))
    .limit(1);

  if (!found) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // 清理缓存
  await clearApiKeyCache(found.key);

  await db.delete(apiKey).where(eq(apiKey.id, id));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const toggleStatus: ApiKeysRouteHandlerType<"toggleStatus"> = async (c) => {
  const { id } = c.req.valid("param");

  const [found] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.id, id))
    .limit(1);

  if (!found) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(apiKey)
    .set({ enabled: !found.enabled })
    .where(eq(apiKey.id, id))
    .returning();

  // 清理缓存
  await clearApiKeyCache(found.key);

  return c.json(updated, HttpStatusCodes.OK);
};

import type { JWTPayload } from "hono/utils/jwt/types";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysAccessKey } from "@/db/schema";

import type { SysAccessKeysRouteHandlerType } from "./sys-access-keys.index";

export const list: SysAccessKeysRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  const query = db
    .select()
    .from(sysAccessKey)
    .where(eq(sysAccessKey.domain, domain))
    .$dynamic();

  // 搜索条件
  if (params.search) {
    const searchCondition = or(
      ilike(sysAccessKey.accessKeyId, `%${params.search}%`),
      sysAccessKey.description ? ilike(sysAccessKey.description, `%${params.search}%`) : undefined,
    );
    if (searchCondition) {
      query.where(searchCondition);
    }
  }

  // 添加排序
  query.orderBy(desc(sysAccessKey.createdAt));

  const accessKeys = await query;

  return c.json(accessKeys, HttpStatusCodes.OK);
};

export const create: SysAccessKeysRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";
  const operatorId = payload.sub as string;

  // 生成访问密钥
  const generateRandomString = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const accessKeyId = `ak_${generateRandomString(32)}`;
  const accessKeySecret = `sk_${generateRandomString(64)}`;

  const [accessKey] = await db
    .insert(sysAccessKey)
    .values({
      domain,
      accessKeyId,
      accessKeySecret,
      description: body.description,
      status: body.status || "ENABLED",
      createdBy: operatorId,
    })
    .returning();

  return c.json(accessKey, HttpStatusCodes.CREATED);
};

export const remove: SysAccessKeysRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  const [deleted] = await db
    .delete(sysAccessKey)
    .where(and(
      eq(sysAccessKey.id, id),
      eq(sysAccessKey.domain, domain),
    ))
    .returning({ id: sysAccessKey.id });

  if (!deleted) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

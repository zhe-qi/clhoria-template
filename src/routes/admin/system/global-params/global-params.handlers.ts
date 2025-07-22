import type { JWTPayload } from "hono/utils/jwt/types";

import { and, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { globalParams } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/constants";
import { getGlobalParamKey, getGlobalParamsAllKey } from "@/lib/enums/cache";
import { pagination } from "@/lib/pagination";
import { redisClient } from "@/lib/redis";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

const DEFAULT_DOMAIN = "default";
const CACHE_TTL = 3600;

async function getCachedParam(key: string, domain: string) {
  try {
    const cached = await redisClient.get(getGlobalParamKey(key, domain));
    return cached ? JSON.parse(cached) : null;
  }
  catch (error) {
    console.error("Redis 缓存读取失败:", error);
    return null;
  }
}

async function setCachedParam(key: string, domain: string, data: any) {
  try {
    await redisClient.setex(
      getGlobalParamKey(key, domain),
      CACHE_TTL,
      JSON.stringify(data),
    );
  }
  catch (error) {
    console.error("Redis 缓存写入失败:", error);
  }
}

async function deleteCachedParam(key: string, domain: string) {
  try {
    await redisClient.del(getGlobalParamKey(key, domain));
    await redisClient.del(getGlobalParamsAllKey(domain));
  }
  catch (error) {
    console.error("Redis 缓存删除失败:", error);
  }
}

async function clearDomainCache(domain: string) {
  try {
    const pattern = getGlobalParamKey("*", domain);
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.del(getGlobalParamsAllKey(domain));
  }
  catch (error) {
    console.error("清除域缓存失败:", error);
  }
}

export const list: GlobalParamsRouteHandlerType<"list"> = async (c) => {
  const {
    domain = DEFAULT_DOMAIN,
    search,
    isPublic,
    page = 1,
    limit = 20,
  } = c.req.valid("query");

  try {
    let whereCondition = and(
      eq(globalParams.domain, domain),
      eq(globalParams.status, 1),
    );

    if (search) {
      whereCondition = and(
        whereCondition,
        or(
          ilike(globalParams.key, `%${search}%`),
          ilike(globalParams.description, `%${search}%`),
        ),
      );
    }

    if (isPublic !== undefined) {
      whereCondition = and(
        whereCondition,
        eq(globalParams.isPublic, Number(isPublic)),
      );
    }

    const result = await pagination(
      globalParams,
      whereCondition,
      { page: Number(page), limit: Number(limit) },
    );

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取全局参数列表失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const get: GlobalParamsRouteHandlerType<"get"> = async (c) => {
  const { key } = c.req.valid("param");
  const { domain = DEFAULT_DOMAIN } = c.req.valid("query");

  try {
    const cached = await getCachedParam(key, domain);
    if (cached) {
      return c.json(cached, HttpStatusCodes.OK);
    }

    const [param] = await db
      .select()
      .from(globalParams)
      .where(and(
        eq(globalParams.key, key),
        eq(globalParams.domain, domain),
        eq(globalParams.status, 1),
      ));

    if (!param) {
      return c.json(
        { message: "参数不存在" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    await setCachedParam(key, domain, param);

    return c.json(param, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("获取全局参数失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const create: GlobalParamsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { domain = DEFAULT_DOMAIN } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.sub as string;

  try {
    const [created] = await db
      .insert(globalParams)
      .values({
        ...body,
        domain,
        createdBy: userId,
      })
      .returning();

    await setCachedParam(created.key, domain, created);
    await clearDomainCache(domain);

    return c.json(created, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.code === "23505") {
      return c.json(
        getDuplicateKeyError("key", "参数键已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }
    console.error("创建全局参数失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const update: GlobalParamsRouteHandlerType<"update"> = async (c) => {
  const { key } = c.req.valid("param");
  const body = c.req.valid("json");
  const { domain = DEFAULT_DOMAIN } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.sub as string;

  try {
    const [updated] = await db
      .update(globalParams)
      .set({
        ...body,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(globalParams.key, key),
        eq(globalParams.domain, domain),
      ))
      .returning();

    if (!updated) {
      return c.json(
        { message: HttpStatusPhrases.NOT_FOUND },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    await setCachedParam(key, domain, updated);
    await clearDomainCache(domain);

    return c.json(updated, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("更新全局参数失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const remove: GlobalParamsRouteHandlerType<"remove"> = async (c) => {
  const { key } = c.req.valid("param");
  const { domain = DEFAULT_DOMAIN } = c.req.valid("query");

  try {
    const [deleted] = await db
      .delete(globalParams)
      .where(and(
        eq(globalParams.key, key),
        eq(globalParams.domain, domain),
      ))
      .returning({ key: globalParams.key });

    if (!deleted) {
      return c.json(
        { message: HttpStatusPhrases.NOT_FOUND },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    await deleteCachedParam(key, domain);

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  }
  catch (error) {
    console.error("删除全局参数失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const batch: GlobalParamsRouteHandlerType<"batch"> = async (c) => {
  const { keys } = c.req.valid("json");
  const { domain = DEFAULT_DOMAIN, publicOnly = "false" } = c.req.valid("query");

  try {
    const result: Record<string, any> = {};

    const cacheKeys = keys.map(key => getGlobalParamKey(key, domain));
    const cached = await redisClient.mget(...cacheKeys);

    const missingKeys: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cachedValue = cached[i];

      if (cachedValue) {
        result[key] = JSON.parse(cachedValue);
      }
      else {
        missingKeys.push(key);
        result[key] = null;
      }
    }

    if (missingKeys.length > 0) {
      let whereCondition = and(
        eq(globalParams.domain, domain),
        eq(globalParams.status, 1),
      );

      if (publicOnly === "true") {
        whereCondition = and(whereCondition, eq(globalParams.isPublic, 1));
      }

      const dbParams = await db
        .select()
        .from(globalParams)
        .where(whereCondition);

      for (const param of dbParams) {
        if (missingKeys.includes(param.key)) {
          result[param.key] = param;
          await setCachedParam(param.key, domain, param);
        }
      }
    }

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("批量获取全局参数失败:", error);
    return c.json(
      { message: "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

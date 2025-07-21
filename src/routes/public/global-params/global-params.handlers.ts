import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { globalParams } from "@/db/schema";
import { getGlobalParamKey, getGlobalParamsAllKey } from "@/lib/enums/cache";
import { redisClient } from "@/lib/redis";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

const DEFAULT_DOMAIN = "default";
const CACHE_TTL = 3600; // 1小时

/**
 * 从 Redis 缓存中获取全局参数
 */
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

/**
 * 设置全局参数到 Redis 缓存
 */
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

/**
 * 删除缓存中的参数
 */
async function deleteCachedParam(key: string, domain: string) {
  try {
    await redisClient.del(getGlobalParamKey(key, domain));
    // 同时清除所有参数的缓存
    await redisClient.del(getGlobalParamsAllKey(domain));
  }
  catch (error) {
    console.error("Redis 缓存删除失败:", error);
  }
}

/**
 * 清除域的所有参数缓存
 */
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
  const { domain = DEFAULT_DOMAIN, publicOnly = "true" } = c.req.valid("query");

  try {
    // 尝试从缓存获取
    if (publicOnly === "true") {
      const cacheKey = getGlobalParamsAllKey(domain);
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return c.json(JSON.parse(cached), HttpStatusCodes.OK);
      }
    }

    // 构建查询条件
    let whereCondition = eq(globalParams.domain, domain);

    if (publicOnly === "true") {
      whereCondition = and(whereCondition, eq(globalParams.isPublic, 1))!;
    }

    const result = await db
      .select()
      .from(globalParams)
      .where(and(whereCondition, eq(globalParams.status, 1)));

    // 如果是公开参数，缓存结果
    if (publicOnly === "true") {
      await redisClient.setex(
        getGlobalParamsAllKey(domain),
        CACHE_TTL,
        JSON.stringify(result),
      );
    }

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
    // 尝试从缓存获取
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
        eq(globalParams.isPublic, 1), // 只允许访问公开参数
      ));

    if (!param) {
      return c.json(
        { message: "参数不存在或不是公开参数" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // 缓存结果
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

  try {
    const [created] = await db
      .insert(globalParams)
      .values({
        ...body,
        domain,
        createdBy: "system", // public 路由没有用户信息
      })
      .returning();

    // 更新缓存
    await setCachedParam(created.key, domain, created);
    await clearDomainCache(domain); // 清除列表缓存

    return c.json(created, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.code === "23505") { // PostgreSQL unique constraint violation
      return c.json(
        { message: "参数键已存在" },
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

  try {
    const [updated] = await db
      .update(globalParams)
      .set({
        ...body,
        updatedBy: "system",
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

    // 更新缓存
    await setCachedParam(key, domain, updated);
    await clearDomainCache(domain); // 清除列表缓存

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

    // 删除缓存
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
  const { domain = DEFAULT_DOMAIN, publicOnly = "true" } = c.req.valid("query");

  try {
    const result: Record<string, any> = {};

    // 尝试从缓存批量获取
    const cacheKeys = keys.map(key => getGlobalParamKey(key, domain));
    const cached = await redisClient.mget(...cacheKeys);

    const missingKeys: string[] = [];

    // 处理缓存结果
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

    // 从数据库获取未缓存的参数
    if (missingKeys.length > 0) {
      let whereCondition = and(
        eq(globalParams.domain, domain),
        eq(globalParams.status, 1),
      );

      if (publicOnly === "true") {
        whereCondition = and(whereCondition, eq(globalParams.isPublic, 1))!;
      }

      const dbParams = await db
        .select()
        .from(globalParams)
        .where(whereCondition);

      // 更新结果和缓存
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

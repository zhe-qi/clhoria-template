import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

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

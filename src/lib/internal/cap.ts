import Cap from "@cap.js/server";
// 导入date-fns核心函数
import { differenceInSeconds, isValid } from "date-fns";

import redisClient from "../redis";
import { createSingleton } from "./singleton";

/** 生成带前缀的Redis Key */
function getRedisKey(type: "challenge" | "token", id: string): string {
  return `cap:${type}:${id}`; // 统一前缀格式：cap:类型:唯一标识
}

/** 计算TTL秒数（基于date-fns，增强鲁棒性） */
function calculateTtlSeconds(expires: number | Date): number {
  // 校验expires是否为合法日期（避免无效时间导致的异常）
  const expiresDate = typeof expires === "number" ? new Date(expires) : expires;
  if (!isValid(expiresDate))
    return 0;

  // 计算当前时间与过期时间的秒数差（语义化清晰）
  const ttl = differenceInSeconds(expiresDate, new Date());
  // 确保TTL不小于0（过期数据直接返回0，不存入Redis）
  return Math.max(ttl, 0);
}

const cap = createSingleton("cap", () => new Cap({
  storage: {
    challenges: {
      store: async (token, challengeData) => {
        // 复用工具函数生成Key和计算TTL
        const key = getRedisKey("challenge", token);
        const ttlSeconds = calculateTtlSeconds(challengeData.expires);

        if (ttlSeconds > 0) {
          await redisClient.setex(key, ttlSeconds, JSON.stringify(challengeData));
        }
      },

      read: async (token) => {
        const key = getRedisKey("challenge", token);
        const data = await redisClient.get(key);

        if (!data)
          return null;

        const challengeData = JSON.parse(data);
        // 此处可额外用isValid校验challengeData.expires，增强鲁棒性
        if (!isValid(new Date(challengeData.expires)))
          return null;

        return {
          challenge: challengeData,
          expires: challengeData.expires,
        };
      },

      delete: async (token) => {
        const key = getRedisKey("challenge", token);
        await redisClient.del(key);
      },

      deleteExpired: async () => {
        // Redis自动过期，无需手动清理
      },
    },

    tokens: {
      store: async (tokenKey, expires) => {
        // 复用工具函数，逻辑与challenges.store统一
        const key = getRedisKey("token", tokenKey);
        const ttlSeconds = calculateTtlSeconds(expires);

        if (ttlSeconds > 0) {
          // 存入过期时间的字符串形式（保持原逻辑）
          await redisClient.setex(key, ttlSeconds, expires.toString());
        }
      },

      get: async (tokenKey) => {
        const key = getRedisKey("token", tokenKey);
        const expiresStr = await redisClient.get(key);

        if (!expiresStr)
          return null;

        const expires = Number.parseInt(expiresStr, 10);
        // 校验解析后的过期时间是否合法（避免无效数值）
        return isValid(new Date(expires)) ? expires : null;
      },

      delete: async (tokenKey) => {
        const key = getRedisKey("token", tokenKey);
        await redisClient.del(key);
      },

      deleteExpired: async () => {
        // Redis自动过期，无需手动清理
      },
    },
  },
}));

export default cap;

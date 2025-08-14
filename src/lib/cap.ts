import Cap from "@cap.js/server";

import { redisClient } from "@/lib/redis";

/**
 * Cap.js 验证码服务实例
 * 使用Redis缓存存储挑战和token数据，支持自动过期清理
 */
export const cap = new Cap({
  storage: {
    challenges: {
      store: async (token, challengeData) => {
        const key = `cap:challenge:${token}`;
        const ttlSeconds = Math.ceil((challengeData.expires - Date.now()) / 1000);
        if (ttlSeconds > 0) {
          await redisClient.setex(key, ttlSeconds, JSON.stringify(challengeData));
        }
      },
      read: async (token) => {
        const key = `cap:challenge:${token}`;
        const data = await redisClient.get(key);
        if (!data) {
          return null;
        }
        const challengeData = JSON.parse(data);
        return {
          challenge: challengeData,
          expires: challengeData.expires,
        };
      },
      delete: async (token) => {
        const key = `cap:challenge:${token}`;
        await redisClient.del(key);
      },
      listExpired: async () => {
        // Redis自动过期处理，无需手动清理过期数据
        return [];
      },
    },
    tokens: {
      store: async (tokenKey, expires) => {
        const key = `cap:token:${tokenKey}`;
        const ttlSeconds = Math.ceil((expires - Date.now()) / 1000);
        if (ttlSeconds > 0) {
          await redisClient.setex(key, ttlSeconds, expires.toString());
        }
      },
      get: async (tokenKey) => {
        const key = `cap:token:${tokenKey}`;
        const expiresStr = await redisClient.get(key);
        return expiresStr ? Number.parseInt(expiresStr, 10) : null;
      },
      delete: async (tokenKey) => {
        const key = `cap:token:${tokenKey}`;
        await redisClient.del(key);
      },
      listExpired: async () => {
        // Redis自动过期处理，无需手动清理过期数据
        return [];
      },
    },
  },
});

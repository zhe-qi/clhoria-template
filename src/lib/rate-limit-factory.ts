import type { Context } from "hono";
import type { Store } from "hono-rate-limiter";
import type { RedisReply } from "rate-limit-redis";

import { rateLimiter } from "hono-rate-limiter";
import { RedisStore } from "rate-limit-redis";
import { z } from "zod";

import type { AppBindings } from "@/types/lib";

import env from "@/env";
import redisClient from "@/lib/redis";

/**
 * Redis 存储实例 (全局单例)
 */
const ioredisStore = new RedisStore({
  sendCommand: (...args) => {
    const [command, ...commandArgs] = args;
    return redisClient.call(command, ...commandArgs) as Promise<RedisReply>;
  },
}) as unknown as Store<AppBindings>;

/**
 * IP地址验证器 (Zod v4 - 支持 IPv4 和 IPv6)
 */
const ipv4Schema = z.ipv4();
const ipv6Schema = z.ipv6();

/**
 * 验证并返回有效的IP地址
 * @param ip 待验证的IP字符串
 * @returns 验证通过返回IP,失败返回null
 */
function validateIp(ip: string): string | null {
  // 先尝试 IPv4
  const ipv4Result = ipv4Schema.safeParse(ip);
  if (ipv4Result.success)
    return ipv4Result.data;

  // 再尝试 IPv6
  const ipv6Result = ipv6Schema.safeParse(ip);
  if (ipv6Result.success)
    return ipv6Result.data;

  return null;
}

/**
 * 获取客户端真实标识
 * 根据环境变量 TRUST_PROXY 决定是否信任代理头部
 */
function getClientIdentifier(c: Context<AppBindings>) {
  // 如果信任反向代理,按优先级读取代理头部
  if (env.TRUST_PROXY) {
    // 1. X-Forwarded-For (标准代理头,取第一个IP - 最接近客户端)
    const forwardedFor = c.req.header("X-Forwarded-For");
    if (forwardedFor) {
      const clientIp = forwardedFor.split(",")[0].trim();
      const validatedIp = validateIp(clientIp);
      if (validatedIp)
        return validatedIp;
    }

    // 2. X-Real-IP (Nginx 等常用)
    const realIp = c.req.header("X-Real-IP");
    if (realIp) {
      const validatedIp = validateIp(realIp);
      if (validatedIp)
        return validatedIp;
    }
  }

  // 不信任代理或无代理头,使用未知标识
  return "unknown";
}

/**
 * 速率限制配置选项
 */
export interface RateLimitOptions {
  /** 时间窗口(毫秒) */
  windowMs: number;
  /** 最大请求数 */
  limit: number;
  /** 自定义key生成器 (可选,默认使用IP) */
  keyGenerator?: (c: Context<AppBindings>) => string;
  /** 是否跳过成功的请求计数 (默认false) */
  skipSuccessfulRequests?: boolean;
  /** 是否跳过失败的请求计数 (默认false) */
  skipFailedRequests?: boolean;
}

/**
 * 创建速率限制中间件
 * @param options 速率限制配置
 * @returns Hono 中间件
 */
export function createRateLimiter(options: RateLimitOptions) {
  return rateLimiter({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-6", // 返回 RateLimit-* 响应头
    keyGenerator: options.keyGenerator ?? getClientIdentifier,
    store: ioredisStore,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
  });
}

/** 默认全局速率限制配置 (每15分钟300次) */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 300,
};

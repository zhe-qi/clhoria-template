import type { Context } from "hono";
import type { Store } from "hono-rate-limiter";
import type { ConnInfo } from "hono/conninfo";
import type { RedisReply } from "rate-limit-redis";

import type { AppBindings } from "@/types/lib";
import { rateLimiter } from "hono-rate-limiter";
import { RedisStore } from "rate-limit-redis";

import { z } from "zod";

import env from "@/env";
import redisClient from "@/lib/services/redis";

import { createSingleton } from "./singleton";

/**
 * 运行时检测：判断是否为 Bun 环境
 */
const isBun = "Bun" in globalThis;

/**
 * 动态加载对应运行时的 getConnInfo
 * - Bun: hono/bun
 * - Node.js: @hono/node-server/conninfo
 */
const getConnInfo = await (async () => {
  if (isBun) {
    return (await import("hono/bun")).getConnInfo;
  }
  return (await import("@hono/node-server/conninfo")).getConnInfo;
})() as (c: Context) => ConnInfo;

const ioredisStore = createSingleton(
  "rate-limit-store",
  () => new RedisStore({
    sendCommand: (...args) => {
      const [command, ...commandArgs] = args;
      return redisClient.call(command, ...commandArgs) as Promise<RedisReply>;
    },
  }) as unknown as Store<AppBindings>,
);

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

function normalizeIp(ip: string) {
  // Node 经常给出 IPv4-mapped IPv6
  if (ip.startsWith("::ffff:"))
    return ip.slice(7);
  return ip;
}

/**
 * 通过 Hono ConnInfo Helper 获取 Socket IP
 * 兼容 Node.js 和 Bun 运行时
 */
function getSocketIp(c: Context<AppBindings>) {
  const info = getConnInfo(c);
  const ip = info.remote.address;
  return ip ? normalizeIp(ip) : null;
}

const TRUSTED_PROXY_IPS = (env.TRUSTED_PROXY_IPS)
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4)
    return false;

  const nums = parts.map(n => Number(n));
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255))
    return false;

  const [a, b] = nums;

  // RFC1918 + loopback
  if (a === 10)
    return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31)
    return true;
  if (a === 192 && b === 168)
    return true;
  if (a === 127)
    return true;

  return false;
}

function isPrivateIpv6(ip: string) {
  const lower = ip.toLowerCase();
  // loopback
  if (lower === "::1")
    return true;

  // Unique local addresses: fc00::/7
  if (lower.startsWith("fc") || lower.startsWith("fd"))
    return true;

  // Link-local: fe80::/10
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb"))
    return true;

  return false;
}

function isPrivateIp(ip: string) {
  // 注意：normalizeIp 已把 ::ffff:x.x.x.x 转成 IPv4
  return ip.includes(".") ? isPrivateIpv4(ip) : isPrivateIpv6(ip);
}

function isTrustedProxy(ip: string | null) {
  if (!ip)
    return false;

  // 显式配置优先：只有在白名单内才信任
  if (TRUSTED_PROXY_IPS.length > 0)
    return TRUSTED_PROXY_IPS.includes(ip);

  // 默认行为（省心但尽量安全）：
  // 未配置时，仅在请求来源是内网/本机地址时才信任代理头（覆盖大多数 Nginx/SLB 场景）
  return isPrivateIp(ip);
}

/**
 * 获取客户端真实标识
 */
function wrapIpv6(ip: string) {
  return ip.includes(":") ? `v6-${ip.replaceAll(":", "-")}` : ip;
}

function getClientIdentifier(c: Context<AppBindings>) {
  const remoteRaw = getSocketIp(c);
  const remote = remoteRaw ? validateIp(remoteRaw) : null;

  // 只有来自可信代理（SLB、Nginx等）才读取头部
  if (remote && isTrustedProxy(remote)) {
    // 1) SLB 会覆盖 X-Real-IP：优先用它（防伪造关键点：只在 trusted proxy 下读取）
    const real = c.req.header("X-Real-IP");
    const realIp = real ? validateIp(normalizeIp(real.trim())) : null;
    if (realIp)
      return wrapIpv6(realIp);

    // 2) 可选：再兜底 XFF（不建议取第一个；除非你能保证链路已被 SLB 清洗）
    const xff = c.req.header("X-Forwarded-For");
    if (xff) {
      const parts = xff.split(",").map(s => normalizeIp(s.trim()));
      // 多层代理时，最右侧一般是“离你最近的代理”；但如果你没维护完整可信代理列表，这里很难绝对正确
      // 最保守做法：只在你确认 SLB 已清洗/重写 XFF 的情况下，才用 parts[0]
      const ip = validateIp(parts[0] ?? "");
      if (ip)
        return wrapIpv6(ip);
    }
  }

  // 非可信来源：忽略头部，直接用 socket remoteAddress（至少不可由 Header 伪造）
  if (remote)
    return wrapIpv6(remote);

  // 如果以上都失败，则返回 0.0.0.0，生产环境中基本走不到这里
  return "0.0.0.0";
}

/**
 * 速率限制配置选项
 */
export type RateLimitOptions = {
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
};

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

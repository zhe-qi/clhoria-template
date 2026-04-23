import type { Context } from "hono";
import type { Store } from "hono-rate-limiter";
import type { ConnInfo } from "hono/conninfo";
import type { RedisReply } from "rate-limit-redis";

import type { BaseBindings } from "@/types/lib";
import { rateLimiter } from "hono-rate-limiter";
import { RedisStore } from "rate-limit-redis";

import { z } from "zod";

import env from "@/env";
import redisClient from "@/lib/services/redis";

/**
 * Runtime detection: check if running in Bun environment
 * 运行时检测：判断是否为 Bun 环境
 */
const isBun = "Bun" in globalThis;

/**
 * Dynamically load getConnInfo for the corresponding runtime
 * - Bun: hono/bun
 * - Node.js: @hono/node-server/conninfo
 * 动态加载对应运行时的 getConnInfo
 */
const getConnInfo = await (async () => {
  if (isBun) {
    return (await import("hono/bun")).getConnInfo;
  }
  return (await import("@hono/node-server/conninfo")).getConnInfo;
})() as (c: Context) => ConnInfo;

function buildRedisStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (...args) => {
      const [command, ...commandArgs] = args;
      return redisClient.call(command, ...commandArgs) as Promise<RedisReply>;
    },
  }) as unknown as Store<BaseBindings>;
}

/**
 * IP address validator (Zod v4 - supports IPv4 and IPv6)
 * IP地址验证器 (Zod v4 - 支持 IPv4 和 IPv6)
 */
const ipv4Schema = z.ipv4();
const ipv6Schema = z.ipv6();

/**
 * Validate and return a valid IP address
 * @param ip The IP string to validate / 待验证的IP字符串
 * @returns Returns IP if valid, null if invalid / 验证通过返回IP,失败返回null
 *
 * 验证并返回有效的IP地址
 */
function validateIp(ip: string): string | null {
  // Try IPv4 first / 先尝试 IPv4
  const ipv4Result = ipv4Schema.safeParse(ip);
  if (ipv4Result.success)
    return ipv4Result.data;

  // Then try IPv6 / 再尝试 IPv6
  const ipv6Result = ipv6Schema.safeParse(ip);
  if (ipv6Result.success)
    return ipv6Result.data;

  return null;
}

function normalizeIp(ip: string) {
  // Node often provides IPv4-mapped IPv6 / Node 经常给出 IPv4-mapped IPv6
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

/**
 * Get Socket IP via Hono ConnInfo Helper
 * Compatible with Node.js and Bun runtimes
 * 通过 Hono ConnInfo Helper 获取 Socket IP
 * 兼容 Node.js 和 Bun 运行时
 */
function getSocketIp(c: Context<BaseBindings>): string | null {
  try {
    const info = getConnInfo(c);
    const ip = info.remote.address;
    return ip ? normalizeIp(ip) : null;
  }
  catch {
    // 测试环境无 socket（vitest fetch），返回 null 由上层兜底
    return null;
  }
}

const TRUSTED_PROXY_IPS = env.TRUSTED_PROXY_IPS.split(",")
  .map(s => s.trim())
  .filter(Boolean);

// 特殊模式：
// - "none"    → 不信任任何代理（直接暴露端口的部署）
// - "private" → 信任所有私有/回环 IP（1Panel/K8s/Docker 容器网络、Aliyun SLB 等反代场景）
// - 其他       → 仅信任精确匹配的 IP 白名单
const TRUST_MODE: "none" | "private" | "list" = (() => {
  if (TRUSTED_PROXY_IPS.length === 1 && TRUSTED_PROXY_IPS[0] === "none") return "none";
  if (TRUSTED_PROXY_IPS.length === 1 && TRUSTED_PROXY_IPS[0] === "private") return "private";
  return "list";
})();

if (env.NODE_ENV === "production" && TRUSTED_PROXY_IPS.length === 0) {
  throw new Error(
    "[Security] 生产环境必须配置 TRUSTED_PROXY_IPS。可选值："
    + "(1) 逗号分隔的可信反代 IP 列表；"
    + "(2) \"private\" 信任所有私有 IP（容器/K8s/SLB 反代场景推荐）；"
    + "(3) \"none\" 直接暴露端口无反代。",
  );
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  const nums = parts.map(n => Number(n));
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;

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
  // Note: normalizeIp already converts ::ffff:x.x.x.x to IPv4 / 注意：normalizeIp 已把 ::ffff:x.x.x.x 转成 IPv4
  return ip.includes(".") ? isPrivateIpv4(ip) : isPrivateIpv6(ip);
}

function isTrustedProxy(ip: string | null) {
  if (!ip)
    return false;

  if (TRUST_MODE === "none")
    return false;

  if (TRUST_MODE === "private")
    return isPrivateIp(ip);

  if (TRUST_MODE === "list")
    return TRUSTED_PROXY_IPS.includes(ip);

  // dev/test 未配置时：内网/本机地址默认信任，方便本地反代/容器调试
  return isPrivateIp(ip);
}

/**
 * Get client real identifier
 * 获取客户端真实标识
 */
function wrapIpv6(ip: string) {
  return ip.includes(":") ? `v6-${ip.replaceAll(":", "-")}` : ip;
}

function getClientIdentifier(c: Context<BaseBindings>) {
  const remoteRaw = getSocketIp(c);
  const remote = remoteRaw ? validateIp(remoteRaw) : null;

  // Only read headers from trusted proxies (SLB, Nginx, etc.) / 只有来自可信代理（SLB、Nginx等）才读取头部
  if (remote && isTrustedProxy(remote)) {
    // 1) SLB overwrites X-Real-IP: prefer it (anti-forgery key: only read under trusted proxy)
    // SLB 会覆盖 X-Real-IP：优先用它（防伪造关键点：只在 trusted proxy 下读取）
    const real = c.req.header("X-Real-IP");
    const realIp = real ? validateIp(normalizeIp(real.trim())) : null;
    if (realIp)
      return wrapIpv6(realIp);

    // 2) Optional: fallback to XFF (not recommended to use first entry unless SLB has sanitized the chain)
    // 可选：再兜底 XFF（不建议取第一个；除非你能保证链路已被 SLB 清洗）
    const xff = c.req.header("X-Forwarded-For");
    if (xff) {
      const parts = xff.split(",").map(s => normalizeIp(s.trim()));
      // With multiple proxies, rightmost is usually "closest proxy"; but without a full trusted proxy list, this is hard to get absolutely right
      // Most conservative approach: only use parts[0] when you confirm SLB has sanitized/rewritten XFF
      // 多层代理时，最右侧一般是"离你最近的代理"；但如果你没维护完整可信代理列表，这里很难绝对正确
      // 最保守做法：只在你确认 SLB 已清洗/重写 XFF 的情况下，才用 parts[0]
      const ip = validateIp(parts[0] ?? "");
      if (ip)
        return wrapIpv6(ip);
    }
  }

  // Untrusted source: ignore headers, use socket remoteAddress directly (at least not forgeable via headers)
  // 非可信来源：忽略头部，直接用 socket remoteAddress（至少不可由 Header 伪造）
  if (remote)
    return wrapIpv6(remote);

  // If all above fail, return 0.0.0.0; in production this path is essentially unreachable
  // 如果以上都失败，则返回 0.0.0.0，生产环境中基本走不到这里
  return "0.0.0.0";
}

/**
 * Get the real client IP with trusted proxy validation.
 * Only reads X-Real-IP / X-Forwarded-For when the socket peer is a trusted proxy.
 * 获取客户端真实 IP（带可信代理验证）
 */
export function getClientIp(c: Context): string {
  let remote: string | null = null;
  try {
    const remoteRaw = getSocketIp(c as Context<BaseBindings>);
    remote = remoteRaw ? validateIp(remoteRaw) : null;
  }
  catch {
    // getConnInfo unavailable (e.g. test environment) — fall through to header check
  }

  if (remote && isTrustedProxy(remote)) {
    const real = c.req.header("X-Real-IP");
    const realIp = real ? validateIp(normalizeIp(real.trim())) : null;
    if (realIp) return realIp;

    const xff = c.req.header("X-Forwarded-For");
    if (xff) {
      const ip = validateIp(normalizeIp(xff.split(",")[0]?.trim() ?? ""));
      if (ip) return ip;
    }
  }

  return remote ?? "unknown";
}

/**
 * Rate limit configuration options
 * 速率限制配置选项
 */
export type RateLimitOptions = {
  /** Time window (milliseconds) / 时间窗口(毫秒) */
  windowMs: number;
  /** Maximum requests / 最大请求数 */
  limit: number;
  /** Redis key prefix — 必须为每个独立桶传不同值，否则多层限流会共用 key 互相计数 */
  prefix: string;
  /** Custom key generator (optional, defaults to IP) / 自定义key生成器 (可选,默认使用IP) */
  keyGenerator?: (c: Context<BaseBindings>) => string;
  /** Whether to skip counting successful requests (default false) / 是否跳过成功的请求计数 (默认false) */
  skipSuccessfulRequests?: boolean;
  /** Whether to skip counting failed requests (default false) / 是否跳过失败的请求计数 (默认false) */
  skipFailedRequests?: boolean;
};

/**
 * Create rate limit middleware
 * @param options Rate limit configuration / 速率限制配置
 * @returns Hono middleware / Hono 中间件
 *
 * 创建速率限制中间件
 */
export function createRateLimiter(options: RateLimitOptions) {
  // 非生产环境跳过限流：
  // - test：用例需要快速连发请求，且共享 socket 会导致 IP key 相同迅速触发 429
  // - development：本地联调频繁，避免被限流打断
  if (env.NODE_ENV !== "production") {
    return async (_c: Context<BaseBindings>, next: () => Promise<void>) => next();
  }

  return rateLimiter({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-6", // Return RateLimit-* response headers / 返回 RateLimit-* 响应头
    keyGenerator: options.keyGenerator ?? getClientIdentifier,
    store: buildRedisStore(options.prefix),
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
  });
}

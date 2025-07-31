import type { Context, MiddlewareHandler } from "hono";

import { isSpoofedBot } from "@arcjet/inspect";
import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/node";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppBindings } from "@/types/lib";

import env from "@/env";

// 创建 Arcjet 实例
const aj = arcjet({
  key: env.ARCJET_KEY!,
  rules: [
    // Shield 保护应用免受常见攻击，如 SQL 注入
    shield({ mode: "LIVE" }),
    // 创建机器人检测规则
    detectBot({
      mode: "LIVE", // 阻止请求。使用 "DRY_RUN" 仅记录日志
      // 阻止所有机器人，除了以下类型
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing 等搜索引擎
        // 取消注释以允许其他常见的机器人类别
        // 查看完整列表：https://arcjet.com/bot-list
        // "CATEGORY:MONITOR", // 正常运行时间监控服务
        // "CATEGORY:PREVIEW", // 链接预览，如 Slack, Discord
      ],
    }),
    // 创建令牌桶速率限制，支持其他算法
    tokenBucket({
      mode: "LIVE",
      // 默认按 IP 地址跟踪，但可以自定义
      // 查看：https://docs.arcjet.com/fingerprints
      // characteristics: ["ip.src"],
      refillRate: 5, // 每个间隔补充 5 个令牌
      interval: 10, // 每 10 秒补充一次
      capacity: 10, // 桶容量为 10 个令牌
    }),
  ],
});

/**
 * Arcjet 中间件
 * 提供机器人检测、攻击防护和速率限制功能
 */
export function arcjetMiddleware(): MiddlewareHandler<AppBindings> {
  return async (c: Context<AppBindings>, next) => {
    try {
      // 使用 Arcjet 保护请求，从桶中扣除 1 个令牌
      const decision = await aj.protect(c.env.incoming, { requested: 1 });

      // 如果请求被拒绝
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return c.json({ error: "Too Many Requests", message: "速率限制" }, HttpStatusCodes.TOO_MANY_REQUESTS);
        }
        else if (decision.reason.isBot()) {
          return c.json({ error: "No Bots Allowed", message: "不允许机器人访问" }, HttpStatusCodes.FORBIDDEN);
        }
        else {
          return c.json({ error: "Forbidden", message: "请求被禁止" }, HttpStatusCodes.FORBIDDEN);
        }
      }

      // 来自托管 IP 的请求可能来自机器人，通常可以被阻止
      // 但是，请考虑你的用例 - 如果这是一个 API 端点，
      // 那么托管 IP 可能是合法的
      // https://docs.arcjet.com/blueprints/vpn-proxy-detection
      if (decision.ip.isHosting()) {
        return c.json({ error: "Forbidden", message: "托管 IP 被禁止" }, HttpStatusCodes.FORBIDDEN);
      }

      // 付费 Arcjet 账户包括使用 IP 数据的额外验证检查
      // 验证并不总是可能的，所以我们建议单独检查决策
      // https://docs.arcjet.com/bot-protection/reference#bot-verification
      if (decision.results.some(isSpoofedBot)) {
        return c.json({ error: "Forbidden", message: "检测到虚假机器人" }, HttpStatusCodes.FORBIDDEN);
      }

      await next();
    }
    catch (error) {
      console.error("Arcjet middleware error:", error);
      // 如果 Arcjet 出错，继续执行而不是阻止请求
      await next();
    }
  };
}

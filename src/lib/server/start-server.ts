import type { ServerType } from "@hono/node-server";

import { serve } from "@hono/node-server";

import logger from "@/lib/logger";

/**
 * 等待指定毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 具有 fetch 方法的应用类型（支持 Hono 和 OpenAPIHono）
 */
interface FetchApp {
  fetch: (...args: any[]) => Response | Promise<Response>;
}

/**
 * 启动服务器并处理端口占用重试
 *
 * @param app - Hono 或 OpenAPIHono 应用实例
 * @param port - 端口号
 * @param maxRetries - 最大重试次数（默认 5 次）
 * @param retryDelay - 重试延迟毫秒数（默认 1000ms）
 * @returns 服务器实例
 */
export async function startServerWithRetry(
  app: FetchApp,
  port: number,
  maxRetries = 5,
  retryDelay = 1000,
): Promise<ServerType> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const server = serve({ fetch: app.fetch, port });
      return server;
    }
    catch (error: unknown) {
      const isAddressInUse = error instanceof Error
        && "code" in error
        && error.code === "EADDRINUSE";

      if (isAddressInUse && attempt < maxRetries) {
        logger.warn(
          { attempt, maxRetries, port, retryDelay },
          `[应用]: 端口 ${port} 被占用，等待 ${retryDelay}ms 后重试（第 ${attempt}/${maxRetries} 次）`,
        );
        await sleep(retryDelay);
      }
      else {
        // 最后一次重试失败或非端口占用错误，抛出
        throw error;
      }
    }
  }

  // TypeScript 类型保护，理论上不会到这里
  throw new Error(`[应用]: 启动服务器失败，已重试 ${maxRetries} 次`);
}

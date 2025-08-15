import type { OpenAPIHono } from "@hono/zod-openapi";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";

import type { AppBindings } from "@/types/lib";

import env from "@/env";
import { getScheduler } from "@/jobs/scheduler";
import logger from "@/lib/logger";
import { jwtWithQuery } from "@/middlewares/special/jwt-auth-with-query";

/** Bull Board 配置管理 */
export class BullBoardManager {
  private serverAdapter: HonoAdapter;
  private isInitialized = false;

  constructor() {
    this.serverAdapter = new HonoAdapter(serveStatic);
  }

  /** 初始化 Bull Board */
  initialize(): HonoAdapter {
    if (this.isInitialized) {
      logger.warn("Bull Board 已经初始化");
      return this.serverAdapter;
    }

    try {
      // 获取队列实例
      const scheduler = getScheduler();

      // 检查调度器是否已初始化
      if (!scheduler.isReady) {
        throw new Error("调度器尚未初始化，无法创建 Bull Board");
      }

      const queueManager = scheduler.getQueueManager();
      const queue = queueManager.getQueue();

      // 创建 Bull Board
      createBullBoard({
        queues: [new BullMQAdapter(queue)],
        serverAdapter: this.serverAdapter,
      });

      // 设置基础路径
      const basePath = "/admin/ui/queues";
      this.serverAdapter.setBasePath(basePath);

      this.isInitialized = true;

      return this.serverAdapter;
    }
    catch (error) {
      logger.error({ error }, "Bull Board 初始化失败");
      throw error;
    }
  }

  /** 获取服务器适配器 */
  getServerAdapter(): HonoAdapter {
    if (!this.isInitialized) {
      throw new Error("Bull Board 未初始化，请先调用 initialize()");
    }
    return this.serverAdapter;
  }

  /** 检查是否已初始化 */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 全局实例
let globalBullBoard: BullBoardManager | null = null;

/** 获取全局 Bull Board 实例 */
export function getBullBoard(): BullBoardManager {
  if (!globalBullBoard) {
    globalBullBoard = new BullBoardManager();
  }
  return globalBullBoard;
}

/** 初始化 Bull Board UI */
export function initializeBullBoard(): HonoAdapter {
  const bullBoard = getBullBoard();
  return bullBoard.initialize();
}

/**
 * 设置 Bull Board UI 集成
 */
export function setupBullBoard(app: OpenAPIHono<AppBindings>): void {
  try {
    const bullBoardAdapter = initializeBullBoard();

    // 添加 JWT 认证中间件到队列管理界面
    app.use("/admin/ui/queues", jwtWithQuery(env.ADMIN_JWT_SECRET));
    app.route("/admin/ui/queues", bullBoardAdapter.registerPlugin());
  }
  catch (error) {
    logger.error({ error }, "Bull Board UI 集成失败");
    // 在开发环境中不抛出错误，避免影响服务启动
    if (env.NODE_ENV === "production") {
      throw error;
    }
  }
}

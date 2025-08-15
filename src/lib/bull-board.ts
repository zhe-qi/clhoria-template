import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";

import logger from "@/lib/logger";

import { getScheduler } from "../jobs/scheduler";

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

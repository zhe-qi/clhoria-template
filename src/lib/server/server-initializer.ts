import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppBindings } from "@/types/lib";

import { adminApp } from "@/app";
import { initializeScheduler } from "@/jobs/scheduler";
import { logger } from "@/lib/logger";
import { collectAndSyncEndpointPermissions } from "@/lib/permissions";

import { setupBullBoard } from "./setup-bull-board";

/**
 * 初始化应用核心功能
 */
async function initializeAppCore(): Promise<void> {
  const apps = [
    { name: "admin", app: adminApp, prefix: "/admin" },
  ];

  await collectAndSyncEndpointPermissions(apps);
  await initializeScheduler();
}

/**
 * 生产环境初始化流程
 */
export async function initializeProduction(app: OpenAPIHono<AppBindings>): Promise<void> {
  logger.info("正在初始化生产环境...");

  await initializeAppCore();
  setupBullBoard(app);

  logger.info("生产环境初始化完成");
}

/**
 * 开发环境初始化流程
 */
export function initializeDevelopment(app: OpenAPIHono<AppBindings>): void {
  // 异步执行初始化任务，不阻塞服务启动
  initializeAppCore()
    .then(() => {
      // 确保调度器初始化完成后再初始化 Bull Board
      setupBullBoard(app);

      logger.info("开发环境初始化完成");
    })
    .catch((error) => {
      logger.error({ error }, "开发环境初始化失败");
    });
}

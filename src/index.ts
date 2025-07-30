import { serve } from "@hono/node-server";

import app, { adminApp } from "./app";
import env from "./env";
import { initializeScheduler } from "./jobs/scheduler";
import { initializeBullBoard } from "./lib/bull-board";
import { logger } from "./lib/logger";
import { collectAndSyncEndpointPermissions } from "./lib/permissions";
import { jwtWithQuery } from "./middlewares/special/jwt-auth-with-query";

const port = env.PORT;

/**
 * 设置 Bull Board UI 集成
 */
function setupBullBoard(): void {
  try {
    const bullBoardAdapter = initializeBullBoard();

    // 添加 JWT 认证中间件到队列管理界面
    app.use("/admin/ui/queues", jwtWithQuery(env.ADMIN_JWT_SECRET));
    app.route("/admin/ui/queues", bullBoardAdapter.registerPlugin());

    logger.info("Bull Board UI 已成功集成到管理后台");
  }
  catch (error) {
    logger.error("Bull Board UI 集成失败:", error);
    // 在开发环境中不抛出错误，避免影响服务启动
    if (env.NODE_ENV === "production") {
      throw error;
    }
  }
}

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
async function initializeProduction(): Promise<void> {
  logger.info("正在初始化生产环境...");

  await initializeAppCore();
  setupBullBoard();

  logger.info("生产环境初始化完成");
}

/**
 * 开发环境初始化流程
 */
function initializeDevelopment(): void {
  logger.info("正在初始化开发环境...");

  // 异步执行初始化任务，不阻塞服务启动
  initializeAppCore()
    .then(() => {
      // 确保调度器初始化完成后再初始化 Bull Board
      setupBullBoard();
      logger.info("开发环境初始化完成");
    })
    .catch((error) => {
      logger.error("开发环境初始化失败:", error);
    });
}

/**
 * 打印服务启动消息
 */
async function logServerStart(): Promise<void> {
  const message = ` 🚀 服务启动成功 → (http://localhost:${port}) `;

  if (env.NODE_ENV === "production") {
    logger.info(message);
  }
  else {
    try {
      // 开发环境动态导入 chalk 和 gradient-string
      const { default: chalk } = await import("chalk");
      const { default: gradient } = await import("gradient-string");
      const styledMessage = gradient(["cyan", "magenta"])(chalk.bold(message));
      logger.info(styledMessage);
    }
    catch {
      // 如果动态导入失败，回退到普通日志
      logger.info(message);
    }
  }
}

/**
 * 启动服务器主函数
 */
async function startServer(): Promise<void> {
  try {
    // 根据环境执行不同的初始化流程
    if (env.NODE_ENV === "production") {
      await initializeProduction();
    }
    else {
      initializeDevelopment();
    }

    // 启动 HTTP 服务器
    serve({ fetch: app.fetch, port });

    // 打印启动成功消息
    await logServerStart();
  }
  catch (error) {
    logger.error("服务启动失败:", error);
    process.exit(1);
  }
}

// 启动应用
startServer().catch((error) => {
  logger.error("应用启动异常:", error);
  process.exit(1);
});

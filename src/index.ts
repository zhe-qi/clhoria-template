import { serve } from "@hono/node-server";
import chalk from "chalk";
import gradient from "gradient-string";

import app, { adminApp } from "./app";
import env from "./env";
import { initializeScheduler } from "./jobs/scheduler";
import { initializeBullBoard } from "./lib/bull-board";
import { logger } from "./lib/logger";
import { collectAndSyncEndpointPermissions } from "./lib/permissions";
import { jwtWithQuery } from "./middlewares/jwt-auth-with-query";

const port = env.PORT;

async function startServer() {
  try {
    if (env.NODE_ENV === "production") {
      // 生产环境同步执行
      const apps = [
        { name: "admin", app: adminApp, prefix: "/admin" },
      ];
      await collectAndSyncEndpointPermissions(apps);
      await initializeScheduler();

      // 初始化 Bull Board UI - 直接添加到主应用
      const bullBoardAdapter = initializeBullBoard();
      // 只对主页面需要认证，静态资源保持开放（常见做法）
      app.use("/admin/ui/queues", jwtWithQuery(env.ADMIN_JWT_SECRET));
      app.route("/admin/ui/queues", bullBoardAdapter.registerPlugin());
    }
    else {
      // 开发环境异步执行所有初始化任务
      const apps = [
        { name: "admin", app: adminApp, prefix: "/admin" },
      ];

      Promise.all([
        collectAndSyncEndpointPermissions(apps),
        initializeScheduler(),
      ]).then(() => {
        // 在调度器初始化完成后初始化 Bull Board UI
        try {
          const bullBoardAdapter = initializeBullBoard();
          // 只对主页面需要认证，静态资源保持开放（常见做法）
          app.use("/admin/ui/queues", jwtWithQuery(env.ADMIN_JWT_SECRET));
          app.route("/admin/ui/queues", bullBoardAdapter.registerPlugin());
          logger.info("Bull Board UI 已集成到管理后台");
        }
        catch (error) {
          logger.error("Bull Board UI 集成失败:", error);
        }
      }).catch((error) => {
        logger.error("初始化任务执行失败:", error);
      });
    }

    // 启动HTTP服务器
    const message = `服务启动成功 (http://localhost:${port})`;

    if (env.NODE_ENV === "production") {
      logger.info(message);
    }
    else {
      // 开发环境使用彩色渐变加粗文字
      const gradientText = gradient(["cyan", "magenta"])(chalk.bold(message));
      logger.info(gradientText);
    }

    serve({ fetch: app.fetch, port });
  }
  catch (error) {
    console.error("服务启动失败:", error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

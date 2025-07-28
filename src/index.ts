import { serve } from "@hono/node-server";
import chalk from "chalk";
import gradient from "gradient-string";

import app, { adminApp } from "./app";
import env from "./env";
import { initializeScheduler } from "./jobs/scheduler";
import { logger } from "./lib/logger";
import { collectAndSyncEndpointPermissions } from "./lib/permissions";

const port = env.PORT;

async function startServer() {
  try {
    // 权限同步（仅在开发环境）
    if (env.NODE_ENV !== "production") {
      const apps = [
        { name: "admin", app: adminApp, prefix: "/admin" },
      ];
      await collectAndSyncEndpointPermissions(apps);
    }

    // 初始化定时任务调度器
    await initializeScheduler();

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

import type { Server as HTTPServer } from "node:http";

import { serve } from "@hono/node-server";
import * as z from "zod";

import app from "./app";
import env from "./env";
import { initializeDevelopment, initializeProduction, logServerStart, setupGracefulShutdown } from "./lib/server";
import { createSocketServer } from "./lib/socket-server";

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

// 生产环境同步，开发环境异步处理一些前置条件
if (env.NODE_ENV === "production") {
  await initializeProduction(app);
}
else {
  initializeDevelopment(app);
}

// 启动 HTTP 服务器
const httpServer = serve({ fetch: app.fetch, port: env.PORT });

// 创建 Socket.IO 服务器
createSocketServer(httpServer as HTTPServer);

// 打印启动成功消息
await logServerStart();

// 设置优雅关闭处理
setupGracefulShutdown();

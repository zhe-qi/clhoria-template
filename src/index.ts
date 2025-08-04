import { serve } from "@hono/node-server";

import app from "./app";
import env from "./env";
import { initializeDevelopment, initializeProduction, logServerStart, setupGracefulShutdown } from "./lib/server";

if (env.NODE_ENV === "production") {
  await initializeProduction(app);
}
else {
  initializeDevelopment(app);
}

// 启动 HTTP 服务器
serve({ fetch: app.fetch, port: env.PORT });

// 打印启动成功消息
await logServerStart();

// 设置优雅关闭处理
setupGracefulShutdown();

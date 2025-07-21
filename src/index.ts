import { serve } from "@hono/node-server";

import app, { adminApp } from "./app";
import env from "./env";
import { collectAndSyncEndpoints } from "./lib/permissions";

const port = env.PORT;

// 启动时收集端点
async function startServer() {
  try {
    // 收集并同步端点（使用已注册路由的应用实例）
    await collectAndSyncEndpoints([
      { name: "admin", app: adminApp, prefix: "/admin" },
    ]);

    // eslint-disable-next-line no-console
    console.log(`服务启动成功 http://localhost:${port}`);

    serve({ fetch: app.fetch, port });
  }
  catch (error) {
    console.error("启动服务失败:", error);
    process.exit(1);
  }
}

startServer();

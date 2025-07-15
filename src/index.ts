import { serve } from "@hono/node-server";

import app from "./app";
import env from "./env";
import { collectAndSyncEndpoints } from "./lib/collect-endpoints";
import configureOpenAPI from "./lib/configure-open-api";

const port = env.PORT;

// 启动时收集端点
async function startServer() {
  try {
    // 获取应用实例
    const { adminApp, clientApp, publicApp } = configureOpenAPI();
    
    // 收集并同步端点
    await collectAndSyncEndpoints([
      { name: "public", app: publicApp, prefix: "" },
      { name: "client", app: clientApp, prefix: "/client" },
      { name: "admin", app: adminApp, prefix: "/admin" },
    ]);
    
    // eslint-disable-next-line no-console
    console.log(`服务启动成功 http://localhost:${port}`);
    
    serve({ fetch: app.fetch, port });
  } catch (error) {
    console.error("启动服务失败:", error);
    process.exit(1);
  }
}

startServer();

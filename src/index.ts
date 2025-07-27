import { serve } from "@hono/node-server";

import app, { adminApp } from "./app";
import env from "./env";
import { collectAndSyncEndpointPermissions } from "./lib/permissions";

const port = env.PORT;

// 异步权限同步（仅在开发环境）
if (env.NODE_ENV !== "production") {
  // 开发环境：异步执行权限同步，不阻塞启动
  setImmediate(async () => {
    try {
      const apps = [
        { name: "admin", app: adminApp, prefix: "/admin" },
      ];

      await collectAndSyncEndpointPermissions(apps);
    }
    catch (error) {
      console.warn("权限同步失败:", error);
    }
  });
}

// eslint-disable-next-line no-console
console.log(`服务启动成功 http://localhost:${port}`);

serve({ fetch: app.fetch, port });

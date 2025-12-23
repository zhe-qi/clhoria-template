import { jwt } from "hono/jwt";
import * as z from "zod";

import type { RouteModule } from "@/types/lib";

import configureOpenAPI from "@/lib/internal/openapi";

import env from "./env";
import createApp from "./lib/internal/create-app";
import { authorize } from "./middlewares/authorize";
import { operationLog } from "./middlewares/operation-log";

// 使用 import.meta.glob 自动加载路由模块
const adminModules = import.meta.glob<RouteModule>("./routes/admin/**/index.ts", { eager: true });
const clientModules = import.meta.glob<RouteModule>("./routes/client/**/index.ts", { eager: true });
const publicModules = import.meta.glob<RouteModule>("./routes/public/**/index.ts", { eager: true });

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

// 获取OpenAPIHono实例
const { adminApp, clientApp, publicApp, configureMainDoc } = configureOpenAPI();

// 创建主应用
const app = createApp();

// 配置文档主页（非生产环境）
configureMainDoc?.(app);

if (env.SENTRY_DSN) {
  const { sentry } = await import("@hono/sentry");
  app.use("*", sentry({ dsn: env.SENTRY_DSN }));
}

// #region 公共路由（无认证）
for (const module of Object.values(publicModules)) {
  publicApp.route("/", module.default);
}
// #endregion

// #region 客户端路由（JWT）
clientApp.use("/*", jwt({ secret: env.CLIENT_JWT_SECRET }));
for (const module of Object.values(clientModules)) {
  clientApp.route("/", module.default);
}
// #endregion

// #region 后管路由
// tip: 如果你要用 trpc 请参考 https://github.com/honojs/hono/issues/2399#issuecomment-2675421823

// 1. 先注册跳过全局认证的模块（如 auth 模块，内部自己处理 JWT）
for (const module of Object.values(adminModules)) {
  if (module.skipGlobalAuth) {
    adminApp.route("/", module.default);
  }
}

// 2. 应用全局中间件
adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", authorize());
adminApp.use("/*", operationLog({ moduleName: "后台管理", description: "后台管理操作日志" }));

// 3. 注册需要全局认证的模块
for (const module of Object.values(adminModules)) {
  if (!module.skipGlobalAuth) {
    adminApp.route("/", module.default);
  }
}
// #endregion

/** 路由分组 顺序很重要，直接影响了中间件的执行顺序，公共路由必须放最前面 */
app.route("/", publicApp);
app.route("/", clientApp);
app.route("/", adminApp);

// 生产环境启动服务器
if (import.meta.env.PROD) {
  const { serve } = await import("@hono/node-server");
  const logger = (await import("./lib/logger")).default;

  serve({ fetch: app.fetch, port: env.PORT });
  logger.info({ port: env.PORT }, "[服务]: 启动成功");
}

export default app;

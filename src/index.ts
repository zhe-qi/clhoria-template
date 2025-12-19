import { jwt } from "hono/jwt";
import * as z from "zod";

import configureOpenAPI from "@/lib/openapi";
import * as allAdminExports from "@/routes/admin";
import * as allClientExports from "@/routes/client";
import * as allPublicExports from "@/routes/public";

import env from "./env";
import createApp from "./lib/create-app";
import { authorize } from "./middlewares/authorize";
import { operationLog } from "./middlewares/operation-log";

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

// #region 公共路由
const publicRoutes = Object.values(allPublicExports);
publicRoutes.forEach((route) => {
  publicApp.route("/", route);
});
// #endregion

// #region 客户端路由
const clientRoutes = Object.values(allClientExports);
clientApp.use("/*", jwt({ secret: env.CLIENT_JWT_SECRET }));
clientRoutes.forEach((route) => {
  clientApp.route("/", route);
});
// #endregion

// #region 后管路由
// tip: 如果你要用 trpc 请参考 https://github.com/honojs/hono/issues/2399#issuecomment-2675421823

const { auth: authModule, ...otherAdminModules } = allAdminExports;
const otherAdminRoutes = Object.values(otherAdminModules);

// admin auth module 自己处理自己的 jwt 校验
adminApp.route("/", authModule);

adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", authorize());
adminApp.use("/*", operationLog({ moduleName: "后台管理", description: "后台管理操作日志" }));

otherAdminRoutes.forEach((route) => {
  adminApp.route("/", route);
});
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

import { sentry } from "@hono/sentry";
import { jwt } from "hono/jwt";

import configureOpenAPI from "@/lib/openapi";
import * as allAdminExports from "@/routes/admin";
import * as allClientExports from "@/routes/client";
import * as allPublicExports from "@/routes/public";

import env from "./env";
import createApp from "./lib/create-app";
import { authorize } from "./middlewares/authorize";
import { operationLog } from "./middlewares/operation-log";

// 获取OpenAPIHono实例
const { adminApp, clientApp, publicApp, configureMainDoc } = configureOpenAPI();

// 创建主应用
const app = createApp();

// 配置文档主页（非生产环境）
configureMainDoc?.(app);

if (env.SENTRY_DSN) {
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
// ps: 如果你要用 trpc 请参考 https://github.com/honojs/hono/issues/2399#issuecomment-2675421823

const { auth: authModule, ...otherAdminModules } = allAdminExports;
const otherAdminRoutes = Object.values(otherAdminModules);

// admin auth module 自己处理自己的 jwt 校验
adminApp.route("/", authModule);

adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", authorize());
adminApp.use("/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }));

otherAdminRoutes.forEach((route) => {
  adminApp.route("/", route);
});
// #endregion

/** 路由分组 顺序很重要，直接影响了中间件的执行顺序，公共路由必须放最前面 */
app.route("/", publicApp);
app.route("/", clientApp);
app.route("/", adminApp);

export default app;

import { prometheus } from "@hono/prometheus";
import { sentry } from "@hono/sentry";
import { jwt } from "hono/jwt";

import type { AppOpenAPI } from "@/types/lib";

import configureOpenAPI from "@/lib/openapi";
import * as allAdminExports from "@/routes/admin/admin.index";
import * as allClientExports from "@/routes/client/client.index";
import * as allPublicExports from "@/routes/public/public.index";

import env from "./env";
import createApp from "./lib/create-app";
import { casbin } from "./middlewares/jwt-auth";
import { operationLog } from "./middlewares/operation-log";

// 获取OpenAPIHono实例
const { adminApp, clientApp, publicApp, configureMainDoc } = configureOpenAPI();

// 创建主应用
const app = createApp();

// 配置文档主页（非生产环境）
configureMainDoc?.(app);

const { printMetrics, registerMetrics } = prometheus();

app.use("*", registerMetrics);

// 配置 Sentry
app.use("*", sentry({ dsn: env.SENTRY_DSN }));

// #region 公共路由
const publicRoutes = Object.values<AppOpenAPI>(allPublicExports);
publicRoutes.forEach((route) => {
  publicApp.route("/", route);
});
// #endregion

// #region 客户端路由
const clientRoutes = Object.values<AppOpenAPI>(allClientExports);
clientApp.use("/*", jwt({ secret: env.CLIENT_JWT_SECRET }));
clientRoutes.forEach((route) => {
  clientApp.route("/", route);
});
// #endregion

// #region 后管路由
// ps: 如果你要用 trpc 请参考 https://github.com/honojs/hono/issues/2399#issuecomment-2675421823
const adminRoutes = Object.values<AppOpenAPI>(allAdminExports);

// admin 路由使用标准认证
adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", casbin());
adminApp.use("/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }));
adminRoutes.forEach((route) => {
  adminApp.route("/", route);
});
// #endregion

/** 路由分组 顺序很重要，直接影响了中间件的执行顺序，公共路由必须放最前面 */
const appGroups = [publicApp, clientApp, adminApp];
appGroups.forEach((group) => {
  app.route("/", group);
});

// 添加 metrics 端点（必须在路由分组之后）
app.get("/metrics", printMetrics);

export default app;

// 导出各个应用实例以便端点收集
export { adminApp, clientApp, publicApp };

import { prometheus } from "@hono/prometheus";
import { sentry } from "@hono/sentry";
import { jwt } from "hono/jwt";

import configureOpenAPI from "@/lib/openapi";
import * as allAdminExports from "@/routes/admin/admin.index";
import * as allClientExports from "@/routes/client/client.index";
import * as allPublicExports from "@/routes/public/public.index";

import env from "./env";
import createApp from "./lib/create-app";
import { operationLog } from "./middlewares/operation-log";

// 获取OpenAPIHono实例
const { adminApp, clientApp, publicApp, configureMainDoc } = configureOpenAPI();

// 创建主应用
const app = createApp();

// 配置文档主页（非生产环境）
configureMainDoc?.(app);

const { printMetrics, registerMetrics } = prometheus();

app.use("*", registerMetrics);
app.use("*", sentry({ dsn: env.SENTRY_DSN }));

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

// 从 admin 导出中分离 auth 模块和其他模块
const { auth: authModule, ...otherAdminModules } = allAdminExports;
const otherAdminRoutes = Object.values(otherAdminModules);

// 1. 先注册 auth 模块（包含免验证的 login 和 refresh 路由）
if (authModule) {
  adminApp.route("/", authModule);
}

// 2. 注册中间件（影响后续路由）
adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }));

// 3. 重新注册 auth 模块（JWT保护的接口会被中间件保护，login/refresh不受影响因为已经注册）
if (authModule) {
  adminApp.route("/", authModule);
}

// 4. 注册其他需要验证的路由
otherAdminRoutes.forEach((route) => {
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

import type { AppOpenAPI } from "@/types/lib";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";
import { bootstrap } from "@/lib/infrastructure/bootstrap";
import configureOpenAPI from "@/lib/internal/openapi";
import env from "./env";

import { SKIP_AUTH_PREFIXES, SKIP_JWT_PATHS } from "./lib/constants/auth-bypass";
import createApp from "./lib/internal/create-app";
import { authorize } from "./middlewares/authorize";
import { operationLog } from "./middlewares/operation-log";

// 初始化基础设施（pg-boss 等）
await bootstrap();

// 使用 import.meta.glob 自动加载路由模块
const adminModules = import.meta.glob<{ default: AppOpenAPI }>("./routes/admin/**/*.index.ts", { eager: true });
const clientModules = import.meta.glob<{ default: AppOpenAPI }>("./routes/client/**/*.index.ts", { eager: true });
const publicModules = import.meta.glob<{ default: AppOpenAPI }>("./routes/public/**/*.index.ts", { eager: true });

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

// #region 公共路由（无认证但是可使用局部中间件进行认证）
for (const module of Object.values(publicModules)) {
  publicApp.route("/", module.default);
}
// #endregion

// #region 客户端路由（JWT）
clientApp.use("/*", jwt({ secret: env.CLIENT_JWT_SECRET, alg: "HS256" }));
for (const module of Object.values(clientModules)) {
  clientApp.route("/", module.default);
}
// #endregion

// #region 后管路由
// tip: 如果你要用 trpc 请参考 https://github.com/honojs/hono/issues/2399#issuecomment-2675421823
adminApp.use("/*", except(
  c => SKIP_JWT_PATHS.some(p => c.req.path.endsWith(p)),
  jwt({ secret: env.ADMIN_JWT_SECRET, alg: "HS256" }),
));
adminApp.use("/*", except(
  c => SKIP_AUTH_PREFIXES.some(p => c.req.path.includes(p)),
  authorize,
));
adminApp.use("/*", except(
  c => SKIP_AUTH_PREFIXES.some(p => c.req.path.includes(p)),
  operationLog({ moduleName: "后台管理", description: "后台管理操作日志" }),
));

// 一次性注册所有路由模块
for (const module of Object.values(adminModules)) {
  adminApp.route("/", module.default);
}
// #endregion

/** 路由分组 顺序很重要，直接影响了中间件的执行顺序，公共路由必须放最前面 */
app.route("/", publicApp);
app.route("/", clientApp);
app.route("/", adminApp);

export default app;

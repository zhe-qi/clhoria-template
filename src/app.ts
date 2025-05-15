import { jwt } from "hono/jwt";

import type { DynamicSpreadArrayType } from "@/types/lib";

import configureOpenAPI from "@/lib/configure-open-api";
import * as allAdminExports from "@/routes/admin/api.index";
import * as allClientExports from "@/routes/client/api.index";
import * as allPublicExports from "@/routes/public/api.index";

import env from "./env";
import createApp from "./lib/create-app";
import { casbin } from "./middlewares/jwt-auth";

// 获取OpenAPIHono实例
const { adminApp, clientApp, publicApp, configureMainDoc } = configureOpenAPI();

// 创建主应用
const app = createApp();

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
const adminRoutes = Object.values(allAdminExports);
adminApp.use("/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
adminApp.use("/*", casbin());
adminRoutes.forEach((route) => {
  adminApp.route("/", route);
});
// #endregion

const appGroups = [adminApp, clientApp, publicApp];
appGroups.forEach((group) => {
  app.route("/", group);
});

// 配置文档主页（非生产环境）
if (env.NODE_ENV !== "production") {
  configureMainDoc(app);
}

export type AppType = DynamicSpreadArrayType<[typeof adminRoutes, typeof clientRoutes, typeof publicRoutes]>[number];

export default app;

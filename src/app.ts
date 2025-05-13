import { newEnforcer } from "casbin";
import { jwt } from "hono/jwt";

import { createDrizzleAdapter } from "@/lib/casbin";
import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import * as allAdminExports from "@/routes/admin/api.index";
import * as allClientExports from "@/routes/client/api.index";
import * as allPublicExports from "@/routes/public/api.index";

import env from "./env";
import { casbin } from "./middlewares/jwt-auth";

const app = createApp();

configureOpenAPI(app);

// #region 公共路由
const publicRoutes = Object.values(allPublicExports);
publicRoutes.forEach((route) => {
  app.route("/", route);
});
// #endregion

// #region 客户端路由
const clientRoutes = Object.values(allClientExports);

app.use("/client/*", jwt({ secret: env.CLIENT_JWT_SECRET }));

clientRoutes.forEach((route) => {
  app.route("/client", route);
});
// #endregion

// #region 后管路由
const adminRoutes = Object.values(allAdminExports);

app.use("/admin/*", jwt({ secret: env.ADMIN_JWT_SECRET }));
app.use("/admin/*", casbin({
  newEnforcer: newEnforcer("src/lib/casbin/model.conf", createDrizzleAdapter()),
}));

adminRoutes.forEach((route) => {
  app.route("/admin", route);
});
// #endregion

type ExtractElementType<T> = T extends Array<infer U> ? U : never;
type ExtractElements<T> =
  T extends [infer First, ...infer Rest]
    ? ExtractElementType<First> | ExtractElements<Rest>
    : never;

type DynamicSpreadArrayType<T extends any[]> = Array<ExtractElements<T>>;

export type AppType = DynamicSpreadArrayType<[typeof adminRoutes, typeof clientRoutes, typeof publicRoutes]>[number];

export default app;

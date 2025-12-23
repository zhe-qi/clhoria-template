import type { RouteConfig as HonoRouteConfig, OpenAPIHono, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";
import type { JWTPayload } from "hono/utils/jwt/types";

export type AppBindings = {
  Variables: {
    /** 日志记录器 */
    logger: PinoLogger;
    /** 请求 ID */
    requestId: string;
    /** JWT 负载 */
    jwtPayload: JWTPayload & {
      /** 用户角色 */
      roles: string[];
      /** 用户 ID */
      sub: string;
    };
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends HonoRouteConfig> = RouteHandler<R, AppBindings>;

/** 路由模块导出结构 */
export type RouteModule = {
  /** 路由实例 */
  default: AppOpenAPI;
  /** 跳过全局认证中间件（模块内部自己处理） */
  skipGlobalAuth?: boolean;
};

import type { RouteConfig as HonoRouteConfig, OpenAPIHono, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";
import type { JWTPayload } from "hono/utils/jwt/types";

export type AppBindings = {
  Variables: {
    /** Logger / 日志记录器 */
    logger: PinoLogger;
    /** Request ID / 请求 ID */
    requestId: string;
    /** Current tier's basePath, auto-injected by framework / 当前 tier 的 basePath，由框架自动注入 */
    tierBasePath: string;
    /** JWT payload / JWT 负载 */
    jwtPayload: JWTPayload & {
      /** User roles / 用户角色 */
      roles: string[];
      /** User ID / 用户 ID */
      sub: string;
    };
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends HonoRouteConfig> = RouteHandler<R, AppBindings>;

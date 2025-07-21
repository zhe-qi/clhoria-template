import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";

import type { PermissionConfig } from "@/lib/permission-inference";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    apiKey?: string;
    userRoles?: string[];
    userDomain?: string;
    currentPermission?: PermissionConfig;
    requiredPermission?: PermissionConfig;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

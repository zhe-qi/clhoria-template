import type { ArcjetNodeRequest } from "@arcjet/node";
import type { RouteConfig as HonoRouteConfig, OpenAPIHono, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";

import type { PermissionConfig } from "@/lib/permissions";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    currentPermission: PermissionConfig;
    userRoles: string[];
    userDomain: string;
    userId: string;
  };
  Bindings: {
    incoming: ArcjetNodeRequest;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends HonoRouteConfig> = RouteHandler<R, AppBindings>;

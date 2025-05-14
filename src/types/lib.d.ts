import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

type ExtractElementType<T> = T extends Array<infer U> ? U : never;
type ExtractElements<T> =
  T extends [infer First, ...infer Rest]
    ? ExtractElementType<First> | ExtractElements<Rest>
    : never;

export type DynamicSpreadArrayType<T extends any[]> = Array<ExtractElements<T>>;


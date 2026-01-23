import type * as routes from "./health.routes";
import type { AppRouteHandler } from "@/types/lib";

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type HealthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

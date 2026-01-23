import type * as routes from "./users.routes";
import type { AppRouteHandler } from "@/types/lib";

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemUsersRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

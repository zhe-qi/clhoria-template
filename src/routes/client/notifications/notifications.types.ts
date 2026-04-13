import type * as routes from "./notifications.routes";
import type { ClientRouteHandler } from "@/types/lib";

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type NotificationsRouteHandlerType<T extends keyof RouteTypes> = ClientRouteHandler<RouteTypes[T]>;

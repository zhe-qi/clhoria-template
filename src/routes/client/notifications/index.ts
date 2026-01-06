import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

const notificationsRouter = createRouter()
  .openapi(routes.subscribe, handlers.subscribe);

export default notificationsRouter;

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type NotificationsRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

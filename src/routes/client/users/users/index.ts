import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

const clientUsersRouter = createRouter()
  .openapi(routes.getUsersInfo, handlers.getUsersInfo);

export default clientUsersRouter;

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ClientUsersRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./posts.handlers";
import * as routes from "./posts.routes";

export const systemPosts = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.simpleList, handlers.simpleList)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.assignUsers, handlers.assignUsers);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemPostsRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

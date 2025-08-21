import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./object-storage.handlers";
import * as routes from "./object-storage.routes";

export const objectStorage = createRouter()
  .openapi(routes.getUploadToken, handlers.getUploadToken)
  .openapi(routes.getDownloadToken, handlers.getDownloadToken);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ObjectStorageRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;

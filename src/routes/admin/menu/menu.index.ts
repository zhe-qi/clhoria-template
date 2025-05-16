import { createRouter } from "@/lib/create-app";

import * as handlers from "./menu.handlers";
import * as routes from "./menu.routes";

export const menu = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

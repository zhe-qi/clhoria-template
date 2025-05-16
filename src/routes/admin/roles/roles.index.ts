import { createRouter } from "@/lib/create-app";

import * as handlers from "./roles.handlers";
import * as routes from "./roles.routes";

export const roles = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

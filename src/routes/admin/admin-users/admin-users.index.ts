import { createRouter } from "@/lib/create-app";

import * as handlers from "./admin-users.handlers";
import * as routes from "./admin-users.routes";

export const adminUsers = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

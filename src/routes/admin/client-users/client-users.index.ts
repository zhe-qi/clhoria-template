import { createRouter } from "@/lib/create-app";

import * as handlers from "./client-users.handlers";
import * as routes from "./client-users.routes";

export const clientUsers = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./roles.handlers";
import * as routes from "./roles.routes";

const systemRolesRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.savePermissions, handlers.savePermissions);

export default systemRolesRouter;

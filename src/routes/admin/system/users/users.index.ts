import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const systemUsersRouter = createRouter()
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.create, handlers.create)
  .openapi(routes.list, handlers.list)
  .openapi(routes.saveRoles, handlers.saveRoles);

export default systemUsersRouter;

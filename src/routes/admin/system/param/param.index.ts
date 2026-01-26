import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./param.handlers";
import * as routes from "./param.routes";

const systemParamRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default systemParamRouter;

import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./params.handlers";
import * as routes from "./params.routes";

const systemParamRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default systemParamRouter;

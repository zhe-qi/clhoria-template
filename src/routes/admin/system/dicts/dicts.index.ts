import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./dicts.handlers";
import * as routes from "./dicts.routes";

const systemDictRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default systemDictRouter;

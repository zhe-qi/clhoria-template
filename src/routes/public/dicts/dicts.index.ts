import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./dicts.handlers";
import * as routes from "./dicts.routes";

const dictsRouter = createRouter()
  .openapi(routes.getByCode, handlers.getByCode);

export default dictsRouter;

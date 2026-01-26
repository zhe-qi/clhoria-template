import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./param.handlers";
import * as routes from "./param.routes";

const paramRouter = createRouter()
  .openapi(routes.getByKey, handlers.getByKey);

export default paramRouter;

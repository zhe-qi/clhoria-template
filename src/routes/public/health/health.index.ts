import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./health.handlers";
import * as routes from "./health.routes";

const health = createRouter()
  .openapi(routes.get, handlers.get);

export default health;

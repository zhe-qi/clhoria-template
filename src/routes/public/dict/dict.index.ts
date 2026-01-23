import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./dict.handlers";
import * as routes from "./dict.routes";

const dictRouter = createRouter()
  .openapi(routes.getByCode, handlers.getByCode);

export default dictRouter;

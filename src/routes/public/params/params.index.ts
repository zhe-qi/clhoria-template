import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./params.handlers";
import * as routes from "./params.routes";

const paramsRouter = createRouter()
  .openapi(routes.getByKey, handlers.getByKey);

export default paramsRouter;

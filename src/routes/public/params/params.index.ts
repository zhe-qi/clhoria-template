import { createPublicRouter } from "@/lib/core/create-app";

import * as handlers from "./params.handlers";
import * as routes from "./params.routes";

const paramsRouter = createPublicRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getByKey, handlers.getByKey);

export default paramsRouter;

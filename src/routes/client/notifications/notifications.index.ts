import { createClientRouter } from "@/lib/core/create-app";

import * as handlers from "./notifications.handlers";
import * as routes from "./notifications.routes";

const notificationsRouter = createClientRouter()
  .openapi(routes.subscribe, handlers.subscribe);

export default notificationsRouter;

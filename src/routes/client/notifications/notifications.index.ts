import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./notifications.handlers";
import * as routes from "./notifications.routes";

const notificationsRouter = createRouter()
  .openapi(routes.subscribe, handlers.subscribe);

export default notificationsRouter;

import { createRouter } from "@/lib/internal/create-app";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const clientUsersRouter = createRouter()
  .openapi(routes.getUsersInfo, handlers.getUsersInfo);

export default clientUsersRouter;

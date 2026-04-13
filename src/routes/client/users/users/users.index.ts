import { createClientRouter } from "@/lib/core/create-app";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const clientUsersRouter = createClientRouter()
  .openapi(routes.getUsersInfo, handlers.getUsersInfo);

export default clientUsersRouter;

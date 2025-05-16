import { createRouter } from "@/lib/create-app";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

export const auth = createRouter()
  .openapi(routes.adminLogin, handlers.adminLogin)
  .openapi(routes.adminRegister, handlers.adminRegister)
  .openapi(routes.clientLogin, handlers.clientLogin)
  .openapi(routes.clientRegister, handlers.clientRegister);

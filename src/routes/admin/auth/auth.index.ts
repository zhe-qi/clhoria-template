import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

const auth = createRouter()
  .openapi(routes.login, handlers.login)
  .openapi(routes.refreshToken, handlers.refreshToken)
  .openapi(routes.logout, handlers.logout)
  .openapi(routes.getIdentity, handlers.getIdentity)
  .openapi(routes.getPermissions, handlers.getPermissions)
  .openapi(routes.createChallenge, handlers.createChallenge)
  .openapi(routes.redeemChallenge, handlers.redeemChallenge);

export default auth;

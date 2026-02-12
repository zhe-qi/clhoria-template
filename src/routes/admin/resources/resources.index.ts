import { createRouter } from "@/lib/core/create-app";

import * as handlers from "./resources.handlers";
import * as routes from "./resources.routes";

const objectStorage = createRouter()
  .openapi(routes.getUploadToken, handlers.getUploadToken)
  .openapi(routes.getDownloadToken, handlers.getDownloadToken);

export default objectStorage;

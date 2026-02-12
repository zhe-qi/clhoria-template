import type { AppBindings } from "@/types/lib";
import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";

import { requestId } from "hono/request-id";

import { notFound, onError } from "@/lib/core/stoker/middlewares";
import { defaultHook } from "@/lib/core/stoker/openapi";
import logger from "@/lib/services/logger";

function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export function createTestApp() {
  const app = createRouter();
  app.use(requestId())
    .use(pinoLogger({ pino: logger }));
  app.notFound(notFound);
  app.onError(onError);
  return app;
}

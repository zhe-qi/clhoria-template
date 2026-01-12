import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { requestId } from "hono/request-id";

import type { AppBindings } from "@/types/lib";

import logger from "@/lib/logger";
import { notFound, onError } from "@/lib/stoker/middlewares";
import { defaultHook } from "@/lib/stoker/openapi";

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

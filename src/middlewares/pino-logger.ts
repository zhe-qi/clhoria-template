import { pinoLogger as honoLogger } from "hono-pino";

import logger from "@/lib/logger";

export function pinoLogger() {
  return honoLogger({
    pino: logger,
  });
}

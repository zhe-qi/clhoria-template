import type { PrettyStream } from "pino-pretty";

import pino from "pino";

import env from "@/env";

let options: PrettyStream | undefined;

if (env.NODE_ENV === "development") {
  const pretty = await import("pino-pretty");
  options = pretty.default();
}

const logger = pino({ level: env.LOG_LEVEL || "info" }, options);

export default logger;

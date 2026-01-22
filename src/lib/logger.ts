import type { DestinationStream } from "pino";

import pino from "pino";

import env from "@/env";
import { createSingleton } from "@/lib/internal/singleton";

let destination: DestinationStream | undefined;

// 仅在开发环境使用 pino-pretty，生产环境压缩成一条会好一点
if (env.NODE_ENV === "development") {
  const pretty = await import("pino-pretty");
  destination = pretty.default();
}

const logger = createSingleton("logger", () =>
  pino({ level: env.LOG_LEVEL || "info" }, destination));

export default logger;

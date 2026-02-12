import type { Logger as PinoLogger } from "pino";

import { Context, Layer } from "effect";

import logger from "@/lib/services/logger";

export class LoggerService extends Context.Tag("LoggerService")<LoggerService, PinoLogger>() {}

export const LoggerServiceLive = Layer.succeed(LoggerService, logger);

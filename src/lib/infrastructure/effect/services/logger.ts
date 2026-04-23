import type { Logger as PinoLogger } from "pino";

import { Context, Layer } from "effect";

import logger from "@/lib/services/logger";

export class LoggerService extends Context.Service<LoggerService, PinoLogger>()("LoggerService") {}

export const LoggerServiceLive = Layer.succeed(LoggerService, logger);

import { Layer } from "effect";

import { DbServiceLive } from "../services/db";
import { LoggerServiceLive } from "../services/logger";
import { PgBossServiceLive } from "../services/pg-boss";

export const InfraLayer = Layer.mergeAll(
  DbServiceLive,
  PgBossServiceLive,
  LoggerServiceLive,
);

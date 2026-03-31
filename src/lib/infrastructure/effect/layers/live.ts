import { Layer } from "effect";

import { BullMQServiceLive } from "../services/bullmq";
import { DbServiceLive } from "../services/db";
import { LoggerServiceLive } from "../services/logger";

export const InfraLayer = Layer.mergeAll(
  DbServiceLive,
  BullMQServiceLive,
  LoggerServiceLive,
);

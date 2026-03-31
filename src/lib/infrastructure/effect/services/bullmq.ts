import { Context, Layer } from "effect";

import { queueManager } from "@/lib/infrastructure/bullmq-adapter";

export class BullMQService extends Context.Tag("BullMQService")<
  BullMQService,
  typeof queueManager
>() {}

export const BullMQServiceLive = Layer.succeed(BullMQService, queueManager);

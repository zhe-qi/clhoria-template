import { Context, Layer } from "effect";

import { queueManager } from "@/lib/infrastructure/bullmq-adapter";

export class BullMQService extends Context.Service<BullMQService, typeof queueManager>()("BullMQService") {}

export const BullMQServiceLive = Layer.succeed(BullMQService, queueManager);

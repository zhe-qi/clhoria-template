import { createAsyncSingleton } from "@/lib/internal/singleton";

import { SagaOrchestrator } from "./saga-orchestrator";

export { SagaOrchestrator } from "./saga-orchestrator";
export { sagaRegistry } from "./saga-registry";
export * from "./types";

/** 获取 Saga 协调器单例 */
export const getSagaOrchestrator = createAsyncSingleton(
  "saga-orchestrator",
  async () => {
    const orchestrator = new SagaOrchestrator();
    await orchestrator.initialize();
    return orchestrator;
  },
  {
    destroy: async () => {
      // pg-boss 的停止由 pg-boss-adapter 管理
    },
  },
);

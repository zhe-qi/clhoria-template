import { createSingleton } from "@/lib/core/singleton";

import { SagaOrchestrator } from "./saga-orchestrator";

export { SagaOrchestrator } from "./saga-orchestrator";
export { sagaRegistry } from "./saga-registry";
export * from "./types";

/** Saga 协调器单例（懒加载） */
let sagaOrchestratorPromise: Promise<SagaOrchestrator> | null = null;

/**
 * 获取 Saga 协调器单例
 *
 * 使用懒加载模式，只在首次调用时初始化
 * 避免模块导入时自动触发 pg-boss 初始化
 */
export function getSagaOrchestrator(): Promise<SagaOrchestrator> {
  if (!sagaOrchestratorPromise) {
    sagaOrchestratorPromise = (async () => {
      const orchestrator = createSingleton(
        "saga-orchestrator",
        () => new SagaOrchestrator(),
      );
      await orchestrator.initialize();
      return orchestrator;
    })();
  }
  return sagaOrchestratorPromise;
}

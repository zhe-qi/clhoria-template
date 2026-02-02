import type { SagaDefinition } from "./types";

import logger from "@/lib/logger";

/** Saga 定义注册表 */
class SagaRegistry {
  private definitions = new Map<string, SagaDefinition>();

  /** 注册 Saga 定义 */
  register<TInput, TOutput, TContext>(
    definition: SagaDefinition<TInput, TOutput, TContext>,
  ): void {
    if (this.definitions.has(definition.type)) {
      logger.warn(
        { type: definition.type },
        "[Saga]: Saga 定义已存在，将被覆盖",
      );
    }
    this.definitions.set(definition.type, definition as SagaDefinition);
    logger.info(
      { type: definition.type, steps: definition.steps.length },
      "[Saga]: Saga 定义已注册",
    );
  }

  /** 获取 Saga 定义 */
  get(type: string): SagaDefinition | undefined {
    return this.definitions.get(type);
  }

  /** 检查 Saga 是否已注册 */
  has(type: string): boolean {
    return this.definitions.has(type);
  }

  /** 获取所有已注册的 Saga 类型 */
  getTypes(): string[] {
    return Array.from(this.definitions.keys());
  }

  /** 清空注册表（用于测试） */
  clear(): void {
    this.definitions.clear();
  }
}

export const sagaRegistry = new SagaRegistry();

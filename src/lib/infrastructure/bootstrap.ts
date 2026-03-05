import { Effect } from "effect";

import * as z from "zod";

import { createSingleton, destroyAllSingletons, hasSingleton } from "@/lib/core/singleton";
import logger from "@/lib/services/logger";

import { initExcelize } from "./excelize";
import boss from "./pg-boss-adapter";

const KEY = "bootstrap";

/** Initialize infrastructure / 初始化基础设施 */
export function bootstrap(): Promise<void> {
  if (hasSingleton(KEY)) return Promise.resolve();

  const program = Effect.gen(function* () {
    // Configure Zod to use Chinese error messages / 配置 Zod 使用中文错误消息
    z.config(z.locales.zhCN());

    // 1. Initialize pg-boss (must be before other components) / 初始化 pg-boss（必须先于其他组件）
    yield* Effect.promise(() => boss.start());
    logger.info("[PgBossAdapter]: pg-boss 已启动");

    // 2. Initialize excelize wasm / 初始化 excelize wasm
    yield* initExcelize;
    logger.info("[Bootstrap]: excelize wasm 已加载");

    createSingleton(KEY, () => true);
  });

  return Effect.runPromise(program);
}

/** Shutdown infrastructure / 关闭基础设施 */
export async function shutdown(): Promise<void> {
  if (!hasSingleton(KEY)) return;

  logger.info("[Bootstrap]: 开始优雅关闭");

  try {
    logger.info("[Bootstrap]: 正在停止 pg-boss");
    await boss.stop();
    logger.info("[Bootstrap]: pg-boss 已停止");

    // 销毁所有单例资源
    // 框架自动调用各单例的 destroy：Redis.quit()、PostgreSQL.end() 等
    // pg-boss 的 destroy(instance.stop()) 会被二次调用但被 catch，不影响其他资源
    logger.info("[Bootstrap]: 正在关闭所有连接");
    await destroyAllSingletons();
    logger.info("[Bootstrap]: 所有连接已关闭");
  }
  catch (error) {
    logger.error({ error }, "[Bootstrap]: 关闭过程出错");
    throw error;
  }
}

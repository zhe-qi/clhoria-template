import { Effect } from "effect";

import * as z from "zod";

import logger from "@/lib/services/logger";

import boss from "./pg-boss-adapter";

let initialized = false;

/** 初始化基础设施 */
export function bootstrap(): Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }

  const program = Effect.gen(function* () {
    // 配置 Zod 使用中文错误消息
    z.config(z.locales.zhCN());

    // 1. 初始化 pg-boss（必须先于其他组件）
    yield* Effect.promise(() => boss.start());
    logger.info("[PgBossAdapter]: pg-boss 已启动");

    // 2. 初始化 Saga 协调器（依赖 pg-boss，使用动态导入确保顺序）
    const { getSagaOrchestrator } = yield* Effect.promise(() => import("./saga"));
    yield* Effect.promise(() => getSagaOrchestrator());
    logger.info("[Bootstrap]: Saga 协调器已初始化");

    initialized = true;
  });

  return Effect.runPromise(program);
}

/** 关闭基础设施 */
export function shutdown(): Promise<void> {
  if (!initialized) {
    return Promise.resolve();
  }

  const program = Effect.gen(function* () {
    yield* Effect.promise(() => boss.stop());
    logger.info("[Bootstrap]: pg-boss 已停止");
    initialized = false;
  });

  return Effect.runPromise(program);
}

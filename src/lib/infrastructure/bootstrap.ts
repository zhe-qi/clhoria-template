import { Effect } from "effect";

import * as z from "zod";

import { createSingleton, destroySingleton, hasSingleton } from "@/lib/core/singleton";
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
export function shutdown(): Promise<void> {
  if (!hasSingleton(KEY)) return Promise.resolve();

  const program = Effect.gen(function* () {
    yield* Effect.promise(() => boss.stop());
    logger.info("[Bootstrap]: pg-boss 已停止");
    yield* Effect.promise(() => destroySingleton(KEY));
  });

  return Effect.runPromise(program);
}

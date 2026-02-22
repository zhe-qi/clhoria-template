import fs from "node:fs";
import path from "node:path";

import { Effect } from "effect";
import { init } from "excelize-wasm";

import { createSingleton, getSingleton, hasSingleton } from "@/lib/core/singleton";

export type Excelize = Awaited<ReturnType<typeof init>>;

const KEY = "excelize";

function getWasmPath(): string {
  const projectRoot = process.cwd();
  const wasmPath = path.join(projectRoot, "node_modules/excelize-wasm/excelize.wasm.gz");

  if (fs.existsSync(wasmPath)) return wasmPath;

  const fallbackPath = path.resolve(import.meta.dirname, "../../node_modules/excelize-wasm/excelize.wasm.gz");

  if (fs.existsSync(fallbackPath)) return fallbackPath;

  throw new Error(`excelize wasm file not found. Searched: ${wasmPath}, ${fallbackPath}`);
}

/** 初始化 excelize wasm（在 bootstrap 中调用） */
export const initExcelize = Effect.gen(function* () {
  if (hasSingleton(KEY)) return;

  const wasmPath = getWasmPath();
  const instance = yield* Effect.promise(() => init(wasmPath));

  createSingleton(KEY, () => instance);
});

/** 获取 excelize 实例（必须在 bootstrap 之后调用） */
export function getExcelize(): Excelize {
  const instance = getSingleton<Excelize>(KEY);

  if (!instance) throw new Error("excelize 尚未初始化，请确保 bootstrap 已完成");

  return instance;
}

import fs from "node:fs";
import path from "node:path";

import { init } from "excelize-wasm";

import { createAsyncSingleton } from "@/lib/internal/singleton";

export type Excelize = Awaited<ReturnType<typeof init>>;

function getWasmPath(): string {
  const projectRoot = process.cwd();
  const wasmPath = path.join(projectRoot, "node_modules/excelize-wasm/excelize.wasm.gz");

  if (fs.existsSync(wasmPath)) {
    return wasmPath;
  }

  const fallbackPath = path.resolve(import.meta.dirname, "../../node_modules/excelize-wasm/excelize.wasm.gz");

  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  throw new Error(`excelize wasm file not found. Searched: ${wasmPath}, ${fallbackPath}`);
}

export const getExcelize = createAsyncSingleton<Excelize>(
  "excelize",
  async () => {
    const wasmPath = getWasmPath();
    return init(wasmPath);
  },
);

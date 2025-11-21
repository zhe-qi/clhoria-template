import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "."),
    },
  },
  test: {
    setupFiles: [],
    // 串行运行测试文件，避免 Casbin 规则冲突
    fileParallelism: false,
    // 禁用隔离以加快测试速度（测试在同一进程中运行）
    isolate: false,
    // 启用线程池以提升性能
    pool: "threads",
  },
});

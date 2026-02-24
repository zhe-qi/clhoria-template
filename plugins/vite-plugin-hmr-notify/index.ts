/**
 * Vite HMR notification plugin
 * Vite HMR 通知插件
 *
 * Provides frontend-like status notifications during backend HMR
 * Uses server.watcher to listen for file changes, avoiding conflicts with @hono/vite-dev-server
 * 在后端 HMR 时提供类似前端的状态提示
 * 使用 server.watcher 监听文件变化，避免与 @hono/vite-dev-server 冲突
 */
import type { Plugin, ViteDevServer } from "vite";

// ANSI color codes / ANSI 颜色码
const colors = {
  green: (str: string) => `\x1B[32m${str}\x1B[39m`,
  cyan: (str: string) => `\x1B[36m${str}\x1B[39m`,
  dim: (str: string) => `\x1B[2m${str}\x1B[22m`,
};

// ANSI control codes / ANSI 控制码
const ansi = {
  cursorUp: "\x1B[1A",
  clearLine: "\x1B[2K",
};

type HmrNotifyOptions = {
  /** File extensions to watch, default [".ts", ".tsx", ".js", ".jsx"] / 监听的文件扩展名，默认 [".ts", ".tsx", ".js", ".jsx"] */
  extensions?: string[];
  /** Path patterns to ignore / 忽略的路径模式 */
  exclude?: RegExp[];
  /** Debounce time window for batched printing (ms), default 100 / 合并打印的时间窗口(ms)，默认 100 */
  debounce?: number;
};

export default function hmrNotifyPlugin(options?: HmrNotifyOptions): Plugin {
  const extensions = options?.extensions ?? [".ts", ".tsx", ".js", ".jsx"];
  const exclude = options?.exclude ?? [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/];
  const debounceMs = options?.debounce ?? 100;

  let server: ViteDevServer;
  let pendingFiles: string[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPrintedLines = 0;

  function printChanges() {
    if (pendingFiles.length === 0)
      return;

    // Clear previously printed lines / 清除上次打印的行
    if (lastPrintedLines > 0) {
      process.stdout.write(ansi.cursorUp.repeat(lastPrintedLines) + ansi.clearLine);
    }

    // Print the latest changes / 打印最新的变更
    const filesText = pendingFiles.length === 1
      ? colors.cyan(pendingFiles[0])
      : `${colors.cyan(pendingFiles[0])} ${colors.dim(`等 ${pendingFiles.length} 个文件`)}`;

    server.config.logger.info(
      `${colors.green("[hmr]")} ${filesText} ${colors.dim("已变更")}`,
      { timestamp: true },
    );

    lastPrintedLines = 1;
    pendingFiles = [];
  }

  return {
    name: "vite-plugin-hmr-notify",
    apply: "serve",

    configureServer(_server) {
      server = _server;

      // Watch file changes / 监听文件变化
      server.watcher.on("change", (file) => {
        // Check file extension / 检查文件扩展名
        const hasValidExt = extensions.some(ext => file.endsWith(ext));
        if (!hasValidExt)
          return;

        // Check if in exclusion list / 检查是否在排除列表中
        if (exclude.some(pattern => pattern.test(file)))
          return;

        const relativePath = file.replace(`${process.cwd()}/`, "");

        // Add to pending print list / 添加到待打印列表
        if (!pendingFiles.includes(relativePath)) {
          pendingFiles.push(relativePath);
        }

        // Debounce: batch prints within the time window / 防抖：在时间窗口内合并打印
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          printChanges();
          debounceTimer = null;
        }, debounceMs);
      });
    },
  };
}

import type { Plugin } from "vite";
/**
 * Vite plugin: serve Bull Board UI static files
 * Vite 插件：提供 Bull Board UI 静态文件服务
 *
 * Vite dev server intercepts .js/.css requests through its transform pipeline,
 * preventing @hono/node-server/serve-static from serving Bull Board UI assets.
 * This plugin registers a connect middleware before Vite's built-in middlewares
 * to serve those files directly from @bull-board/ui/dist.
 *
 * Vite dev server 会通过 transform 管道拦截 .js/.css 请求，
 * 导致 @hono/node-server/serve-static 无法提供 Bull Board UI 静态资源。
 * 此插件在 Vite 内置中间件之前注册 connect 中间件，直接从 @bull-board/ui/dist 提供文件。
 */
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";

const mimeTypes: Record<string, string> = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

export default function bullBoardStaticPlugin(basePath = "/api/queue-board"): Plugin {
  const require = createRequire(import.meta.url);
  let uiDistPath: string;
  const staticPrefix = `${basePath}/static/`;

  return {
    name: "bull-board-static",
    configureServer(server) {
      try {
        uiDistPath = join(dirname(require.resolve("@bull-board/ui/package.json")), "dist");
      }
      catch {
        return;
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(staticPrefix)) return next();

        const staticSuffix = url.replace(basePath, "");
        const filePath = join(uiDistPath, staticSuffix);
        const ext = extname(filePath);

        import("node:fs/promises").then(fs => fs.readFile(filePath)).then((content) => {
          res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
          res.end(content);
        }).catch(() => next());
      });
    },
  };
}

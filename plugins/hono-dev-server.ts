import type http from "node:http";
/**
 * 自定义 Hono Vite Dev Server 插件
 * 兼容 Vite 8，功能对标 @hono/vite-dev-server
 */
import type { Connect, ViteDevServer, Plugin as VitePlugin } from "vite";

import { getRequestListener } from "@hono/node-server";
import { minimatch } from "minimatch";
import fs from "node:fs";
import path from "node:path";

type Fetch = (request: Request, env: Record<string, unknown>, executionContext: ExecutionContext) => Promise<Response> | Response;

type ExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
};

export type DevServerOptions = {
  /** 应用入口文件路径 */
  entry?: string;
  /** 导出的模块名称 */
  export?: string;
  /** 是否注入 Vite 客户端脚本 */
  injectClientScript?: boolean;
  /** 排除的路径模式 */
  exclude?: (string | RegExp)[];
  /** 忽略监听的文件模式 */
  ignoreWatching?: (string | RegExp)[];
  /** 自定义 HMR 处理 */
  handleHotUpdate?: VitePlugin["handleHotUpdate"];
};

/** 默认配置 */
export const defaultOptions: Required<Omit<DevServerOptions, "handleHotUpdate">> = {
  entry: "./src/index.ts",
  export: "default",
  injectClientScript: true,
  exclude: [
    /.*\.css$/,
    /.*\.ts$/,
    /.*\.tsx$/,
    /^\/@.+$/,
    /\?t=\d+$/,
    /[?&]tsr-split=[^&]*(&t=[^&]*)?$/,
    /^\/favicon\.ico$/,
    /^\/static\/.+/,
    /^\/node_modules\/.*/,
    /.*\.svelte$/,
    /.*\.vue$/,
    /.*\.js$/,
    /.*\.jsx$/,
  ],
  ignoreWatching: [/\.wrangler/, /\.mf/],
};

/**
 * 向 Response 中注入字符串内容
 */
function injectStringToResponse(response: Response, content: string): Response | null {
  const stream = response.body;
  const newContent = new TextEncoder().encode(content);

  if (!stream) {
    return null;
  }

  const reader = stream.getReader();

  const combinedStream = new ReadableStream({
    async start(controller) {
      for (;;) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        controller.enqueue(result.value);
      }
      controller.enqueue(newContent);
      controller.close();
    },
  });

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(combinedStream, {
    headers,
    status: response.status,
  });
}

/**
 * Hono Vite Dev Server 插件
 */
export function honoDevServer(options?: DevServerOptions): VitePlugin {
  let publicDirPath = "";
  let viteBase = "/";

  const entry = options?.entry ?? defaultOptions.entry;
  const exportName = options?.export ?? defaultOptions.export;
  const exclude = options?.exclude ?? defaultOptions.exclude;
  const injectClientScript = options?.injectClientScript ?? defaultOptions.injectClientScript;
  const ignoreWatching = options?.ignoreWatching ?? defaultOptions.ignoreWatching;

  const plugin: VitePlugin = {
    name: "hono-dev-server",

    config: () => {
      return {
        server: {
          watch: {
            ignored: ignoreWatching,
          },
        },
      };
    },

    configResolved(config) {
      publicDirPath = config.publicDir;
      viteBase = config.base;
    },

    configureServer: async (server: ViteDevServer) => {
      async function createMiddleware(server: ViteDevServer): Promise<Connect.HandleFunction> {
        return async function (
          req: http.IncomingMessage,
          res: http.ServerResponse,
          next: Connect.NextFunction,
        ): Promise<void> {
          // 检查是否为公共目录下的静态文件
          if (req.url) {
            const filePath = path.join(publicDirPath, req.url);
            try {
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return next();
              }
            }
            catch {
              // 忽略错误
            }
          }

          // 检查排除规则
          for (const pattern of exclude) {
            if (req.url) {
              if (pattern instanceof RegExp) {
                if (pattern.test(req.url)) {
                  return next();
                }
              }
              else if (minimatch(req.url.toString(), pattern)) {
                return next();
              }
            }
          }

          // 动态加载应用模块
          let app: { fetch: Fetch };

          try {
            const appModule = await server.ssrLoadModule(entry);
            app = appModule[exportName] as { fetch: Fetch };

            if (!app) {
              throw new Error(`[hono-dev-server]: 未找到导出 "${exportName}"，来自 ${entry}`);
            }
          }
          catch (e) {
            if (e instanceof Error) {
              server.ssrFixStacktrace(e);
            }
            return next(e);
          }

          // 使用 @hono/node-server 处理请求
          getRequestListener(
            async (request): Promise<Response> => {
              const env = {
                incoming: req,
                outgoing: res,
              };

              const executionContext: ExecutionContext = {
                waitUntil: async fn => fn,
                passThroughOnException: () => {
                  throw new Error("`passThroughOnException` 不支持");
                },
              };

              const response = await app.fetch(request, env, executionContext);

              if (!(response instanceof Response)) {
                throw response;
              }

              // 注入 Vite 客户端脚本
              if (
                injectClientScript
                && response.headers.get("content-type")?.match(/^text\/html/)
              ) {
                const viteScript = path.posix.join(viteBase, "/@vite/client");
                const nonce = response.headers
                  .get("content-security-policy")
                  ?.match(/'nonce-([^']+)'/)?.[1];
                const script = `<script${nonce ? ` nonce="${nonce}"` : ""}>import("${viteScript}")</script>`;
                return injectStringToResponse(response, script) ?? response;
              }

              return response;
            },
            {
              overrideGlobalObjects: false,
              errorHandler: (e) => {
                let err: Error;
                if (e instanceof Error) {
                  err = e;
                  server.ssrFixStacktrace(err);
                }
                else if (typeof e === "string") {
                  err = new Error(`响应不是 Response 实例: ${e}`);
                }
                else {
                  err = new Error(`未知错误: ${e}`);
                }
                next(err);
              },
            },
          )(req, res);
        };
      }

      server.middlewares.use(await createMiddleware(server));
    },

    handleHotUpdate(ctx) {
      const { server, file } = ctx;
      // 后端 src 目录下的文件变化时触发全页面刷新
      const isSrcFile = file.includes("/src/");
      if (isSrcFile) {
        const fileName = file.split("/").pop();
        server.config.logger.info(`\x1B[32mhmr\x1B[0m \x1B[2m${fileName} → full reload\x1B[0m`, { timestamp: true });
        server.hot.send({ type: "full-reload" });
        return [];
      }
    },
  };

  return plugin;
}

export default honoDevServer;

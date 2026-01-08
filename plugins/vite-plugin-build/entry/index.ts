import { normalize } from "node:path";

export type EntryContentHookOptions = {
  staticPaths: string[];
};

export type EntryContentHook = (
  appName: string,
  options?: EntryContentHookOptions,
) => string | Promise<string>;

const presets = ["hono", "hono/tiny", "hono/quick"] as const;
export type Preset = (typeof presets)[number];

export type GetEntryContentOptions = {
  entry: string[];
  entryContentBeforeHooks?: EntryContentHook[];
  entryContentAfterHooks?: EntryContentHook[];
  /**
   * Explicitly specify the default export for the app. Make sure your export
   * incorporates the app passed as the `appName` argument.
   *
   * @default `export default ${appName}`
   */
  entryContentDefaultExportHook?: EntryContentHook;
  staticPaths?: string[];
  /**
   * @default `hono`
   */
  preset?: Preset;
  /**
   * 是否使用 mainApp 包装原始 app
   * 启用后会创建一个 Hono 实例包装原始 app，兼容 Edge Runtime
   * @default false
   */
  wrapWithMainApp?: boolean;
};

const normalizePaths = (paths: string[]) => {
  return paths.map((p) => {
    let normalizedPath = normalize(p).replace(/\\/g, "/");
    if (normalizedPath.startsWith("./")) {
      normalizedPath = normalizedPath.substring(2);
    }
    return `/${normalizedPath}`;
  });
};

export const getEntryContent = async (options: GetEntryContentOptions) => {
  const preset = presets.includes(options.preset ?? "hono")
    ? options.preset ?? "hono"
    : (console.warn(
        `Invalid preset: ${options.preset}. Must be one of: ${presets.join(", ")}. Using 'hono' as default.`,
      ),
      "hono");

  const wrapWithMainApp = options.wrapWithMainApp ?? false;
  const staticPaths = options.staticPaths ?? [""];
  const globStr = normalizePaths(options.entry)
    .map(e => `'${e}'`)
    .join(",");

  const hooksToString = async (appName: string, hooks?: EntryContentHook[]) => {
    if (hooks) {
      const str = (
        await Promise.all(
          hooks.map((hook) => {
            return hook(appName, {
              staticPaths,
            });
          }),
        )
      ).join("\n");
      return str;
    }
    return "";
  };

  if (wrapWithMainApp) {
    // 使用 mainApp 包装原始 app，兼容 Edge Runtime
    const appStr = `const modules = import.meta.glob([${globStr}], { import: 'default', eager: true })
      let added = false
      for (const [, app] of Object.entries(modules)) {
        if (app) {
          mainApp.all('*', (c) => {
            let executionCtx
            try {
              executionCtx = c.executionCtx
            } catch {}
            return app.fetch(c.req.raw, c.env, executionCtx)
          })
          mainApp.notFound((c) => {
            let executionCtx
            try {
              executionCtx = c.executionCtx
            } catch {}
            return app.fetch(c.req.raw, c.env, executionCtx)
          })
          added = true
        }
      }
      if (!added) {
        throw new Error("Can't import modules from [${globStr}]")
      }`;

    const defaultExportHook
      = options.entryContentDefaultExportHook ?? (() => "export default mainApp");

    return `import { Hono } from '${preset}'
const mainApp = new Hono()

${await hooksToString("mainApp", options.entryContentBeforeHooks)}

${appStr}

${await hooksToString("mainApp", options.entryContentAfterHooks)}

${await hooksToString("mainApp", [defaultExportHook])}`;
  }

  // 简化版：直接使用导入的 app，无 mainApp 包装
  const defaultExportHook
    = options.entryContentDefaultExportHook ?? (() => "export default app");

  return `const modules = import.meta.glob([${globStr}], { import: 'default', eager: true })
let app
for (const [, mod] of Object.entries(modules)) {
  if (mod) { app = mod; break }
}
if (!app) throw new Error("Can't import modules from [${globStr}]")

${await hooksToString("app", options.entryContentBeforeHooks)}

${await hooksToString("app", options.entryContentAfterHooks)}

${await hooksToString("app", [defaultExportHook])}`;
};

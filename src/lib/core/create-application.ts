import type { ApiReferenceConfiguration } from "@scalar/hono-api-reference";
import type { AppConfig, MiddlewareWithExcept, OpenAPIConfig, TierConfig, TierMiddleware } from "./define-config";
import type { AppOpenAPI } from "@/types/lib";

import { Scalar } from "@scalar/hono-api-reference";
import { except } from "hono/combine";

import env from "@/env";

import packageJSON from "../../../package.json" with { type: "json" };
import createApp, { createRouter } from "./create-app";

// ── Framework internal auto-scan (import.meta.glob requires relative paths) / 框架内部自动扫描（import.meta.glob 要求相对路径）──
const allRoutes = import.meta.glob<{ default: AppOpenAPI }>(
  "../../routes/**/*.index.ts",
  { eager: true },
);
const allMiddlewares = import.meta.glob<{ default: TierMiddleware[] }>(
  "../../routes/*/_middleware.ts",
  { eager: true },
);

/** basePath resolution / basePath 解析 */
function resolveTierBasePath(tier: TierConfig, config: AppConfig): string {
  if (tier.basePath) return tier.basePath;
  const prefix = config.prefix ?? "/api";
  const version = config.version ? `/${config.version}` : "";
  if (tier.name === "public") return `${prefix}${version}`;
  return `${prefix}${version}/${tier.name}`;
}

/** Route matching (three modes) / 路由匹配（三种模式） */
function resolveTierRoutes(tier: TierConfig, _allRoutes: Record<string, { default: AppOpenAPI }>) {
  if (tier.routes) return tier.routes;
  const dirName = tier.routeDir ?? tier.name;
  return Object.fromEntries(
    Object.entries(_allRoutes).filter(([path]) => {
      const match = path.match(/\/routes\/([^/]+)\//);
      return match?.[1] === dirName;
    }),
  );
}

/** Middleware loading / 中间件加载 */
function resolveTierMiddlewares(
  tier: TierConfig,
  _allMiddlewares: Record<string, { default: TierMiddleware[] }>,
): TierMiddleware[] {
  if (tier.middlewares) return tier.middlewares;
  const dirName = tier.routeDir ?? tier.name;
  const key = Object.keys(_allMiddlewares)
    .find(k => k.includes(`/routes/${dirName}/_middleware.ts`));
  return key ? _allMiddlewares[key].default : [];
}

/** Type guard / 类型守卫 */
function isMiddlewareWithExcept(mw: TierMiddleware): mw is MiddlewareWithExcept {
  return typeof mw === "object" && "handler" in mw && "except" in mw;
}

/** OpenAPI enabled resolution / OpenAPI enabled 解析 */
function resolveEnabled(enabled: OpenAPIConfig["enabled"]): boolean {
  if (typeof enabled === "function") return enabled(env);
  if (typeof enabled === "boolean") return enabled;
  return env.NODE_ENV !== "production";
}

/** Configure OpenAPI doc for a single tier / 配置单个 tier 的 OpenAPI 文档 */
function configureAppDoc(router: AppOpenAPI, tier: TierConfig, config: AppConfig, docEndpoint: string) {
  const version = config.openapi?.version ?? "3.1.0";
  const docConfig = {
    openapi: version,
    info: { version: packageJSON.version, title: tier.title },
  };

  if (tier.token) {
    const securityName = `${tier.name}Bearer`;
    router.openAPIRegistry.registerComponent("securitySchemes", securityName, {
      type: "http",
      scheme: "bearer",
    });
    router.doc31(docEndpoint, { ...docConfig, security: [{ [securityName]: [] }] });
  }
  else {
    router.doc31(docEndpoint, docConfig);
  }
}

/** Configure Scalar documentation homepage / 配置 Scalar 文档主页 */
function configureScalarUI(
  app: AppOpenAPI,
  tierApps: Array<{ tier: TierConfig; basePath: string }>,
  config: AppConfig,
  docEndpoint: string,
) {
  const scalarConfig = config.openapi?.scalar ?? {};
  app.get("/", Scalar({
    ...scalarConfig as Partial<ApiReferenceConfiguration>,
    sources: tierApps.map(({ tier, basePath }, i) => ({
      title: tier.title,
      slug: tier.name,
      url: `${basePath}${docEndpoint}`,
      default: i === 0,
    })),
    authentication: {
      securitySchemes: Object.fromEntries(
        tierApps
          .filter(({ tier }) => tier.token)
          .map(({ tier }) => [`${tier.name}Bearer`, { token: tier.token! }]),
      ),
    },
  }));
}

/** Application builder / 应用构建器 */
export async function createApplication(config: AppConfig): Promise<AppOpenAPI> {
  const app = createApp();
  const openapiEnabled = resolveEnabled(config.openapi?.enabled);
  const docEndpoint = config.openapi?.docEndpoint ?? "/doc";

  const tierApps: Array<{ tierApp: AppOpenAPI; tier: TierConfig; basePath: string }> = [];

  for (const tier of config.tiers) {
    const basePath = resolveTierBasePath(tier, config);
    const tierApp = createRouter().basePath(basePath);

    // OpenAPI docs (registered before middlewares to avoid auth interception) / OpenAPI 文档（在中间件之前注册，避免被认证拦截）
    if (openapiEnabled) {
      configureAppDoc(tierApp, tier, config, docEndpoint);
    }

    // Inject tier basePath for downstream middleware use / 注入 tier basePath 供下游中间件使用
    tierApp.use("/*", async (c, next) => {
      c.set("tierBasePath", basePath);
      await next();
    });

    // Register middlewares / 注册中间件
    const middlewares = resolveTierMiddlewares(tier, allMiddlewares);
    for (const mw of middlewares) {
      if (isMiddlewareWithExcept(mw)) {
        tierApp.use("/*", except(mw.except, mw.handler));
      }
      else {
        tierApp.use("/*", mw);
      }
    }

    // Register routes / 注册路由
    const routes = resolveTierRoutes(tier, allRoutes);
    for (const mod of Object.values(routes)) {
      tierApp.route("/", mod.default);
    }

    tierApps.push({ tierApp, tier, basePath });
  }

  // Scalar documentation homepage / Scalar 文档主页
  if (openapiEnabled) {
    configureScalarUI(app, tierApps, config, docEndpoint);
  }

  // Sentry
  if (env.SENTRY_DSN) {
    const { sentry } = await import("@hono/sentry");
    app.use("*", sentry({ dsn: env.SENTRY_DSN }));
  }

  // Mount in tiers order / 按 tiers 顺序挂载
  for (const { tierApp } of tierApps) {
    app.route("/", tierApp);
  }

  return app;
}

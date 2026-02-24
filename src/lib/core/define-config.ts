import type { ApiReferenceConfiguration } from "@scalar/hono-api-reference";
import type { Context, MiddlewareHandler } from "hono";

import type { Env } from "@/env";
import type { AppOpenAPI } from "@/types/lib";

/** Middleware with conditional skip / 带条件跳过的中间件 */
export type MiddlewareWithExcept = {
  handler: MiddlewareHandler;
  except: (c: Context) => boolean;
};

/** Tier-level middleware / Tier 级中间件 */
export type TierMiddleware = MiddlewareHandler | MiddlewareWithExcept;

/** Tier configuration / Tier 配置 */
export type TierConfig = {
  name: string;
  title: string;
  token?: string;
  /** Custom URL prefix (overrides default prefix+version+name rule) / 自定义 URL 前缀（覆盖默认 prefix+version+name 规则） */
  basePath?: string;
  /**
   * Three modes for routes:
   * 1. Default: match routes/{name}/ directory by name
   * 2. routeDir: match routes/{routeDir}/ by custom directory name
   * 3. routes: explicitly pass import.meta.glob result, skip auto matching
   * 路由的三种模式：
   * 1. 默认：按 name 匹配 routes/{name}/ 目录
   * 2. routeDir：按自定义目录名匹配 routes/{routeDir}/
   * 3. routes：显式传入 import.meta.glob 结果，跳过自动匹配
   */
  routeDir?: string;
  routes?: Record<string, { default: AppOpenAPI }>;
  /** Explicitly provide middlewares (skip _middleware.ts auto-loading) / 显式提供中间件（跳过 _middleware.ts 自动加载） */
  middlewares?: TierMiddleware[];
};

/** OpenAPI documentation configuration / OpenAPI 文档配置 */
export type OpenAPIConfig = {
  enabled?: boolean | ((env: Env) => boolean);
  version?: string;
  /** Documentation endpoint path (default "/doc") / 文档端点路径（默认 "/doc"） */
  docEndpoint?: string;
  scalar?: Partial<ApiReferenceConfiguration>;
};

/** Application global configuration / 应用全局配置 */
export type AppConfig = {
  prefix?: string;
  version?: string;
  openapi?: OpenAPIConfig;
  tiers: TierConfig[];
};

export function defineConfig(config: AppConfig): AppConfig {
  return config;
}

export function defineMiddleware(middlewares: TierMiddleware[]): TierMiddleware[] {
  return middlewares;
}

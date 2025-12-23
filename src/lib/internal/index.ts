// 应用工厂
export { createRouter, createTestApp } from "./create-app";

export { default as createApp } from "./create-app";
// 速率限制
export { createRateLimiter, DEFAULT_RATE_LIMIT } from "./rate-limit-factory";

export type { RateLimitOptions } from "./rate-limit-factory";
// 单例管理
export {
  createAsyncSingleton,
  createLazySingleton,
  createSingleton,
  destroyAllSingletons,
  destroySingleton,
  getSingletonKeys,
  hasSingleton,
} from "./singleton";

// casbin 和 openapi 保持子目录导入方式
// import { enforcer } from "@/lib/internal/casbin";
// import { registerOpenAPI } from "@/lib/internal/openapi";

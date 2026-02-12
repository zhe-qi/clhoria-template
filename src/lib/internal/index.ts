// 应用工厂
export { createRouter } from "./create-app";

export { default as createApp } from "./create-app";
// 速率限制
export { createRateLimiter } from "./rate-limit-factory";

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

// casbin 保持子目录导入方式
// import { enforcer } from "@/lib/internal/casbin";

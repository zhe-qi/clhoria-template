/**
 * Singleton cache utility
 *
 * Solves the problem of duplicate initialization during Vite HMR, provides type-safe singleton management
 *
 * HMR Cache Guide
 *
 * To determine whether to cache in globalThis, ask yourself these 3 questions:
 *
 * 1. Does it maintain TCP/WebSocket long connections?
 *    Yes -> Must cache (PostgreSQL, Redis, WebSocket, gRPC)
 *
 * 2. Does it have internal state/timers/background tasks?
 *    Yes -> Must cache (PgBoss, task queues, timers, EventEmitter)
 *
 * 3. Is creation overhead significant? (initialization > 100ms or lots of configuration)
 *    Yes -> Recommended to cache (S3Client, Casbin, large config objects)
 *
 * If all 3 are No -> No caching needed
 *
 * 单例缓存工具
 *
 * 解决 Vite HMR 时重复初始化的问题，提供类型安全的单例管理
 *
 * HMR 缓存指南
 *
 * 判断是否需要缓存到 globalThis，问自己这 3 个问题：
 *
 * 1. 是否维护 TCP/WebSocket 长连接？
 *    ✅ 是 → 必须缓存（PostgreSQL, Redis, WebSocket, gRPC）
 *
 * 2. 是否有内部状态/定时器/后台任务？
 *    ✅ 是 → 必须缓存（PgBoss, 任务队列, 定时器, EventEmitter）
 *
 * 3. 创建开销是否很大？（初始化耗时 > 100ms 或有大量配置）
 *    ✅ 是 → 推荐缓存（S3Client, Casbin, 大型配置对象）
 *
 * 如果 3 个都是 ❌ → 不需要缓存
 */

type DestroyFn<T> = (instance: T) => void | Promise<void>;

type SingletonOptions<T> = {
  /** Optional destroy function for graceful shutdown / 可选的销毁函数，用于优雅关闭 */
  destroy?: DestroyFn<T>;
};

type SingletonEntry = {
  instance: unknown;
  destroy?: DestroyFn<unknown>;
};

// Use Symbol.for to ensure cross-module uniqueness, avoids maintaining types in global.d.ts
// 使用 Symbol.for 保证跨模块唯一性，避免在 global.d.ts 中维护类型
const SINGLETON_REGISTRY_KEY = Symbol.for("__singleton_registry__");

type GlobalWithRegistry = typeof globalThis & {
  [SINGLETON_REGISTRY_KEY]?: Map<string, SingletonEntry>;
};

/**
 * Get global singleton registry
 * 获取全局单例注册表
 */
function getRegistry(): Map<string, SingletonEntry> {
  const g = globalThis as GlobalWithRegistry;

  if (!g[SINGLETON_REGISTRY_KEY]) {
    g[SINGLETON_REGISTRY_KEY] = new Map();
  }

  return g[SINGLETON_REGISTRY_KEY];
}

/**
 * Create synchronous singleton
 * 创建同步单例
 *
 * @example
 * const redisClient = createSingleton('redis', () => new Redis(config), {
 *   destroy: (client) => client.quit(),
 * });
 */
export function createSingleton<T>(key: string, factory: () => T, options?: SingletonOptions<T>): T {
  const registry = getRegistry();

  if (!registry.has(key)) {
    const instance = factory();
    registry.set(key, {
      instance,
      destroy: options?.destroy as DestroyFn<unknown> | undefined,
    });
  }

  return registry.get(key)!.instance as T;
}

/**
 * Create lazy-initialized singleton (returns getter function)
 * 创建延迟初始化单例（返回 getter 函数）
 *
 * @example
 * const getQueryClient = createLazySingleton('postgres', () => postgres(url), {
 *   destroy: (sql) => sql.end(),
 * });
 * // Usage / 使用时
 * const client = getQueryClient();
 */
export function createLazySingleton<T>(key: string, factory: () => T, options?: SingletonOptions<T>): () => T {
  return () => createSingleton(key, factory, options);
}

/**
 * Create async singleton (returns Promise)
 * 创建异步单例（返回 Promise）
 *
 * @example
 * const enforcerPromise = createAsyncSingleton('casbin', async () => {
 *   const adapter = await DrizzleCasbinAdapter.newAdapter(db);
 *   return newEnforcer(model, adapter);
 * });
 */
export function createAsyncSingleton<T>(key: string, factory: () => Promise<T>, options?: SingletonOptions<T>): Promise<T> {
  const registry = getRegistry();

  if (!registry.has(key)) {
    // Store Promise immediately to avoid duplicate initialization on concurrent calls
    // 立即存入 Promise，避免并发调用时重复初始化
    const promise = factory().then((instance) => {
      // Update with resolved instance / 更新为已解析的实例
      registry.set(key, {
        instance,
        destroy: options?.destroy as DestroyFn<unknown> | undefined,
      });
      return instance;
    });

    // Store Promise first / 先存入 Promise
    registry.set(key, {
      instance: promise,
      destroy: options?.destroy as DestroyFn<unknown> | undefined,
    });
  }

  return registry.get(key)!.instance as Promise<T>;
}

/**
 * Destroy specified singleton
 * 销毁指定单例
 */
export async function destroySingleton(key: string): Promise<void> {
  const registry = getRegistry();
  const entry = registry.get(key);

  if (entry) {
    if (entry.destroy) {
      // If instance is a Promise, wait for resolution before destroying
      // 如果实例是 Promise，等待其解析后再销毁
      const instance = entry.instance instanceof Promise
        ? await entry.instance
        : entry.instance;
      await entry.destroy(instance);
    }
    registry.delete(key);
  }
}

/**
 * Destroy all singletons
 * 销毁所有单例
 */
export async function destroyAllSingletons(): Promise<void> {
  const registry = getRegistry();

  const destroyPromises = Array.from(registry.keys()).map(key =>
    destroySingleton(key).catch((error) => {
      console.error(`[单例]: 销毁 ${key} 失败`, error);
    }),
  );

  await Promise.all(destroyPromises);
}

/**
 * Synchronously get a registered singleton instance
 * Only returns completed instances, does not trigger creation
 * 同步获取已注册的单例实例
 * 仅返回已完成初始化的实例，不触发创建
 */
export function getSingleton<T>(key: string): T | undefined {
  const entry = getRegistry().get(key);
  return entry?.instance as T | undefined;
}

/**
 * Check if singleton exists
 * 检查单例是否存在
 */
export function hasSingleton(key: string): boolean {
  return getRegistry().has(key);
}

/**
 * Get all registered singleton keys (for debugging)
 * 获取所有已注册的单例键（用于调试）
 */
export function getSingletonKeys(): string[] {
  return Array.from(getRegistry().keys());
}

import type { Context } from "hono";

import type { AppBindings } from "@/types/lib";

/**
 * 从 Hono context 中批量获取值并返回严格类型安全的元组
 * @param c Hono context 对象
 * @param keys 要获取的键名数组
 * @returns 按照 keys 顺序返回对应值的元组
 */
export function pickContext<
  TKeys extends readonly (keyof AppBindings["Variables"])[],
>(
  c: Context<AppBindings>,
  keys: TKeys,
): {
  readonly [K in keyof TKeys]: TKeys[K] extends keyof AppBindings["Variables"]
    ? AppBindings["Variables"][TKeys[K]]
    : never;
} {
  return keys.map(key => c.get(key)) as any;
}

/**
 * 设置上下文数据到 Hono Context
 * @param c Hono Context
 * @param data 要设置的上下文数据
 */
export function setContextData(c: Context, data: Record<string, any>): void {
  Object.entries(data).forEach(([key, value]) => {
    c.set(key, value);
  });
}

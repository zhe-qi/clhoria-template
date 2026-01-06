import { createFactory } from "hono/factory";

import type { AppBindings } from "@/types/lib";

/**
 * Hono Factory 实例
 * 用于创建中间件和处理器，自动继承 AppBindings 类型
 */
export const factory = createFactory<AppBindings>();

/**
 * 创建中间件
 * 自动推断 c.get('jwtPayload') 等类型
 *
 * @example
 * ```typescript
 * export const myMiddleware = createMiddleware(async (c, next) => {
 *   const { roles } = c.get('jwtPayload') // 类型自动推断
 *   await next()
 * })
 * ```
 */
export const createMiddleware = factory.createMiddleware;

/**
 * 创建处理器数组
 * 用于在路由外部定义处理器时保持类型安全
 *
 * @example
 * ```typescript
 * const handlers = createHandlers(
 *   async (c) => c.json({ message: 'ok' })
 * )
 * ```
 */
export const createHandlers = factory.createHandlers;

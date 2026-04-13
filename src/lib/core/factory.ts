import type { AdminBindings, BaseBindings, ClientBindings } from "@/types/lib";

import { createFactory } from "hono/factory";

/** Generic tier factory / 通用 tier 工厂 */
export function createTierFactory<TBindings extends BaseBindings>() {
  return createFactory<TBindings>();
}

// ── Base factory (framework-level, no JWT assumption) / 基础工厂（框架级，不假设 JWT） ──
const baseFactory = createTierFactory<BaseBindings>();
export const createMiddleware = baseFactory.createMiddleware;
export const createHandlers = baseFactory.createHandlers;

// ── Admin factory / 管理端工厂 ──
const adminFactory = createTierFactory<AdminBindings>();

/**
 * Create admin middleware with AdminBindings type
 * c.get('jwtPayload') includes roles and sub
 * 创建管理端中间件，c.get('jwtPayload') 包含 roles 和 sub
 */
export const createAdminMiddleware = adminFactory.createMiddleware;
export const createAdminHandlers = adminFactory.createHandlers;

// ── Client factory / 客户端工厂 ──
const clientFactory = createTierFactory<ClientBindings>();

/**
 * Create client middleware with ClientBindings type
 * c.get('jwtPayload') includes sub only
 * 创建客户端中间件，c.get('jwtPayload') 仅包含 sub
 */
export const createClientMiddleware = clientFactory.createMiddleware;
export const createClientHandlers = clientFactory.createHandlers;

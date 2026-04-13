import type { RouteConfig as HonoRouteConfig, OpenAPIHono, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";
import type { JWTPayload } from "hono/utils/jwt/types";

// ── Base Variables (shared across all tiers) / 基础变量（所有 tier 共享） ──
export type BaseVariables = {
  /** Logger / 日志记录器 */
  logger: PinoLogger;
  /** Request ID / 请求 ID */
  requestId: string;
  /** Current tier's basePath, auto-injected by framework / 当前 tier 的 basePath，由框架自动注入 */
  tierBasePath: string;
};

// ── JWT Payload types / JWT 载荷类型 ──

/** Base JWT payload (shared by all authenticated tiers) / 基础 JWT 载荷（所有认证 tier 共享） */
export type BaseJwtPayload = JWTPayload & {
  /** User ID / 用户 ID */
  sub: string;
};

/** Client JWT payload / 客户端 JWT 载荷 */
export type ClientJwtPayload = BaseJwtPayload & {};

/** Admin JWT payload (with roles for RBAC) / 管理端 JWT 载荷（含 RBAC 角色） */
export type AdminJwtPayload = BaseJwtPayload & {
  /** User roles / 用户角色 */
  roles: string[];
};

// ── Per-Tier Bindings / 分层绑定 ──

/** Base bindings for framework infrastructure / 框架基础设施绑定 */
export type BaseBindings = {
  Variables: BaseVariables;
};

/**
 * Reusable authenticated bindings primitive / 可复用的认证型 bindings 原语
 *
 * Custom tier example / 自定义 tier 示例：
 * type PartnerJwtPayload = BaseJwtPayload & { partnerId: string };
 * type PartnerBindings = JwtBindings<PartnerJwtPayload>;
 */
export type JwtBindings<TPayload extends BaseJwtPayload = BaseJwtPayload> = {
  Variables: BaseVariables & { jwtPayload: TPayload };
};

/** Admin tier bindings (JWT with roles + RBAC) / 管理端绑定（带角色的 JWT + RBAC） */
export type AdminBindings = JwtBindings<AdminJwtPayload>;

/** Client tier bindings (JWT with sub only) / 客户端绑定（仅含 sub 的 JWT） */
export type ClientBindings = JwtBindings<ClientJwtPayload>;

/** Public tier bindings (no JWT) / 公开端绑定（无 JWT） */
export type PublicBindings = BaseBindings;

/** Generic OpenAPI app type for arbitrary tier bindings / 任意 tier bindings 的通用 OpenAPI 类型 */
// eslint-disable-next-line ts/no-empty-object-type
export type OpenAPIWithBindings<TBindings extends BaseBindings, S extends Schema = {}> = OpenAPIHono<TBindings, S>;

/** Generic route handler type for arbitrary tier bindings / 任意 tier bindings 的通用路由处理器类型 */
export type RouteHandlerWithBindings<R extends HonoRouteConfig, TBindings extends BaseBindings> = RouteHandler<R, TBindings>;

// ── OpenAPI app types / OpenAPI 应用类型 ──

// eslint-disable-next-line ts/no-empty-object-type
export type AdminOpenAPI<S extends Schema = {}> = OpenAPIWithBindings<AdminBindings, S>;
// eslint-disable-next-line ts/no-empty-object-type
export type ClientOpenAPI<S extends Schema = {}> = OpenAPIWithBindings<ClientBindings, S>;
// eslint-disable-next-line ts/no-empty-object-type
export type PublicOpenAPI<S extends Schema = {}> = OpenAPIWithBindings<PublicBindings, S>;

// ── Route handler types / 路由处理器类型 ──

export type AdminRouteHandler<R extends HonoRouteConfig> = RouteHandlerWithBindings<R, AdminBindings>;
export type ClientRouteHandler<R extends HonoRouteConfig> = RouteHandlerWithBindings<R, ClientBindings>;
export type PublicRouteHandler<R extends HonoRouteConfig> = RouteHandlerWithBindings<R, PublicBindings>;

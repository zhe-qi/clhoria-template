---
name: create-tier
description: 创建或修改一个新的 API tier。当用户请求“新增 tier / 创建 partner tier / 新增 merchant 端 / 新增 tenant 端 / 新增 API 端 / 新增一套路由层”时使用。目标是在不修改框架核心的前提下，为新 tier 补齐配置、中间件、类型别名、路由入口和测试。
argument-hint: "[tier-name]"
---

# 新增 Tier 指南

## 核心原则

1. 新增 tier 优先在业务侧组合，不要为了一个新 tier 回改框架核心。
2. admin、client、public 是预置别名，不是唯一扩展入口。
3. 只有在“所有 tier 都共享的新能力”出现时，才允许修改核心文件。

当前可复用的扩展原语：

- 类型原语：`BaseJwtPayload`、`JwtBindings`、`RouteHandlerWithBindings`、`OpenAPIWithBindings`
- 运行时原语：`createTierRouter`、`createTierFactory`、`defineMiddleware`

默认不要修改这些核心文件：

- `src/types/lib.d.ts`
- `src/lib/core/create-app.ts`
- `src/lib/core/factory.ts`

## 先做判断

| 场景 | 是否 JWT | 推荐 bindings | 备注 |
|------|----------|---------------|------|
| 公开 tier | 否 | `PublicBindings` 或 `BaseBindings` | 没有 `jwtPayload` |
| 认证 tier，仅需 `sub` | 是 | `JwtBindings` 或 `ClientBindings` | 默认只带 `sub` |
| 认证 tier，有额外 claims | 是 | `JwtBindings<CustomJwtPayload>` | 例如 `partnerId`、`tenantId` |
| 带角色的 tier | 是 | `JwtBindings<CustomPayload & { roles: string[] }>` | 不要默认复用 admin 语义 |

如果只是“另一个业务端”，通常不需要把它加进全局核心类型，只需要在该 tier 目录下定义本地 alias。

## 推荐文件布局

```text
src/routes/{tier}/
├── _middleware.ts
├── {tier}.types.ts
├── {tier}.factory.ts
└── {feature}/
    ├── {feature}.index.ts
    ├── {feature}.routes.ts
    ├── {feature}.handlers.ts
    ├── {feature}.types.ts
    └── __tests__/
```

约定：

- `{tier}.types.ts` 只放 tier 级 payload / bindings / route handler alias
- `{tier}.factory.ts` 只放 tier 级 router / middleware / handlers alias
- 业务模块继续放在 `src/routes/{tier}/{feature}/` 或 `src/routes/{tier}/{category}/{feature}/`

## 标准步骤

### 1. 在 `app.config.ts` 注册 tier

先补文档入口和路由装配配置：

```ts
// app.config.ts
{
  name: "partner",
  title: "合作方 API 文档",
  token: "your-partner-token",
}
```

可选字段：

- `basePath`: 自定义路径前缀
- `routeDir`: 当目录名和 tier 名不同
- `middlewares`: 显式传入中间件，跳过 `src/routes/{tier}/_middleware.ts`

### 2. 如果是 JWT tier，先补环境变量

在 `src/env.ts` 增加对应 secret，例如：

```ts
PARTNER_JWT_SECRET: z.string().min(32, "JWT密钥长度至少32字符,建议使用强随机字符串"),
```

同时同步 `.env` / `.env.test` 的实际值。

### 3. 定义 tier 本地类型别名

优先在 `src/routes/{tier}/{tier}.types.ts` 定义，而不是回到 `src/types/lib.d.ts` 增加一个全局业务类型。

认证 tier 示例：

```ts
// src/routes/partner/partner.types.ts
import type { RouteConfig as HonoRouteConfig } from "@hono/zod-openapi";
import type {
  BaseJwtPayload,
  JwtBindings,
  RouteHandlerWithBindings,
} from "@/types/lib";

export type PartnerJwtPayload = BaseJwtPayload & {
  partnerId: string;
};

export type PartnerBindings = JwtBindings<PartnerJwtPayload>;
export type PartnerRouteHandler<R extends HonoRouteConfig>
  = RouteHandlerWithBindings<R, PartnerBindings>;
```

公开 tier 示例：

```ts
// src/routes/portal/portal.types.ts
import type { PublicBindings, RouteHandlerWithBindings } from "@/types/lib";
import type { RouteConfig as HonoRouteConfig } from "@hono/zod-openapi";

export type PortalBindings = PublicBindings;
export type PortalRouteHandler<R extends HonoRouteConfig>
  = RouteHandlerWithBindings<R, PortalBindings>;
```

如果 tier 除了 `jwtPayload` 还需要额外上下文变量，可以直接组合 `BaseVariables`：

```ts
import type { BaseVariables, BaseJwtPayload } from "@/types/lib";

type PartnerJwtPayload = BaseJwtPayload & { partnerId: string };

export type PartnerBindings = {
  Variables: BaseVariables & {
    jwtPayload: PartnerJwtPayload;
    partnerCode: string;
  };
};
```

### 4. 定义 tier 本地 factory alias

在 `src/routes/{tier}/{tier}.factory.ts` 本地封装，不要把 `createPartnerRouter` 之类的东西加回核心。

```ts
// src/routes/partner/partner.factory.ts
import { createTierRouter } from "@/lib/core/create-app";
import { createTierFactory } from "@/lib/core/factory";

import type { PartnerBindings } from "./partner.types";

const partnerFactory = createTierFactory<PartnerBindings>();

export const createPartnerMiddleware = partnerFactory.createMiddleware;
export const createPartnerHandlers = partnerFactory.createHandlers;

export function createPartnerRouter() {
  return createTierRouter<PartnerBindings>();
}
```

### 5. 编写 tier 级中间件

默认放在 `src/routes/{tier}/_middleware.ts`，由框架自动加载。

认证 tier 示例：

```ts
// src/routes/partner/_middleware.ts
import { jwt } from "hono/jwt";

import env from "@/env";
import { defineMiddleware } from "@/lib/core/define-config";

export default defineMiddleware([
  jwt({ secret: env.PARTNER_JWT_SECRET, alg: "HS256" }),
]);
```

带白名单跳过时，使用 `{ handler, except }`：

```ts
export default defineMiddleware([
  {
    handler: jwt({ secret: env.PARTNER_JWT_SECRET, alg: "HS256" }),
    except: c => c.req.path.endsWith("/auth/login"),
  },
]);
```

只有当业务语义完全一致时，才复用 admin 的 `authorize`、`operationLog`。不要因为“也有角色”就直接套 admin 中间件。

### 6. 创建业务路由模块

入口文件使用本地 tier router：

```ts
// src/routes/partner/orders/orders.index.ts
import { createPartnerRouter } from "../partner.factory";

import * as handlers from "./orders.handlers";
import * as routes from "./orders.routes";

export default createPartnerRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.get, handlers.get);
```

模块类型文件继续基于 tier alias：

```ts
// src/routes/partner/orders/orders.types.ts
import type * as routes from "./orders.routes";
import type { PartnerRouteHandler } from "../partner.types";

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type PartnerOrdersRouteHandlerType<T extends keyof RouteTypes>
  = PartnerRouteHandler<RouteTypes[T]>;
```

### 7. 测试与验证

至少做下面这些：

1. 为新 tier 的核心路由补 `__tests__`
2. 如果 tier 使用了自定义 claims，补一个类型测试，验证 `c.get("jwtPayload")` 的字段推断正确
3. 运行 `pnpm typecheck`
4. 运行 `pnpm test --run`

可参考现有的组合测试思路：`src/lib/core/__tests__/tier-composition.test.ts`

## 最小示例：新增 partner tier

目标：新增一个带 `partnerId` claim 的合作方端。

最少需要改这些地方：

1. `app.config.ts` 新增 `{ name: "partner", title, token }`
2. `src/env.ts` 增加 `PARTNER_JWT_SECRET`
3. 新建 `src/routes/partner/partner.types.ts`
4. 新建 `src/routes/partner/partner.factory.ts`
5. 新建 `src/routes/partner/_middleware.ts`
6. 在 `src/routes/partner/...` 下创建业务模块
7. 补测试并执行 `pnpm typecheck && pnpm test --run`

注意：这整个流程默认不需要修改：

- `src/types/lib.d.ts`
- `src/lib/core/create-app.ts`
- `src/lib/core/factory.ts`

## 反模式

不要这样做：

1. 每新增一个 tier，就往 `src/lib/core/create-app.ts` 加一个 `createXxxRouter`
2. 每新增一个 tier，就往 `src/lib/core/factory.ts` 加一个 `createXxxMiddleware`
3. 每新增一个 tier，就往 `src/types/lib.d.ts` 塞一个业务专属全局类型
4. 非 admin tier 直接复用 `AdminBindings` 或 admin 专属中间件
5. 忘记补 `src/env.ts` 和测试环境 secret

## 执行时的工作顺序

当用户要求“新增一个 tier”时，按下面顺序执行：

1. 先判断 tier 是公开、基础认证还是自定义 claims
2. 再决定是否需要新增 env secret
3. 在 `app.config.ts` 注册 tier
4. 在 `src/routes/{tier}/` 下创建本地 types / factory / middleware
5. 再创建业务模块和测试
6. 最后执行类型检查和测试

如果过程中发现自己想改核心文件，先停一下，确认这是不是“所有 tier 共享的新能力”；如果不是，就回到本地组合方案。

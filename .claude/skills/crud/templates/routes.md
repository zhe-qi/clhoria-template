# Routes 模板

## 标准路由文件

```typescript
// {feature}.routes.ts
import { createRoute } from "@hono/zod-openapi";
import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";
import {
  {feature}CreateSchema,
  {feature}IdParams,
  {feature}ListResponse,
  {feature}PatchSchema,
  {feature}QuerySchema,
  {feature}ResponseSchema,
} from "./{feature}.schema";

const routePrefix = "/{category}/{feature}s";
const tags = [`${routePrefix}（{Feature}管理）`];

/** 获取列表 */
export const list = createRoute({
  tags,
  summary: "获取{Feature}列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema.extend({feature}QuerySchema.shape),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema({feature}ListResponse),
      "列表响应成功"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      respErrSchema,
      "查询参数验证错误"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      respErrSchema,
      "服务器内部错误"
    ),
  },
});

/** 创建 */
export const create = createRoute({
  tags,
  summary: "创建{Feature}",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired({feature}CreateSchema, "创建参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      RefineResultSchema({feature}ResponseSchema),
      "创建成功"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      respErrSchema,
      "参数验证失败"
    ),
  },
});

/** 获取详情 */
export const get = createRoute({
  tags,
  summary: "获取{Feature}详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: {feature}IdParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema({feature}ResponseSchema),
      "获取成功"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "数据不存在"),
  },
});

/** 更新 */
export const update = createRoute({
  tags,
  summary: "更新{Feature}",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: {feature}IdParams,
    body: jsonContentRequired({feature}PatchSchema, "更新参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema({feature}ResponseSchema),
      "更新成功"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "数据不存在"),
  },
});

/** 删除 */
export const remove = createRoute({
  tags,
  summary: "删除{Feature}",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: {feature}IdParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema({feature}IdParams),
      "删除成功"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "数据不存在"),
  },
});
```

## Index 入口文件

```typescript
// {feature}.index.ts
import { createRouter } from "@/lib/internal/create-app";
import * as handlers from "./{feature}.handlers";
import * as routes from "./{feature}.routes";

const {feature}Router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.get, handlers.get)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default {feature}Router;
```

## 路由注册

路由通过 `import.meta.glob` 自动加载，无需手动注册。确保文件命名为 `{feature}.index.ts`。

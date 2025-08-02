import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { selectTsLoginLogSchema } from "@/db/schema";
import { PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const routePrefix = "/system/login-log";
const tags = [`${routePrefix}（登录日志）`];

const loginLogQuerySchema = PaginationParamsSchema.extend({
  search: z.string().optional().describe("搜索关键词"),
});

/** 获取登录日志列表 */
export const list = createRoute({
  tags,
  method: "get",
  path: routePrefix,
  permission: {
    resource: PermissionResource.SYSTEM_LOGIN_LOG,
    action: PermissionAction.READ,
  },
  summary: "获取登录日志列表",
  request: {
    query: loginLogQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectTsLoginLogSchema),
      "登录日志列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(loginLogQuerySchema),
      "参数验证失败",
    ),
  },
});

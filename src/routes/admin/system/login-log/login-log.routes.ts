import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { selectTsLoginLogSchema } from "@/db/schema";
import { PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const routePrefix = "/system/login-log";
const tags = [`${routePrefix}（登录日志）`];

/** 获取登录日志列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_LOGIN_LOG,
    action: PermissionAction.READ,
  },
  summary: "获取登录日志列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema<typeof selectTsLoginLogSchema>(selectTsLoginLogSchema),
      "登录日志列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

import { createRoute } from "@hono/zod-openapi";

import { selectTsLoginLogSchema } from "@/db/schema";
import { PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";

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
      GetPaginatedResultSchema(selectTsLoginLogSchema),
      "登录日志列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

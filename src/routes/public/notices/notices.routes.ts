import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  noticeTypeSchema,
  responseSystemNoticesSchema,
} from "@/db/schema";
import { notFoundSchema } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils/zod/schemas";

const prefix = "/public-notices";
const tags = [`${prefix} (通知公告)`];

const ListQuerySchema = PaginationParamsSchema.extend({
  type: noticeTypeSchema.optional().describe("公告类型"),
  domain: z.string().optional().describe("域名，默认为default"),
}).partial({
  page: true,
  limit: true,
});

/** 获取通知公告列表 */
export const list = createRoute({
  tags,
  summary: "获取通知公告列表",
  method: "get",
  path: `${prefix}`,
  request: {
    query: ListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseSystemNoticesSchema).or(z.array(responseSystemNoticesSchema)),
      "获取通知公告列表成功，有分页参数时返回分页结果，无分页参数时返回数组",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ListQuerySchema),
      "查询参数错误",
    ),
  },
});

/** 根据ID获取单个通知公告 */
export const get = createRoute({
  tags,
  summary: "获取单个通知公告",
  method: "get",
  path: `${prefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    query: z.object({
      domain: z.string().optional().describe("域名，默认为default"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemNoticesSchema,
      "获取通知公告成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "公告ID格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "通知公告不存在或未启用",
    ),
  },
});

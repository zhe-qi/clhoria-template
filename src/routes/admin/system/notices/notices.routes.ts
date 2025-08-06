import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  insertSystemNoticesSchema,
  noticeTypeSchema,
  patchSystemNoticesSchema,
  responseSystemNoticesSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils/zod/schemas";

const routePrefix = "/system/notices";
const tags = [`${routePrefix}（通知公告管理）`];

// 管理员创建通知公告的请求体，不包含domain字段（从用户上下文获取）
const adminCreateNoticeSchema = insertSystemNoticesSchema.omit({ domain: true });

const ListQuerySchema = PaginationParamsSchema.extend({
  search: z.string().optional().meta({ description: "搜索关键词（标题、内容）" }),
  type: noticeTypeSchema.optional().meta({ description: "公告类型" }),
  status: z.enum(["0", "1"]).optional().meta({ description: "公告状态: 1=启用 0=禁用" }),
});

/** 获取通知公告列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_NOTICES,
    action: PermissionAction.READ,
  },
  summary: "获取通知公告列表（分页）",
  method: "get",
  path: routePrefix,
  request: {
    query: ListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseSystemNoticesSchema),
      "获取通知公告列表成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ListQuerySchema),
      "查询参数错误",
    ),
  },
});

/** 获取单个通知公告详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_NOTICES,
    action: PermissionAction.READ,
  },
  summary: "获取单个通知公告详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
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
      "通知公告不存在",
    ),
  },
});

/** 创建通知公告 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_NOTICES,
    action: PermissionAction.CREATE,
  },
  summary: "创建通知公告",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      adminCreateNoticeSchema,
      "创建通知公告参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseSystemNoticesSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(adminCreateNoticeSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemNoticesSchema),
      "数据验证失败",
    ),
  },
});

/** 更新通知公告 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_NOTICES,
    action: PermissionAction.UPDATE,
  },
  summary: "更新通知公告",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemNoticesSchema,
      "更新通知公告参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemNoticesSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemNoticesSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "通知公告不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSystemNoticesSchema),
      "数据验证失败",
    ),
  },
});

/** 删除通知公告 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_NOTICES,
    action: PermissionAction.DELETE,
  },
  summary: "删除通知公告",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "公告ID格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "通知公告不存在",
    ),
  },
});

import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSystemDomainSchema, patchSystemDomainSchema, selectSystemDomainSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/domains";
const tags = [`${routePrefix}（系统域）`];

/** 获取系统域分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DOMAINS,
    action: PermissionAction.READ,
  },
  summary: "获取系统域列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().meta({ describe: "搜索关键词" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSystemDomainSchema),
      "系统域列表响应成功",
    ),
  },
});

/** 创建系统域 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DOMAINS,
    action: PermissionAction.CREATE,
  },
  summary: "创建系统域",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemDomainSchema,
      "创建系统域参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSystemDomainSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSystemDomainSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemDomainSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemDomainSchema),
      "域代码已存在",
    ),
  },
});

/** 根据ID获取系统域详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DOMAINS,
    action: PermissionAction.READ,
  },
  summary: "获取系统域详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemDomainSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "域不存在",
    ),
  },
});

/** 更新系统域 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DOMAINS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新系统域",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemDomainSchema,
      "更新系统域参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemDomainSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemDomainSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "域不存在",
    ),
  },
});

/** 删除系统域 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DOMAINS,
    action: PermissionAction.DELETE,
  },
  summary: "删除系统域",
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
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "域不存在",
    ),
  },
});

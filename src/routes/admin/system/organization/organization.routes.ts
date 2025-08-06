import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { insertSystemOrganizationSchema, patchSystemOrganizationSchema, selectSystemOrganizationSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/organization";
const tags = [`${routePrefix}（组织管理）`];

/** 获取组织分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.READ,
  },
  summary: "获取组织列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().meta({ describe: "搜索关键词" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSystemOrganizationSchema),
      "组织列表响应成功",
    ),
  },
});

/** 获取组织树形结构 */
export const tree = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.READ,
  },
  summary: "获取组织树形结构",
  method: "get",
  path: `${routePrefix}/tree`,
  request: {
    query: z.object({
      status: z.coerce.number().int().optional().meta({ describe: "组织状态: 1=启用 0=禁用" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSystemOrganizationSchema.extend({
        children: z.array(selectSystemOrganizationSchema).optional(),
      })),
      "组织树形结构响应成功",
    ),
  },
});

/** 创建组织 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.CREATE,
  },
  summary: "创建组织",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemOrganizationSchema,
      "创建组织参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSystemOrganizationSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSystemOrganizationSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemOrganizationSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemOrganizationSchema),
      "组织代码已存在",
    ),
  },
});

/** 根据ID获取组织详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.READ,
  },
  summary: "获取组织详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemOrganizationSchema,
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
      "组织不存在",
    ),
  },
});

/** 更新组织 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.UPDATE,
  },
  summary: "更新组织",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemOrganizationSchema,
      "更新组织参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemOrganizationSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createMessageObjectSchema("Bad Request"),
      "请求参数错误或循环引用",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSystemOrganizationSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "组织不存在",
    ),
  },
});

/** 删除组织 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ORGANIZATION,
    action: PermissionAction.DELETE,
  },
  summary: "删除组织",
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
      "ID参数错误或存在子组织",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "组织不存在",
    ),
  },
});

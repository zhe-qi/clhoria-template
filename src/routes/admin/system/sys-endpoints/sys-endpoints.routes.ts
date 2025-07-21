import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";

import { insertSysEndpointSchema, patchSysEndpointSchema, selectSysEndpointSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

// 查询API端点列表
export const list = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:read",
  summary: "获取API端点列表",
  method: "get",
  path: "/sys-endpoints",
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().describe("搜索关键词"),
      method: z.string().optional().describe("HTTP方法过滤"),
      action: z.string().optional().describe("动作过滤"),
      resource: z.string().optional().describe("资源过滤"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSysEndpointSchema),
      "API端点列表响应成功",
    ),
  },
});

// 树形结构查询API端点
export const tree = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:read",
  summary: "获取API端点树形结构",
  method: "get",
  path: "/sys-endpoints/tree",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysEndpointSchema.extend({
        children: z.array(z.any()).optional().describe("子端点"),
      })),
      "API端点树形结构响应成功",
    ),
  },
});

// 获取角色授权的API端点
export const authEndpoints = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:read",
  summary: "获取角色授权的API端点",
  method: "get",
  path: "/sys-endpoints/auth/{roleCode}",
  request: {
    params: z.object({
      roleCode: z.string().describe("角色代码"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysEndpointSchema),
      "角色授权的API端点列表",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

// 创建API端点
export const create = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:create",
  summary: "创建API端点",
  method: "post",
  path: "/sys-endpoints",
  request: {
    body: jsonContentRequired(
      insertSysEndpointSchema,
      "创建API端点参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSysEndpointSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysEndpointSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysEndpointSchema),
      "API端点已存在",
    ),
  },
});

// 获取单个API端点
export const get = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:read",
  summary: "获取API端点详情",
  method: "get",
  path: "/sys-endpoints/{id}",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysEndpointSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API端点不存在",
    ),
  },
});

// 更新API端点
export const update = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:update",
  summary: "更新API端点",
  method: "patch",
  path: "/sys-endpoints/{id}",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSysEndpointSchema,
      "更新API端点参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysEndpointSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSysEndpointSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchSysEndpointSchema),
      "API端点路径已存在",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API端点不存在",
    ),
  },
});

// 删除API端点
export const remove = createRoute({
  tags: ["/sys-endpoints (API端点)"],
  operationId: "sysEndpoints:delete",
  summary: "删除API端点",
  method: "delete",
  path: "/sys-endpoints/{id}",
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
      "API端点不存在",
    ),
  },
});

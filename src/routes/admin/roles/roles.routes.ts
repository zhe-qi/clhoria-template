import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

import { insertAdminRolesSchema, patchAdminRolesSchema, selectAdminRolesSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["后台管理-角色管理"];

export const list = createRoute({
  path: "/roles",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "获取角色列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectAdminRolesSchema),
      "分页角色列表",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

export const create = createRoute({
  path: "/roles",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertAdminRolesSchema,
      "创建角色参数",
    ),
  },
  tags,
  summary: "创建角色",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminRolesSchema,
      "创建角色成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertAdminRolesSchema),
      "请求参数验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/roles/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "获取角色详情",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminRolesSchema,
      "请求角色成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

export const patch = createRoute({
  path: "/roles/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchAdminRolesSchema,
      "更新角色参数",
    ),
  },
  tags,
  summary: "更新角色",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminRolesSchema,
      "更新角色成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchAdminRolesSchema)
        .or(createErrorSchema(IdParamsSchema)),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/roles/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "删除角色",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

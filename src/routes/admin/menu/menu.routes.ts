import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertMenuSchema, patchMenuSchema, selectMenuSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/menu (菜单管理)"];

export const list = createRoute({
  path: "/menu",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "获取菜单列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectMenuSchema),
      "列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

export const create = createRoute({
  path: "/menu",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertMenuSchema,
      "创建参数",
    ),
  },
  tags,
  summary: "创建菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectMenuSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertMenuSchema),
      "创建请求体验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/menu/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  summary: "获取菜单详情",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectMenuSchema,
      "请求成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const patch = createRoute({
  path: "/menu/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchMenuSchema,
      "更新参数",
    ),
  },
  tags,
  summary: "更新菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectMenuSchema,
      "更新成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchMenuSchema)
        .or(createErrorSchema(z.object({
          id: z.string(),
        }))),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/menu/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  summary: "删除菜单",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

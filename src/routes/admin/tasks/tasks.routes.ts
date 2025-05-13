import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

import { insertTasksSchema, patchTasksSchema, selectTasksSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["后台管理-任务管理"];

export const list = createRoute({
  path: "/tasks",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "获取任务列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectTasksSchema),
      "分页任务列表",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

export const create = createRoute({
  path: "/tasks",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertTasksSchema,
      "创建任务参数",
    ),
  },
  tags,
  summary: "创建任务",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTasksSchema,
      "创建任务成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertTasksSchema),
      "请求参数验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/tasks/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "获取任务详情",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTasksSchema,
      "请求任务成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "任务不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

export const patch = createRoute({
  path: "/tasks/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchTasksSchema,
      "更新任务参数",
    ),
  },
  tags,
  summary: "更新任务",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTasksSchema,
      "更新任务成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "任务不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchTasksSchema)
        .or(createErrorSchema(IdParamsSchema)),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/tasks/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "删除任务",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "任务不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

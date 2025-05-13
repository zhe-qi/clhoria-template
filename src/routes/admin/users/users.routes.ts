import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

import { insertUsersSchema, patchUsersSchema, selectUsersSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["Admin-Users"];

export const list = createRoute({
  path: "/users",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "/users 用户列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectUsersSchema),
      "分页用户列表",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

export const create = createRoute({
  path: "/users",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertUsersSchema,
      "创建用户请求",
    ),
  },
  tags,
  summary: "/users 创建用户",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUsersSchema,
      "创建用户响应",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertUsersSchema),
      "创建用户请求体验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/users/{id}",
  method: "get",
  request: {
    params: IdParamsSchema.extend({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "/users/{id} 请求用户",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUsersSchema,
      "请求用户响应",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

export const patch = createRoute({
  path: "/users/{id}",
  method: "patch",
  request: {
    params: IdParamsSchema.extend({
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchUsersSchema,
      "更新用户请求",
    ),
  },
  tags,
  summary: "/users/{id} 更新用户",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUsersSchema,
      "更新用户响应",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchUsersSchema)
        .or(createErrorSchema(IdParamsSchema)),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/users/{id}",
  method: "delete",
  request: {
    params: IdParamsSchema.extend({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "/users/{id} 删除用户",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "请求参数验证错误",
    ),
  },
});

import { createRoute, z } from "@hono/zod-openapi";

import { insertRolesSchema, patchRolesSchema, selectRolesSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";

const tags = ["/roles (角色管理)"];

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
      GetPaginatedResultSchema(selectRolesSchema),
      "列表响应成功",
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
      insertRolesSchema,
      "创建参数",
    ),
  },
  tags,
  summary: "创建角色",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectRolesSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertRolesSchema),
      "创建请求体验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/roles/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  summary: "获取角色详情",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectRolesSchema,
      "请求成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
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
  path: "/roles/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchRolesSchema,
      "更新参数",
    ),
  },
  tags,
  summary: "更新角色",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectRolesSchema,
      "更新成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchRolesSchema)
        .or(createErrorSchema(z.object({
          id: z.string(),
        }))),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/roles/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.string(),
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
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const getPermissions = createRoute({
  path: "/roles/{id}/permissions",
  method: "get",
  request: {
    params: z.object({
      id: z.string(),
    }),
    query: z.object({
      include: z.enum(["direct", "inherited", "inheritable", "combined"]).array().optional(),
    }),
  },
  tags,
  summary: "获取角色权限信息",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        direct: z.array(z.object({
          obj: z.string(),
          act: z.string(),
        })).optional(),
        inherited: z.array(z.object({
          obj: z.string(),
          act: z.string(),
        })).optional(),
        inheritable: z.array(z.object({
          role: z.string(),
          name: z.string(),
        })).optional(),
        combined: z.array(z.object({
          obj: z.string(),
          act: z.string(),
        })).optional(),
      }),
      "请求成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const addPermissions = createRoute({
  path: "/roles/{id}/permissions",
  method: "post",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        permissions: z.array(z.object({
          obj: z.string(),
          act: z.string(),
        })),
      }),
      "添加权限参数",
    ),
  },
  tags,
  summary: "添加角色直接权限",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      "添加成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const addInherits = createRoute({
  path: "/roles/{id}/inherits",
  method: "post",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        roles: z.array(z.string()),
      }),
      "添加继承关系参数",
    ),
  },
  tags,
  summary: "添加角色继承关系",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      "添加成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const removePermissions = createRoute({
  path: "/roles/{id}/permissions",
  method: "delete",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        permissions: z.array(z.object({
          obj: z.string(),
          act: z.string(),
        })),
      }),
      "删除权限参数",
    ),
  },
  tags,
  summary: "删除角色直接权限",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      "删除成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export const removeInherits = createRoute({
  path: "/roles/{id}/inherits",
  method: "delete",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        roles: z.array(z.string()),
      }),
      "删除继承关系参数",
    ),
  },
  tags,
  summary: "删除角色继承关系",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      "删除成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.string(),
      })),
      "请求参数验证错误",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetPermissionsRoute = typeof getPermissions;
export type AddPermissionsRoute = typeof addPermissions;
export type AddInheritsRoute = typeof addInherits;
export type RemovePermissionsRoute = typeof removePermissions;
export type RemoveInheritsRoute = typeof removeInherits;

import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { respErr } from "@/utils";

import { idAdminSystemRole, insertAdminSystemRole, patchAdminSystemRole, selectAdminSystemRole } from "./schema";

const routePrefix = "/system/role";
const tags = [`${routePrefix}（系统角色）`];

/** 获取系统角色分页列表 */
export const list = createRoute({
  tags,
  summary: "获取系统角色列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.array(selectAdminSystemRole)),
      "列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

/** 创建系统角色 */
export const create = createRoute({
  tags,
  summary: "创建系统角色",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertAdminSystemRole,
      "创建系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      RefineResultSchema(selectAdminSystemRole),
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "请求参数错误"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "参数验证失败"),
    [HttpStatusCodes.CONFLICT]: jsonContent(respErr, "角色代码已存在"),
  },
});

/** 根据ID获取系统角色详情 */
export const get = createRoute({
  tags,
  summary: "获取系统角色详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: idAdminSystemRole,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(selectAdminSystemRole),
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "角色不存在"),
  },
});

/** 更新系统角色 */
export const update = createRoute({
  tags,
  summary: "更新系统角色",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: idAdminSystemRole,
    body: jsonContentRequired(
      patchAdminSystemRole,
      "更新系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(selectAdminSystemRole),
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "请求参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "角色不存在"),
  },
});

/** 删除系统角色 */
export const remove = createRoute({
  tags,
  summary: "删除系统角色",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: idAdminSystemRole,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(idAdminSystemRole),
      "删除成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "角色不存在"),
  },
});

/** 获取角色权限 */
export const getPermissions = createRoute({
  tags,
  summary: "获取角色权限",
  method: "get",
  path: `${routePrefix}/{id}/permissions`,
  request: {
    params: idAdminSystemRole,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.array(z.array(z.string()))),
      "获取权限成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "ID参数错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "获取权限失败"),
  },
});

export const savePermissions = createRoute({
  tags,
  summary: "保存角色权限（全量更新）",
  method: "put",
  path: `${routePrefix}/{id}/permissions`,
  request: {
    params: idAdminSystemRole,
    body: jsonContentRequired(
      z.object({
        permissions: z.array(
          z.tuple([
            z.string().min(1).meta({ description: "资源" }),
            z.string().min(1).meta({ description: "操作" }),
          ]),
        ).meta({ description: "权限列表（全量）" }),
      }),
      "保存权限参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({
        added: z.number().int().meta({ description: "新增权限数量" }),
        removed: z.number().int().meta({ description: "删除权限数量" }),
        total: z.number().int().meta({ description: "总权限数量" }),
      })),
      "保存权限成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "角色不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "保存权限失败"),
  },
});

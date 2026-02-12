import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { downloadTokenRequestSchema, tokenResponseSchema, uploadTokenRequestSchema } from "./resources.schema";

const routePrefix = "/resources";
const tags = [`${routePrefix}（通用资源）`];

/** 获取上传预签名 URL */
export const getUploadToken = createRoute({
  path: `${routePrefix}/object-storage/upload`,
  method: "post",
  request: {
    body: jsonContentRequired(uploadTokenRequestSchema, "上传令牌请求"),
  },
  tags,
  summary: "OS-获取上传预签名 URL",
  description: "用于管理员上传文件到对象存储",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(tokenResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "请求参数错误"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

/** 获取下载预签名 URL */
export const getDownloadToken = createRoute({
  path: `${routePrefix}/object-storage/download`,
  method: "post",
  request: {
    body: jsonContentRequired(downloadTokenRequestSchema, "下载令牌请求"),
  },
  tags,
  summary: "OS-获取下载预签名 URL",
  description: "用于管理员从对象存储下载文件",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(tokenResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "请求参数错误"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

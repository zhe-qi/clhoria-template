import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { respErr } from "@/utils";

import { DownloadTokenRequestSchema, TokenResponseSchema, UploadTokenRequestSchema } from "./schema";

const routePrefix = "/resources";
const tags = [`${routePrefix}（通用资源）`];

/** 获取上传预签名 URL */
export const getUploadToken = createRoute({
  path: `${routePrefix}/object-storage/upload`,
  method: "post",
  request: {
    body: jsonContentRequired(
      UploadTokenRequestSchema,
      "上传令牌请求",
    ),
  },
  tags,
  summary: "OS-获取上传预签名 URL",
  description: "用于管理员上传文件到对象存储",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(TokenResponseSchema),
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "请求参数错误"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "参数验证失败"),
  },
});

/** 获取下载预签名 URL */
export const getDownloadToken = createRoute({
  path: `${routePrefix}/object-storage/download`,
  method: "post",
  request: {
    body: jsonContentRequired(
      DownloadTokenRequestSchema,
      "下载令牌请求",
    ),
  },
  tags,
  summary: "OS-获取下载预签名 URL",
  description: "用于管理员从对象存储下载文件",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(TokenResponseSchema),
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "请求参数错误"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "参数验证失败"),
  },
});

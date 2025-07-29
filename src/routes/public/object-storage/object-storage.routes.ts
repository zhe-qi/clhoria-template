import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { operationLog } from "@/middlewares/operation-log";
import { optionalJwtAuth } from "@/middlewares/special/optional-jwt-auth";

const tags = ["/sts-token (对象存储直传)"];

const UploadTokenRequestSchema = z.object({
  fileName: z.string().describe("文件名"),
  fileType: z.string().optional().describe("文件类型"),
}).strict();

const DownloadTokenRequestSchema = z.object({
  fileName: z.string().describe("文件名"),
}).strict();

const TokenResponseSchema = z.object({
  url: z.string().describe("预签名 URL"),
  expiresAt: z.string().describe("过期时间"),
});

const ErrorResponseSchema = z.object({
  message: z.string(),
});

/** 获取上传预签名 URL */
export const getUploadToken = createRoute({
  path: "/sts-token/upload",
  method: "post",
  middleware: [optionalJwtAuth(), operationLog({ moduleName: "对象存储", description: "对象存储获取上传token" })],
  request: {
    body: jsonContentRequired(
      UploadTokenRequestSchema,
      "上传令牌请求",
    ),
  },
  tags,
  summary: "获取上传预签名 URL",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      TokenResponseSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      ErrorResponseSchema,
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(UploadTokenRequestSchema),
      "参数验证失败",
    ),
  },
});

/** 获取下载预签名 URL */
export const getDownloadToken = createRoute({
  path: "/sts-token/download",
  method: "post",
  middleware: [optionalJwtAuth(), operationLog({ moduleName: "对象存储", description: "对象存储获取下载token" })],
  request: {
    body: jsonContentRequired(
      DownloadTokenRequestSchema,
      "下载令牌请求",
    ),
  },
  tags,
  summary: "获取下载预签名 URL",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      TokenResponseSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      ErrorResponseSchema,
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(DownloadTokenRequestSchema),
      "参数验证失败",
    ),
  },
});

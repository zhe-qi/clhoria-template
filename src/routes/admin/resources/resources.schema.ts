import { z } from "@hono/zod-openapi";

export const UploadTokenRequestSchema = z.object({
  fileName: z.string().meta({ description: "文件名" }),
  fileType: z.string().optional().meta({ description: "文件类型" }),
}).strict();

export const DownloadTokenRequestSchema = z.object({
  fileName: z.string().meta({ description: "文件名" }),
}).strict();

export const TokenResponseSchema = z.object({
  url: z.string().meta({ description: "预签名 URL" }),
  expiresAt: z.string().meta({ description: "过期时间" }),
});

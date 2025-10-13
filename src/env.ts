/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

import { parseEnvOrExit } from "@/utils/zod";

expand(config({
  path: path.resolve(
    process.cwd(),
    process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  ),
}));

/**
 * 环境变量验证模式，包含对于环境变量的校验，转换，默认值，类型等
 */
const EnvSchema = z.object({
  /** 环境变量 */
  NODE_ENV: z.string().default("development"),
  /** 端口 */
  PORT: z.coerce.number().default(9999),
  /** 日志级别 */
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** 数据库连接字符串 */
  DATABASE_URL: z.string().refine(
    val => process.env.NODE_ENV !== "production" || val !== "",
    { message: "生产环境下数据库连接字符串不能为空" },
  ),
  /** Redis连接字符串 */
  REDIS_URL: z.string().refine(
    val => process.env.NODE_ENV !== "production" || val !== "",
    { message: "生产环境下redis连接字符串不能为空" },
  ),
  /** 客户端JWT密钥 */
  CLIENT_JWT_SECRET: z.string(),
  /** 管理端JWT密钥 */
  ADMIN_JWT_SECRET: z.string(),

  /** 云服务商R2访问密钥ID */
  ACCESS_KEY_ID: z.string(),
  /** 云服务商R2访问密钥 */
  SECRET_ACCESS_KEY: z.string(),
  /** 云服务商R2终端节点 */
  ENDPOINT: z.url(),
  /** 云服务商R2存储桶名称 */
  BUCKET_NAME: z.string().default("default-bucket"),

  /** Sentry错误追踪 */
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export default parseEnvOrExit(EnvSchema);

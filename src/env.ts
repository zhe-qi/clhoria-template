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
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().refine(
    val => process.env.NODE_ENV !== "production" || val !== "",
    { message: "生产环境下数据库连接字符串不能为空" },
  ),
  REDIS_URL: z.string().refine(
    val => process.env.NODE_ENV !== "production" || val !== "",
    { message: "生产环境下redis连接字符串不能为空" },
  ),
  CLIENT_JWT_SECRET: z.string(),
  ADMIN_JWT_SECRET: z.string(),

  // cloudflare r2
  ACCESS_KEY_ID: z.string(),
  SECRET_ACCESS_KEY: z.string(),
  ENDPOINT: z.url(),
  BUCKET_NAME: z.string().default("default-bucket"),

  // sentry
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export default parseEnvOrExit(EnvSchema);

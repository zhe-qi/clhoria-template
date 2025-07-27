/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod/v4";

expand(config({
  path: path.resolve(
    process.cwd(),
    process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  ),
}));

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
});

export type Env = z.infer<typeof EnvSchema>;

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid env:");

  const fieldErrors: Record<string, string[]> = {};

  result.error.issues.forEach((issue) => {
    // 确保路径元素是字符串 (Symbol 不能作为索引类型)
    const field = issue.path
      .filter((p): p is string => typeof p === "string")
      .join("."); // 处理嵌套路径，尽管环境变量是扁平的

    if (field) {
      // 将错误添加到对应字段
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    else {
      // 处理无字段关联的错误（如根级错误）
      const rootKey = "_";
      if (!fieldErrors[rootKey]) {
        fieldErrors[rootKey] = [];
      }
      fieldErrors[rootKey].push(issue.message);
    }
  });

  console.error(JSON.stringify(fieldErrors, null, 2));
  process.exit(1);
}

export default result.data;

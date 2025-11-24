import type { z } from "zod";

import { env as processEnv } from "node:process";

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

/**
 * 安全解析环境变量schema
 */
export function safeParseEnv<T extends z.ZodType>(
  schema: T,
  env: Record<string, unknown> = processEnv,
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(env);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

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

  return {
    success: false,
    fieldErrors,
  };
}

/**
 * 解析环境变量并在失败时退出进程
 */
export function parseEnvOrExit<T extends z.ZodType>(
  schema: T,
  env: Record<string, unknown> = processEnv,
): z.infer<T> {
  const result = safeParseEnv(schema, env);

  if (!result.success) {
    console.error("❌ Invalid env:");
    console.error(JSON.stringify(result.fieldErrors, null, 2));
    process.exit(1);
  }

  return result.data!;
}

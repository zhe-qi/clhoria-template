import { drizzle } from "drizzle-orm/postgres-js";

import { getQueryClient } from "./postgres";
import * as schema from "./schema";

const db = drizzle({
  client: getQueryClient(),
  // schema同时用于提供类型
  schema,
  // 自动在数据库使用 snake_case 命名风格
  casing: "snake_case",
  // 开发环境数据库日志
  logger: false, // 或者 env.NODE_ENV !== "production"
});

export default db;

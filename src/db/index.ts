import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "@/env";

import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL, {
  max: 10, // 默认最大连接数=10
  idle_timeout: 10, // 空闲连接保留10秒
  connect_timeout: 30, // 连接超时30秒
  transform: {
    // 处理JS undefined转SQL NULL
    undefined: null,
  },
});

const db = drizzle({
  client: queryClient,
  // schema同时用于提供类型
  schema,
  // 自动在数据库使用 snake_case 命名风格
  casing: "snake_case",
  // 开发环境数据库日志
  // logger: env.NODE_ENV !== "production",
});

export default db;

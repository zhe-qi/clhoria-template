import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "@/env";

import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL, {
  max: 10, // 默认最大连接数=10
  idle_timeout: 10, // 空闲连接保留10秒
  connect_timeout: 30, // 连接超时30秒
  transform: {
    undefined: null, // 处理JS undefined转SQL NULL
  },
});

const db = drizzle({
  client: queryClient,
  schema,
  casing: "snake_case",
  logger: env.NODE_ENV !== "production", // 开发环境日志
});

export default db;

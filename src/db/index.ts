import { drizzle } from "drizzle-orm/postgres-js";

import postgres from "postgres";
import env from "@/env";

import { createLazySingleton } from "@/lib/core/singleton";
import * as schema from "./schema";

export const getQueryClient = createLazySingleton(
  "postgres",
  () => postgres(env.DATABASE_URL, {
    max: env.DB_POOL_SIZE, // 连接池最大连接数
    idle_timeout: 45, // 45s 连接空闲超时
    connect_timeout: 30, // 30s 连接超时
    max_lifetime: 60 * 30, // 30min 连接最大生命周期
    transform: {
      undefined: null, // 空值转换为 null
    },
    connection: {
      statement_timeout: 15000, // 15s 语句超时
      lock_timeout: 10000, // 10s 锁等待超时
    },
  }),
  { destroy: sql => sql.end() },
);

const db = drizzle({
  client: getQueryClient(),
  schema,
  casing: "snake_case", // 自动在数据库使用 snake_case 命名风格
  logger: false, // 或者 env.NODE_ENV !== "production"
});

export default db;

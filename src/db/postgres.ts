import postgres from "postgres";

import env from "@/env";
import { createLazySingleton } from "@/lib/internal/singleton";

export const getQueryClient = createLazySingleton(
  "postgres",
  () => postgres(env.DATABASE_URL, {
    max: env.DB_POOL_SIZE,
    idle_timeout: 10,
    connect_timeout: 30,
    transform: { undefined: null },
  }),
  { destroy: sql => sql.end() },
);

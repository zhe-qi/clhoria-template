import postgres from "postgres";

import env from "@/env";
import { createLazySingleton } from "@/lib/internal/singleton";

export const getQueryClient = createLazySingleton(
  "postgres",
  () => postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 10,
    connect_timeout: 30,
    transform: { undefined: null },
  }),
  { destroy: sql => sql.end() },
);

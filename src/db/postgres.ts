import type { Sql } from "postgres";

import postgres from "postgres";

import env from "@/env";

let queryClient: Sql | null = null;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 10,
      connect_timeout: 30,
      transform: { undefined: null },
    });
  }
  return queryClient;
}

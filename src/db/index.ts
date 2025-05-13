import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "@/env";

import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL);

const db = drizzle({
  client: queryClient,
  schema,
  casing: "snake_case",
});

export default db;

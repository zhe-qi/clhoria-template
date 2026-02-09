import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "@/db/schema";

import { Context, Layer } from "effect";
import db from "@/db";

type DrizzleDb = PostgresJsDatabase<typeof schema>;

export class DbService extends Context.Tag("DbService")<DbService, DrizzleDb>() {}

export const DbServiceLive = Layer.succeed(DbService, db);

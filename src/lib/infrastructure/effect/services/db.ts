import type db from "@/db";

import { Context, Layer } from "effect";
import dbInstance from "@/db";

type DrizzleDb = typeof db;

export class DbService extends Context.Service<DbService, DrizzleDb>()("DbService") {}

export const DbServiceLive = Layer.succeed(DbService, dbInstance);

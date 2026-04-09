import type db from "@/db";

import { Context, Layer } from "effect";
import dbInstance from "@/db";

type DrizzleDb = typeof db;

export class DbService extends Context.Tag("DbService")<DbService, DrizzleDb>() {}

export const DbServiceLive = Layer.succeed(DbService, dbInstance);

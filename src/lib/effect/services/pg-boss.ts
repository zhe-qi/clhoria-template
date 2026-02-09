import type { PgBoss } from "pg-boss";

import { Context, Layer } from "effect";

import boss from "@/lib/infrastructure/pg-boss-adapter";

export class PgBossService extends Context.Tag("PgBossService")<PgBossService, PgBoss>() {}

export const PgBossServiceLive = Layer.succeed(PgBossService, boss);

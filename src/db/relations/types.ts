import type { ExtractTablesFromSchema, RelationsBuilder, RelationsBuilderConfig } from "drizzle-orm";

import type * as schema from "@/db/schema";

export type Schema = ExtractTablesFromSchema<typeof schema>;
export type RelationsConfig = RelationsBuilderConfig<Schema>;
export type RelationsHelper = RelationsBuilder<Schema>;

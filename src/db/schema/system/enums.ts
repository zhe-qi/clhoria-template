import { pgEnum } from "drizzle-orm/pg-core";

import { Status } from "@/lib/enums";

export const statusEnum = pgEnum("status", [Status.ENABLED, Status.DISABLED, Status.BANNED]);

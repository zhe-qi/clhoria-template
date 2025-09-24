import { integer } from "drizzle-orm/pg-core";

import { Status } from "@/lib/enums";

export const statusEnum = () => integer().default(Status.ENABLED);

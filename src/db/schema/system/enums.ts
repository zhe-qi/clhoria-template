import { integer } from "drizzle-orm/pg-core";

import { Status, TokenStatus } from "@/lib/enums";

export const statusEnum = () => integer().default(Status.ENABLED);
export const tokenStatusEnum = () => integer().default(TokenStatus.ACTIVE);

import { timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidV7 } from "uuid";

import { formatDate } from "@/utils";

export const defaultColumns = {
  id: uuid().primaryKey().notNull().$defaultFn(() => uuidV7()),
  createdAt: timestamp({ mode: "string" })
    .notNull()
    .$defaultFn(() => formatDate(new Date())),
  updatedAt: timestamp({ mode: "string" })
    .notNull()
    .$defaultFn(() => formatDate(new Date()))
    .$onUpdate(() => formatDate(new Date())),
};

export const defaultColumnsOmit = {
  id: true,
  createdAt: true,
  updatedAt: true,
} as const;

import { text, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidV7 } from "uuid";

import { formatDate } from "@/utils";

export function withBaseSchema() {
  return {
    id: uuid().primaryKey().$defaultFn(() => uuidV7()),
    createdAt: text().$defaultFn(() => formatDate(new Date())),
    updatedAt: text()
      .$defaultFn(() => formatDate(new Date()))
      .$onUpdate(() => formatDate(new Date())),
  };
}

export function withBaseSchemaOmit() {
  return {
    id: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

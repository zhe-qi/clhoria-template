import { sql } from "drizzle-orm";
import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { formatDate } from "@/utils";

export const baseColumns = {
  // pg18 以下用这个 .$defaultFn(() => uuidV7())，pg18 以上用这个 .default(sql`uuidv7()`)
  /** id，uuid v7 生成 */
  id: uuid().primaryKey().notNull().default(sql`uuidv7()`),
  /** 创建时间 */
  createdAt: timestamp({ mode: "string" })
    .$defaultFn(() => formatDate(new Date())),
  /** 创建人 */
  createdBy: varchar({ length: 64 }),
  /** 更新时间 包含自动更新 */
  updatedAt: timestamp({ mode: "string" })
    .$defaultFn(() => formatDate(new Date()))
    .$onUpdate(() => formatDate(new Date())),
  /** 更新人 */
  updatedBy: varchar({ length: 64 }),
};

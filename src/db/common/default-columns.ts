import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { v7 as uuidV7 } from "uuid";

import { formatDate } from "@/utils";

export const defaultColumns = {
  /** id，uuid v7 */
  id: uuid()
    .primaryKey()
    .notNull()
    .$defaultFn(() => uuidV7()),
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

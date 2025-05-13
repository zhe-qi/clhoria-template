import { pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const casbinTable = pgTable("casbin_rule", {
  id: defaultColumns.id,
  // 策略类型：p（策略）/g（角色继承）
  ptype: varchar("ptype", { length: 254 }),
  // 角色名或用户ID
  v0: varchar({ length: 254 }),
  // 资源路径（对应 `menu.path`）
  v1: varchar({ length: 254 }),
  // 操作类型（对应 `menu.method` 或自定义动作）
  v2: varchar({ length: 254 }),
  v3: varchar({ length: 254 }),
  v4: varchar({ length: 254 }),
  v5: varchar({ length: 254 }),
});

export const selectCasbinTableSchema = createSelectSchema(casbinTable);

export const insertCasbinTableSchema = createInsertSchema(
  casbinTable,
).omit({
  id: true,
});

export const patchCasbinTableSchema = insertCasbinTableSchema.partial();

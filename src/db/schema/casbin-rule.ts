import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/base-columns";

export const casbinRules = pgTable("casbin_rule", {
  id: defaultColumns.id,
  /** 策略类型：p（策略）/g（角色继承） */
  ptype: varchar("ptype", { length: 8 }),
  /** 关联角色 或者 继承角色 */
  v0: varchar({ length: 64 }),
  /** 资源路径（对应 `menu.path`）或者 被继承角色 */
  v1: varchar({ length: 254 }),
  /** 操作类型（对应 `menu.method` 或自定义动作） */
  v2: varchar({ length: 64 }),
  v3: varchar({ length: 64 }),
  v4: varchar({ length: 64 }),
  v5: varchar({ length: 64 }),
}, table => [
  index("idx_ptype_v0").on(table.ptype, table.v0),
  index("idx_ptype_v0_v1_v2").on(table.ptype, table.v0, table.v1, table.v2),
]);

export const selectCasbinRulesSchema = createSelectSchema(casbinRules);

export const insertCasbinRulesSchema = createInsertSchema(
  casbinRules,
).omit({
  id: true,
});

export const patchCasbinRulesSchema = insertCasbinRulesSchema.partial();

import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const casbinRule = pgTable("casbin_rule", {
  id: defaultColumns.id,
  /** 策略类型：p（策略）/g（角色继承） */
  ptype: varchar("ptype", { length: 8 }),
  /** 主体：角色或用户 */
  v0: varchar({ length: 64 }),
  /** 对象：资源路径 */
  v1: varchar({ length: 254 }),
  /** 动作：操作类型 */
  v2: varchar({ length: 64 }),
  /** 域：租户/域 */
  v3: varchar({ length: 64 }),
  /** 效果：allow/deny（仅策略使用） */
  v4: varchar({ length: 64 }),
  /** 保留字段 */
  v5: varchar({ length: 64 }),
}, table => [
  index("idx_ptype_v0").on(table.ptype, table.v0),
  index("idx_ptype_v0_v1_v2").on(table.ptype, table.v0, table.v1, table.v2),
  index("idx_ptype_v3").on(table.ptype, table.v3),
]);

export const selectCasbinRuleSchema = createSelectSchema(casbinRule, {
  id: schema => schema.describe("规则ID"),
  ptype: schema => schema.describe("策略类型: p=策略 g=角色继承"),
  v0: schema => schema.describe("主体: 角色或用户"),
  v1: schema => schema.describe("对象: 资源路径"),
  v2: schema => schema.describe("动作: 操作类型"),
  v3: schema => schema.describe("域: 租户/域"),
  v4: schema => schema.describe("效果: allow/deny"),
  v5: schema => schema.describe("保留字段"),
});

export const insertCasbinRuleSchema = createInsertSchema(
  casbinRule,
).omit({
  id: true,
});

export const patchCasbinRuleSchema = insertCasbinRuleSchema.partial();

import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

export const casbinRule = pgTable("casbin_rule", {
  id: defaultColumns.id,
  /** 策略类型：p（策略）/g（角色继承） */
  ptype: varchar({ length: 8 }),
  /** 主体：角色或用户 */
  v0: varchar({ length: 64 }),
  /** 对象：业务资源 */
  v1: varchar({ length: 254 }),
  /** 动作：业务动作 */
  v2: varchar({ length: 64 }),
  /** 域：租户/域 */
  v3: varchar({ length: 64 }),
  /** 效果：allow/deny（仅策略使用） */
  v4: varchar({ length: 64 }),
  /** 保留字段 */
  v5: varchar({ length: 64 }),
}, table => [
  // 权限检查的核心索引（最高频查询）
  index("idx_ptype_v0_v1_v2_v3").on(table.ptype, table.v0, table.v1, table.v2, table.v3),
  // 角色管理查询索引
  index("idx_ptype_v0").on(table.ptype, table.v0),
  // 域级别查询索引
  index("idx_ptype_v3").on(table.ptype, table.v3),
  // 资源级别查询索引（用于按资源过滤策略）
  index("idx_ptype_v1").on(table.ptype, table.v1),
]);

export const selectCasbinRuleSchema = createSelectSchema(casbinRule, {
  id: schema => schema.meta({ description: "规则ID" }),
  ptype: schema => schema.meta({ description: "策略类型: p=策略 g=角色继承" }),
  v0: schema => schema.meta({ description: "主体: 角色或用户" }),
  v1: schema => schema.meta({ description: "对象: 业务资源" }),
  v2: schema => schema.meta({ description: "动作: 业务动作" }),
  v3: schema => schema.meta({ description: "域: 租户/域" }),
  v4: schema => schema.meta({ description: "效果: allow/deny" }),
  v5: schema => schema.meta({ description: "保留字段" }),
});

export const insertCasbinRuleSchema = createInsertSchema(
  casbinRule,
).omit({
  id: true,
});

export const patchCasbinRuleSchema = insertCasbinRuleSchema.partial();

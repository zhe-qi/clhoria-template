import { z } from "@hono/zod-openapi";
import { index, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

export const casbinRule = pgTable("casbin_rule", {
  /** 策略类型：p（权限策略）/g（角色继承） */
  ptype: varchar({ length: 8 }).notNull(), // 非空：所有规则必含 ptype
  /** 主体：角色或用户（p策略=sub，g策略=上级角色/用户） */
  v0: varchar({ length: 64 }).notNull(), // 非空：p/g 策略均需主体
  /** 对象：业务资源（p策略=obj，g策略=下级角色/用户） */
  v1: varchar({ length: 254 }).notNull(), // 非空：p/g 策略均需对象
  /** 动作：业务动作（仅p策略使用，g策略为空字符串） */
  v2: varchar({ length: 64 }).notNull().default(""), // 默认空字符串：兼容g策略
  /** 效果：allow/deny（仅p策略使用，g策略为空字符串） */
  v3: varchar({ length: 64 }).notNull().default(""), // 默认空字符串：兼容g策略
  /** 保留字段（暂不使用，默认空字符串） */
  v4: varchar({ length: 64 }).notNull().default(""),
  /** 保留字段（暂不使用，默认空字符串） */
  v5: varchar({ length: 64 }).notNull().default(""),
}, table => [
  primaryKey({ name: "casbin_rule_pkey", columns: [table.v0, table.v1, table.v2, table.v3] }),
  index("idx_casbin_g_v0").on(table.ptype, table.v0, table.v1),
]);

// Zod Schema 适配字段非空+默认值约束
export const selectCasbinRuleSchema = createSelectSchema(casbinRule, {
  ptype: schema =>
    schema.meta({ description: "策略类型: p=策略 g=角色继承" }),
  v0: schema =>
    schema.meta({ description: "主体: 角色或用户（p=sub，g=上级）" }),
  v1: schema =>
    schema.meta({ description: "对象: 资源/角色（p=obj，g=下级）" }),
  v2: schema =>
    schema.meta({ description: "动作: 仅p策略使用（如GET/POST）" }),
  v3: schema =>
    schema.meta({ description: "效果: 仅p策略使用（allow/deny）" }),
  v4: schema =>
    schema.meta({ description: "保留字段" }),
  v5: schema =>
    schema.meta({ description: "保留字段" }),
});

// 类型来源：z.infer<typeof selectCasbinRuleSchema> 是 selectSchema 的解析类型，omit 后得到插入类型
type InsertCasbinRuleType = z.infer<typeof selectCasbinRuleSchema>;
type InsertCasbinRuleInput = z.infer<typeof insertCasbinRuleSchema>;

export const insertCasbinRuleSchema = selectCasbinRuleSchema
  .refine((data: InsertCasbinRuleInput) => {
    if (data.ptype === "g") {
      if ((data.v2 !== "") || (data.v3 !== "")) {
        throw new Error("角色继承规则（g）不允许设置「动作（v2）」和「效果（v3）」，请留空");
      }
    }

    if (data.ptype === "p") {
      if ((data.v2 === "") || (data.v3 === "")) {
        throw new Error("权限策略（p）必须设置「动作（v2，如GET/POST）」和「效果（v3，如allow/deny）」");
      }
      if (!["allow", "deny"].includes(data.v3)) {
        throw new Error("权限策略（p）的效果（v3）仅支持「allow」或「deny」");
      }
    }

    return true;
  });

interface FromOriginalRuleType {
  ptype: InsertCasbinRuleType["ptype"];
}
type UpdateDataInput = z.infer<typeof insertCasbinRuleSchema>;
interface PatchCasbinRuleInput {
  fromOriginalRule: FromOriginalRuleType;
  updateData: Partial<UpdateDataInput>;
}

export const patchCasbinRuleSchema = z
  .object({
    fromOriginalRule: z.object({
      ptype: selectCasbinRuleSchema.shape.ptype,
    }).meta({ description: "原规则的基础信息（仅需ptype，用于校验更新合法性）" }),
    updateData: insertCasbinRuleSchema.partial().meta({ description: "待更新的规则字段（部分可选）" }),
  })
  .refine((data: PatchCasbinRuleInput) => {
    const { fromOriginalRule, updateData } = data;
    const originalPtype = fromOriginalRule.ptype;
    const { ptype: newPtype, v2: newV2, v3: newV3, v0: newV0, v1: newV1 } = updateData;

    // 场景1：更新 ptype（从g改p或p改g）
    if ((newPtype !== undefined) && (newPtype !== originalPtype)) {
      if (newPtype === "g") {
        if (((newV2 !== undefined) && (newV2 !== "")) || ((newV3 !== undefined) && (newV3 !== ""))) {
          throw new Error(`规则类型从「${originalPtype}」改为「g（角色继承）」后，不允许设置「动作（v2）」和「效果（v3）」`);
        }
      }

      if (newPtype === "p") {
        if (((newV2 === undefined) || (newV2 === "")) || ((newV3 === undefined) || (newV3 === ""))) {
          throw new Error(`规则类型从「${originalPtype}」改为「p（权限）」后，必须设置「动作（v2）」和「效果（v3）」`);
        }
        if (!["allow", "deny"].includes(newV3 as string)) {
          throw new Error(`规则类型改为「p（权限）」后，效果（v3）仅支持「allow」或「deny」，当前值：${newV3}`);
        }
      }
    }

    // 场景2：未更新 ptype（保持原类型）
    if ((newPtype === undefined) || (newPtype === originalPtype)) {
      if (originalPtype === "g") {
        // 修复混合运算符：用括号明确 (newV2 !== undefined) 的优先级
        if ((newV2 !== undefined) || (newV3 !== undefined)) {
          throw new Error(`原规则为「g（角色继承）」，不允许更新「动作（v2）」和「效果（v3）」，请移除这些字段`);
        }
      }

      if (originalPtype === "p") {
        if ((newV2 !== undefined) && (newV2 === "")) {
          throw new Error(`原规则为「p（权限）」，更新「动作（v2）」时不能为空（如GET/POST）`);
        }
        if (newV3 !== undefined) {
          if (newV3 === "") {
            throw new Error(`原规则为「p（权限）」，更新「效果（v3）」时不能为空`);
          }
          if (!["allow", "deny"].includes(newV3)) {
            throw new Error(`原规则为「p（权限）」，效果（v3）仅支持「allow」或「deny」，当前值：${newV3}`);
          }
        }
      }
    }

    // 场景3：更新 v0/v1 的额外校验
    if ((newV0 !== undefined) && (newV0.includes("@"))) {
      throw new Error("主体（v0）不允许包含「@」字符，请修改后重试");
    }
    if ((newV1 !== undefined) && (newV1.length > 254)) {
      throw new Error(`对象（v1）长度不能超过254个字符，当前长度：${newV1.length}`);
    }

    return true;
  })
  .meta({ description: "Casbin规则更新Schema（支持部分字段更新，结合原规则类型做全场景校验）" });

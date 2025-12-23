import type { Adapter, Model, UpdatableAdapter } from "casbin";
import type { InferInsertModel } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { Helper } from "casbin";
import { and, eq, inArray, not, or, sql } from "drizzle-orm";

import type * as schema from "@/db/schema";
import type { casbinRule } from "@/db/schema";

import { insertCasbinRuleSchema } from "@/db/schema";

type TCasbinTable = InferInsertModel<typeof casbinRule>;
type PostgresJsDatabaseSchema = PostgresJsDatabase<typeof schema>;

/** 策略过滤器类型，支持单条或多条规则模式匹配 */
export type PolicyFilter = {
  /** p 策略过滤：单条规则 string[] 或多条规则 string[][] */
  p?: string[] | string[][];
  /** g 角色继承过滤：单条规则 string[] 或多条规则 string[][] */
  g?: string[] | string[][];
};

export class DrizzleCasbinAdapter implements Adapter, UpdatableAdapter {
  private readonly db: PostgresJsDatabaseSchema;
  private readonly schema: typeof casbinRule;
  private filtered = false;

  constructor(db: PostgresJsDatabaseSchema, casbinRuleSchema: typeof casbinRule) {
    this.db = db;
    this.schema = casbinRuleSchema;
  }

  // ---------- loadPolicy ----------
  async loadPolicy(model: Model): Promise<void> {
    try {
      const lines = await this.db.select().from(this.schema);
      lines.forEach(line => this.loadPolicyLine(line, model));
    }
    catch (error) {
      throw new Error(`加载策略失败: ${(error as Error).message}`);
    }
  }

  // ---------- loadFilteredPolicy ----------
  /**
   * 支持 filter 的几种常见形态：
   * - { p: ['alice','data1','read'] }  => 单条 pattern（string[]）
   * - { p: [ ['a','b'], ['c','d'] ] } => 多条 pattern（string[][]）
   * - 也支持 p/g 两种类型
   */
  async loadFilteredPolicy(model: Model, filter: any): Promise<void> {
    // 规范化 filter 为 Record<string, string[][]>（每个 entry 为若干条 rule pattern）
    const normalized: Record<string, string[][]> = {};

    if (!filter || Object.keys(filter).length === 0) {
      // 如果没有 filter，等同于 loadPolicy
      await this.loadPolicy(model);
      this.filtered = false;
      return;
    }

    for (const [ptype, val] of Object.entries(filter as PolicyFilter)) {
      if (val == null)
        continue;
      if (!Array.isArray(val))
        continue;

      // 如果第一个元素仍是数组 -> 认为是 string[][]（多个 patterns）
      if (val.length > 0 && Array.isArray(val[0])) {
        normalized[ptype] = val as string[][];
      }
      else {
        // 否则当作单条 pattern（string[]）
        normalized[ptype] = [val as string[]];
      }
    }

    const whereConditions = Object.entries(normalized)
      .map(([ptype, patterns]) =>
        patterns.map(pattern => this.buildRuleConditions(ptype, pattern)),
      )
      .flat();

    if (whereConditions.length === 0) {
      // 没有有效过滤条件，退回 loadPolicy
      await this.loadPolicy(model);
      this.filtered = false;
      return;
    }

    const lines = await this.db
      .select()
      .from(this.schema)
      .where(or(...whereConditions));

    lines.forEach(line => this.loadPolicyLine(line, model));
    this.filtered = true;
  }

  // ---------- savePolicy ----------
  async savePolicy(model: Model): Promise<boolean> {
    // 核心字段（与数据库主键保持一致）
    const keyFields: (keyof TCasbinTable)[] = ["ptype", "v0", "v1", "v2", "v3"];

    const policies = this.extractAndValidatePolicies(model, keyFields);

    // 如果没有策略，清空表
    if (policies.length === 0) {
      await this.db.transaction(tx => tx.delete(this.schema));
      return true;
    }

    // keepKeys (字符串 key)：ptype|v0|v1|v2|v3
    const keepKeys = new Set(
      policies.map(policy => keyFields.map(field => (policy[field] ?? "").toString()).join("|")),
    );

    // 构建 SQL 表达式：ptype || '|' || v0 || '|' || v1 || '|' || v2 || '|' || v3
    const sqlKeyExpr = keyFields
      .map(field => this.schema[field])
      .reduce((prev, curr) => (prev ? sql`${prev} || '|' || ${curr}` : curr as any));

    await this.db.transaction(async (tx) => {
      // 批量插入（冲突时跳过）
      await tx
        .insert(this.schema)
        .values(policies)
        .onConflictDoNothing({ target: keyFields.map(field => this.schema[field]) });

      // 删除旧的、但不在 keepKeys 中的记录
      await tx
        .delete(this.schema)
        .where(not(inArray(sqlKeyExpr, Array.from(keepKeys))));
    });

    return true;
  }

  // ---------- extractAndValidatePolicies ----------
  private extractAndValidatePolicies(
    model: Model,
    keyFields: (keyof TCasbinTable)[],
  ): TCasbinTable[] {
    const policies: TCasbinTable[] = [];
    const policyTypes: ("p" | "g")[] = ["p", "g"];

    for (const ptype of policyTypes) {
      const policyAsts = model.model.get(ptype);
      if (!policyAsts)
        continue;

      for (const ast of Array.from(policyAsts.values())) {
        for (const rule of ast.policy) {
          const policy = Object.fromEntries(
            [["ptype", ptype], ...Array.from({ length: 6 }, (_, i) => [`v${i}`, rule[i] ?? ""])],
          ) as TCasbinTable;

          // 验证
          const validation = insertCasbinRuleSchema.safeParse(policy);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => i.message).join("; ");
            throw new Error(`无效的${ptype}-规则 ${JSON.stringify(rule)}: ${errors}`);
          }

          // keyFields 的存在性检查（都应该有字段，空串亦可）
          if (!keyFields.every(field => Object.prototype.hasOwnProperty.call(policy, field))) {
            throw new Error(`策略缺少必要字段: ${keyFields.join(", ")}`);
          }

          policies.push(policy);
        }
      }
    }

    return policies;
  }

  // ---------- addPolicy / addPolicies ----------
  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const policy = this.createPolicyObject(ptype, rule);

    // 验证
    const validation = insertCasbinRuleSchema.safeParse(policy);
    if (!validation.success) {
      const errors = validation.error.issues.map(i => i.message).join("; ");
      throw new Error(`无效的规则 ${JSON.stringify(rule)}: ${errors}`);
    }

    await this.db
      .insert(this.schema)
      .values(policy)
      .onConflictDoNothing({
        target: [
          this.schema.ptype,
          this.schema.v0,
          this.schema.v1,
          this.schema.v2,
          this.schema.v3,
        ],
      });
  }

  async addPolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    if (rules.length === 0)
      return;

    const policies: TCasbinTable[] = [];

    for (const rule of rules) {
      const policy = this.createPolicyObject(ptype, rule);
      const validation = insertCasbinRuleSchema.safeParse(policy);
      if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message).join("; ");
        throw new Error(`无效的规则 ${JSON.stringify(rule)}: ${errors}`);
      }
      policies.push(policy);
    }

    await this.db
      .insert(this.schema)
      .values(policies)
      .onConflictDoNothing({
        target: [
          this.schema.ptype,
          this.schema.v0,
          this.schema.v1,
          this.schema.v2,
          this.schema.v3,
        ],
      });
  }

  // ---------- removePolicy / removePolicies ----------
  async removePolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.db
      .delete(this.schema)
      .where(this.buildRuleConditions(ptype, rule));
  }

  async removePolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    if (rules.length === 0)
      return;

    const conditions = rules.map(rule => this.buildRuleConditions(ptype, rule));

    await this.db
      .delete(this.schema)
      .where(or(...conditions));
  }

  // ---------- removeFilteredPolicy ----------
  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const conditions = [];

    for (let i = 0; i < fieldValues.length; i++) {
      const vKey = (`v${i + fieldIndex}`) as keyof TCasbinTable;
      const value = fieldValues[i];
      // 仅在调用方明确提供（非 undefined）时构建条件
      if (value === undefined)
        continue;
      conditions.push(eq(this.schema[vKey], value));
    }

    await this.db
      .delete(this.schema)
      .where(and(eq(this.schema.ptype, ptype), ...conditions));
  }

  // ---------- updatePolicy / updatePolicies ----------
  async updatePolicy(_sec: string, ptype: string, oldRule: string[], newRule: string[]): Promise<void> {
    const newPolicy = this.createPolicyObject(ptype, newRule);

    // 验证新策略
    const validation = insertCasbinRuleSchema.safeParse(newPolicy);
    if (!validation.success) {
      const errors = validation.error.issues.map(i => i.message).join("; ");
      throw new Error(`无效的规则 ${JSON.stringify(newRule)}: ${errors}`);
    }

    await this.db.transaction(async (tx) => {
      // 删除旧策略
      await tx
        .delete(this.schema)
        .where(this.buildRuleConditions(ptype, oldRule));

      // 插入新策略
      await tx
        .insert(this.schema)
        .values(newPolicy)
        .onConflictDoNothing({
          target: [
            this.schema.ptype,
            this.schema.v0,
            this.schema.v1,
            this.schema.v2,
            this.schema.v3,
          ],
        });
    });
  }

  async updatePolicies(_sec: string, ptype: string, oldRules: string[][], newRules: string[][]): Promise<void> {
    if (oldRules.length !== newRules.length) {
      throw new Error("oldRules 和 newRules 的长度必须相同");
    }

    if (oldRules.length === 0)
      return;

    const newPolicies: TCasbinTable[] = [];

    for (const rule of newRules) {
      const policy = this.createPolicyObject(ptype, rule);
      const validation = insertCasbinRuleSchema.safeParse(policy);
      if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message).join("; ");
        throw new Error(`无效的规则 ${JSON.stringify(rule)}: ${errors}`);
      }
      newPolicies.push(policy);
    }

    await this.db.transaction(async (tx) => {
      // 删除所有旧策略
      const oldConditions = oldRules.map(rule => this.buildRuleConditions(ptype, rule));
      await tx
        .delete(this.schema)
        .where(or(...oldConditions));

      // 插入所有新策略
      await tx
        .insert(this.schema)
        .values(newPolicies)
        .onConflictDoNothing({
          target: [
            this.schema.ptype,
            this.schema.v0,
            this.schema.v1,
            this.schema.v2,
            this.schema.v3,
          ],
        });
    });
  }

  // ---------- factory / isFiltered ----------
  static async newAdapter(
    db: PostgresJsDatabaseSchema,
    casbinRuleSchema: typeof casbinRule,
  ) {
    return new DrizzleCasbinAdapter(db, casbinRuleSchema);
  }

  isFiltered(): boolean {
    return this.filtered;
  }

  // ---------- loadPolicyLine ----------
  private loadPolicyLine(rule: TCasbinTable, model: Model): void {
    // 生成 tokens，去除右侧尾随空字符串
    const tokens = [
      rule.ptype,
      ...Array.from({ length: 6 }, (_, i) => (rule[`v${i}` as keyof TCasbinTable] ?? "")),
    ] as string[];

    // 去掉尾部连续的空字符串
    while (tokens.length > 1 && tokens[tokens.length - 1] === "") {
      tokens.pop();
    }

    const policyLine = tokens.join(", ");
    Helper.loadPolicyLine(policyLine, model);
  }

  // ---------- createPolicyObject ----------
  private createPolicyObject(ptype: string, rule: string[]): TCasbinTable {
    const policy: TCasbinTable = {
      ptype,
      v0: rule[0] ?? "",
      v1: rule[1] ?? "",
      v2: rule[2] ?? "",
      v3: rule[3] ?? "",
      v4: rule[4] ?? "",
      v5: rule[5] ?? "",
    };
    return policy;
  }

  // ---------- buildRuleConditions ----------
  private buildRuleConditions(ptype: string, rule: string[]) {
    const conditions = [
      eq(this.schema.ptype, ptype),
      ...rule.map((value, index) =>
        value !== undefined && value !== null
          ? eq(this.schema[`v${index}` as keyof TCasbinTable], value)
          : undefined,
      ).filter(Boolean),
    ];

    return and(...conditions);
  }
}

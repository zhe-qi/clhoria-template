import type { Adapter, Model } from "casbin";
import type { InferInsertModel } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { Helper } from "casbin";
import { and, eq, inArray, not, or, sql } from "drizzle-orm";

import type * as schema from "@/db/schema";
import type { casbinRule } from "@/db/schema";

import { insertCasbinRuleSchema } from "@/db/schema";

type TCasbinTable = InferInsertModel<typeof casbinRule>;
type PostgresJsDatabaseSchema = PostgresJsDatabase<typeof schema>;

export class DrizzleCasbinAdapter implements Adapter {
  private readonly db: PostgresJsDatabaseSchema;
  private readonly schema: typeof casbinRule;
  // 标识是否启用了过滤加载策略
  private filtered = false;

  constructor(db: PostgresJsDatabaseSchema, casbinRuleSchema: typeof casbinRule) {
    this.db = db;
    this.schema = casbinRuleSchema;
  }

  // 从数据库加载所有策略规则到Casbin模型
  async loadPolicy(model: Model): Promise<void> {
    try {
      const lines = await this.db.select().from(this.schema);
      lines.forEach(line => this.loadPolicyLine(line, model));
    }
    catch (error) {
      throw new Error(`加载策略失败: ${(error as Error).message}`);
    }
  }

  // 加载符合过滤条件的策略规则
  async loadFilteredPolicy(model: Model, filter: any): Promise<void> {
    const whereConditions = Object.entries(filter as Record<string, string[][]>)
      .map(([ptype, patterns]) =>
        patterns.map(pattern => this.buildRuleConditions(ptype, pattern)),
      )
      .flat();

    const lines = await this.db
      .select()
      .from(this.schema)
      .where(or(...whereConditions));

    lines.forEach(line => this.loadPolicyLine(line, model));
    this.filtered = true;
  }

  // 将Casbin模型中的所有策略保存到数据库
  async savePolicy(model: Model): Promise<boolean> {
    // 核心字段（与数据库唯一索引保持一致）
    const keyFields: (keyof TCasbinTable)[] = ["ptype", "v0", "v1", "v2", "v3"];

    // 提取并校验新规则
    const policies = this.extractAndValidatePolicies(model, keyFields);

    // 空规则场景：清空表
    if (policies.length === 0) {
      await this.db.transaction(tx => tx.delete(this.schema));
      return true;
    }

    // 生成用于比对的唯一键集合
    const keepKeys = new Set(
      policies.map(policy => keyFields.map(field => policy[field]).join("|")),
    );

    // 构建SQL表达式用于查询比对
    const sqlKeyExpr = sql<string>`${this.schema[keyFields[0]]}${
      keyFields.slice(1).map(field => sql`||'|'||${this.schema[field]}`)
    }`;

    // 原子更新事务
    await this.db.transaction(async (tx) => {
      // 批量插入新规则（冲突时跳过）
      await tx
        .insert(this.schema)
        .values(policies)
        .onConflictDoNothing({ target: keyFields.map(field => this.schema[field]) });

      // 清理不在新规则集中的旧规则
      await tx
        .delete(this.schema)
        .where(not(inArray(sqlKeyExpr, Array.from(keepKeys))));
    });

    return true;
  }

  // 从Casbin模型中提取并验证所有策略规则
  private extractAndValidatePolicies(
    model: Model,
    keyFields: (keyof TCasbinTable)[],
  ): TCasbinTable[] {
    const policies: TCasbinTable[] = [];
    // 支持的策略类型：p(权限)和g(角色继承)
    const policyTypes: ("p" | "g")[] = ["p", "g"];

    policyTypes.forEach((ptype) => {
      const policyAsts = model.model.get(ptype);
      if (!policyAsts)
        return;

      // 处理每种策略类型下的所有规则
      Array.from(policyAsts.values()).forEach((ast) => {
        ast.policy.forEach((rule) => {
          // 转换规则数组为策略对象
          const policy = Object.fromEntries(
            [["ptype", ptype], ...Array.from({ length: 6 }, (_, i) => [`v${i}`, rule[i] ?? ""])],
          ) as TCasbinTable;

          // 验证规则合法性
          const validation = insertCasbinRuleSchema.safeParse(policy);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => i.message).join("; ");
            throw new Error(`无效的${ptype}-规则 ${JSON.stringify(rule)}: ${errors}`);
          }

          // 验证必要字段
          if (!keyFields.every(field => policy[field] !== undefined)) {
            throw new Error(`策略缺少必要字段: ${keyFields.join(", ")}`);
          }

          policies.push(policy);
        });
      });
    });

    return policies;
  }

  // 添加单条策略规则
  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const policy = this.createPolicyObject(ptype, rule);
    await this.db.insert(this.schema).values(policy);
  }

  // 批量添加策略规则
  async addPolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    const policies: TCasbinTable[] = [];

    for (const rule of rules) {
      const policy = this.createPolicyObject(ptype, rule);
      policies.push(policy);
    }

    await this.db.insert(this.schema).values(policies);
  }

  // 删除单条策略规则
  async removePolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.db
      .delete(this.schema)
      .where(this.buildRuleConditions(ptype, rule));
  }

  // 批量删除策略规则
  async removePolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    if (rules.length === 0)
      return;

    // 构建所有规则的删除条件
    const conditions = rules.map(rule => this.buildRuleConditions(ptype, rule));

    await this.db
      .delete(this.schema)
      .where(or(...conditions));
  }

  // 删除符合过滤条件的策略规则
  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const conditions = [];

    // 构建过滤条件
    for (let i = 0; i < fieldValues.length; i++) {
      const vKey = `v${i + fieldIndex}` as keyof TCasbinTable;
      // 只处理有效的v字段（v0到v5）
      if (!["v0", "v1", "v2", "v3", "v4", "v5"].includes(vKey)) {
        continue;
      }
      conditions.push(eq(this.schema[vKey], fieldValues[i]));
    }

    // 执行删除
    await this.db
      .delete(this.schema)
      .where(and(eq(this.schema.ptype, ptype), ...conditions));
  }

  // 创建适配器实例的工厂方法
  static async newAdapter(
    db: PostgresJsDatabaseSchema,
    casbinRuleSchema: typeof casbinRule,
  ) {
    return new DrizzleCasbinAdapter(db, casbinRuleSchema);
  }

  // 检查是否启用了过滤加载策略
  isFiltered(): boolean {
    return this.filtered;
  }

  // 将数据库中的规则行加载到Casbin模型
  private loadPolicyLine(rule: TCasbinTable, model: Model): void {
    // 构建Casbin格式的策略字符串
    const policyLine = [
      rule.ptype,
      ...Array.from({ length: 6 }, (_, i) =>
        rule[`v${i}` as keyof TCasbinTable] ?? ""),
    ].join(", ");

    Helper.loadPolicyLine(policyLine, model);
  }

  // 将规则数组转换为策略对象
  private createPolicyObject(ptype: string, rule: string[]): TCasbinTable {
    return {
      ptype,
      v0: rule[0] ?? "",
      v1: rule[1] ?? "",
      v2: rule[2] ?? "",
      v3: rule[3] ?? "",
      v4: rule[4] ?? "",
      v5: rule[5] ?? "",
    };
  }

  // 为规则构建数据库查询条件
  private buildRuleConditions(ptype: string, rule: string[]) {
    return and(
      eq(this.schema.ptype, ptype),
      ...rule.map((value, index) =>
        value !== undefined && value !== null
          ? eq(this.schema[`v${index}` as keyof TCasbinTable], value)
          : undefined,
      ).filter(Boolean),
    );
  }
}

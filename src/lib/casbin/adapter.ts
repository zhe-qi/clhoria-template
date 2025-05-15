import type { Adapter, Model } from "casbin";
import type { z } from "zod";

import { Helper } from "casbin";
import { and, eq, or } from "drizzle-orm";

import type { insertCasbinRulesSchema } from "@/db/schema";

import db from "@/db";
import { adminRoles, casbinRules } from "@/db/schema";

type TCasinTable = z.infer<typeof insertCasbinRulesSchema>;

export class DrizzleCasbinAdapter implements Adapter {
  private db: typeof db;
  private schema: typeof casbinRules;
  private roleSchema: typeof adminRoles;

  private filtered = false;

  constructor() {
    this.db = db;
    this.schema = casbinRules;
    this.roleSchema = adminRoles;
  }

  async loadPolicy(model: Model): Promise<void> {
    const roles = await this.db.select().from(this.roleSchema).where(eq(this.roleSchema.status, 1));
    const lines = await this.db.select().from(this.schema);

    const roleSet = new Set<string>(roles.map(role => role.id));

    lines.forEach((line) => {
      if (!roleSet.has(line.v0 as string)) {
        return;
      }
      this.loadPolicyLine(line, model);
    });
  }

  async loadFilteredPolicy(model: Model, filter: { [key: string]: string[][] }): Promise<void> {
    const whereConditions = Object.entries(filter).map(([ptype, patterns]) =>
      patterns.map(pattern =>
        and(
          eq(this.schema.ptype, ptype),
          ...pattern.map((value, index) =>
            value ? eq(this.schema[`v${index}` as keyof TCasinTable], value) : undefined,
          ).filter(Boolean),
        ),
      ),
    ).flat();

    const lines = await this.db.select().from(this.schema).where(or(...whereConditions));

    const roles = await this.db.select().from(this.roleSchema).where(eq(this.roleSchema.status, 1));

    const roleSet = new Set<string>(roles.map(role => role.id));

    lines.forEach((line) => {
      if (!roleSet.has(line.v0 as string)) {
        return;
      }
      this.loadPolicyLine(line, model);
    });

    this.filtered = true;
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.db.transaction(async (tx) => {
      await tx.delete(this.schema);

      const processes: TCasinTable[] = [];
      const processPolicy = (ptype: string) => {
        const astMap = model.model.get(ptype);
        astMap?.forEach((ast, ptype) =>
          ast.policy.forEach(rule =>
            processes.push(this.createPolicyObject(ptype, rule)),
          ),
        );
      };

      processPolicy("p");
      processPolicy("g");

      await tx.insert(this.schema).values(processes);
    });

    return true;
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const policy = this.createPolicyObject(ptype, rule);
    await this.db.insert(this.schema).values(policy);
  }

  async addPolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    const processes: TCasinTable[] = [];

    for (const rule of rules) {
      const line = this.createPolicyObject(ptype, rule);
      processes.push(line);
    }

    await this.db.insert(this.schema).values(processes);
  }

  async removePolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.db.delete(this.schema)
      .where(
        and(
          eq(this.schema.ptype, ptype),
          ...rule.map((value, index) =>
            value ? eq(this.schema[`v${index}` as keyof TCasinTable], value) : undefined,
          ).filter(Boolean),
        ),
      );
  }

  async removePolicies(_sec: string, ptype: string, rules: string[][]): Promise<void> {
    const processes = [];

    for (const rule of rules) {
      const p = this.db.delete(this.schema).where(
        and(
          eq(this.schema.ptype, ptype),
          ...rule.map((value, index) =>
            value ? eq(this.schema[`v${index}` as keyof TCasinTable], value) : undefined,
          ).filter(Boolean),
        ),
      );
      processes.push(p);
    }

    await Promise.all(processes);
  }

  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const conditions = [];

    for (let i = 0; i < fieldValues.length; i++) {
      const field = `v${i + fieldIndex}` as keyof TCasinTable;
      conditions.push(eq(this.schema[field], fieldValues[i]));
    }

    await this.db.delete(this.schema)
      .where(
        and(
          eq(this.schema.ptype, ptype),
          ...conditions,
        ),
      );
  }

  static async newAdapter() {
    return new DrizzleCasbinAdapter();
  }

  isFiltered(): boolean {
    return this.filtered;
  }

  private loadPolicyLine(rule: TCasinTable, model: Model): void {
    const policyLine = [
      rule.ptype,
      rule.v0,
      rule.v1,
      rule.v2,
      rule.v3,
      rule.v4,
      rule.v5,
    ].filter(v => v !== null).join(", ");
    Helper.loadPolicyLine(policyLine, model);
  }

  private createPolicyObject(ptype: string, rule: string[]): TCasinTable {
    return {
      ptype,
      v0: rule[0] || null,
      v1: rule[1] || null,
      v2: rule[2] || null,
      v3: rule[3] || null,
      v4: rule[4] || null,
      v5: rule[5] || null,
    };
  }
}

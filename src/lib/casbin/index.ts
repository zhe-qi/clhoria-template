import type { Model, UpdatableAdapter } from "casbin";
import type { SQL } from "drizzle-orm";
import type { z } from "zod";

import { Helper } from "casbin";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { insertCasbinTableSchema } from "@/db/schema";

import db from "@/db";
import { casbinTable, roles } from "@/db/schema";

type TCasinTable = z.infer<typeof insertCasbinTableSchema>;

// 工具函数：创建where条件数组
function createWhereConditions(line: TCasinTable): SQL[] {
  const whereArray: SQL[] = [];

  const fields = ["v0", "v1", "v2", "v3", "v4", "v5"] as const;
  for (const field of fields) {
    if (line[field]) {
      whereArray.push(eq(casbinTable[field], line[field]));
    }
  }

  return whereArray;
}

// 工具函数：转换rule数组到数据库记录格式
function savePolicyLine(ptype: string, rule: string[]): TCasinTable {
  const line: TCasinTable = { ptype, v0: null, v1: null, v2: null, v3: null, v4: null, v5: null };

  // 将规则数组填充到line对象
  const fields = ["v0", "v1", "v2", "v3", "v4", "v5"] as const;
  for (let i = 0; i < Math.min(rule.length, 6); i++) {
    line[fields[i]] = rule[i];
  }

  return line;
}

// 工具函数：从数据库记录加载策略到模型
function loadPolicyLine(line: TCasinTable, model: Model): void {
  const values = [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5]
    .filter(v => v)
    .join(", ");
  const result = `${line.ptype}, ${values}`;
  Helper.loadPolicyLine(result, model);
}

// 创建Drizzle适配器
export function createDrizzleAdapter(): UpdatableAdapter {
  return {
    async loadPolicy(model: Model): Promise<void> {
      try {
        const activeRoleIds = await db.select({ id: roles.id })
          .from(roles)
          .where(eq(roles.status, 1));

        const lines = await db.select()
          .from(casbinTable)
          .where(
            inArray(casbinTable.v0, activeRoleIds.map(r => r.id)),
          );

        for (const line of lines) {
          loadPolicyLine(line, model);
        }
      }
      catch {
        throw new Error("table must named 'casbinTable'");
      }
    },

    async savePolicy(model: Model): Promise<boolean> {
      await db.execute(sql`
        --#region SQL
        delete from ${casbinTable};
        --#endregion
      `);

      // 处理p类型的策略
      let astMap = model.model.get("p")!;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          const line = savePolicyLine(ptype, rule);
          await db.insert(casbinTable).values(line);
        }
      }

      // 处理g类型的策略
      astMap = model.model.get("g")!;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          const line = savePolicyLine(ptype, rule);
          await db.insert(casbinTable).values(line);
        }
      }

      return true;
    },

    async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
      const line = savePolicyLine(ptype, rule);
      await db.insert(casbinTable).values(line);
    },

    async removePolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
      const line = savePolicyLine(ptype, rule);
      const whereArray = createWhereConditions(line);
      await db.delete(casbinTable).where(and(...whereArray));
    },

    async removeFilteredPolicy(
      _sec: string,
      ptype: string,
      fieldIndex: number,
      ...fieldValues: string[]
    ): Promise<void> {
      const line: TCasinTable = { ptype, v0: null, v1: null, v2: null, v3: null, v4: null, v5: null };

      // 根据字段索引和值填充line对象
      const fields = ["v0", "v1", "v2", "v3", "v4", "v5"] as const;
      for (let i = 0; i < fieldValues.length; i++) {
        const targetIndex = fieldIndex + i;
        if (targetIndex >= 0 && targetIndex < 6) {
          line[fields[targetIndex]] = fieldValues[i];
        }
      }

      const whereArray = createWhereConditions(line);
      await db.delete(casbinTable).where(and(...whereArray));
    },

    async updatePolicy(_sec: string, ptype: string, oldRule: string[], newRule: string[]): Promise<void> {
      const oldLine = savePolicyLine(ptype, oldRule);
      const newLine = savePolicyLine(ptype, newRule);
      const whereArray = createWhereConditions(oldLine);

      await db.update(casbinTable)
        .set(newLine)
        .where(and(...whereArray));
    },
  };
}

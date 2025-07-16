import { eq } from "drizzle-orm";

import db from "@/db";
import { casbinRule, sysEndpoint, sysRole } from "@/db/schema";

/**
 * 同步权限数据
 * 确保所有端点都有对应的超级管理员权限
 */
async function syncPermissions() {
  console.log("开始同步权限数据...");

  try {
    // 查找超级管理员角色
    const superRole = await db.query.sysRole.findFirst({
      where: (table, { eq }) => eq(table.code, "ROLE_SUPER"),
    });

    if (!superRole) {
      console.error("未找到超级管理员角色 (ROLE_SUPER)");
      return;
    }

    console.log(`找到超级管理员角色: ${superRole.name} (ID: ${superRole.id})`);

    // 获取所有端点
    const endpoints = await db.select().from(sysEndpoint);
    console.log(`找到 ${endpoints.length} 个端点`);

    // 获取现有的超级管理员权限
    const existingRules = await db
      .select()
      .from(casbinRule)
      .where(eq(casbinRule.v0, "ROLE_SUPER"));

    // 创建权限映射
    const existingPermissions = new Set(
      existingRules.map(rule => `${rule.v1}:${rule.v2}`)
    );

    // 收集需要添加的权限
    const newPermissions: Array<{
      resource: string;
      action: string;
    }> = [];

    for (const endpoint of endpoints) {
      const permissionKey = `${endpoint.resource}:${endpoint.action}`;
      
      if (!existingPermissions.has(permissionKey)) {
        newPermissions.push({
          resource: endpoint.resource,
          action: endpoint.action,
        });
        console.log(`需要添加权限: ${permissionKey}`);
      }
    }

    // 添加缺失的权限
    if (newPermissions.length > 0) {
      const rulesToInsert = newPermissions.map(perm => ({
        ptype: "p",
        v0: "ROLE_SUPER",
        v1: perm.resource,
        v2: perm.action,
        v3: "built-in",
        v4: null,
        v5: null,
      }));

      await db.insert(casbinRule).values(rulesToInsert);
      console.log(`添加了 ${newPermissions.length} 条新权限`);
    } else {
      console.log("所有权限已存在，无需添加");
    }

    // 统计当前权限
    const allRules = await db
      .select()
      .from(casbinRule)
      .where(eq(casbinRule.ptype, "p"));

    console.log(`\n权限统计:`);
    console.log(`- 总权限数: ${allRules.length}`);
    console.log(`- 超级管理员权限: ${existingRules.length + newPermissions.length}`);

    console.log("\n权限同步完成！");
  } catch (error) {
    console.error("权限同步失败:", error);
    throw error;
  }
}

// 验证权限数据
async function validatePermissions() {
  console.log("\n验证权限数据...");

  try {
    // 获取所有权限规则
    const rules = await db
      .select()
      .from(casbinRule)
      .where(eq(casbinRule.ptype, "p"));

    // 获取所有端点
    const endpoints = await db.select().from(sysEndpoint);
    
    // 创建端点映射
    const endpointMap = new Map<string, boolean>();
    for (const endpoint of endpoints) {
      endpointMap.set(`${endpoint.resource}:${endpoint.action}`, true);
    }

    // 验证每个权限规则
    let validCount = 0;
    let invalidCount = 0;

    for (const rule of rules) {
      const permissionKey = `${rule.v1}:${rule.v2}`;
      
      if (endpointMap.has(permissionKey)) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`未找到对应端点: ${permissionKey} (角色: ${rule.v0})`);
      }
    }

    console.log(`\n验证结果:`);
    console.log(`- 有效权限: ${validCount}`);
    console.log(`- 无效权限: ${invalidCount}`);
    console.log(`- 端点总数: ${endpoints.length}`);

    if (invalidCount > 0) {
      console.warn("\n警告: 存在未映射到端点的权限规则");
    } else {
      console.log("\n✓ 所有权限规则都有对应的端点");
    }
  } catch (error) {
    console.error("权限验证失败:", error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    await syncPermissions();
    await validatePermissions();
    console.log("\n所有任务完成！");
    process.exit(0);
  } catch (error) {
    console.error("执行失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { syncPermissions, validatePermissions };
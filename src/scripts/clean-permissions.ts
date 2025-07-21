#!/usr/bin/env tsx
/* eslint-disable no-console */

import { eq, inArray } from "drizzle-orm";

import db from "@/db";
import { casbinRule } from "@/db/schema";
import { PermissionConfigManager } from "@/lib/permission-config";

/**
 * 权限清理脚本
 * 移除数据库中无效的 Casbin 权限规则
 */

interface CleanupOptions {
  dryRun?: boolean;
  batchSize?: number;
}

/**
 * 分析无效权限
 */
async function analyzeInvalidPermissions() {
  console.log("🔍 分析无效权限...");

  // 获取所有权限规则
  const rules = await db
    .select()
    .from(casbinRule)
    .where(eq(casbinRule.ptype, "p"));

  // 从权限管理器获取所有有效的端点权限
  const permissionManager = PermissionConfigManager.getInstance();
  const allEndpointPermissions = permissionManager.getAllEndpointPermissions();

  // 创建有效权限映射
  const validPermissions = new Set<string>();
  for (const endpoint of allEndpointPermissions) {
    validPermissions.add(`${endpoint.resource}:${endpoint.action}`);
  }

  // 分类权限规则
  const validRules: typeof rules = [];
  const invalidRules: typeof rules = [];

  for (const rule of rules) {
    const permissionKey = `${rule.v1}:${rule.v2}`;

    if (validPermissions.has(permissionKey)) {
      validRules.push(rule);
    }
    else {
      invalidRules.push(rule);
    }
  }

  // 按角色分组无效权限
  const invalidByRole = invalidRules.reduce((acc, rule) => {
    const roleKey = rule.v0 || "unknown";
    if (!acc[roleKey]) {
      acc[roleKey] = [];
    }
    acc[roleKey].push(rule);
    return acc;
  }, {} as Record<string, typeof rules>);

  return {
    total: rules.length,
    valid: validRules.length,
    invalid: invalidRules.length,
    invalidRules,
    invalidByRole,
    validPermissions: Array.from(validPermissions).sort(),
  };
}

/**
 * 清理无效权限
 */
async function cleanupInvalidPermissions(options: CleanupOptions = {}) {
  const { dryRun = false, batchSize = 50 } = options;

  console.log(`🧹 开始清理无效权限 ${dryRun ? "(预览模式)" : "(实际执行)"}...`);

  const analysis = await analyzeInvalidPermissions();

  if (analysis.invalid === 0) {
    console.log("✅ 没有发现无效权限，无需清理");
    return { deleted: 0 };
  }

  console.log(`\n📊 清理统计:`);
  console.log(`- 总权限数: ${analysis.total}`);
  console.log(`- 有效权限: ${analysis.valid}`);
  console.log(`- 无效权限: ${analysis.invalid}`);

  console.log(`\n🔍 按角色分组的无效权限:`);
  for (const [roleId, rules] of Object.entries(analysis.invalidByRole)) {
    console.log(`  - 角色 ${roleId}: ${rules.length} 个无效权限`);

    // 显示前5个无效权限作为示例
    const examples = rules.slice(0, 5).map(rule => `${rule.v1}:${rule.v2}`);
    console.log(`    示例: ${examples.join(", ")}${rules.length > 5 ? "..." : ""}`);
  }

  if (dryRun) {
    console.log(`\n🔔 预览模式：将会删除 ${analysis.invalid} 条无效权限规则`);
    return { deleted: 0 };
  }

  // 确认清理
  console.log(`\n⚠️  即将删除 ${analysis.invalid} 条无效权限规则`);
  console.log("这个操作不可逆，请确认是否继续...");

  // 执行清理（分批处理）
  let deletedCount = 0;
  const invalidRuleIds = analysis.invalidRules.map(rule => rule.id).filter(Boolean);

  if (invalidRuleIds.length > 0) {
    // 分批删除
    for (let i = 0; i < invalidRuleIds.length; i += batchSize) {
      const batch = invalidRuleIds.slice(i, i + batchSize);

      await db
        .delete(casbinRule)
        .where(inArray(casbinRule.id, batch));

      deletedCount += batch.length;
      console.log(`已删除 ${deletedCount}/${invalidRuleIds.length} 条权限规则`);
    }
  }

  console.log(`✅ 权限清理完成，共删除 ${deletedCount} 条无效规则`);

  return { deleted: deletedCount };
}

/**
 * 验证清理结果
 */
async function validateCleanupResult() {
  console.log("\n🔍 验证清理结果...");

  const analysis = await analyzeInvalidPermissions();

  console.log(`📊 清理后统计:`);
  console.log(`- 总权限数: ${analysis.total}`);
  console.log(`- 有效权限: ${analysis.valid}`);
  console.log(`- 无效权限: ${analysis.invalid}`);

  if (analysis.invalid === 0) {
    console.log("✅ 权限清理成功，没有剩余无效权限");
  }
  else {
    console.warn(`⚠️ 仍有 ${analysis.invalid} 个无效权限需要处理`);
  }

  return analysis;
}

/**
 * 生成权限对比报告
 */
async function generateComparisonReport() {
  console.log("\n📋 生成权限对比报告...");

  const analysis = await analyzeInvalidPermissions();

  // 获取数据库中的权限
  const dbPermissions = new Set<string>();
  const rules = await db
    .select()
    .from(casbinRule)
    .where(eq(casbinRule.ptype, "p"));

  for (const rule of rules) {
    dbPermissions.add(`${rule.v1}:${rule.v2}`);
  }

  // 对比有效权限和数据库权限
  const validPermissionsSet = new Set(analysis.validPermissions);
  const onlyInDb = Array.from(dbPermissions).filter(p => !validPermissionsSet.has(p));
  const onlyInCode = analysis.validPermissions.filter(p => !dbPermissions.has(p));

  console.log(`\n📊 权限对比报告:`);
  console.log(`- 代码中定义的权限: ${analysis.validPermissions.length}`);
  console.log(`- 数据库中的权限: ${dbPermissions.size}`);
  console.log(`- 仅在数据库中: ${onlyInDb.length} 个 (将被清理)`);
  console.log(`- 仅在代码中: ${onlyInCode.length} 个 (需要同步)`);

  if (onlyInDb.length > 0) {
    console.log(`\n🗑️  仅在数据库中的权限 (${onlyInDb.length} 个):`);
    onlyInDb.slice(0, 10).forEach(perm => console.log(`  - ${perm}`));
    if (onlyInDb.length > 10) {
      console.log(`  ... 还有 ${onlyInDb.length - 10} 个`);
    }
  }

  if (onlyInCode.length > 0) {
    console.log(`\n➕ 仅在代码中的权限 (${onlyInCode.length} 个):`);
    onlyInCode.slice(0, 10).forEach(perm => console.log(`  - ${perm}`));
    if (onlyInCode.length > 10) {
      console.log(`  ... 还有 ${onlyInCode.length - 10} 个`);
    }
  }

  return {
    codePermissions: analysis.validPermissions.length,
    dbPermissions: dbPermissions.size,
    onlyInDb: onlyInDb.length,
    onlyInCode: onlyInCode.length,
  };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-d");
  const force = args.includes("--force") || args.includes("-f");

  console.log("🧹 权限清理工具");
  console.log("=".repeat(40));

  try {
    // 生成对比报告
    const report = await generateComparisonReport();

    if (report.onlyInDb === 0) {
      console.log("\n✅ 没有需要清理的无效权限");
      process.exit(0);
    }

    // 清理权限
    const options: CleanupOptions = {
      dryRun: dryRun || !force,
      batchSize: 50,
    };

    await cleanupInvalidPermissions(options);

    if (!dryRun && force) {
      // 验证清理结果
      await validateCleanupResult();
    }

    if (dryRun) {
      console.log("\n💡 提示:");
      console.log("  - 使用 --force 参数执行实际清理");
      console.log("  - 使用 --dry-run 预览清理内容");
    }

    console.log("\n🎉 权限清理完成!");
  }
  catch (error) {
    console.error("\n💥 权限清理失败:", error);
    process.exit(1);
  }
}

// 导出函数
export {
  analyzeInvalidPermissions,
  cleanupInvalidPermissions,
  generateComparisonReport,
  validateCleanupResult,
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
